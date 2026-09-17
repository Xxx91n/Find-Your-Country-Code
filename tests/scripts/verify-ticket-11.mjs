#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-11.mjs — Cycle-6 票 11「ITI 形态下 L3 的正确可观测判据」结构门（A-035）
// 方法：读文本做结构断言（无浏览器、无 npm 依赖、零外网，node 直跑）。
//
// 断言面：
//   G1 共享原语层只增不改（既有导出保留 + 新增 ITI 可观测面原语 + 零断言库纪律保持）
//   G2 live 层 L3 按写入口形态分派（形态判定 + ITI 三判据 + 官方事件）
//   G3 只升不降（票 07 原判据逐字保留；阶梯仍为 L0–L4 五级；observe/跳过路径保留）
//   G4 判定次序（形态判定与事件面挂载必须早于写入动作）
//   G5 manifest 成文契约（writeSurfaceRule + ticketCoverage；coveredA/ladderRule 不得被改写）
//   G6 密封层覆盖（§4.5 升塔纪律：真实形态已沉淀为 fixture + spec，含普通字段对照组）
//   G7 覆盖声明 A-035（共享层 / live 层 / manifest / spec / 本门 / workflow）
// 用法：node tests/scripts/verify-ticket-11.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

let pass = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name + (detail ? ' — ' + detail : '')); }
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
/** 子串计数（不用正则，避免转义层漂移）。 */
const n = (src, sub) => src.split(sub).length - 1;
/** 去注释（行注释 + 块注释，无正则状态机）：头注会合法地提及 expect / playwright。 */
function stripComments(src) {
  const out = [];
  let inBlock = false;
  for (const line of src.split('\n')) {
    let l = line;
    if (inBlock) {
      const e = l.indexOf('*/');
      if (e < 0) continue;
      l = l.slice(e + 2);
      inBlock = false;
    }
    const b = l.indexOf('/*');
    if (b >= 0 && l.indexOf('*/', b) < 0) { l = l.slice(0, b); inBlock = true; }
    if (l.trim().startsWith('//')) continue;
    out.push(l);
  }
  return out.join('\n');
}
const exportedCount = (src) => src.split('\n').filter((l) => l.startsWith('export ')).length;

const FILES = {
  prim: 'tests/helpers/primitives.mjs',
  live: 'tests/live/live-smoke.mjs',
  manifest: 'tests/live/site-manifest.json',
  fixture: 'tests/fixtures/iti-l3-write-surface.html',
  spec: 'tests/iti-l3-criterion.spec.ts',
  workflow: '.github/workflows/verify-tickets.yml',
};

