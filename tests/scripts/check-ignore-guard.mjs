#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// tests/scripts/check-ignore-guard.mjs — Cycle-8 T-03 「防误吞门禁」（D-005④）
//
// 目的：断言「关键路径不被 .gitignore 吞掉」。锐评事故的根因即「不可再生证据落在
//   被忽略目录且无留痕」；本门禁是那类事故的机器前置。
//
// 方法：对每个关键路径跑 `git check-ignore -v <path>`。
//   - 退出码 0 = 被忽略（FAIL，并打印「哪一行哪条规则吞了它」）
//   - 退出码 1 = 未被忽略（PASS）
//
// 双向断言（本门禁不是恒真）：
//   A) 正向：关键路径（受管工件区 / 文档 / 语料 / 门禁输入）**必须不被忽略**；
//   B) 阴性对照：已知可抛弃目录（构建与运行产物）**必须确实被忽略** ——
//      证明本门禁真的能区分「被吞」与「没被吞」。
//
// 关键路径清单只存在于本文件：`.github/workflows/*.yml` 不出现 `.scratch/` 字面量
//   （否则会击穿 verify-ticket-07 G4v / 10 G7e / 11 G7 / 12 G7e 的反向断言门）。
//
// 用法：
//   node tests/scripts/check-ignore-guard.mjs             # 门禁（默认）
//   node tests/scripts/check-ignore-guard.mjs --self-test # 额外自检（解析器 + 清单非空）
//   node tests/scripts/check-ignore-guard.mjs --json      # 机器可读输出
// ══════════════════════════════════════════════════════════════════

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARGS = new Set(process.argv.slice(2));
const JSON_OUT = ARGS.has('--json');

// ── A) 关键路径：必须 **不被** 忽略（被吞即门禁失败）──
const MUST_NOT_BE_IGNORED = [
  // 受管工件区（ADR-0013 决策 1）：区界文档 + 证据区 + 草稿区
  '.scratch/README.md',
  '.scratch/evidence/README.md',
  '.scratch/evidence/external-inputs-ledger.md',
  '.scratch/evidence/findings-register.md',
  '.scratch/draft/README.md',
  // 受管工件区：被 CI 门禁读取的数据面（移动即断门）
  '.scratch/architecture-recovery/decision-ledger.md',
  '.scratch/architecture-recovery/WORKFLOW.md',
  '.scratch/architecture-recovery/issues/',
  '.scratch/architecture-recovery/research/scripts/',
  '.scratch/architecture-recovery/research/window-reports/',
  // 周期账本与 handoff（唯一权威需求面，不得置于被忽略目录）
  '.scratch/cycle6-grill/decision-ledger.md',
  '.scratch/cycle7-grill/decision-ledger.md',
  '.scratch/cycle8-grill/decision-ledger.md',
  '.scratch/cycle8-grill/spec.md',
  '.scratch/cycle8-grill/handoffs/next-round.md',
  '.scratch/cycle8-grill/research/q3-evidence-workspace-governance.md',
  // 领域语言与决策（CONTEXT.md / docs/adr 白名单形态）
  'CONTEXT.md',
  'docs/adr/',
  // 测试与门禁输入面
  'tests/ACCEPTANCE-SURFACE.md',
  'tests/corpus/manifest.json',
  'tests/scripts/verify-ticket-plan.json',
  // 仓库卫生声明面
  '.editorconfig',
  '.gitattributes',
  '.github/workflows/typecheck.yml',
];

// ── B) 阴性对照：必须 **确实** 被忽略（否则门禁无区分力）──
const MUST_BE_IGNORED = [
  'dist/',
  'test-results/',
  'playwright-report/',
  'live-out/',
  'node_modules/',
];

/** 解析 `git check-ignore -v` 的单行输出：`<source>:<linenum>:<pattern>\t<pathname>` */
export function parseCheckIgnore(stdout) {
  const line = String(stdout || '').split('\n').find((l) => l.trim().length > 0);
  if (!line) return null;
  const tab = line.indexOf('\t');
  const head = tab === -1 ? line : line.slice(0, tab);
  const pathname = tab === -1 ? '' : line.slice(tab + 1);
  const m = head.match(/^(.*?):(\d+):(.*)$/);
  if (!m) return { source: head, line: null, pattern: head, pathname };
  return { source: m[1], line: Number(m[2]), pattern: m[3], pathname };
}

