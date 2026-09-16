// ══════════════════════════════════════════════════════════════════
// verify-ticket-05-harness.mjs — Cycle-6 票 05「harness 交互原语」结构门（A-029）
// 方法：直接读文本做结构断言（无浏览器、无 npm 依赖、node 直跑）。
// 命名：Cycle-5 已有 tests/scripts/verify-ticket-05.mjs（站点规则引擎单元门，非本票）；
//   本票为 Cycle-6 新票，按 verify-ticket-02-settings.mjs 的既有后缀模式另起名。
// 覆盖：S0 自证 / S1 共享原语层为唯一来源 / S2 共享层零断言·零运行器依赖 /
//   S3 无第二套 GM 替身与探针 / S4 GM 替身记录 {title, fn} 且可调用 /
//   S5 断言 web-first + expect.soft 一次收全量 / S6 覆盖声明与 fixture 契约 /
//   S7 live 层真实消费共享原语（非仅 import 摆设）。
// 用法：node tests/scripts/verify-ticket-05-harness.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');

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

// 去注释后再做「代码面」断言：头注会合法地提及 expect() / playwright/test 等词。
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

const FILES = {
  prim: 'tests/helpers/primitives.mjs',
  facade: 'tests/helpers/userscript.ts',
  live: 'tests/live/live-smoke.mjs',
  manifest: 'tests/live/site-manifest.json',
  spec: 'tests/harness-primitives.spec.ts',
  fixture: 'tests/fixtures/harness-primitives.html',
  pwconfig: 'playwright.config.ts',
};

