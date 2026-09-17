#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-03.mjs — 票 03（诊断面，覆盖 A-028）验收门
// 断言面（node 直跑，无浏览器、无 npm 依赖）：
//   G0 自证：装载器先对已知好样本干跑（WORKFLOW §5 教训：先区分工具误报与真实缺陷）
//   G1 单一事实来源：两个 serializer（snapshot/text）与 records() 同源逐条一致
//   G2 四层判定：每条 reason 都能归层（无静默默认）；四层齐备
//   G3 分级门控：error/warn/计数器恒开；info/trace 门控
//   G4 惰性构造：门控关时 detail thunk 永不求值
//   G5 环形缓冲：容量上限 + 溢出计数 + 截断标记 + 最旧被驱逐
//   G6 已验证因果：闭集外 reason 降级为 unknown-open-debug 且 verified=false
//   G7 自保：detail thunk 抛错不得拖垮主流程，记录仍写入
//   G8 热路径：counter 单次调用开销 O(1)（10 万次 < 100ms）
//   G9 接线静态断言：单一 GM 诊断入口 / 面板与机器面同源 / 四层判定接入点齐备
//   G10 判定面零改动：评分阈值与分档链逐字保留
// 装载：与 verify-ticket-42 同心智——module.stripTypeScriptTypes（Node>=22.13）。
// 用法：node tests/scripts/verify-ticket-03.mjs
// ══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
if (typeof stripTypeScriptTypes !== 'function') {
  console.error('verify-ticket-03 需要 Node >= 22.13（module.stripTypeScriptTypes）');
  process.exit(2);
}

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

