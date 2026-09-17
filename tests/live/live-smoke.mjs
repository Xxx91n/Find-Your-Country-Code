// ══════════════════════════════════════════════════════════════════
// live-smoke.mjs — 真实站点低频冒烟层（第二层）
//   票 32 [A-006] 建层 · 票 39 [A-016] 嵌套帧与有头启动 · 票 05 [A-029] 共享原语收敛
//   · 票 07 [A-029] 升到全阶梯 L0–L4 + 发布门配套
// 定位：与密封 E2E（第一层，CI 必跑、零外网、PR 阻断）解耦。本层只做「低频 / 手动触发 +
//       可跳过白名单 + 全阶梯断言 + 失败 advisory」，永不出现在 pull_request 触发面。
// 断言阶梯（权威定义 tests/ACCEPTANCE-SURFACE.md §4.1/§4.2；票 07 实现）：
//   L0 静默健康    pageerror = 0（永不单独算生效）
//   L1 元素已注入  目标字段被 .cch-wrapper 包裹，.cch-btn 的 data-cch-tier ∈ {auto, lowkey}
//   L2 交互可驱动  面板 #cch-pop 可见 + 搜索收窄可见行（跨帧为双端断言：子帧图标 → 顶层面板）
//   L3 写入结果正确 按**写入口形态**分派（票 11 / A-035）：
//                   · 普通字段（select / input / contenteditable）→ 宿主 value 写入所选国家区号
//                     + 派发 input / change（票 07 原判据，逐字不变）
//                   · ITI 接管字段 → **选中国家状态**（官方读 API → DOM 选中态）
//                     + ITI 官方 countrychange 事件。依据：ITI 官方**不承诺**把区号写进其
//                     input.value（separateDialCode 模式下由独立元素承载），且**从不**派发
//                     原生 input / change——见 research/atomcode-11-iti-l3-criterion.md
//                     与 research/window-reports/11-iti-l3-criterion-report.md
//   L4 用户反馈出现 #cch-toast 出现且文案非空（外部可观测，非脚本自报）
// 层归属（§4.2）：本层与 owned 页**都跑全阶梯**，差别只在阻断语义 —— 本层 advisory
//   （仅 schedule + workflow_dispatch，失败只告警不阻断合入）；阻断只发生在 release.yml 发布门
//   （ADR-0010：最近一次运行为绿，或失败已被显式 ack 并立票，否则不出包）。
// 硬校验（exit 1）：白名单契约（跳过 / observe 挂账必须带非空 reason + ticket）；全阶梯契约
//   （expect="injected" 必须声明 L0–L4，非全阶梯必须带非空 degradeReason + ticket）；
//   expect="injected" 的目标必须真的注入、档位合法、全程无未捕获异常。
// 软观测（不退出）：expect="observe" 的目标只记录观测值（长期挂账，只记录不裁定）。
// 票 39 增补（A-016）：嵌套帧断言（frame 子串匹配子帧）；有头启动（headless:false）——真实站点
//   普遍前置反爬托管挑战，CI 走 xvfb-run，无 DISPLAY 自动回退 headless 并告警（不伪造绿）；
//   挑战检测仅用于诊断文案（不作控制流）。CCH_LIVE_HEADLESS=1 强制 headless。
// 票 05 增补（A-029）：GM 替身 / DOM 探针 / 交互原语由 tests/helpers/primitives.mjs **唯一提供**
//   （与密封层同一份文件），本层不再内联第二套 stub 与 PROBE。
// 用法: node tests/live/live-smoke.mjs [--json out.json] [--out out.md] [--target id]
// 前置: npm run build（需 dist/find-your-country-code.user.js）
// ══════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium } from 'playwright';
// 票 05 [A-029]：GM 替身 / DOM 探针 / 交互原语**唯一来源**（与密封层共用同一份文件）。
// 本层不再内联第二套 GM stub 与 PROBE —— 那正是「两 harness 收敛为同一份原语」要消灭的东西。
// 票 07 [A-029]：跨帧 open（链路 A）与未校准目标的宿主字段读取面同样出自该唯一来源。
import {
  DIST_PATH, installUserscript, injectionSatisfied, openPanel, openPanelRemote,
  readFeedback, readFieldEvents, readHostValue, readInjection, readRowDialCode,
  readVisibleRows, readWrappedHostField, recordFieldEvents, recordWrappedFieldEvents,
  searchType, selectCountry,
  // 票 11 [A-035]：ITI 形态写入口判定 + 选中国家状态读取面（与普通字段判据分派）
  ITI_COUNTRY_EVENT, readItiCountryEvents, readItiSelectedCountry, readWriteSurface,
  recordItiCountryEvents,
} from '../helpers/primitives.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(here, 'site-manifest.json');
const PAGES = join(here, 'pages');
// 构建产物路径由共享原语层唯一提供（票 05）；本层不再自行拼路径。
const DIST = DIST_PATH;
const PORT = Number(process.env.CCH_LIVE_PORT || 4399);
const SETTLE_MS = Number(process.env.CCH_LIVE_SETTLE_MS || 800);
const LIVE_TIMEOUT_MS = Number(process.env.CCH_LIVE_TIMEOUT_MS || 45000);
const ASSERT_TIMEOUT_MS = Number(process.env.CCH_LIVE_ASSERT_MS || 60000);
const POLL_MS = 500;
// 票 10 补：跨帧写入的有界条件等待窗口（读侧采样，非固定 sleep 充当等待）
const WRITE_WAIT_MS = 6000;
// 票 07 [A-029]：阶梯级别全集（权威定义 tests/ACCEPTANCE-SURFACE.md §4.1）。
const LADDER_ALL = ['L0', 'L1', 'L2', 'L3', 'L4'];
const DRIVEN_LEVELS = ['L2', 'L3', 'L4'];
// 仅用于诊断文案（不作控制流）：覆盖常见本地化挑战标题 + 挑战帧 URL。
const CHALLENGE_RE = /just a moment|checking your browser|attention required|enable javascript and cookies|verifying you are human|请稍候|稍候|einen moment|un momento|vérification|sicherheitsüberprüfung/i;
const CHALLENGE_FRAME_RE = /challenges\.cloudflare\.com|cdn-cgi\/challenge-platform/i;