// == S0 自证（已知好样本干跑 [WORKFLOW §5 教训]）==
{
  const missing = Object.entries(FILES).filter(([, p]) => !existsSync(abs(p))).map(([k]) => k);
  check(missing.length === 0, 'S0 全部工件存在', 'missing=' + (missing.join(',') || 'none'));
  if (missing.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
  const sizes = Object.entries(FILES).map(([k, p]) => k + '=' + read(p).length).join(' ');
  check(Object.values(FILES).every((p) => read(p).length > 0), 'S0 全部工件可读非空', sizes);
  check(/export const GM_STUB = \[/.test(read(FILES.prim)), 'S0 已知好样本命中 primitives GM_STUB');
  check(/__cchMenu/.test(read(FILES.prim)), 'S0 已知好样本命中 __cchMenu 记录面');
}

const PRIM = read(FILES.prim);
const FACADE = read(FILES.facade);
const LIVE = read(FILES.live);
const SPEC = read(FILES.spec);
const FIXTURE = read(FILES.fixture);
const PRIM_CODE = stripComments(PRIM);
const FACADE_CODE = stripComments(FACADE);

// == S1 共享原语层是唯一来源，两 harness 均收敛到它 ==
{
  check(/export function wrapperFor\s*\(scope, target\)/.test(PRIM), 'S1 primitives 导出定位器原语 wrapperFor');
  check(/export async function installUserscript\(page\)/.test(PRIM), 'S1 primitives 导出 inject 原语 installUserscript');
  for (const fn of ['openPanel', 'searchType', 'selectCountry', 'fillField', 'readHostValue']) {
    check(new RegExp('export async function ' + fn + '\\s*\\(').test(PRIM), 'S1 primitives 导出原语 ' + fn);
  }
  check(/export \* from '\.\/primitives\.mjs'/.test(FACADE), 'S1 密封层门面再导出共享原语（导入面不变）');
  check(/locator\(BUTTON_SELECTOR\)/.test(FACADE_CODE) && !/locator\(['"]\.cch-btn/.test(FACADE_CODE),
    'S1 门面消费 BUTTON_SELECTOR 常量（选择器不硬编码）');
  check(/from '\.\.\/helpers\/primitives\.mjs'/.test(LIVE), 'S1 live 层直接 import 共享原语（零转换同一份）');
  const exported = count(PRIM, /^export /gm);
  check(exported >= 30, 'S1 共享层导出面足够宽（实测 ' + exported + ' 个）');
}

// == S2 共享层零断言、零运行器依赖、零固定 sleep ==
{
  eq(count(PRIM_CODE, /\bexpect\s*\(/g), 0, 'S2 共享层无 expect() 调用（断言不进共享层）');
  eq(count(PRIM_CODE, /expect\.soft\s*\(/g), 0, 'S2 共享层无 expect.soft（软断言不进共享层）');
  eq(count(PRIM_CODE, /playwright\/test/g), 0, 'S2 共享层不依赖 playwright/test（两 runtime 可加载）');
  eq(count(PRIM_CODE, /waitForTimeout\s*\(/g), 0, 'S2 共享层无固定 sleep 充当等待');
  check(/waitFor\(\{ state:/.test(PRIM_CODE) && /waitForFunction\(/.test(PRIM_CODE),
    'S2 等待一律用 locator.waitFor() / waitForFunction()');
}

// == S3 无第二套 GM 替身与探针（收敛的核心证据）==
{
  eq(count(LIVE, /const GM_STUB/g), 0, 'S3 live 层无内联第二套 GM_STUB');
  eq(count(LIVE, /GM_registerMenuCommand/g), 0, 'S3 live 层无内联 GM_registerMenuCommand 定义');
  eq(count(LIVE, /const PROBE/g), 0, 'S3 live 层无内联第二套 PROBE 探针');
  eq(count(LIVE, /addInitScript\(/g), 0, 'S3 live 层不再自行 addInitScript（改由 installUserscript）');
  check(/installUserscript\(page\)/.test(LIVE), 'S3 live 层经 installUserscript 注入');
  eq(count(FACADE_CODE, /addInitScript\(/g), 0, 'S3 门面不再内联 GM 替身装配');
  eq(count(FACADE_CODE, /GM_registerMenuCommand/g), 0, 'S3 门面不重实现 GM 替身');
  eq(count(PRIM, /window\.GM_registerMenuCommand = /g), 1, 'S3 全仓仅一处 GM_registerMenuCommand 定义');
}

// == S4 GM 替身记录 {title, fn} 且可调用 ==
{
  check(/window\.__cchMenu\.push\(\{ id: id, title: title, fn: fn \}\)/.test(PRIM),
    'S4 无 id 分支记录 {id, title, fn}');
  check(/hit\.title = title; hit\.fn = fn;/.test(PRIM), 'S4 同 id 分支原地更新 title/fn（Tampermonkey >=5.0 语义）');
  check(/if \(hit\) \{ hit\.title = title; hit\.fn = fn; return 0; \}/.test(PRIM),
    'S4 同 id 命中分支原地更新后提前返回（不 push、不递增计数）');
  check(/callable: typeof c\.fn === 'function'/.test(PRIM), 'S4 读取面给出 callable（fn 可调用的可观测面）');
  check(/cmd\.fn\(\);/.test(PRIM), 'S4 invokeMenuCommand 真实调用 fn（非仅记录）');
  check(/reason: 'no-match'/.test(PRIM) && /reason: 'fn-not-callable'/.test(PRIM),
    'S4 未命中/不可调用均有可观测拒因（不静默）');
  check(/export async function invokeMenuCommand\(scope, matcher\)/.test(PRIM), 'S4 导出菜单命令调用原语');
}

// == S5 断言 web-first + expect.soft 一次收全量 ==
{
  const softFacade = count(FACADE_CODE, /expect\.soft\s*\(/g);
  check(softFacade >= 6, 'S5 门面断言 adapter 全部用 expect.soft（实测 ' + softFacade + ' 处）');
  eq(count(FACADE_CODE, /[^.]\bexpect\s*\(/g), 0, 'S5 门面无裸 expect() 断言（一律 soft，一次收全量）');
  const softSpec = count(SPEC, /expect\.soft\s*\(/g);
  check(softSpec >= 10, 'S5 密封层 spec 使用 expect.soft（实测 ' + softSpec + ' 处）');
  eq(count(SPEC, /waitForTimeout\s*\(/g), 0, 'S5 spec 无固定 sleep');
  eq(count(SPEC, /page\.locator\([^)]*\)\.fill\(/g), 0, 'S5 spec 不直写页面选择器（一律经原语）');
  check(/from '\.\/helpers\/userscript'/.test(SPEC), 'S5 spec 仅经门面导入原语');
}

// == S6 覆盖声明与 fixture 契约 ==
{
  check(/A-029/.test(SPEC), 'S6 spec 声明本票覆盖的 A-029');
  check(/A-029/.test(PRIM), 'S6 共享层声明本票覆盖的 A-029');
  check(/id="hp-select"/.test(FIXTURE) && /id="hp-input"/.test(FIXTURE), 'S6 fixture 含两个宿主字段');
  check(/<label for="hp-select">Country code<\/label>/.test(FIXTURE), 'S6 fixture 形态与 live 已知好对照组同形（label + 区号选项）');
  check(/testMatch:/.test(read(FILES.pwconfig)) || /\.spec\.ts/.test(read(FILES.pwconfig)),
    'S6 spec 位于 playwright testMatch 内（tests/*.spec.ts）');
}

// == S7 live 层真实消费共享原语（非仅 import 摆设）==
{
  const imported = (LIVE.match(/from '\.\.\/helpers\/primitives\.mjs'/g) || []).length;
  eq(imported, 1, 'S7 live 层仅一处共享原语 import 面');
  for (const fn of ['openPanel', 'searchType', 'selectCountry', 'readHostValue', 'readInjection', 'readVisibleRows', 'recordFieldEvents']) {
    check(new RegExp('\\b' + fn + '\\b').test(LIVE), 'S7 live 层实际调用原语 ' + fn);
  }
  check(/async function runDeepChecks\(/.test(LIVE), 'S7 live 层存在共享原语驱动链 runDeepChecks');
  check(/deepChecks/.test(LIVE), 'S7 live 层汇总暴露 deepChecks（驱动结果进报告）');
  let manifest = null;
  try { manifest = JSON.parse(read(FILES.manifest)); } catch { /* 下方断言会报出 */ }
  check(!!manifest, 'S7 site-manifest.json 可解析');
  const mirror = manifest && (manifest.targets || []).find((t) => t.id === 'mirror-control');
  check(!!(mirror && mirror.deep), 'S7 mirror-control 声明 deep 驱动链');
  check(!!(mirror && mirror.deep && mirror.deep.iso && mirror.deep.query && mirror.deep.expectValue),
    'S7 deep 契约含 iso/query/expectValue 三字段', mirror && mirror.deep ? JSON.stringify(mirror.deep) : 'none');
}

console.log('-----------------------------');
console.log('verify-ticket-05-harness: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