function toModuleBody(file) {
  return readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

const cfgSrc = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const diagSrc = readFileSync(join(ROOT, 'src', 'diag', 'index.ts'), 'utf8');
const typesSrc = readFileSync(join(ROOT, 'src', 'types.ts'), 'utf8');
const uiSrc = readFileSync(join(ROOT, 'src', 'ui', 'index.ts'), 'utf8');
const detSrc = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
const fillSrc = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
const mainSrc = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf8');
const i18nSrc = readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8');

// 诊断面模块束（config 为常量层，diag 为采集/存储层；无 DOM 依赖）
const BUNDLE = [toModuleBody(join(ROOT, 'src', 'config.ts')), toModuleBody(join(ROOT, 'src', 'diag', 'index.ts'))].join('\n');
function load() {
  return new Function(stripTypeScriptTypes(BUNDLE, { mode: 'strip' })
    + '\n;return { createDiag, DIAG_REASON, DIAG_CAPACITY, DIAG_LAYERS, DIAG_VERSION };')();
}

// ── G0 自证：装载器对已知好样本干跑 ──
let M = null;
try { M = load(); } catch (e) { /* 下方断言会报具体原因 */ }
check('G0a 诊断面模块束可装载（config + diag 剥类型后可执行）', !!M && typeof M.createDiag === 'function', M ? '' : 'load failed');
check('G0b DIAG_REASON 闭集非空且均为字符串', !!M && Object.keys(M.DIAG_REASON).length >= 20 && Object.keys(M.DIAG_REASON).every(k => typeof M.DIAG_REASON[k] === 'string'), M ? 'n=' + Object.keys(M.DIAG_REASON).length : '');
check('G0c 环形缓冲默认容量 = DIAG_CAPACITY(200)', !!M && M.DIAG_CAPACITY === 200 && M.createDiag().snapshot().capacity === 200, M ? 'cap=' + M.DIAG_CAPACITY : '');

if (M) {
  const R = M.DIAG_REASON;

  // ── G1 单一事实来源 ──
  {
    const D = M.createDiag({ trace: true });
    D.warn("gate:input-type:email", R.TOOL_GATE_INPUT_TYPE, { t: "email" });
    D.trace("scan:1", R.TOOL_RECOGNIZED, () => ({ score: 100 }));
    D.trace("inject:attach", R.INJECT_ATTACHED, () => ({ kind: "select" }));
    D.trace("logic:fill", R.LOGIC_RESOLVED, () => ({ iso: "CN" }));
    D.trace("write:post-assert", R.WRITE_ASSERTED, () => ({ pre: "", post: "+86" }));
    const recs = D.records();
    const snap = D.snapshot();
    check("G1a snapshot.records 与 records() 同源同长", snap.records.length === recs.length, snap.records.length + " vs " + recs.length);
    check("G1b snapshot.records 逐条同 point/reason", snap.records.every((r, i) => r.point === recs[i].point && r.reason === recs[i].reason), "");
    const lines = D.text().split("\n");
    const recLines = lines.filter(l => /^\d+ \S+ (tool|inject|logic|write) /.test(l));
    check("G1c text() 记录行数与 records() 一致（两 serializer 同源）", recLines.length === recs.length, recLines.length + " vs " + recs.length);
    check("G1d text() 每行含对应 point+reason", recs.every(r => lines.some(l => l.indexOf(r.point) >= 0 && l.indexOf(r.reason) >= 0)), "");
  }

  // ── G2 四层判定：reason 全可归层（无静默默认）──
  {
    const known = new Set(M.DIAG_LAYERS);
    const bad = [];
    for (const k of Object.keys(R)) {
      const D = M.createDiag();
      D.warn("probe", R[k], null);
      const rec = D.records()[0];
      if (!rec || !known.has(rec.layer) || rec.reason !== R[k] || !rec.verified) bad.push(k + "=" + (rec && rec.layer) + "/" + (rec && rec.reason));
    }
    check("G2a 每条 reason 都归入四层之一且未被降级", bad.length === 0, bad.join(","));
    const D = M.createDiag({ trace: true });
    D.trace("scan:1", R.TOOL_RECOGNIZED, null);
    D.trace("inject:a", R.INJECT_ATTACHED, null);
    D.trace("logic:f", R.LOGIC_RESOLVED, null);
    D.trace("write:a", R.WRITE_ASSERTED, null);
    const snap = D.snapshot();
    check("G2b 四层齐备（tool/inject/logic/write 均有 pass 记录）", M.DIAG_LAYERS.every(l => snap.layers[l].verdict === "pass"), JSON.stringify(snap.layers));
    check("G2c 四层齐备时 health=pass", snap.health === "pass", snap.health);
    check("G2d checks 检查矩阵四条（id 与层一一对应）", snap.checks.length === 4 && snap.checks.every((c, i) => c.id === "layer:" + M.DIAG_LAYERS[i]), JSON.stringify(snap.checks.map(c => c.id)));
  }

  // ── G3 分级门控 ──
  {
    const D = M.createDiag(); // trace 默认关
    let thunk = 0;
    D.counter("scans"); D.counter("candidates", 5);
    D.warn("gate:x", R.TOOL_GATE_INPUT_TYPE, { a: 1 });
    D.error("err:x", R.UNKNOWN, { b: 2 });
    D.info("info:x", R.UNKNOWN, () => { thunk++; return { c: 3 }; });
    D.trace("trace:x", R.TOOL_RECOGNIZED, () => { thunk++; return { d: 4 }; });
    const s = D.snapshot();
    check("G3a 门控关：error/warn 恒开（各 1 条）", s.counters.errors === 1 && s.counters.warns === 1, JSON.stringify(s.counters));
    check("G3b 门控关：计数器恒开", s.counters.scans === 1 && s.counters.candidates === 5, JSON.stringify(s.counters));
    check("G3c 门控关：info/trace 不记录", s.counters.traces === 0 && s.records.length === 2, "records=" + s.records.length + " traces=" + s.counters.traces);
    check("G3d 门控关：thunk 未求值（惰性构造）", thunk === 0, "thunk=" + thunk);
    D.setTrace(true);
    D.info("info:x", R.UNKNOWN, () => { thunk++; return { c: 3 }; });
    D.trace("trace:x", R.TOOL_RECOGNIZED, () => { thunk++; return { d: 4 }; });
    const s2 = D.snapshot();
    check("G3e 门控开：info/trace 记录且 thunk 求值", s2.records.length === 4 && thunk === 2 && s2.trace === true, "records=" + s2.records.length + " thunk=" + thunk);
    check("G3f 门控开：info/trace 带 detail", s2.records[2].detail && s2.records[3].detail, JSON.stringify(s2.records.map(r => r.detail)));
  }

  // ── G4 惰性构造（trace 开启时 thunk 仍可选）──
  {
    const D = M.createDiag({ trace: true });
    D.trace("t", R.TOOL_RECOGNIZED, undefined);
    const r = D.records()[0];
    check("G4a 无 thunk 时 detail 为 null（不造空对象）", r.detail === null, JSON.stringify(r.detail));
  }

  // ── G5 环形缓冲 ──
  {
    const D = M.createDiag({ capacity: 5 });
    for (let i = 0; i < 9; i++) D.warn("p" + i, R.TOOL_GATE_INPUT_TYPE, null);
    const s = D.snapshot();
    check("G5a 容量上限：records 不超过 capacity", s.records.length === 5 && s.capacity === 5, s.records.length + "/" + s.capacity);
    check("G5b 溢出计数：dropped = 4", s.dropped === 4, String(s.dropped));
    check("G5c 截断标记 truncated=true", s.truncated === true, String(s.truncated));
    check("G5d 溢出策略：丢最旧（保留 p4..p8）", s.records.map(r => r.point).join(",") === "p4,p5,p6,p7,p8", s.records.map(r => r.point).join(","));
    check("G5e 环形缓冲不扩容（长会话内存有界）", s.records.length <= s.capacity, "");
  }

  // ── G6 已验证因果（闭集校验）──
  {
    const D = M.createDiag();
    D.warn("p", "i-made-this-up", null);
    D.warn("q", null, null);
    const rs = D.records();
    check("G6a 闭集外 reason → unknown-open-debug", rs[0].reason === R.UNKNOWN && rs[1].reason === R.UNKNOWN, rs.map(r => r.reason).join(","));
    check("G6b 降级记录 verified=false（诚实报未知，不猜）", rs[0].verified === false && rs[1].verified === false, JSON.stringify(rs.map(r => r.verified)));
    check("G6c 合法 reason verified=true", (() => { const D2 = M.createDiag(); D2.warn("p", R.WRITE_MISMATCH, null); return D2.records()[0].verified === true; })(), "");
    check("G6d 空 point 被兜底为 unknown-point", (() => { const D2 = M.createDiag(); D2.warn("", R.WRITE_MISMATCH, null); return D2.records()[0].point === "unknown-point"; })(), "");
  }

  // ── G7 自保：诊断面不得成为新失败面 ──
  {
    const D = M.createDiag({ trace: true });
    let threw = false;
    try { D.trace("t", R.TOOL_RECOGNIZED, () => { throw new Error("thunk-boom"); }); } catch { threw = true; }
    check("G7a detail thunk 抛错不得上抛", threw === false, "");
    const r = D.records()[0];
    check("G7b thunk 抛错时记录仍写入且 detail 标记降级", !!r && r.detail && r.detail.detailError === true, JSON.stringify(r && r.detail));
    let threw2 = false;
    try { const D2 = M.createDiag(); D2.warn("p", R.TOOL_GATE_INPUT_TYPE, null); D2.snapshot(); D2.text(); D2.records(); D2.clear(); D2.snapshot(); } catch { threw2 = true; }
    check("G7c 全读面接口不抛错（含 clear 后重读）", threw2 === false, "");
  }

  // ── G8 热路径：counter O(1) ──
  {
    const D = M.createDiag();
    const N = 100000;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) D.counter("scans");
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    check("G8a counter " + N + " 次 < 100ms（无分配、无时钟读取）", ms < 100, ms.toFixed(2) + "ms");
    check("G8b counter 累加正确", D.snapshot().counters.scans === N, String(D.snapshot().counters.scans));
    // G8c 相对比较（D-008）：不用绝对墙钟阈值（受机器/JIT 冷启动影响，本机冷跑 63~71ms 对 50ms 红线）。
    // 改为同进程内与 counter 热路径比：trace 短路的开销主要在调用点的闭包分配，与机器绝对快慢无关。
    // 各测 3 次取最小值（min 剔除 GC/负载尖峰，比值稳定）。实测：短路 ≈6x 基线；门控失效（不再短路）≈80x。
    // 取 20x 为界：仍能抓数量级退化（慢 10 倍 ≈60x），又对机器差异留足余量。诊断保留 ms3/msBase 原值。
    const Db = M.createDiag(), D3 = M.createDiag();
    const tBase = () => { const t = process.hrtime.bigint(); for (let i = 0; i < N; i++) Db.counter("scans"); return Number(process.hrtime.bigint() - t) / 1e6; };
    const tTrace = () => { const t = process.hrtime.bigint(); for (let i = 0; i < N; i++) D3.trace("hot", R.TOOL_RECOGNIZED, () => ({ i })); return Number(process.hrtime.bigint() - t) / 1e6; };
    for (let w = 0; w < 2; w++) { tBase(); tTrace(); }   // 预热，消除冷 JIT 抖动
    const min3 = (f) => { let m = Infinity; for (let k = 0; k < 3; k++) m = Math.min(m, f()); return m; };
    const msBase = min3(tBase);
    const ms3 = min3(tTrace);
    const RATIO_BOUND = 20;
    const ratio3 = msBase > 0 ? ms3 / msBase : Infinity;
    check("G8c 门控关时 trace " + N + " 次 ≤ 基线 counter 的 " + RATIO_BOUND + "x（相对比较，抗机器差异）", ratio3 <= RATIO_BOUND, ms3.toFixed(2) + "ms / base " + msBase.toFixed(2) + "ms = " + ratio3.toFixed(2) + "x");
    check("G8d 门控关时 trace 不产生记录", D3.snapshot().records.length === 0, String(D3.snapshot().records.length));
  }
}