const NO_DISPLAY_LINUX = process.platform === 'linux' && !process.env.DISPLAY;
const FORCE_HEADLESS = process.env.CCH_LIVE_HEADLESS === '1';
const HEADLESS = FORCE_HEADLESS || NO_DISPLAY_LINUX;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function arg(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; }
function writeOut(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }

// ── 契约校验：白名单必须可审计（跳过 ≠ 静默丢失）+ 全阶梯必须逐目标声明（票 07） ──
function validate(manifest) {
  const v = [];
  if (!Array.isArray(manifest.targets) || !manifest.targets.length) { v.push('targets 缺失或为空'); return v; }
  const seen = new Set();
  for (const t of manifest.targets) {
    for (const f of ['id', 'kind', 'expect', 'enabled', 'reason', 'ticket']) {
      if (t[f] === undefined || t[f] === null || t[f] === '') v.push((t.id || '?') + ': 字段缺失 ' + f);
    }
    if (seen.has(t.id)) v.push('target id 重复: ' + t.id);
    seen.add(t.id);
    if (!['mirror', 'live'].includes(t.kind)) v.push(t.id + ': kind 非法 ' + t.kind);
    if (!['injected', 'observe'].includes(t.expect)) v.push(t.id + ': expect 非法 ' + t.expect);
    if (t.kind === 'mirror' && !t.page) v.push(t.id + ': mirror 缺 page');
    if (t.kind === 'live' && !t.url) v.push(t.id + ': live 缺 url');
    if (t.frame !== undefined && (typeof t.frame !== 'string' || !t.frame)) v.push(t.id + ': frame 必须为非空字符串');
    // 票 05：deep 契约（共享原语驱动链）——只允许自有镜像目标，且三字段必须齐全
    if (t.deep !== undefined) {
      if (t.kind !== 'mirror') v.push(t.id + ': deep 只允许用于 mirror 目标（第三方站点不深交互）');
      for (const f of ['iso', 'query', 'expectValue']) {
        if (!t.deep || t.deep[f] === undefined || t.deep[f] === null || t.deep[f] === '') v.push(t.id + ': deep.' + f + ' 缺失');
      }
    }
    // 票 07 [A-029]：全阶梯契约（tests/ACCEPTANCE-SURFACE.md §4.2）——逐目标声明实际运行的级别；
    // expect="injected" 默认必须跑满 L0–L4（真实站点不得只停留在 L0–L1 弱断言，D-004(c)）；
    // 非全阶梯 = 不可驱动降级，必须同时登记非空 degradeReason + ticket。
    if (!Array.isArray(t.ladder) || !t.ladder.length) {
      v.push(t.id + ': ladder 缺失或为空（全阶梯契约要求逐目标声明实际运行级别）');
    } else {
      for (const l of t.ladder) if (!LADDER_ALL.includes(l)) v.push(t.id + ': ladder 含非法级别 ' + l);
      if (t.expect === 'injected') {
        const full = LADDER_ALL.every((l) => t.ladder.includes(l));
        if (!full && (!String(t.degradeReason || '').trim() || !String(t.ticket || '').trim())) {
          v.push(t.id + ': 非全阶梯（' + t.ladder.join('/') + '）必须携带非空 degradeReason + ticket（§4.2 不可驱动降级登记）');
        }
      }
    }
    if (t.probe !== undefined) {
      for (const f of ['iso', 'query']) if (!t.probe || !t.probe[f]) v.push(t.id + ': probe.' + f + ' 缺失');
    }
    if (!t.enabled && (!t.reason || !t.ticket)) v.push(t.id + ': 跳过条目必须携带 reason + ticket（可审计白名单）');
    // 票 07 [A-029]：observe 挂账（只记录不裁定）强制非空 reason + ticket（ADR-0010 条款 4）。
    if (t.expect === 'observe' && (!String(t.reason || '').trim() || !String(t.ticket || '').trim())) {
      v.push(t.id + ': observe 挂账必须携带非空 reason + ticket（不得匿名挂账）');
    }
  }
  return v;
}

