// ══════════════════════════════════════════════════════════════════
// verify-ticket-06.mjs — Cycle-6 票 06「形态语料三层架构」结构门（A-030）
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）读文本 + 哈希 + 目录纪律断言。
// 覆盖：S0 自证 / S1 三层架构与目录纪律 / S2 指纹完整性 /
//   S3 合规口径（去品牌·去追踪·provenance）/ S4 原始快照不入库 /
//   S5 退化回路成文与工具链 / S6 命名正交 / S7 结构骨架确定性 / S8 覆盖声明。
// 用法：node tests/scripts/verify-ticket-06.mjs
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const sha256File = (p) => sha256(readFileSync(p));

let pass = 0;
const failures = [];
const ok = (m) => { pass++; console.log('  PASS ' + m); };
const eq = (a, b, m) => {
  if (a === b) ok(m + ' (' + JSON.stringify(a) + ')');
  else failures.push(m + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
};
const check = (c, m, extra) => {
  if (c) ok(m + (extra ? ' \u2014 ' + extra : ''));
  else failures.push(m + (extra ? ' \u2014 ' + extra : ''));
};
const count = (src, re) => (src.match(re) || []).length;
const stripComments = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
// 可见正文文本（去注释 / script / style / 标签）——合规断言只针对「用户可见内容」
const bodyText = (html) => {
  let s = html.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<head[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const FORMS = 'tests/corpus/forms';
const FILES = {
  readme: FORMS + '/README.md',
  sources: FORMS + '/sources.json',
  manifest: FORMS + '/manifest.json',
  capture: 'tests/scripts/06-capture-forms.mjs',
  skeleton: 'tests/scripts/06-skeleton.mjs',
  diff: 'tests/scripts/06-structural-diff.mjs',
  manifestGen: 'tests/scripts/06-manifest.mjs',
  server: 'tests/server.mjs',
  spec: 'tests/corpus-forms.spec.ts',
  workflow: '.github/workflows/verify-06.yml',
};

// == S0 自证（已知好样本干跑 [WORKFLOW §5 教训]）==
{
  const missing = Object.entries(FILES).filter(([, p]) => !existsSync(abs(p))).map(([k]) => k);
  check(missing.length === 0, 'S0 全部工件存在', 'missing=' + (missing.join(',') || 'none'));
  if (missing.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
  check(Object.values(FILES).every((p) => read(p).length > 0), 'S0 全部工件可读非空');
  const skel = JSON.parse(read(FORMS + '/skeletons/iti-v29.json'));
  check(!!skel.tree && skel.tree.tag === 'div', 'S0 已知好样本命中 iti-v29 骨架根节点');
  const man = JSON.parse(read(FILES.manifest));
  check(Array.isArray(man.entries) && man.entries.length === 8, 'S0 已知好样本命中 8 条清单条目');
}

const MANIFEST = JSON.parse(read(FILES.manifest));
const SOURCES = JSON.parse(read(FILES.sources)).sources;

// == S1 三层架构与目录纪律（ADR-0006 条款 5）==
{
  check(existsSync(abs(FORMS + '/mirrors')) && existsSync(abs(FORMS + '/skeletons')), 'S1 三层目录齐备（mirrors/ + skeletons/）');
  check(!existsSync(abs('corpus')), 'S1 **不新增顶层 corpus/**（ADR-0006 条款 5 单一 tests/ 根）');
  check(abs(FORMS).startsWith(abs('tests')), 'S1 语料位于单一 tests/ 根下');
  eq(MANIFEST.entries.length, SOURCES.length, 'S1 manifest 条目数 == sources 条目数');
  const ids = MANIFEST.entries.map((e) => e.id).sort().join(',');
  eq(ids, SOURCES.map((s) => s.id).sort().join(','), 'S1 manifest 条目 id 与 sources 一致');
  check(MANIFEST.entries.every((e) => e.mirror && e.skeleton), 'S1 每条均有镜像页 + 结构骨架');
  check(MANIFEST.entries.every((e) => e.adoption === 'adopted'), 'S1 全部候选为 adopted（8/8）');
  // 不引入对象存储 / S3
  const s3 = ['s3://', 'amazonaws.com', '@aws-sdk', 'minio', 'cloudflare r2', 'backblaze b2'];
  const blob = read(FILES.readme) + read(FILES.sources) + read(FILES.manifest) + read(FILES.capture) + read(FILES.manifestGen);
  check(s3.every((t) => blob.toLowerCase().indexOf(t) < 0), 'S1 不引入对象存储/S3（复用既有仓库外 archive 模式）');
}

// == S2 指纹完整性（清单 ↔ 磁盘 ↔ 骨架自校验）==
{
  for (const e of MANIFEST.entries) {
    const mp = abs(e.mirror.file);
    if (!existsSync(mp)) { failures.push('S2 镜像页缺失: ' + e.mirror.file); continue; }
    eq(sha256File(mp), e.mirror.sha256, 'S2 ' + e.id + ' 镜像页 SHA-256 与清单一致');
    if (e.child_mirror) {
      const cp = abs(e.child_mirror.file);
      check(existsSync(cp) && sha256File(cp) === e.child_mirror.sha256, 'S2 ' + e.id + ' 子帧镜像页 SHA-256 一致');
    }
    const sp = abs(e.skeleton.file);
    eq(sha256File(sp), e.skeleton.sha256, 'S2 ' + e.id + ' 骨架文件 SHA-256 与清单一致');
    const skel = JSON.parse(read(e.skeleton.file));
    eq(sha256(JSON.stringify(skel.tree)), skel.sha256, 'S2 ' + e.id + ' 骨架内部树哈希自校验');
    eq(skel.sha256, e.skeleton.tree_sha256, 'S2 ' + e.id + ' 骨架树哈希 == 清单 tree_sha256');
    eq(skel.node_count, e.skeleton.node_count, 'S2 ' + e.id + ' 骨架节点数与清单一致');
    check(e.skeleton.node_count > 0, 'S2 ' + e.id + ' 骨架非空（' + e.skeleton.node_count + ' 节点）');
  }
  check(MANIFEST._meta.generated_by === 'tests/scripts/06-manifest.mjs', 'S2 清单声明生成器（generated ledger）');
}

// == S3 合规口径（去品牌 · 去追踪 · provenance）==
{
  const BRAND = ['international telephone input', 'intl-tel-input', 'intl tel input',
    'react-phone-number-input', 'material ui', 'element plus', 'ant design', 'mui',
    'antd', 'heroku', 'codepen', 'harvesthq', 'chosen'];
  const TRACK = ['google-analytics', 'googletagmanager', 'gtag(', 'analytics.js', '_paq', 'facebook.net', 'hotjar', 'segment.com', 'mixpanel'];
  const mirrorFiles = readdirSync(abs(FORMS + '/mirrors')).filter((f) => f.endsWith('.html'));
  check(mirrorFiles.length === 9, 'S3 镜像页数 = 9（8 主 + 1 子帧）', mirrorFiles.length + ' files');
  for (const f of mirrorFiles) {
    const html = read(FORMS + '/mirrors/' + f);
    const body = bodyText(html).toLowerCase();
    const hit = BRAND.filter((t) => body.indexOf(t) >= 0);
    check(hit.length === 0, 'S3 ' + f + ' 可见正文无品牌内容', hit.join(',') || 'clean');
    // provenance：头注释必须含 source_url / captured_at / mirror_of / license_note
    for (const key of ['source_url', 'captured_at', 'mirror_of', 'license_note']) {
      check(html.indexOf(key) >= 0, 'S3 ' + f + ' 标注 ' + key);
    }
    // 去追踪 + 零外链（hermetic）
    const code = stripComments(html);
    check(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(code), 'S3 ' + f + ' 无外部 src/href（hermetic）');
    check(!/url\(\s*['"]?https?:\/\//i.test(code), 'S3 ' + f + ' CSS 无外部 url()');
    const th = TRACK.filter((t) => code.toLowerCase().indexOf(t) >= 0);
    check(th.length === 0, 'S3 ' + f + ' 无追踪脚本 token', th.join(',') || 'clean');
  }
  check(/publicPagesOnly/.test(read(FILES.manifest)) && /noPii/.test(read(FILES.manifest)),
    'S3 清单声明合规口径（公开页 / 无 PII / 剥品牌 / provenance）');
}

// == S4 原始快照不入库 ==
{
  const archiveRoot = MANIFEST.entries[0].capture.archive_root;
  const rootN = ROOT.replace(/\\/g, '/');
  check(!!archiveRoot && archiveRoot !== rootN && !archiveRoot.startsWith(rootN + '/'),
    'S4 归档根在**仓库外**（前缀碰撞防护：须以分隔符为界）', archiveRoot);
  for (const e of MANIFEST.entries) {
    check(e.capture.raw && e.capture.raw.path.startsWith('corpus-forms/'), 'S4 ' + e.id + ' 原始快照路径为归档相对路径');
    check(!String(e.capture.raw.path).startsWith('/') && !String(e.capture.raw.path).includes(ROOT.replace(/\\/g, '/')),
      'S4 ' + e.id + ' 原始快照路径非仓库绝对路径');
    check(!!e.capture.raw.sha256 && e.capture.raw.sha256.length === 64, 'S4 ' + e.id + ' 原始快照登记 SHA-256 指纹');
  }
  // 仓库内不得出现原始快照 / 渲染 DOM / 截图
  const stray = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(png|warc|warc\.gz)$/i.test(f) || /(^|[-.])dom([-.]|$)/i.test(f) || /raw/i.test(f)) stray.push(p.replace(ROOT, '').replace(/\\/g, '/'));
    }
  };
  walk(abs(FORMS));
  eq(stray.length, 0, 'S4 形态语料目录内无原始快照 / 渲染 DOM / 截图', stray.join(',') || 'clean');
  // 归档在场时做**指纹实物复核**（WORKFLOW §8.2 本地硬验收：只读、无副作用）；
  // CI 无归档 → 显式 SKIP（不伪造绿，也不误报红）
  if (existsSync(archiveRoot)) {
    let verified = 0, mismatch = 0;
    for (const e of MANIFEST.entries) {
      for (const a of [e.capture.raw, e.capture.dom, ...(e.capture.frames || [])]) {
        if (!a) continue;
        const p = join(archiveRoot, a.path);
        if (!existsSync(p)) { mismatch++; continue; }
        if (sha256File(p) === a.sha256) verified++; else mismatch++;
      }
    }
    eq(mismatch, 0, 'S4 归档实物指纹逐条复核（' + verified + ' 项匹配，0 失配）');
  } else {
    console.log('  SKIP S4 归档实物指纹复核（本机无 archive：CI 环境下按 §8.2 显式跳过，不伪造绿）');
  }
}

// == S5 退化回路成文与工具链 ==
{
  const README = read(FILES.readme);
  for (const step of ['06-capture-forms.mjs', '06-skeleton.mjs', '06-structural-diff.mjs']) {
    check(README.indexOf(step) >= 0, 'S5 README 记录回路工具 ' + step);
  }
  check(/绝不为修绿而盲目更新快照/.test(README), 'S5 README 载明纪律「绝不为修绿而盲目更新快照」');
  check(/定期重捕/.test(README) && /确定性结构 diff/.test(README) && /回放自检/.test(README) && /分级/.test(README),
    'S5 README 载明四步回路（重捕 → 结构 diff → 分级 bump → 回放自检）');
  check(!!MANIFEST._meta.degradationLoop && !!MANIFEST._meta.degradationLoop.step1_recapture,
    'S5 清单内嵌退化回路定义');
  const diffSrc = read(FILES.diff);
  for (const tier of ['none', 'patch', 'minor', 'major']) {
    check(new RegExp("'" + tier + "'").test(diffSrc) || new RegExp('"' + tier + '"').test(diffSrc), 'S5 结构 diff 分级含 ' + tier);
  }
  check(/非像素 diff/.test(diffSrc), 'S5 结构 diff 声明为「确定性结构 diff（非像素 diff）」');
}

// == S6 命名正交（不与「校准语料」混淆）==
{
  const README = read(FILES.readme);
  check(/形态语料/.test(README) && /校准语料/.test(README), 'S6 README 同时说明「形态语料」与「校准语料」');
  check(/正交/.test(README), 'S6 README 声明两者在语义轴上正交');
  check(/tests\/corpus\/manifest\.json/.test(README), 'S6 README 指向校准语料路径（不混用）');
  check(MANIFEST._meta.naming.indexOf('校准语料') >= 0, 'S6 清单载明命名正交关系');
  // 形态语料目录内不得出现校准语料的用例结构
  const manSrc = read(FILES.manifest);
  check(!/"polarity"/.test(manSrc) && !/"knownResidual"/.test(manSrc), 'S6 形态语料清单不含校准语料字段（polarity/knownResidual）');
}

// == S7 结构骨架确定性（同源两次派生同哈希）==
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch06-gate-'));
  try {
    const run = (out) => execFileSync(process.execPath, [abs(FILES.skeleton), '--id', 'iti-v29', '--from', 'mirror', '--out', out], { encoding: 'utf8' });
    const a = join(tmp, 'a.json');
    const b = join(tmp, 'b.json');
    run(a); run(b);
    eq(sha256File(a), sha256File(b), 'S7 同源两次派生骨架哈希一致（确定性归一化）');
    const ja = JSON.parse(readFileSync(a, 'utf8'));
    eq(sha256(JSON.stringify(ja.tree)), ja.sha256, 'S7 派生骨架内部树哈希自校验');
    check(ja.source === 'mirror', 'S7 派生来源标记为 mirror（离线可复现）');
  } catch (e) {
    failures.push('S7 骨架派生失败: ' + ((e && e.message) || e));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// == S8 覆盖声明与 harness 接入 ==
{
  check(/A-030/.test(read(FILES.readme)), 'S8 README 声明本票覆盖的 A-030');
  check(/A-030/.test(read(FILES.sources)), 'S8 sources 声明覆盖的 A-030');
  check(/A-030/.test(read(FILES.spec)), 'S8 spec 声明覆盖的 A-030');
  check(/\/corpus\//.test(read(FILES.server)), 'S8 测试服务器已挂载 /corpus/ 路由（镜像页可被 E2E 加载）');
  check(/pull_request/.test(read(FILES.workflow)), 'S8 结构门 workflow 进 pull_request 触发面');
}

console.log('-----------------------------');
console.log('verify-ticket-06: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
