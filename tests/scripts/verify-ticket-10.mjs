#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-10.mjs — Cycle-6 票 10「about:srcdoc 帧跨帧 origin 校验误判」结构门（A-034）
// 方法：读文本做结构断言（无浏览器、无 npm 依赖、零外网，node 直跑；零正则，逐行扫描）。
//
// 断言面：
//   S0 自证：全部工件存在且可读非空（WORKFLOW §5 教训：验收工具也要先自证）
//   G1 缺陷形态已沉淀为塔身 fixture（WORKFLOW §4.5.1 硬序：先沉淀再改脚本）
//   G2 修复面完整：SELF_ORIGIN 唯一定义（window.origin 优先）；四处操作数全部改用之；
//      全 src/ 内无以 location.origin 作比较操作数的残留
//   G3 校验未删除、未放宽（本票 delta 硬约束）：票 24 语义不变
//   G4 只升不降：既有密封 spec 文件集零删减；本票 5 例（含 L0/L3/L4 阶梯）在位
//   G5 票 12 delta：跨域 fixture 与既有用例仍在；本票新增非嵌入来源拒绝用例
//   G6 发布面判据不变（ADR-0010）：真实站点层不进 pull_request；release 以 needs 硬依赖挂发布门
//   G7 覆盖声明与 workflow 卫生：A-034 四处声明；workflow 零 .scratch/ 路径引用（ADR-0006 决策 1）
//
// 运行时用例数（135 → 140）由 CI 的 e2e.yml 运行结果锚定，本门只做静态结构锁。
// 用法：node tests/scripts/verify-ticket-10.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

const NL = String.fromCharCode(10);

let pass = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name + (detail ? ' — ' + detail : '')); }
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
const splitLines = (src) => src.split(NL);
/** 取 YAML 顶层 on: 触发块（自 on: 行至下一个非缩进顶层键止）。 */
function onBlock(yaml) {
  const ls = splitLines(yaml);
  const start = ls.findIndex((l) => l === 'on:');
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < ls.length; i++) {
    const l = ls[i];
    if (l.length > 0 && !l.startsWith(' ')) break;
    out.push(l);
  }
  return out.join(NL);
}
const countIn = (src, needle) => src.split(needle).length - 1;
/** 逐行扫描命中（零正则，避免转义面）。 */
function scan(src, predicate) {
  const out = [];
  splitLines(src).forEach((l, i) => { if (predicate(l, i)) out.push((i + 1) + ': ' + l.trim()); });
  return out;
}

// ── S0 自证：工件存在且可读非空 ──
const ARTIFACTS = [
  'src/config.ts', 'src/main.ts', 'src/store/index.ts',
  'tests/fixtures/srcdoc-frame.html', 'tests/srcdoc-origin.spec.ts',
  'tests/scripts/verify-ticket-10.mjs', '.github/workflows/verify-tickets.yml',
  '.scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs',
  '.scratch/architecture-recovery/issues/10-srcdoc-origin-fix.md',
];
{
  const missing = ARTIFACTS.filter((f) => !has(f));
  check('S0 全部工件存在', missing.length === 0, missing.join(','));
  const empty = ARTIFACTS.filter((f) => has(f) && read(f).length === 0);
  check('S0 全部工件可读非空', empty.length === 0, empty.join(','));
  if (missing.length) { console.log(NL + pass + ' PASS, ' + failures.length + ' FAIL'); process.exit(1); }
}

const CFG = read('src/config.ts');
const MAIN = read('src/main.ts');
const STORE = read('src/store/index.ts');
const FIXTURE = read('tests/fixtures/srcdoc-frame.html');
const SPEC = read('tests/srcdoc-origin.spec.ts');
const PROBE = read('.scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs');
const ISSUE = read('.scratch/architecture-recovery/issues/10-srcdoc-origin-fix.md');
// Cycle-7 D-004：票级 workflow 合并 —— verify-10.yml 删除，CI 挂接点 = 调用方 + plan 的 '10' 条目
const V10 = read('.github/workflows/verify-tickets.yml');
const T10 = (JSON.parse(read('tests/scripts/verify-ticket-plan.json')).tickets || {})['10'] || {};

function srcFiles() {
  const out = [];
  (function walk(rel) {
    for (const e of readdirSync(abs(rel), { withFileTypes: true })) {
      const p = rel + '/' + e.name;
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.ts')) out.push(p);
    }
  })('src');
  return out;
}
const ALL_SRC = srcFiles().map((f) => read(f)).join(NL);

// ══ G1 缺陷形态已沉淀为塔身 fixture（WORKFLOW §4.5.1 硬序）══
check('G1a srcdoc 形态 fixture 存在且内联 srcdoc 帧', FIXTURE.includes('srcdoc=') && FIXTURE.includes('iframe'));
check('G1b fixture 子帧含可驱动的区号字段', FIXTURE.includes('id="srcc-cc"'));
check('G1c 密封 spec 钉住根因前提（location.origin 为 null 字符串 / window.origin 为真实 origin）', SPEC.includes("toBe('null')") && SPEC.includes('window.origin'));
check('G1d 密封 spec 覆盖跨帧填充 L3 写入结果', SPEC.includes('readHostValue') && SPEC.includes('readFieldEvents'));
check('G1e 密封 spec 覆盖 L4 用户反馈', SPEC.includes('feedbackToast'));
check('G1f 密封 spec 覆盖 L0 静默健康（弱断言掩盖取证）', SPEC.includes('pageerror'));