// ── 本地镜像静态服务器（零依赖；只服务 tests/live/pages） ──
function servePages() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'mirror-three-forms.html';
    if (name.includes('..')) { res.writeHead(403); res.end('forbidden'); return; }
    const file = join(PAGES, name);
    if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// ── 帧内探针 ──
// 票 05：DOM 探针改由共享原语层 readInjection() 提供（含 data-cch-tier），本层不再自建第二套。
// 判定归约（纯函数，非断言库）留在本层：live 层没有 expect，成败由自建软收集器裁定。
const injectedOk = (probe, sel) => injectionSatisfied(probe, sel);

async function waitForChildFrame(page, match, deadline) {
  for (;;) {
    const f = page.frames().find(x => x !== page.mainFrame() && x.url().includes(match));
    if (f) return f;
    if (Date.now() >= deadline) return null;
    await page.waitForTimeout(POLL_MS);
  }
}

/**
 * 票 10 补：采样式**有界条件等待**（与本文件 waitForChildFrame / 密封层 expect.poll 同构；
 * 非「固定 sleep 充当等待」）。
 *
 * 为何需要：跨帧写入是**异步链** —— 顶层 src/ui/index.ts:820-821 先
 * postMessage(FRAME_FILL_MSG) 再**同步** _closePopup()，子帧的 message 任务 +
 * Fill.run 在其后执行 ⇒ selectCountry() 返回（面板已 detach）**不等于**写入已完成。
 * 一次性读会产生 **CI-only 竞态**（本地快则过、CI 慢则红；票 10 自身密封用例已因此红过
 * 一次：E2E run 35126041454）。
 *
 * 纪律：只把**读取**变为有界采样，判据（ok）**逐字不变** —— 不放宽、不删除、不新增断言。
 * 且**不可能伪造绿**：票 10 修复前的失败是**确定性**的（srcdoc 帧内
 * e.origin !== location.origin 必然判真 ⇒ 处理器提前 return），重试不可能改变其终态。
 */
async function readUntil(scope, read, ok, timeout = WRITE_WAIT_MS) {
  const deadline = Date.now() + timeout;
  let last = null;
  for (;;) {
    try { last = await read(); } catch { last = null; }
    if (ok(last)) return last;
    if (Date.now() >= deadline) return last;
    await scope.waitForTimeout(POLL_MS);
  }
}

// 仅用于失败文案诊断：是否仍停在反爬挑战面（本地化标题 / 挑战帧 URL）。
async function diagnoseChallenge(page) {
  const title = await page.title().catch(() => '');
  const frameHit = page.frames().some(f => CHALLENGE_FRAME_RE.test(f.url()));
  return { challenged: CHALLENGE_RE.test(title) || frameHit, title: title.slice(0, 60) };
}

// ── 阶梯判据纯函数（只做归约，不含断言库） ──
const digits = (s) => String(s === null || s === undefined ? '' : s).replace(/\D+/g, '');
// 精确模式（deep 已校准 expectValue）逐字比对；未校准模式按区号数字归一比对——
// 期望值由面板国家行自带区号同源导出（readRowDialCode），不引入第二份区号表。
function valueMatches(actual, expected, exact) {
  if (actual === null || actual === undefined) return false;
  if (exact) return String(actual) === String(expected);
  const d = digits(actual), e = digits(expected);
  return e.length > 0 && d.includes(e);
}

