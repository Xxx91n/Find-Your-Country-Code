// ══════════════════════════════════════════════════════════════
// 10-probe-srcdoc-origin.mjs — 票 10 / A-034 一次性取证探针
//
// 目的（issue 验收项 3）：实测 `about:srcdoc` 帧的 `location.origin` vs `window.origin` 对照，
// 并实测同一帧内入站消息的 `e.origin`（postMessage 与 BroadcastChannel 两个面）。
// 同时复现跨帧填充指令被静默丢弃的缺陷（同一目标 / 同一阶梯）。
//
// 纪律：与密封层共用同一份交互原语（tests/helpers/primitives.mjs），不新造第二套；
//      不 import playwright/test，不含 expect（探针只输出事实）。
// 运行：npm run build && node .scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const PORT = Number(process.env.E2E_PORT || 4273);
const P = await import(pathToFileURL(path.join(ROOT, 'tests', 'helpers', 'primitives.mjs')).href);

const server = spawn(process.execPath, [path.join(ROOT, 'tests', 'server.mjs')], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/fixtures/srcdoc-frame.html'); if (r.ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('fixture server 未就绪');
}

let browser;
const out = {};
try {
  await waitServer();
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let pageErrors = 0;
  page.on('pageerror', () => { pageErrors++; });
  await P.installUserscript(page);
  await page.goto('http://127.0.0.1:' + PORT + '/fixtures/srcdoc-frame.html');

  // ── 1. 定位 srcdoc 帧（srcdoc iframe 在初始 HTML 内，frameattached 早于等待点，改由句柄取）──
  const child = await (await page.waitForSelector('#f-srcdoc')).contentFrame();
  if (!child) throw new Error('srcdoc frame 未就绪');
  await child.waitForLoadState();
  out.frameUrls = page.frames().map((f) => f.url());

  // ── 2. 帧 origin 对照（修复前）──
  out.frameOrigins = await child.evaluate(() => {
    let topHref = null; let topReadable = false;
    try { topHref = window.top.location.href; topReadable = typeof topHref === 'string'; } catch {}
    return {
      href: location.href,
      locationOrigin: location.origin,
      windowOrigin: window.origin,
      documentOrigin: (document.location && document.location.origin) || null,
      isTop: window.self === window.top,
      topReadable,
      topHref,
    };
  });

  // ── 3. postMessage 入站 e.origin（两面：子→顶 / 顶→子）──
  await page.evaluate(() => {
    window.__probePm = null;
    window.addEventListener('message', (e) => { if (e.data && e.data.__probe) window.__probePm = { from: e.data.__probe, origin: e.origin, sourceIsTop: e.source === window.top }; });
  });
  await child.evaluate(() => {
    window.__probePm = null;
    window.addEventListener('message', (e) => { if (e.data && e.data.__probe) window.__probePm = { from: e.data.__probe, origin: e.origin, sourceIsTop: e.source === window.top }; });
  });
  await child.evaluate(() => { window.top.postMessage({ __probe: 'child-to-top' }, '*'); });
  await page.evaluate(() => { window.frames[0].postMessage({ __probe: 'top-to-child' }, '*'); });
  await sleep(120);
  out.postMessage = { topReceived: await page.evaluate(() => window.__probePm), childReceived: await child.evaluate(() => window.__probePm) };

  // ── 4. BroadcastChannel 入站 e.origin（store:67/:97 同面）──
  await child.evaluate(() => {
    window.__probeBc = null;
    const bc = new BroadcastChannel('cch-rules-sync-v1');
    bc.addEventListener('message', (e) => { if (e.data && e.data.sid === 'probe-10') window.__probeBc = { origin: e.origin, sid: e.data.sid }; });
  });
  await page.evaluate(() => {
    const bc = new BroadcastChannel('cch-rules-sync-v1');
    bc.postMessage({ type: 'cch-rules-sync-v1', sid: 'probe-10', rules: { version: 1, exempt: [], overrides: [], global: null } });
  });
  await sleep(200);
  out.broadcastChannel = { childReceived: await child.evaluate(() => window.__probeBc) };

  // ── 5. 跨帧填充链路（同一目标 / 同一阶梯：L3 写入结果 + L4 反馈）──
  await P.waitForInjection(child, '#srcc-cc');
  await P.recordFieldEvents(child, '#srcc-cc', ['input', 'change']);
  out.injection = await P.readInjection(child, '#srcc-cc');
  await P.openPanelRemote(child, '#srcc-cc', page);
  await P.selectCountry(page, 'cn', { query: 'China' });
  await sleep(300);
  out.fill = {
    hostValue: await P.readHostValue(child, '#srcc-cc'),
    fieldEvents: await P.readFieldEvents(child),
    feedback: await P.readFeedback(child),
    lastFill: await child.evaluate(() => (typeof window.__cchLastFill === 'undefined' ? null : window.__cchLastFill)),
  };
  out.pageErrors = pageErrors;

  console.log(JSON.stringify(out, null, 2));
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { server.kill(); } catch {}
}