// ══ S0 自证（已知好样本干跑 [WORKFLOW §5 教训]）══
{
  const missing = Object.entries(FILES).filter(([, p]) => !has(p)).map(([k]) => k);
  check('S0 全部工件存在', missing.length === 0, 'missing=' + (missing.join(',') || 'none'));
  if (missing.length) { console.log(''); console.log(pass + ' PASS, ' + failures.length + ' FAIL'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
  check('S0 全部工件可读非空', Object.values(FILES).every((p) => read(p).length > 0));
  check('S0 已知好样本命中 primitives ITI 常量', read(FILES.prim).includes("export const ITI_COUNTRY_EVENT = 'countrychange';"));
  check('S0 已知好样本命中 live 层形态分派', read(FILES.live).includes("if (surface === 'iti')"));
}

const PRIM = read(FILES.prim);
const PRIM_CODE = stripComments(PRIM);
const LIVE = read(FILES.live);
const MANIFEST_SRC = read(FILES.manifest);
const FIXTURE = read(FILES.fixture);
const SPEC = read(FILES.spec);
// Cycle-7 D-004：票级 workflow 合并 —— verify-11.yml 删除，CI 挂接点 = 调用方 + plan 的 '11' 条目
const WF = read(FILES.workflow);
const T11 = (JSON.parse(read('tests/scripts/verify-ticket-plan.json')).tickets || {})['11'] || {};

// ══ G1 共享原语层只增不改 ══
{
  for (const fn of ['userscriptCode', 'installUserscript', 'wrapperFor', 'openPanel']) {
    check('G1 既有导出保留 ' + fn, PRIM.includes(' ' + fn + '(') || PRIM.includes('function ' + fn));
  }
  for (const fn of ['readWriteSurface', 'readItiSelectedCountry', 'recordItiCountryEvents', 'readItiCountryEvents']) {
    check('G1 新增 ITI 原语导出 ' + fn, PRIM.includes('export async function ' + fn + '('));
  }
  for (const c of ['ITI_CONTAINER_SELECTOR', 'ITI_SELECTED_SELECTOR', 'ITI_EVENTS_KEY', 'ITI_COUNTRY_EVENT']) {
    check('G1 新增 ITI 常量导出 ' + c, PRIM.includes('export const ' + c + ' ='));
  }
  const exported = exportedCount(PRIM);
  check('G1 导出面只增不减（实测 ' + exported + ' ≥ 48，票 07 基线）', exported >= 48);
  check('G1 双代容器与选中态选择器成文', PRIM.includes('.iti, .intl-tel-input') && PRIM.includes('iti__selected-country') && PRIM.includes('iti__selected-flag'));
  check('G1 官方读 API 双名探测', PRIM.includes('getSelectedCountryData') && PRIM.includes('getSelectedCountry'));
  check('G1 分离区号元素读取路径成文（separateDialCode）', PRIM.includes('iti__selected-dial-code'));
}

// ══ G2 live 层 L3 按写入口形态分派 ══
{
  check('G2 写入口形态判定（宿主侧自动判定，不靠 manifest 声明）', LIVE.includes('readWriteSurface(probeFrame, t.selector || null)'));
  check("G2 ITI 分支存在", LIVE.includes("if (surface === 'iti')"));
  check('G2 ITI 判据一：选中国家状态', LIVE.includes("mark('L3', 'iti-selected-country'"));
  check('G2 ITI 判据二：DOM 选中态独立路径交叉核验', LIVE.includes("mark('L3', 'iti-dom-marker'") && LIVE.includes('domOnly: true'));
  check('G2 ITI 判据三：ITI 官方 countrychange 事件', LIVE.includes("mark('L3', 'iti-country-event'") && LIVE.includes('ITI_COUNTRY_EVENT'));
  check('G2 ITI 事件面挂载与读回', LIVE.includes('recordItiCountryEvents(probeFrame') && LIVE.includes('readItiCountryEvents(probeFrame'));
  check('G2 国家身份优先比对（iso2）', LIVE.includes('function itiMatch(state, iso, expected)') && LIVE.includes('if (state.iso2) return'));
  check('G2 汇总暴露形态分派契约', LIVE.includes('writeSurfaceRule:'));
}

// ══ G3 只升不降（票 07 原判据逐字保留）══
{
  check('G3 普通字段 value 判据逐字保留', LIVE.includes("mark('L3', 'host-value', valueMatches(actual, expected, !!t.deep)"));
  check('G3 普通字段 input/change 判据逐字保留', LIVE.includes("mark('L3', 'field-events', events.includes('input') && events.includes('change')"));
  check('G3 两路读取面（校准 / 未校准）均保留', LIVE.includes('readHostValue(probeFrame') && LIVE.includes('readWrappedHostField(probeFrame'));
  check('G3 原生事件记录面均保留', LIVE.includes('recordFieldEvents(probeFrame') && LIVE.includes('recordWrappedFieldEvents(probeFrame'));
  check('G3 阶梯仍为 L0–L4 五级全集', LIVE.includes("const LADDER_ALL = ['L0', 'L1', 'L2', 'L3', 'L4']"));
  check('G3 既有 observe 路径与跳过白名单输出保留', LIVE.includes("expect === 'observe'") && LIVE.includes('[SKIPPED ]'));
  check('G3 L1 未成立时阶梯如实中断登记', LIVE.includes('L1 未成立，阶梯中断'));
  check('G3 原生事件读数仍入 ITI 明细（信息不丢失）', LIVE.includes('原生事件序列 ['));
  check('G3 live 层无第二套 GM 替身 / 探针 / 注入装配', n(LIVE, 'const GM_STUB') === 0 && n(LIVE, 'const PROBE') === 0 && n(LIVE, 'addInitScript(') === 0);
  check('G3 共享层零断言库纪律保持', n(PRIM_CODE, 'expect(') === 0 && n(PRIM_CODE, 'playwright/test') === 0 && n(PRIM_CODE, 'waitForTimeout(') === 0);
}

// ══ G4 判定次序 ══
{
  const iSurface = LIVE.indexOf('readWriteSurface(probeFrame');
  const iRecord = LIVE.indexOf('recordItiCountryEvents(probeFrame');
  const iWrite = LIVE.indexOf('await selectCountry(page, plan.iso');
  check('G4 形态判定早于写入动作', iSurface >= 0 && iWrite >= 0 && iSurface < iWrite, 'surface@' + iSurface + ' write@' + iWrite);
  check('G4 ITI 事件面挂载早于写入动作', iRecord >= 0 && iWrite >= 0 && iRecord < iWrite, 'record@' + iRecord + ' write@' + iWrite);
}

// ══ G5 manifest 成文契约 ══
{
  let m = null; let err = null;
  try { m = JSON.parse(MANIFEST_SRC); } catch (e) { err = String(e.message); }
  check('G5 site-manifest.json 可解析', !!m && !err, err || '');
  if (m) {
    check('G5 _meta.writeSurfaceRule 成文（≥100 字）', typeof m._meta.writeSurfaceRule === 'string' && m._meta.writeSurfaceRule.length >= 100, 'len=' + String(m._meta.writeSurfaceRule || '').length);
    check('G5 _meta.ticketCoverage 声明 A-035', !!m._meta.ticketCoverage && !!String(m._meta.ticketCoverage['A-035'] || '').trim());
    check('G5 票 07 契约未被改写（coveredA 仍为 A-029）', m._meta.coveredA === 'A-029');
    check('G5 票 07 阶梯契约未被改写（ladderRule 仍成文）', typeof m._meta.ladderRule === 'string' && m._meta.ladderRule.length > 50);
    check('G5 目标清单未被删减（≥8 个）', Array.isArray(m.targets) && m.targets.length >= 8, 'targets=' + (m.targets || []).length);
  }
}

// ══ G6 密封层覆盖（§4.5 升塔纪律）══
{
  check('G6 fixture 含普通字段对照组', FIXTURE.includes('id="ctl-select"'));
  check('G6 fixture 含 ITI 默认模式字段', FIXTURE.includes('id="iti-plain"'));
  check('G6 fixture 含 ITI separateDialCode 字段', FIXTURE.includes('id="iti-sep"') && FIXTURE.includes('separateDialCode: true'));
  check('G6 fixture 经 /vendor/ 本地供给真实库（零外网）', FIXTURE.includes('/vendor/intl-tel-input/build/js/intlTelInputWithUtils.js'));
  check('G6 spec 消费共享原语', SPEC.includes('readWriteSurface') && SPEC.includes('readItiSelectedCountry') && SPEC.includes('readItiCountryEvents'));
  check('G6 spec 断言对照组仍按原判据', SPEC.includes('宿主 select 的 value 应为 +86'));
  check('G6 spec 断言 ITI 官方事件', SPEC.includes('toContain(ITI_COUNTRY_EVENT)'));
  check('G6 spec 钉住旧判据不可满足的事实', SPEC.includes('ITI 从不派发原生 change') && SPEC.includes('separateDialCode：input.value 只承载国家号码'));
  check('G6 spec 全用 expect.soft（一次收全量）', n(SPEC, 'expect.soft(') >= 8 && n(SPEC, 'expect(') === 0);
}

// ══ G7 覆盖声明 A-035 ══
{
  check('G7 共享层声明 A-035', PRIM.includes('A-035'));
  check('G7 live 层声明 A-035', LIVE.includes('A-035'));
  check('G7 manifest 声明 A-035', MANIFEST_SRC.includes('A-035'));
  check('G7 spec 声明 A-035', SPEC.includes('A-035'));
  check('G7 本门与 workflow 声明 A-035', read('tests/scripts/verify-ticket-11.mjs').includes('A-035') && (T11.covers || []).includes('A-035'));
  check('G7 workflow 触发面合规（ADR-0006 决策 2；D-004 合并后 = PR + push(main, cch/**)）', WF.includes('pull_request:') && WF.includes("'cch/**'"));
  check('G7 workflow 零 .scratch/ 路径引用（ADR-0006 决策 1）', !WF.includes('.scratch/'));
}

console.log('');
console.log(pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); for (const f of failures) console.log('  - ' + f); process.exit(1); }