// 票 11 [A-035]：ITI 形态的写入结果归约——优先按**国家身份**（iso2）比对；iso2 不可读时
// 退到官方读 API / DOM 选中态给出的区号数字比对（同一事实的两条读取路径，非放宽判据）。
function itiMatch(state, iso, expected) {
  if (!state) return false;
  if (state.iso2) return String(state.iso2).toLowerCase() === String(iso || '').toLowerCase();
  if (state.dialCode) {
    const d = digits(state.dialCode), e = digits(expected);
    return e.length > 0 && d === e;
  }
  return false;
}

function reduceLevels(checks) {
  const out = {};
  for (const c of checks) {
    const cur = out[c.level];
    if (c.status === 'fail') out[c.level] = 'fail';
    else if (c.status === 'pass' && cur !== 'fail') out[c.level] = 'pass';
    else if (!cur) out[c.level] = c.status;
  }
  return out;
}

// ── 票 07 [A-029]：共享原语驱动链（L2 交互可驱动 → L3 写入结果正确 → L4 用户反馈出现） ──
// 函数名沿用 runDeepChecks：verify-ticket-05-harness.mjs 组 S7 以该标识钉住「live 层存在共享原语
// 驱动链」。票 07 把它的作用域从「mirror 专属 deep 链」扩到**全阶梯 L2–L4 驱动链**（真实站点同样
// 驱动，不再止于 L0–L1），标识保持不变以不破坏既有门；只扩不缩，无断言删除。
// 软收集：逐项 {level, label, status, detail}，一次收全量，不因单项失败中断后续读取。
async function runDeepChecks(page, probeFrame, t, plan) {
  const checks = [];
  const mark = (level, label, pass, detail) => checks.push({ level, label, status: pass ? 'pass' : 'fail', detail: String(detail) });
  const why = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 160);
  const framed = probeFrame !== page.mainFrame();

  // ── L2：交互可驱动（面板可见）。跨帧 = 双端断言：子帧图标点击（一端）→ 顶层 #cch-pop 可见（另一端）。
  try {
    if (framed || !t.selector) await openPanelRemote(probeFrame, t.selector || null, page);
    else await openPanel(probeFrame, t.selector);
    mark('L2', 'panel-open', true, framed
      ? ('跨帧双端：' + (t.selector || '首个已注入图标') + ' 图标点击于帧 "' + t.frame + '" → 顶层 #cch-pop 可见')
      : '#cch-pop 可见');
  } catch (e) {
    mark('L2', 'panel-open', false, why(e));
    return checks;
  }

  // ── L2：搜索收窄（可见状态迁移，非固定 sleep） ──
  try {
    const before = (await readVisibleRows(page)).length;
    await searchType(page, plan.query);
    const rows = await readVisibleRows(page);
    mark('L2', 'search-narrow', rows.length > 0 && rows.length < before,
      '可见行 ' + before + ' → ' + rows.length + '（查询 "' + plan.query + '"）');
  } catch (e) {
    mark('L2', 'search-narrow', false, why(e));
  }

  // ── L3 前置：写入口形态判定 + 期望值同源导出 + 事件面监听（必须早于写入） ──
  // 票 11 [A-035]：ITI 接管字段的「写入结果」不是 input.value——ITI 官方不承诺把区号写进
  // 该 value（separateDialCode 模式下由独立元素承载），且从不派发原生 input/change。
  // 故先按宿主侧可观测事实判定写入口形态，再按形态分派 L3 判据（普通字段路径逐字不变）。
  const surface = await readWriteSurface(probeFrame, t.selector || null).catch(() => 'field');
  const expected = t.deep ? t.deep.expectValue : await readRowDialCode(page, plan.iso).catch(() => null);
  try {
    if (t.selector) await recordFieldEvents(probeFrame, t.selector);
    else await recordWrappedFieldEvents(probeFrame);
  } catch (e) {
    mark('L3', 'record-events', false, why(e));
  }
  let itiPre = null;
  if (surface === 'iti') {
    try {
      await recordItiCountryEvents(probeFrame, t.selector || null);
      itiPre = await readItiSelectedCountry(probeFrame, t.selector || null).catch(() => null);
    } catch (e) {
      mark('L3', 'record-iti-events', false, why(e));
    }
  }

  // ── L3：选国 → 面板关闭（写入动作） ──
  try {
    await selectCountry(page, plan.iso, { query: null });
    mark('L3', 'select-country', true, 'iso=' + plan.iso + '（面板已关）');
  } catch (e) {
    mark('L3', 'select-country', false, why(e));
    return checks;
  }

  if (surface === 'iti') {
    // ── L3（ITI 形态）：写入结果 = 选中国家状态（官方读 API → DOM 选中态） ──
    const preIso = itiPre && itiPre.iso2 ? String(itiPre.iso2).toLowerCase() : null;
    const preAlready = preIso !== null && preIso === String(plan.iso).toLowerCase();
    // 票 10 补：跨帧写入是异步链 ⇒ 读侧改为有界条件等待（判据不变，见 readUntil 注释）。
    // 原生事件面在 ITI 分支仅作保留记录（ITI 从不派发原生 input/change），故不参与等待。
    const iti = await readUntil(probeFrame, () => readItiSelectedCountry(probeFrame, t.selector || null), (v) => itiMatch(v, plan.iso, expected));
    const dom = await readUntil(probeFrame, () => readItiSelectedCountry(probeFrame, t.selector || null, { domOnly: true }), (v) => itiMatch(v, plan.iso, expected));
    const events = await readFieldEvents(probeFrame).catch(() => []);
    const itiEvents = await readUntil(probeFrame, () => readItiCountryEvents(probeFrame), (e) => preAlready || (Array.isArray(e) && e.includes(ITI_COUNTRY_EVENT)));
    const seen = (v) => !v ? '不可读'
      : (v.iso2 ? (v.iso2 + '/' + (v.dialCode || '?') + ' via ' + v.via)
        : (v.dialCode ? ('dial=' + v.dialCode + ' via ' + v.via) : ('不可读 ' + JSON.stringify(v.raw))));
    mark('L3', 'iti-selected-country', itiMatch(iti, plan.iso, expected),
      '写入前 ' + seen(itiPre) + ' → 写入后 ' + seen(iti)
      + '；期望 iso=' + plan.iso + '（区号 ' + JSON.stringify(expected) + '）'
      + '；ITI 形态判据 = 选中国家状态（input.value 非 ITI 官方承诺面）');
    mark('L3', 'iti-dom-marker', itiMatch(dom, plan.iso, expected),
      'DOM 选中态（独立于官方读 API）' + seen(dom) + '；期望 iso=' + plan.iso);
    mark('L3', 'iti-country-event', itiEvents.includes(ITI_COUNTRY_EVENT) || preAlready,
      'ITI 官方事件序列 [' + itiEvents.join(',') + ']'
      + (preAlready ? '；写入前已为目标国家，库按官方语义不广播（状态判定为主判据）' : '')
      + '；原生事件序列 [' + events.join(',') + ']（保留记录：ITI 从不派发原生 input/change，不作 ITI 判据）');
  } else {
    // ── L3（普通字段形态）：写入结果 = 宿主字段 value（票 07 原判据，逐字保留） ──
    const readActual = async () => {
      const h = t.selector
        ? { value: await readHostValue(probeFrame, t.selector).catch(() => null) }
        : await readWrappedHostField(probeFrame).catch(() => null);
      return h ? h.value : null;
    };
    // 票 10 补：读侧有界条件等待（判据不变，见 readUntil 注释）
    const actual = await readUntil(probeFrame, readActual, (v) => valueMatches(v, expected, !!t.deep));
    mark('L3', 'host-value', valueMatches(actual, expected, !!t.deep),
      'value=' + JSON.stringify(actual) + ' 期望=' + JSON.stringify(expected) + (t.deep ? '（精确）' : '（行内区号同源归一）'));

    // ── L3：事件面 input / change 各 ≥1 ──
    const events = await readUntil(probeFrame, () => readFieldEvents(probeFrame), (e) => Array.isArray(e) && e.includes('input') && e.includes('change'));
    mark('L3', 'field-events', events.includes('input') && events.includes('change'), '序列 [' + events.join(',') + ']');
  }

  // ── L4：用户反馈出现。紧跟写入读取：toast 的 on 类只保持 2000ms（src/ui/index.ts:186）。
  // 判据 = 元素在场 + 文案非空（外部可观测）；on 类属 2000ms 视觉窗口状态位，记明细不作判据。
  // 票 10 补：读侧有界条件等待（判据不变，见 readUntil 注释）
  const fb = await readUntil(probeFrame, () => readFeedback(probeFrame), (f) => !!(f && f.present && String(f.text || '').trim()));
  mark('L4', 'feedback', !!(fb && fb.present && String(fb.text || '').trim()),
    fb ? ('present=' + fb.present + ' on=' + fb.on + ' 文本=' + JSON.stringify(String(fb.text || '').slice(0, 60))) : '不可读');

  return checks;
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const violations = validate(manifest);
const only = arg('--target');
const ladderBase = (manifest._meta && manifest._meta.ladderProbe) ? manifest._meta.ladderProbe : { iso: 'cn', query: 'china' };