/** 跑 `git check-ignore -v <p>`，返回 {ignored, rule} */
export function checkIgnore(p) {
  const r = spawnSync('git', ['check-ignore', '-v', '--', p], { cwd: ROOT, encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status === 0) return { ignored: true, rule: parseCheckIgnore(r.stdout) };
  if (r.status === 1) return { ignored: false, rule: null };
  throw new Error('git check-ignore failed for ' + p + ' (status ' + r.status + '): ' + (r.stderr || '').trim());
}

function runSelfTest() {
  const failures = [];
  const t = (name, ok, detail) => { if (!ok) failures.push(name + (detail ? ' :: ' + detail : '')); };

  // 解析器：被忽略行 → 解出 source/line/pattern/pathname
  const parsed = parseCheckIgnore('.gitignore:22:dist/\tdist/f.js');
  t('self-test: parse ignored line', parsed && parsed.source === '.gitignore' && parsed.line === 22 && parsed.pattern === 'dist/' && parsed.pathname === 'dist/f.js', JSON.stringify(parsed));
  // 解析器：空输出 → null
  t('self-test: parse empty output', parseCheckIgnore('') === null && parseCheckIgnore('\n') === null);
  // 清单非空且含受管工件区（防止清单被静默清空后门禁恒真）
  t('self-test: MUST_NOT_BE_IGNORED non-empty', MUST_NOT_BE_IGNORED.length > 0);
  t('self-test: key paths cover the governed artifact area', MUST_NOT_BE_IGNORED.filter((p) => p.startsWith('.scratch/')).length >= 5);
  t('self-test: negative controls non-empty', MUST_BE_IGNORED.length >= 4);
  // 真跑一条阴性对照，证明探测通道真的能看见「被忽略」
  const probe = checkIgnore('dist/');
  t('self-test: probe channel sees an ignored path', probe.ignored === true && probe.rule && probe.rule.line !== null, JSON.stringify(probe));
  return failures;
}

const failures = [];
const positive = [];
for (const p of MUST_NOT_BE_IGNORED) {
  const r = checkIgnore(p);
  positive.push({ path: p, ignored: r.ignored, rule: r.rule });
  if (r.ignored) {
    const rule = r.rule ? r.rule.source + ':' + r.rule.line + ':' + r.rule.pattern : '(unknown rule)';
    failures.push('SWALLOWED  ' + p + '  <- ' + rule);
  }
}
const negative = [];
for (const p of MUST_BE_IGNORED) {
  const r = checkIgnore(p);
  negative.push({ path: p, ignored: r.ignored, rule: r.rule });
  if (!r.ignored) failures.push('CONTROL FAILED (expected ignored, but NOT ignored)  ' + p);
}

let selfTestFailures = [];
if (ARGS.has('--self-test')) selfTestFailures = runSelfTest();

const allFailures = failures.concat(selfTestFailures);

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: allFailures.length === 0, keyPaths: positive, negativeControls: negative, failures: allFailures }, null, 2));
} else {
  console.log('check-ignore-guard: key paths = ' + MUST_NOT_BE_IGNORED.length + ', negative controls = ' + MUST_BE_IGNORED.length);
  for (const p of positive) console.log('  PASS  not-ignored  ' + p.path);
  for (const p of negative) console.log('  PASS  ignored      ' + p.path + (p.rule ? '  (' + p.rule.source + ':' + p.rule.line + ':' + p.rule.pattern + ')' : ''));
  if (ARGS.has('--self-test')) {
    if (selfTestFailures.length === 0) console.log('  PASS  self-test (parser + non-vacuous inventory + probe channel)');
    else for (const f of selfTestFailures) console.log('  FAIL  ' + f);
  }
  for (const f of failures) console.log('  FAIL  ' + f);
  console.log(allFailures.length === 0
    ? 'check-ignore-guard: OK (' + MUST_NOT_BE_IGNORED.length + ' key paths not ignored, ' + MUST_BE_IGNORED.length + ' negative controls ignored)'
    : 'check-ignore-guard: ' + allFailures.length + ' failure(s)');
}

if (allFailures.length > 0) process.exit(1);
