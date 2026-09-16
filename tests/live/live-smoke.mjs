// ══════════════════════════════════════════════════════════════════
// live-smoke.mjs — 票 32 真实站点低频冒烟层（第二层）；票 39 增补嵌套帧断言
// 定位：与密封 E2E（第一层，CI 必跑、零外网、PR 阻断）解耦。本层只做「低频 / 手动触发 +
//       可跳过白名单 + 弱断言 + 失败 advisory」，永不出现在 pull_request 触发面。
// 硬校验（exit 1）：白名单契约（跳过条目必须带非空 reason + ticket）；expect="injected" 的
//       目标必须真的注入（harness 自证）且全程无未捕获异常。
// 软观测（不退出）：expect="observe" 的目标只记录观测值（供票 27/28/29 作复现基线）。
// 票 39 增补（A-016）：
//   - 嵌套帧断言：目标可声明 frame（子串匹配子帧 URL），断言在匹配子帧内求值
//     （CodePen 编辑器页 + 嵌套 preview iframe / Pen fullpage 的 srcdoc 帧）；未声明则顶层帧。
//   - 未捕获异常断言：expect="injected" 目标要求 pageerror 计数为 0。
//   - 有头启动：真实站点普遍前置反爬托管挑战。默认 headless:false；CI 走 xvfb-run；无 DISPLAY
//     时自动回退 headless 并打印告警（此时受挑战站点如实报错，不伪造绿）。CCH_LIVE_HEADLESS=1 强制 headless。
//   - 挑战检测仅用于诊断文案（不作控制流）：避免本地化挑战标题（如「请稍候…」）导致误判；
//     成败一律由「目标帧内 .cch-wrapper 是否出现」裁定。
// 票 05 增补（A-029）：
//   - GM 替身 / DOM 探针 / 交互原语改由 tests/helpers/primitives.mjs **唯一提供**（与密封层同一份
//     文件），本层不再内联第二套 stub 与 PROBE —— 两 harness 收敛为同一份原语。
//   - 自有镜像目标可声明 deep：用共享原语驱动 open→search→select→读回宿主 value（+input/change
//     事件 + toast 反馈），作为「同一份原语在 live runtime（独立 node + playwright，无测试运行器）
//     可用」的自证；第三方真实站点目标仍不深交互。
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
import {
  DIST_PATH, installUserscript, injectionSatisfied, openPanel, readFeedback,
  readFieldEvents, readHostValue, readInjection, readVisibleRows, recordFieldEvents, searchType, selectCountry,
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
// 仅用于诊断文案（不作控制流）：覆盖常见本地化挑战标题 + 挑战帧 URL。
const CHALLENGE_RE = /just a moment|checking your browser|attention required|enable javascript and cookies|verifying you are human|请稍候|稍候|einen moment|un momento|vérification|sicherheitsüberprüfung/i;
const CHALLENGE_FRAME_RE = /challenges\.cloudflare\.com|cdn-cgi\/challenge-platform/i;

const NO_DISPLAY_LINUX = process.platform === 'linux' && !process.env.DISPLAY;
const FORCE_HEADLESS = process.env.CCH_LIVE_HEADLESS === '1';
const HEADLESS = FORCE_HEADLESS || NO_DISPLAY_LINUX;



const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function arg(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; }
function writeOut(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }

// ── 契约校验：白名单必须可审计（跳过 ≠ 静默丢失） ──
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
    if (!t.enabled && (!t.reason || !t.ticket)) v.push(t.id + ': 跳过条目必须携带 reason + ticket（可审计白名单）');
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

// 仅用于失败文案诊断：是否仍停在反爬挑战面（本地化标题 / 挑战帧 URL）。
async function diagnoseChallenge(page) {
  const title = await page.title().catch(() => '');
  const frameHit = page.frames().some(f => CHALLENGE_FRAME_RE.test(f.url()));
  return { challenged: CHALLENGE_RE.test(title) || frameHit, title: title.slice(0, 60) };
}

// ── 票 05 [A-029]：共享原语驱动链（open → search → select → 读回宿主 value） ──
// 只在自有镜像目标上跑（kind=mirror，零外网、确定性）；第三方真实站点不深交互。
// 软收集：逐项 {label, pass, detail}，一次收全量，不因单项失败中断后续读取。
async function runDeepChecks(frame, t) {
  const checks = [];
  const mark = (label, pass, detail) => checks.push({ label: label, pass: !!pass, detail: String(detail) });
  const why = e => String((e && e.message) || e).split('\n')[0].slice(0, 160);

  try {
    await openPanel(frame, t.selector);
    mark('open-panel', true, '#cch-pop 可见');
  } catch (e) {
    mark('open-panel', false, why(e));
    return checks;
  }

  try {
    await recordFieldEvents(frame, t.selector, ['input', 'change']);
  } catch (e) {
    mark('record-events', false, why(e));
  }

  try {
    await searchType(frame, t.deep.query);
    // 可见行计数经共享原语读取（选择器唯一定义处 = primitives.mjs，本层不硬编码）
    const visible = (await readVisibleRows(frame)).length;
    mark('search-type', visible > 0, '可见行 ' + visible + '（查询 "' + t.deep.query + '"）');
  } catch (e) {
    mark('search-type', false, why(e));
  }

  try {
    await selectCountry(frame, t.deep.iso);
    mark('select-country', true, 'iso=' + t.deep.iso);
  } catch (e) {
    mark('select-country', false, why(e));
    return checks;
  }

  const value = await readHostValue(frame, t.selector).catch(() => null);
  mark('read-host-value', value === t.deep.expectValue,
    'value=' + JSON.stringify(value) + ' 期望=' + JSON.stringify(t.deep.expectValue));

  const events = await readFieldEvents(frame).catch(() => []);
  mark('field-events', events.includes('input') && events.includes('change'),
    '序列 [' + events.join(',') + ']');

  const fb = await readFeedback(frame).catch(() => null);
  mark('feedback', !!fb && fb.present, fb ? ('on=' + fb.on + ' 文本=' + JSON.stringify(fb.text.slice(0, 60))) : '不可读');

  return checks;
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const violations = validate(manifest);
const only = arg('--target');

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
  const rec = { id: t.id, kind: t.kind, expect: t.expect, frame: t.frame || null, frameUrl: null, status: 'unknown', detail: '', observed: null, deep: null, pageErrors: 0, elapsedMs: 0 };
  const t0 = Date.now();
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

    if (t.expect === 'injected') {
      let probe = null;
      for (;;) {
        probe = await readInjection(probeFrame, t.selector || null).catch(() => null);
        if (injectedOk(probe, t.selector) || Date.now() >= deadline) break;
        await page.waitForTimeout(POLL_MS);
      }
      rec.observed = probe;
      if (!injectedOk(probe, t.selector)) {
        const diag = await diagnoseChallenge(page);
        rec.status = 'fail';
        rec.detail = '未注入 (wrappers=' + (probe ? probe.wrappers : 'n/a') + ', elementFound=' + (probe ? probe.elementFound : 'n/a') + ', wrapped=' + (probe ? probe.wrapped : 'n/a') + ')'
          + (diag.challenged ? '；疑似反爬挑战未化解（title="' + diag.title + '"）' : '');
        failures.push(t.id + ': ' + rec.detail);
      } else if (pageErrors.length > 0) {
        rec.status = 'fail';
        rec.detail = '注入成立但存在未捕获异常 ' + pageErrors.length + ' 条：' + pageErrors[0];
        failures.push(t.id + ': ' + rec.detail);
      } else {
        rec.status = 'pass';
        rec.detail = '.cch-wrapper 已挂上目标字段' + (t.frame ? '（嵌套帧 ' + t.frame + ' 内）' : '') + '，无未捕获异常';
        // 票 05 [A-029]：自有镜像目标额外跑共享原语驱动链，作为「同一份原语在 live runtime 可用」的自证。
        if (t.kind === 'mirror' && t.deep) {
          rec.deep = await runDeepChecks(probeFrame, t);
          const okCount = rec.deep.filter(c => c.pass).length;
          rec.detail += '；deep ' + okCount + '/' + rec.deep.length + ' 通过';
          for (const c of rec.deep) {
            if (!c.pass) failures.push(t.id + ' [deep:' + c.label + '] ' + c.detail);
          }
        }
      }
    } else {
      await page.waitForTimeout(SETTLE_MS);
      const probe = await readInjection(probeFrame, t.selector || null).catch(() => null);
      rec.observed = probe;
      rec.status = 'observed';
      rec.detail = !probe ? '帧不可求值'
        : (t.selector ? ('wrapped=' + probe.wrapped + ' wrappers=' + probe.wrappers + ' buttons=' + probe.buttons)
          : ('未校准（selector 为空，仅记录 wrapper/button 计数）wrappers=' + probe.wrappers + ' buttons=' + probe.buttons));
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
console.log('— 真实站点低频冒烟（票 32 / A-006；票 39 嵌套帧）: 选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length + ' / 浏览器 ' + (HEADLESS ? 'headless' : 'headed'));
for (const r of results) console.log('[' + pad(r.status, 8) + '] ' + pad(r.id, 26) + ' expect=' + pad(r.expect, 8) + ' errs=' + r.pageErrors + ' ' + r.detail);
for (const s of skipped) console.log('[SKIPPED ] ' + pad(s.id, 26) + ' ticket=' + pad(s.ticket, 4) + ' reason=' + String(s.reason).slice(0, 70));
console.log('白名单契约 + harness 自证: ' + (gate ? 'PASS' : 'FAIL'));
for (const v of violations) console.log('  VIOLATION ' + v);
for (const f of failures) console.log('  FAILURE ' + f);

const summary = {
  ticket: 39, coveredA: 'A-016', layer: 'real-site live smoke (advisory)',
  manifest: 'tests/live/site-manifest.json',
  launch: HEADLESS ? 'headless' : 'headed',
  gate: gate ? 'pass' : 'fail', violations, failures,
  counts: { selected: selected.length, runnable: runnable.length, skipped: skipped.length, observed: results.filter(r => r.status === 'observed').length },
  deepChecks: results.filter(r => r.deep).flatMap(r => r.deep.map(c => ({ target: r.id, label: c.label, pass: c.pass, detail: c.detail }))),
  results,
  skipped: skipped.map(s => ({ id: s.id, ticket: s.ticket, reason: s.reason })),
};
const jsonPath = arg('--json');
if (jsonPath) { writeOut(jsonPath, JSON.stringify(summary, null, 2) + '\n'); console.log('json → ' + jsonPath); }
const mdPath = arg('--out');
if (mdPath) {
  const L = [];
  L.push('# 真实站点低频冒烟报告（票 32 / A-006；票 39 / A-016）');
  L.push('');
  L.push('- 层定位: advisory（仅 schedule / workflow_dispatch 触发，不进 PR 触发面）');
  L.push('- 浏览器: ' + (HEADLESS ? 'headless' : 'headed'));
  L.push('- 白名单契约: ' + (violations.length ? 'FAIL' : 'PASS') + '；harness 自证: ' + (failures.length ? 'FAIL' : 'PASS'));
  L.push('- 计数: 选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length);
  L.push('');
  L.push('| 目标 | 类型 | 期望 | 帧 | 状态 | 未捕获异常 | 观测 |');
  L.push('|---|---|---|---|---|---|---|');
  for (const r of results) L.push('| ' + [r.id, r.kind, r.expect, r.frame || '(顶层)', r.status, r.pageErrors, r.detail].join(' | ') + ' |');
  for (const s of skipped) L.push('| ' + [s.id, s.kind, s.expect, s.frame || '(顶层)', 'skipped', '-', 'ticket=' + s.ticket].join(' | ') + ' |');
  const deepRecs = results.filter(r => r.deep);
  if (deepRecs.length) {
    L.push('');
    L.push('### 共享原语驱动链（票 05 / A-029；仅自有镜像目标）');
    L.push('');
    L.push('| 目标 | 检查 | 结果 | 明细 |');
    L.push('|---|---|---|---|');
    for (const r of deepRecs) for (const c of r.deep) L.push('| ' + [r.id, c.label, c.pass ? 'pass' : 'FAIL', c.detail].join(' | ') + ' |');
  }
  L.push('');
  writeOut(mdPath, L.join('\n') + '\n');
  console.log('report → ' + mdPath);
}
process.exit(gate ? 0 : 1);
