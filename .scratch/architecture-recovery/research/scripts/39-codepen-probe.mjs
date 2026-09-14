// 39-codepen-probe.mjs — 票 39 一次性侦察：CodePen 编辑器页可达性 + preview iframe 结构 + 目标形态
// 用法: node .scratch/architecture-recovery/research/scripts/39-codepen-probe.mjs <url> [url...]
// 输出: 紧凑 JSON（每 URL 一段）：status / 帧清单 / 每帧 DOM 形态 / pageerror
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const DIST = ROOT + '/dist/find-your-country-code.user.js';
const userscript = readFileSync(DIST, 'utf8');

const GM_STUB = [
  '(() => {',
  '  const KEY = "__cch_gm__";',
  '  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };',
  '  window.GM_getValue = (k, d) => { const s = read(); return k in s ? s[k] : d; };',
  '  window.GM_setValue = (k, v) => { const s = read(); s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };',
  '  window.GM_addValueChangeListener = () => 0;',
  '  window.GM_registerMenuCommand = () => 0;',
  '})();',
].join('\n');

const urls = process.argv.slice(2);
if (!urls.length) { console.error('usage: node 39-codepen-probe.mjs <url>...'); process.exit(2); }

const PROBE = () => {
  const out = { url: location.href, origin: location.origin, title: document.title.slice(0, 80) };
  out.wrappers = document.querySelectorAll('.cch-wrapper').length;
  out.buttons = document.querySelectorAll('.cch-btn').length;
  const sels = Array.from(document.querySelectorAll('select'));
  out.selects = sels.length;
  out.tel = document.querySelectorAll('input[type=tel]').length;
  out.combobox = document.querySelectorAll('[role=combobox]').length;
  out.divCountryish = Array.from(document.querySelectorAll('div')).filter(d => /country|dial|phone/i.test(String(d.className || '') + ' ' + String(d.getAttribute('aria-label') || ''))).length;
  const cand = Array.from(document.querySelectorAll('select, input[type=tel], [role=combobox]'));
  out.sample = cand.slice(0, 10).map(e => ({
    tag: e.tagName.toLowerCase(),
    id: e.id || null,
    name: e.getAttribute('name'),
    cls: String(e.className || '').slice(0, 50),
    aria: e.getAttribute('aria-label'),
    opts: e.tagName === 'SELECT' ? e.options.length : null,
  }));
  return out;
};

const browser = await chromium.launch({ headless: true });
for (const url of urls) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e).split('\n')[0].slice(0, 150)));
  try {
    await page.addInitScript(GM_STUB);
    await page.addInitScript(userscript);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(7000);
    const frames = [];
    for (const f of page.frames()) {
      let probe = null, err = null;
      try { probe = await f.evaluate(PROBE); } catch (e) { err = String(e && e.message || e).split('\n')[0].slice(0, 110); }
      frames.push({ url: f.url().slice(0, 140), name: f.name(), main: f === page.mainFrame(), probe, err });
    }
    console.log(JSON.stringify({ url, status: 'ok', ms: Date.now() - t0, pageErrors: errs.slice(0, 6), frameCount: frames.length, frames }, null, 1));
  } catch (e) {
    console.log(JSON.stringify({ url, status: 'goto-fail', error: String(e && e.message || e).split('\n')[0].slice(0, 220), pageErrors: errs.slice(0, 6) }, null, 1));
  } finally { await ctx.close(); }
}
await browser.close();