// ── G9 接线静态断言 ──
{
  // 入口收敛：一个 GM 菜单项（不为每个诊断功能各设菜单项）
  const menuBlocks = mainSrc.match(/if \(IS_TOP_FRAME && typeof GM_registerMenuCommand === 'function'\) \{[\s\S]*?\n\}/g) || [];
  const allMenuCalls = (mainSrc.match(/GM_registerMenuCommand\(/g) || []).length;
  check("G9a 菜单注册均在 IS_TOP_FRAME 门内", menuBlocks.length >= 1 && menuBlocks.join("").indexOf("GM_registerMenuCommand") >= 0, "blocks=" + menuBlocks.length);
  check("G9b 诊断入口恰好一个菜单项", /GM_registerMenuCommand\(\s*t\('diagnostics'\)/.test(mainSrc) && (mainSrc.match(/t\('diagnostics'\)/g) || []).length === 1, "calls=" + allMenuCalls);
  check("G9c 诊断菜单项打开诊断视图（view: 'diag'）", /t\('diagnostics'\)[\s\S]{0,120}?UI\.open\(null,\s*null,\s*null,\s*\{\s*view:\s*'diag'/.test(mainSrc), "");
  check("G9d 机器可读输出暴露为 window.__cchDiag", /__cchDiag\s*=/.test(mainSrc) && /__cchDiag\?:/.test(typesSrc), "");
  check("G9e main.ts 装载诊断面模块（createDiag）", /from '.\/diag'/.test(mainSrc) && /createDiag\(/.test(mainSrc), "");

  // 面板与机器面同源（同一份 records，不各自采集）
  const diagRender = uiSrc.match(/\n  _renderDiag\(\): void \{[\s\S]*?\n  \},/);
  check("G9f 面板诊断渲染函数存在", !!diagRender, "");
  check("G9g 面板读同一份 records()（不各自采集）", !!diagRender && /\.records\(\)/.test(diagRender[0]), "");
  check("G9h 面板行的 reason/layer 来自记录字段（非硬编码）", !!diagRender && /r\.reason/.test(diagRender[0]) && /r\.layer/.test(diagRender[0]), "");
  check("G9i 面板与导出均走 checks() 检查矩阵（D-012 同享定义）", /\.checks\(\)/.test(uiSrc) && /\.snapshot\(\)/.test(uiSrc), "");
  check("G9j 独立诊断视图与既有界面入口摘要齐备", ["cch-diag-view", "cch-diag-list", "cch-diag-layers", "cch-diag-export", "cch-diag-tg", "cch-diag-sum", "cch-diag-trace-tg"].every(id => uiSrc.indexOf(id) >= 0), "");
  check("G9k 过滤器（级别 + 层）存在", /_diagFilter/.test(uiSrc) && /data-filter/.test(uiSrc), "");

  // 四层判定接入点
  check("G9l detect 接收诊断面（可选参数，既有装载器零影响）", /createDetect\(UI: CchUI, Rules: CchRules \| null, Diag\?: CchDiag \| null\)/.test(detSrc), "");
  check("G9m detect 闸门 reason 从信号派生（不新造原因）", /_reasonOf\(res/.test(detSrc) && /TOOL_GATE_INPUT_TYPE/.test(detSrc) && /TOOL_GATE_ARIA_HIDDEN/.test(detSrc) && /TOOL_GATE_COUNTRY_SEMANTIC/.test(detSrc) && /INJECT_GATE_VISIBILITY/.test(detSrc), "");
  check("G9n detect 记录计数器（scans/candidates/injected）", /counter\('scans'/.test(detSrc) && /counter\('candidates'/.test(detSrc) && /counter\('injected'/.test(detSrc), "");
  check("G9o fill 写入结果三元组（pre/action/post-assert）", /_assertWrite\(/.test(fillSrc) && /WRITE_ASSERTED/.test(fillSrc) && /WRITE_MISMATCH/.test(fillSrc) && /pre:/.test(fillSrc) && /post:/.test(fillSrc), "");
  check("G9p fill 失败原因来自策略拒因（已验证因果）", /_decline/.test(fillSrc) && /LOGIC_OPTION_UNMATCHED/.test(fillSrc) && /LOGIC_PSEUDO_UNMATCHED/.test(fillSrc), "");
  check("G9q ui 记录 logic-no-target（GM 入口无目标字段）", /LOGIC_NO_TARGET/.test(uiSrc), "");
  check("G9r 诊断挂载不侵入主路径签名（Fill.run 返回类型未变）", /run\(el: AnyEl, kind: FillKind \| null, country: Country\): Promise<FillResult>/.test(fillSrc), "");

  // i18n 双语键
  const zhBlock = (i18nSrc.match(/zh: \{([\s\S]*?)\n        lang:/) || [])[1] || i18nSrc;
  const enBlock = (i18nSrc.match(/en: \{([\s\S]*?)\n        lang:/) || [])[1] || i18nSrc;
  const keys = ["diagnostics", "diagOpen", "diagLayers", "diagCounters", "diagTimeline", "diagExport", "diagTrace", "diagClear", "diagEmpty", "diagTool", "diagInject", "diagLogic", "diagWrite", "diagPass", "diagFail", "diagUnknown", "diagAll", "diagTruncated", "diagFixTool", "diagFixInject", "diagFixLogic", "diagFixWrite", "diagExported"];
  const missingZh = keys.filter(k => !new RegExp("\\b" + k + "\\s*:").test(zhBlock));
  const missingEn = keys.filter(k => !new RegExp("\\b" + k + "\\s*:").test(enBlock));
  check("G9s 诊断面 i18n 键 zh/en 双语齐备", missingZh.length === 0 && missingEn.length === 0, "zh缺=" + missingZh.join(",") + " en缺=" + missingEn.join(","));
}

// ── G10 判定面零改动 ──
{
  check("G10a SCORE_AUTO=70 逐字保留", /export const SCORE_AUTO = 70;/.test(cfgSrc), "");
  check("G10b SCORE_LOWKEY=35 逐字保留", /export const SCORE_LOWKEY = 35;/.test(cfgSrc), "");
  check("G10c detect 分档 if 链逐字保留", /if \(score >= SCORE_AUTO\) tier = 'auto';[\s\S]*?else if \(score >= SCORE_LOWKEY\) tier = 'lowkey';/.test(detSrc), "");
  check("G10d 低置信登记线 25 未动", /ITI_LOW_REGISTER_SCORE = 25/.test(cfgSrc), "");
  check("G10e FillResult.status 三态语义未改（票 31 契约）", /export type FillStatus = 'filled' \| 'copied' \| 'failed';/.test(typesSrc), "");
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('failures:\n - ' + failures.join('\n - ')); process.exit(1); }