// ══ G2 修复面完整 ══
check('G2a src/config.ts 定义 SELF_ORIGIN（本帧文档 origin 唯一定义）', CFG.includes('export const SELF_ORIGIN ='));
check('G2b SELF_ORIGIN 取径优先 window.origin（本票修法方向）', CFG.includes('window.origin'));
check('G2c SELF_ORIGIN 带回退分支（宿主不支持时退回既有语义，不引入新行为）', CFG.includes('return location.origin;'));
check('G2d 顶层入站校验操作数已改用 SELF_ORIGIN', MAIN.includes('if (e.origin !== SELF_ORIGIN && !isEmbeddedFrame(e.source)) {'));
check('G2e 子帧入站校验操作数已改用 SELF_ORIGIN（本票根因面 main.ts:134）', MAIN.includes('if (isTopFrameSameOrigin() && e.origin !== SELF_ORIGIN) return;'));
const storeHits = countIn(STORE, 'if (e.origin !== SELF_ORIGIN) return;');
check('G2f BroadcastChannel 同源校验两处均已改用 SELF_ORIGIN（:67 / :97 同面）', storeHits === 2, 'count=' + storeHits);
const cmpResidue = scan(ALL_SRC, (l) => l.includes('location.origin') && (l.includes('!==') || l.includes('===') || l.includes('!=') || l.includes('==')));
check('G2g 全 src/ 无以 location.origin 作比较操作数的残留', cmpResidue.length === 0, cmpResidue.join(' | '));

// ══ G3 校验未删除、未放宽（票 24 语义不变）══
check('G3a 顶层入站仍保留嵌入来源锚点', MAIN.includes('!isEmbeddedFrame(e.source)'));
check('G3b 顶层校验失败仍降级为可见提示（票 40：不静默）', MAIN.includes('UI.toast('));
check('G3c 子帧仍保留「只接受顶层指令」来源锚点', MAIN.includes('if (e.source !== window.top) return;'));
check('G3d 子帧仍保留顶层同源前置条件', MAIN.includes('isTopFrameSameOrigin() &&'));
check('G3e store 仍保留两处 origin 拒绝语句（不得以删除校验替代修复）', storeHits === 2);
const widened = scan(ALL_SRC, (l) => l.includes('e.origin') && l.includes("'null'"));
check('G3f 不存在「e.origin 为 null 即放行」类放宽写法', widened.length === 0, widened.join(' | '));

// ══ G4 只升不降 ══
const BASELINE_SPECS = ['corpus-forms.spec.ts', 'custom-dropdown.spec.ts', 'diagnostics-surface.spec.ts',
  'entry-access.spec.ts', 'fill-feedback.spec.ts', 'fp-regression.spec.ts', 'framework-inject.spec.ts',
  'framework-react19.spec.ts', 'harness-primitives.spec.ts', 'iframe-nested.e2e.spec.ts', 'iframe.e2e.spec.ts',
  'iso2-dial-evidence.spec.ts', 'locale-switch.spec.ts', 'pseudo-select.spec.ts', 'rescan.e2e.spec.ts',
  'rules-ui.spec.ts', 'scenarios.e2e.spec.ts', 'settings-surface.spec.ts', 'visibility.spec.ts', 'weak-signal.spec.ts'];
const missingSpecs = BASELINE_SPECS.filter((f) => !has('tests/' + f) || read('tests/' + f).length === 0);
check('G4a 既有密封 spec 文件集零删减（只升不降）', missingSpecs.length === 0, missingSpecs.join(','));
const mineCount = scan(SPEC, (l) => l.trim().startsWith('test(')).length;
check('G4b 本票新增密封用例 ≥5（根因 / 填充链路 / L0 / 锚点 / 跨域拒绝）', mineCount >= 5, 'count=' + mineCount);

// ══ G5 票 12 delta（跨域拒绝语义不回归）══
check('G5a 票 12 跨域 fixture 仍在', has('tests/fixtures/iframe-cross-origin.html'));
const IFSPEC = read('tests/iframe.e2e.spec.ts');
check('G5b 票 12 跨域 fixture 既有用例仍在（拒绝语义载体）', IFSPEC.includes('iframe-cross-origin.html'));
check('G5c 本票新增「非嵌入来源仍被拒绝」用例（入站校验未放宽）', SPEC.includes('非嵌入来源'));

// ══ G6 发布面判据不变（ADR-0008 第二层 / ADR-0010 条款 2）══
const SMOKE = read('.github/workflows/real-site-smoke.yml');
const smokeOn = onBlock(SMOKE);
check('G6a 真实站点层 on: 触发块仍无 pull_request（ADR-0008 第二层）', smokeOn.length > 0 && !smokeOn.includes('pull_request'), smokeOn.split(NL).filter((l) => l.trim()).join(' / '));
check('G6a2 真实站点层仍仅 schedule + workflow_dispatch 触发', smokeOn.includes('schedule:') && smokeOn.includes('workflow_dispatch:'));
const REL = read('.github/workflows/release.yml');
check('G6b release 仍以 needs 硬依赖挂在发布门之后', REL.includes('release-gate:') && REL.includes('needs: release-gate'));

// ══ G7 覆盖声明与 workflow 卫生 ══
check('G7a A-034 在 fixture 声明', FIXTURE.includes('A-034'));
check('G7b A-034 在密封 spec 声明', SPEC.includes('A-034'));
check('G7c A-034 在探针脚本声明', PROBE.includes('A-034'));
check('G7d A-034 在本门与 issue 声明', (T10.covers || []).includes('A-034') && ISSUE.includes('A-034'));
const scratchRefs = scan(V10, (l) => l.includes('.scratch/'));
check('G7e workflow 零 .scratch/ 路径引用（ADR-0006 决策 1）', scratchRefs.length === 0, scratchRefs.join(' | '));

console.log(NL + 'verify-ticket-10: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); for (const f of failures) console.log('  - ' + f); process.exit(1); }
