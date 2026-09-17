#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-12.mjs — Cycle-6 票 12「规则上限强制点裁定 + BC 替身克隆保真度修复」门（A-036）
// 方法：读文本做结构断言（裁定落地 / 断言未放宽 / 替身保真度 / origin 同源），
//   外加一次行为锁（实跑票 05 单元门）；无浏览器、无 npm 依赖、零外网，node 直跑。
//
// 断言面：
//   S0 自证：全部工件存在且可读非空（WORKFLOW §5 教训：验收工具也要先自证）
//   G1 裁定落地：上限强制点在**写路径**（upsertOverride 新增前 fail-closed 拒绝）
//   G2 摄取修复保留：_normRulesDoc 的截断仍在（不得以删除摄取修复替代强制）
//   G3 断言面零改动：S4 上限断言行 / 505 压测循环逐字在位；断言调用点数不得低于基线 100
//   G4 替身保真度：BC 替身按结构化克隆投递；按引用投递形态零残留
//   G5 origin 同源：门内不另立第二套 origin 取值；DOC_ORIGIN 取自 bundle 的 SELF_ORIGIN
//   G6 行为锁：实跑 verify-ticket-05.mjs ⇒ 100/100 ALL GREEN（保真度修正后 S4 的绿 = 真实保证）
//   G7 覆盖声明与 workflow 卫生：A-036 四处声明；workflow 零 .scratch/ 路径引用（ADR-0006 决策 1）
// 用法：node tests/scripts/verify-ticket-12.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
const countIn = (src, needle) => src.split(needle).length - 1;
/** 取 YAML 顶层 on: 触发块（自 on: 行至下一个非缩进顶层键止）。 */
function onBlock(yaml) {
  const ls = yaml.split(NL);
  const start = ls.indexOf('on:');
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < ls.length; i++) {
    const l = ls[i];
    if (l.length > 0 && !l.startsWith(' ')) break;
    out.push(l);
  }
  return out.join(NL);
}

// ── S0 自证：工件存在且可读非空 ──
const ARTIFACTS = [
  'src/config.ts',
  'src/store/index.ts',
  'src/rules/index.ts',
  'tests/scripts/verify-ticket-05.mjs',
  'tests/scripts/verify-ticket-12.mjs',
  '.github/workflows/verify-12.yml',
  'docs/adr/0011-rule-override-cap-enforcement-point.md',
  '.scratch/architecture-recovery/issues/12-rules-limit-fidelity.md',
  '.scratch/architecture-recovery/research/scripts/12-ab-cap-fidelity.mjs',
];
{
  const missing = ARTIFACTS.filter((f) => !has(f));
  check('S0 全部工件存在', missing.length === 0, missing.join(','));
  const empty = ARTIFACTS.filter((f) => has(f) && read(f).length === 0);
  check('S0 全部工件可读非空', empty.length === 0, empty.join(','));
  if (missing.length) { console.log(NL + pass + ' PASS, ' + failures.length + ' FAIL'); process.exit(1); }
}

const STORE = read('src/store/index.ts');
const CFG = read('src/config.ts');
const GATE = read('tests/scripts/verify-ticket-05.mjs');
const SELF = read('tests/scripts/verify-ticket-12.mjs');
const ADR = read('docs/adr/0011-rule-override-cap-enforcement-point.md');
const ISSUE = read('.scratch/architecture-recovery/issues/12-rules-limit-fidelity.md');
const REPORT = read('.scratch/architecture-recovery/research/window-reports/12-rules-limit-fidelity-report.md');
const V12 = read('.github/workflows/verify-12.yml');

// ══ G1 裁定落地：上限强制点在写路径 ══
const CAP = '    if (r.overrides.length >= RULES_MAX_OVERRIDES) return null;';
check('G1a 写路径强制点存在（新增前 fail-closed 拒绝）', countIn(STORE, CAP) === 1, 'count=' + countIn(STORE, CAP));
{
  const iCap = STORE.indexOf(CAP);
  const iUpdate = STORE.indexOf('        return o.id;');
  const iPush = STORE.indexOf('    r.overrides.push(o);');
  check('G1b 强制点位于「更新既有规则」之后、「新增入队」之前', iUpdate > 0 && iCap > iUpdate && iPush > iCap,
    'update=' + iUpdate + ' cap=' + iCap + ' push=' + iPush);
}
check('G1c 上限常量单一定义源（config.ts）', CFG.includes('export const RULES_MAX_OVERRIDES'));
check('G1d 文件头契约声明强制点在写路径', STORE.includes('上限强制点') && STORE.includes('强制点在写路径'));
check('G1e 实现声明裁定依据（ADR-0011）', STORE.includes('ADR-0011'));
check('G1f ADR 记录被否决路线与反证条件', ADR.includes('读路径') && ADR.includes('反证条件'));