if (!existsSync(DIST)) {
  console.log('缺少构建产物 ' + DIST + ' —— 先跑 npm run build（或 npm run e2e）');
  process.exit(2);
}

const selected = manifest.targets.filter(t => (only ? t.id === only : true));
const skipped = selected.filter(t => !t.enabled);
const runnable = selected.filter(t => t.enabled);

const results = [];
const failures = [];
let browser = null;
let server = null;

if (NO_DISPLAY_LINUX && !FORCE_HEADLESS) {
  console.log('[WARN] 未检测到 DISPLAY，已回退 headless；受反爬挑战的站点会如实报错（不伪造绿）。CI 请用 xvfb-run。');
}

async function runTarget(t) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String((e && e.message) || e).split('\n')[0].slice(0, 160)));
  const rec = {
    id: t.id, kind: t.kind, expect: t.expect, frame: t.frame || null, frameUrl: null,
    ladderDeclared: t.ladder || [], levels: {}, ladder: [], status: 'unknown', detail: '',
    observed: null, deep: null, pageErrors: 0, elapsedMs: 0,
  };
  const t0 = Date.now();
  const plan = t.deep
    ? { iso: t.deep.iso, query: t.deep.query }
    : (t.probe ? { iso: t.probe.iso, query: t.probe.query } : { iso: ladderBase.iso, query: ladderBase.query });
  try {
    // 票 05：注入走共享原语（GM 替身 + 构建产物），与密封层同一份实现。
    await installUserscript(page);

    if (t.kind === 'mirror') {
      await page.goto('http://127.0.0.1:' + PORT + '/' + t.page, { waitUntil: 'domcontentloaded' });
    } else {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: LIVE_TIMEOUT_MS });
    }

    const deadline = Date.now() + ASSERT_TIMEOUT_MS;
    let probeFrame = page.mainFrame();
    if (t.frame) {
      const f = await waitForChildFrame(page, t.frame, deadline);
      if (!f) {
        const diag = await diagnoseChallenge(page);
        rec.status = t.expect === 'injected' ? 'fail' : 'error';
        rec.detail = diag.challenged
          ? ('反爬挑战未化解（title="' + diag.title + '"）—— 目标不可达，如实登记')
          : ('未找到嵌套帧（匹配 "' + t.frame + '"）title="' + diag.title + '"');
        if (t.expect === 'injected') failures.push(t.id + ': ' + rec.detail);
        return rec;
      }
      probeFrame = f;
      rec.frameUrl = f.url().slice(0, 140);
    }

    if (t.expect === 'observe') {
      // 长期挂账：只记录观测值，不裁定（ADR-0010 条款 4；reason + ticket 已在 validate 硬校验）
      await page.waitForTimeout(SETTLE_MS);
      const probe = await readInjection(probeFrame, t.selector || null).catch(() => null);
      rec.observed = probe;
      rec.status = 'observed';
      rec.levels = { L0: pageErrors.length ? 'observed-errs' : 'observed-clean', L1: probe && probe.wrappers > 0 ? 'observed-injected' : 'observed-none' };
      rec.detail = !probe ? '帧不可求值'
        : (t.selector ? ('wrapped=' + probe.wrapped + ' wrappers=' + probe.wrappers + ' buttons=' + probe.buttons)
          : ('未校准（selector 为空，仅记录 wrapper/button 计数）wrappers=' + probe.wrappers + ' buttons=' + probe.buttons));
      return rec;
    }

    // ── expect="injected"：按 manifest 声明的级别跑阶梯 ──
    const declared = (l) => (t.ladder || []).includes(l);
    const checks = [];

    // L1：元素已注入（在 L0 之前探测，以便 L0 的 pageerror 归因更完整）
    let probe = null;
    for (;;) {
      probe = await readInjection(probeFrame, t.selector || null).catch(() => null);
      if (injectedOk(probe, t.selector) || Date.now() >= deadline) break;
      await page.waitForTimeout(POLL_MS);
    }
    rec.observed = probe;
    const tierOk = !t.selector || !probe || probe.tier === null || /^(auto|lowkey)$/.test(probe.tier);
    const L1ok = injectedOk(probe, t.selector) && tierOk;
    // L0 静默健康：全程 pageerror = 0（永不单独算生效）；失败分支以 pageErrors.length > 0 判定。
    const L0fail = pageErrors.length > 0;
    const L0ok = !L0fail;

    checks.push({
      level: 'L0', label: 'silent-health', status: declared('L0') ? (L0ok ? 'pass' : 'fail') : 'skip',
      detail: 'pageerror=' + pageErrors.length + (pageErrors.length ? '（首条：' + pageErrors[0] + '）' : '') + '；永不单独算生效',
    });
    checks.push({
      level: 'L1', label: 'injected', status: declared('L1') ? (L1ok ? 'pass' : 'fail') : 'skip',
      detail: 'wrappers=' + (probe ? probe.wrappers : 'n/a') + ' elementFound=' + (probe ? probe.elementFound : 'n/a')
        + ' wrapped=' + (probe ? probe.wrapped : 'n/a') + ' tier=' + (probe ? JSON.stringify(probe.tier) : 'n/a')
        + (tierOk ? '' : '；档位非法（应为 auto|lowkey）'),
    });

    // L2–L4：仅当 L1 成立才可驱动（无图标则无从点击；不伪造绿，逐级登记为 skip）
    let driven = [];
    if (L1ok) {
      driven = await runDeepChecks(page, probeFrame, t, plan);
    } else {
      driven = DRIVEN_LEVELS.map((l) => ({ level: l, label: 'blocked', status: 'skip', detail: 'L1 未成立，阶梯中断（如实登记，不伪造绿）' }));
    }
    for (const c of driven) {
      if (!declared(c.level)) c.status = 'skip';
      checks.push(c);
    }

    rec.ladder = checks;
    rec.levels = reduceLevels(checks);
    const failed = checks.filter(c => c.status === 'fail');
    const passedLevels = LADDER_ALL.filter(l => rec.levels[l] === 'pass');
    rec.deep = driven.filter(c => DRIVEN_LEVELS.includes(c.level))
      .map(c => ({ target: t.id, label: c.label, pass: c.status === 'pass', detail: c.detail }));
    if (failed.length) {
      rec.status = 'fail';
      const diag = await diagnoseChallenge(page);
      rec.detail = failed.map(c => c.level + ':' + c.label + ' ' + c.detail).join(' | ')
        + (diag.challenged ? '；疑似反爬挑战未化解（title="' + diag.title + '"）' : '');
      for (const c of failed) failures.push(t.id + ' [' + c.level + ':' + c.label + '] ' + c.detail);
    } else {
      rec.status = 'pass';
      rec.detail = '声明阶梯 ' + (t.ladder || []).join('/') + ' 全部通过（' + passedLevels.join('/') + '）'
        + (t.frame ? '；嵌套帧 ' + t.frame : '');
    }
  } catch (e) {
    rec.status = t.expect === 'injected' ? 'fail' : 'error';
    rec.detail = String((e && e.message) || e).split('\n')[0].slice(0, 200);
    if (t.expect === 'injected') failures.push(t.id + ': ' + rec.detail);
  } finally {
    rec.pageErrors = pageErrors.length;
    rec.elapsedMs = Date.now() - t0;
    await ctx.close();
  }
  return rec;
}

