#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// 38-version-consistency.mjs — 票 38（分发最后一公里，覆盖 A-011）版本一致性闸门
//
// 设计前提（票 38 delta）：
//   · 版本真源唯一 = package.json
//   · CI 禁止任何主动写 GreasyFork 的步骤（GF 无写入 API，只支持站内
//     「Sync from external URL」拉取模型）——本脚本全程只读本地文件
//
// 断言面（node 直跑，无浏览器、无 npm 依赖）：
//   G1 真源唯一：package.json 是唯一声明点，vite.config.ts 注入而非手写字面量
//   G2 产物一致：dist 产物 // @version == package.json version（构建后实测）
//   G3 tag 一致：tag 上下文下 tag 去 v 前缀 == 真源；且 release 工作流 tag 由产物派生
//   G4 GF 硬规则：单文件 ≤2MB、@updateURL ≤1 条（更新检查 ≤1 次/天）、产物未 minify
//   G5 分发链接：README 双语安装链指向 releases/latest，不得钉死旧 tag
//
// 用法：node tests/scripts/38-version-consistency.mjs [--tag v1.5.0]
// 前置：npm run build（dist/ 被 .gitignore 忽略，必须在 CI 内构建）
// ══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ADR-0006 决策 1：脚本以自身位置上溯 2 级锚定仓库根
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');

const ARTIFACT_REL = 'dist/find-your-country-code.user.js';
const ARTIFACT = join(ROOT, ARTIFACT_REL);
const MAX_BYTES = 2 * 1024 * 1024; // GF 硬规则：单文件 ≤ 2MB
const REPO_URL = 'https://github.com/Xxx91n/Find-Your-Country-Code';
const LATEST_ASSET = REPO_URL + '/releases/latest/download/find-your-country-code.user.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log('PASS ' + name + (detail ? ' :: ' + detail : ''));
  } else {
    fail++;
    failures.push(name + (detail ? ' :: ' + detail : ''));
    console.log('FAIL ' + name + (detail ? ' :: ' + detail : ''));
  }
}

function metaValue(src, key) {
  const m = src.match(new RegExp('^//\\s*@' + key + '\\s+(\\S+)\\s*$', 'm'));
  return m ? m[1].trim() : null;
}

// ══ G1 版本真源唯一 ═════════════════════════════════════════════════
const pkgVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
check('G1a package.json 声明语义化版本',
  typeof pkgVersion === 'string' && /^\d+\.\d+\.\d+/.test(pkgVersion),
  'package.json version=' + pkgVersion);

const viteCfg = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
check('G1b vite.config.ts 无手写版本字面量（第二份副本已消除）',
  !/version:\s*['"]\d+\.\d+\.\d+['"]/.test(viteCfg));
check('G1c vite.config.ts 从 package.json 读取并注入版本',
  /package\.json/.test(viteCfg) && /version:\s*[A-Za-z_$][\w$]*/.test(viteCfg));

// ══ G2 产物版本一致 ═════════════════════════════════════════════════
check('G2a 产物存在（须先 npm run build）', existsSync(ARTIFACT), ARTIFACT_REL);
if (!existsSync(ARTIFACT)) {
  console.error('\n38-version-consistency: 产物缺失，先执行 npm run build');
  process.exit(1);
}
const artifact = readFileSync(ARTIFACT, 'utf8');
const artifactVersion = metaValue(artifact, 'version');
check('G2b 产物含 // @version 元数据', !!artifactVersion, 'artifact @version=' + artifactVersion);
check('G2c 产物 @version == package.json version（真源）',
  artifactVersion === pkgVersion,
  'artifact=' + artifactVersion + ' package.json=' + pkgVersion);

// ══ G3 tag 一致（防半发布）══════════════════════════════════════════
const tagIdx = process.argv.indexOf('--tag');
const argTag = tagIdx >= 0 ? process.argv[tagIdx + 1] : null;
const ref = process.env.GITHUB_REF || '';
let tag = argTag;
if (!tag && ref.startsWith('refs/tags/')) tag = ref.slice('refs/tags/'.length);

if (tag) {
  check('G3a tag == package.json version（不一致即红，防半发布）',
    tag.replace(/^v/, '') === pkgVersion,
    'tag=' + tag + ' package.json=' + pkgVersion);
} else {
  console.log('SKIP G3a 非 tag 上下文（pull_request / branch push 无 tag 可比）');
}
const releaseYml = readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8');
check('G3b release.yml 的 tag 由产物 @version 派生（tag 不脱离真源）',
  /TAG=v\$VERSION/.test(releaseYml));

// ══ G4 GreasyFork 三条硬规则不回归 ══════════════════════════════════
const bytes = statSync(ARTIFACT).size;
check('G4a 产物单文件 ≤ 2MB（GF 硬规则）', bytes <= MAX_BYTES,
  bytes + ' bytes / limit ' + MAX_BYTES);

const updateCount = (artifact.match(/^\/\/\s*@updateURL\s+/gm) || []).length;
check('G4b @updateURL ≤ 1 条（更新检查 ≤ 1 次/天）', updateCount <= 1, 'count=' + updateCount);

const lines = artifact.split('\n');
const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
check('G4c 产物元数据块 ==UserScript== 完整（GF 可读源码）',
  /\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/.test(artifact));
check('G4d 产物未 minify（多行可读，非单行压缩）',
  lines.length > 200 && longest < 2000,
  'lines=' + lines.length + ' longestLine=' + longest);

// ══ G5 分发链接不钉死旧版本 ═════════════════════════════════════════
for (const file of ['README.md', 'README_EN.md']) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  check('G5a ' + file + ' 安装链指向 releases/latest', src.includes(LATEST_ASSET));
  check('G5b ' + file + ' 无钉死旧 tag 的 releases/download 链接',
    !/releases\/download\/v\d+\.\d+\.\d+\/find-your-country-code\.user\.js/.test(src));
}

console.log('\n─────────────────────────────────────────────');
console.log('ticket-38 version consistency: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log('OK: tag / package.json / artifact version 三者一致，GF 硬规则无回归');