// ══ G2 摄取修复保留（第二层，非强制点）══
check('G2a _normRulesDoc 摄取截断仍在（不得以删除摄取修复替代）',
  countIn(STORE, 'd.overrides = d.overrides.filter(isOverrideRule).slice(0, RULES_MAX_OVERRIDES);') === 1);
check('G2b 摄取修复定位为外来输入（不承担上限保证）',
  STORE.includes('摄取修复') && STORE.includes('不承担本上限的保证'));

// ══ G3 断言面零改动 ══
const S4CAP = "  ok(Store.getSiteRules().overrides.length <= 500, 'S4 RULES_MAX_OVERRIDES 上限生效（got=' + Store.getSiteRules().overrides.length + '）');";
check('G3a S4 上限断言行逐字在位（未放宽、未删除）', countIn(GATE, S4CAP) === 1, 'count=' + countIn(GATE, S4CAP));
check('G3b S4 505 条压测循环逐字在位', countIn(GATE, 'for (let i = 0; i < 505; i++) {') === 1);
check('G3c S4 非法输入不落盘断言在位', countIn(GATE, "eq(Store.getSiteRules().overrides.length, n0, 'S4 非法输入不落盘');") === 1);
check('G3d S4 副本隔离断言在位', countIn(GATE, 'S4 getSiteRules 返回副本') === 1);
{
  const okN = countIn(GATE, NL + '  ok(');
  const eqN = countIn(GATE, NL + '  eq(');
  check('G3e 断言调用点数不低于基线 100（零删除）', okN + eqN >= 100, 'ok=' + okN + ' eq=' + eqN + ' total=' + (okN + eqN));
}

// ══ G4 替身保真度：结构化克隆 ══
check('G4a 替身按结构化克隆投递（真实 BC 语义）', countIn(GATE, 'const data = structuredClone(msg);') === 1);
check('G4b 按引用投递形态零残留', countIn(GATE, 'fn({ data: msg, origin: DOC_ORIGIN })') === 0);
check('G4c 替身保真度有注释留痕', GATE.includes('结构化克隆'));

// ══ G5 origin 同源（不得出现第二套取值）══
check('G5a DOC_ORIGIN 直接消费 bundle 的 SELF_ORIGIN', countIn(GATE, 'const DOC_ORIGIN = SELF_ORIGIN;') === 1);
check('G5b SELF_ORIGIN 由 bundle 导出（唯一来源）', GATE.includes('createDetect, SELF_ORIGIN } = new Function('));
check('G5c 门内零自建 origin 取值（window.origin / location.origin 均不出现）',
  countIn(GATE, 'window.origin') === 0 && countIn(GATE, 'location.origin') === 0,
  'window=' + countIn(GATE, 'window.origin') + ' location=' + countIn(GATE, 'location.origin'));
check('G5d SELF_ORIGIN 唯一定义仍在 config.ts（票 10 面不回归）', countIn(CFG, 'export const SELF_ORIGIN =') === 1);

// ══ G6 行为锁：实跑票 05 单元门 ══
let gateOut = '', gateCode = 0;
try {
  gateOut = execFileSync(process.execPath, [abs('tests/scripts/verify-ticket-05.mjs')], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT,
  });
} catch (e) {
  gateOut = String(e.stdout || '');
  gateCode = e.status == null ? -1 : e.status;
}
check('G6a 票 05 单元门实跑退出码 0', gateCode === 0, 'exit=' + gateCode);
check('G6b 票 05 单元门 100/100 ALL GREEN（保真度修正后 S4 仍绿 = 真实保证）',
  gateOut.includes('100/100 pass') && gateOut.includes('ALL GREEN'));
check('G6c S4 无失败行输出（替身保真度修正后不得复红）', !gateOut.includes('FAIL S4 RULES_MAX_OVERRIDES'));

// ══ G7 覆盖声明与 workflow 卫生 ══
check('G7a A-036 在本门声明', SELF.includes('A-036'));
check('G7b A-036 在 workflow 声明', V12.includes('A-036'));
check('G7c A-036 在 issue 声明', ISSUE.includes('A-036'));
check('G7d A-036 在 ADR 声明', ADR.includes('A-036'));
check('G7e workflow 零 .scratch/ 路径引用（ADR-0006 决策 1）', countIn(V12, '.scratch/') === 0);
{
  const on = onBlock(V12);
  check('G7f workflow 触发面 = pull_request + workflow_dispatch + 本票分支 push',
    on.includes('pull_request:') && on.includes('workflow_dispatch:') && on.includes('cch/12-rules-limit-fidelity'),
    on.split(NL).filter((l) => l.trim()).join(' / '));
}

console.log('-----------------------------');
console.log('verify-ticket-12: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