try {
  if (runnable.some(t => t.kind === 'mirror')) server = await servePages();
  browser = await chromium.launch({ headless: HEADLESS });
  for (const t of runnable) results.push(await runTarget(t));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(r => server.close(r));
}

const gate = violations.length === 0 && failures.length === 0;

const pad = (s, n) => String(s).padEnd(n);
const levelStr = (rec) => LADDER_ALL.map(l => rec.levels[l] ? (rec.levels[l] === 'pass' ? l + '+' : l + '!') : l + '-').join(' ');
console.log('— 真实站点低频冒烟（票 32/39/05/07 · A-006/A-016/A-029）全阶梯 L0–L4: 选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length + ' / 浏览器 ' + (HEADLESS ? 'headless' : 'headed'));
for (const r of results) console.log('[' + pad(r.status, 8) + '] ' + pad(r.id, 26) + ' expect=' + pad(r.expect, 8) + ' errs=' + r.pageErrors + ' ' + pad(levelStr(r), 22) + ' ' + r.detail);
for (const s of skipped) console.log('[SKIPPED ] ' + pad(s.id, 26) + ' ticket=' + pad(s.ticket, 4) + ' reason=' + String(s.reason).slice(0, 70));
console.log('白名单契约 + 全阶梯契约 + harness 自证: ' + (gate ? 'PASS' : 'FAIL'));
for (const v of violations) console.log('  VIOLATION ' + v);
for (const f of failures) console.log('  FAILURE ' + f);

const ladderChecks = results.flatMap(r => (r.ladder || []).map(c => ({ target: r.id, level: c.level, label: c.label, status: c.status, detail: c.detail })));
const summary = {
  ticket: 7, coveredA: 'A-029', layer: 'real-site live smoke (advisory) — full ladder L0–L4',
  manifest: 'tests/live/site-manifest.json',
  ladderRule: 'tests/ACCEPTANCE-SURFACE.md §4.1/§4.2；本层与 owned 页都跑 L0–L4，差别只在阻断语义（本层 advisory，阻断只在 release.yml 发布门 ADR-0010）',
  writeSurfaceRule: 'L3 判据按写入口形态分派（票 11 / A-035）：ITI 接管字段 → 选中国家状态（官方读 API / DOM 选中态 / 官方 countrychange 事件）；普通字段 → 宿主 value + input·change（票 07 原判据逐字不变）',
  amendedBy: 'ticket 11 (A-035) — ITI 形态 L3 判据收敛',
  launch: HEADLESS ? 'headless' : 'headed',
  gate: gate ? 'pass' : 'fail', violations, failures,
  counts: {
    selected: selected.length, runnable: runnable.length, skipped: skipped.length,
    observed: results.filter(r => r.status === 'observed').length,
    ladderChecks: ladderChecks.length,
    ladderFailures: ladderChecks.filter(c => c.status === 'fail').length,
  },
  ladderCoverage: Object.fromEntries(LADDER_ALL.map(l => [l, selected.filter(t => (t.ladder || []).includes(l)).length])),
  ladderChecks,
  deepChecks: results.filter(r => r.deep).flatMap(r => r.deep),
  results,
  skipped: skipped.map(s => ({ id: s.id, ticket: s.ticket, reason: s.reason })),
};
const jsonPath = arg('--json');
if (jsonPath) { writeOut(jsonPath, JSON.stringify(summary, null, 2) + '\n'); console.log('json → ' + jsonPath); }
const mdPath = arg('--out');
if (mdPath) {
  const L = [];
  L.push('# 真实站点低频冒烟报告（票 32 / A-006 · 票 39 / A-016 · 票 07 / A-029）');
  L.push('');
  L.push('- 层定位: advisory（仅 schedule / workflow_dispatch 触发，不进 PR 触发面）；阻断只发生在 release.yml 发布门（ADR-0010）');
  L.push('- 断言阶梯: L0 静默健康 / L1 元素已注入 / L2 交互可驱动 / L3 写入结果正确 / L4 用户反馈出现（tests/ACCEPTANCE-SURFACE.md §4.1）');
  L.push('- 浏览器: ' + (HEADLESS ? 'headless' : 'headed'));
  L.push('- 白名单契约 + 全阶梯契约: ' + (violations.length ? 'FAIL' : 'PASS') + '；harness 自证: ' + (failures.length ? 'FAIL' : 'PASS'));
  L.push('- 计数: 选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length + ' / 阶梯检查 ' + ladderChecks.length + '（失败 ' + ladderChecks.filter(c => c.status === 'fail').length + '）');
  L.push('- 阶梯覆盖（声明该级别的目标数）: ' + LADDER_ALL.map(l => l + '=' + summary.ladderCoverage[l]).join(' '));
  L.push('');
  L.push('| 目标 | 类型 | 期望 | 帧 | 状态 | L0 | L1 | L2 | L3 | L4 | 未捕获异常 | 明细 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const cells = LADDER_ALL.map(l => (r.levels[l] ? (r.levels[l] === 'pass' ? 'pass' : r.levels[l]) : '-'));
    L.push('| ' + [r.id, r.kind, r.expect, r.frame || '(顶层)', r.status, ...cells, r.pageErrors, r.detail].join(' | ') + ' |');
  }
  for (const s of skipped) L.push('| ' + [s.id, s.kind, s.expect, s.frame || '(顶层)', 'skipped', '-', '-', '-', '-', '-', '-', 'ticket=' + s.ticket].join(' | ') + ' |');
  if (ladderChecks.length) {
    L.push('');
    L.push('### 全阶梯逐项检查（票 07 / A-029；共享原语驱动，真实站点不再止于 L0–L1）');
    L.push('');
    L.push('| 目标 | 级别 | 检查 | 结果 | 明细 |');
    L.push('|---|---|---|---|---|');
    for (const c of ladderChecks) L.push('| ' + [c.target, c.level, c.label, c.status, c.detail].join(' | ') + ' |');
  }
  L.push('');
  writeOut(mdPath, L.join('\n') + '\n');
  console.log('report → ' + mdPath);
}
process.exit(gate ? 0 : 1);
