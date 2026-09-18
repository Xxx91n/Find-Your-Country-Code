// 39-matrix-probe.mjs — 隔离变量矩阵：headless-shell vs 完整 chromium；默认 UA vs Chrome UA；反自动化标志
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const userscript = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');
const GM_STUB = [
  '(() => { const KEY="__cch_gm__";',
  '  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}};',
  '  window.GM_getValue=(k,d)=>{const s=read();return k in s?s[k]:d};',
  '  window.GM_setValue=(k,v)=>{const s=read();s[k]=v;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};',
  '  window.GM_addValueChangeListener=()=>0; window.GM_registerMenuCommand=()=>0;',
  '})();',
].join('\n');
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const URL = 'https://codepen.io/pen/ExzVrPY';
const combos = [
  { id: 'shell+defUA', channel: undefined, ua: undefined, flag: false },
  { id: 'shell+chromeUA', channel: undefined, ua: CHROME_UA, flag: false },
  { id: 'full+defUA', channel: 'chromium', ua: undefined, flag: false },
  { id: 'full+chromeUA+flag', channel: 'chromium', ua: CHROME_UA, flag: true },
];
for (const c of combos) {
  const opts = { headless: true };
  if (c.channel) opts.channel = c.channel;
  if (c.flag) opts.args = ['--disable-blink-features=AutomationControlled'];
  const browser = await chromium.launch(opts);
  const ctxOpts = { viewport: { width: 1280, height: 900 }, locale: 'en-US' };
  if (c.ua) ctxOpts.userAgent = c.ua;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e).split('\n')[0].slice(0, 100)));
  const rec = { combo: c.id, challenged: null, title: null, tWrapperMs: null, mainWrapper: 0, previewWrapper: 0, previewUrl: null, pageErrors: 0 };
  try {
    await page.addInitScript(GM_STUB);
    await page.addInitScript(userscript);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // 轮询直到挑战化解或 32s
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(2000);
      const t = await page.title();
      if (!/just a moment|checking your browser|attention required/i.test(t)) break;
    }
    rec.title = (await page.title()).slice(0, 50);
    rec.challenged = /just a moment|checking your browser|attention required/i.test(rec.title);
    if (!rec.challenged) {
      // 轮询 preview 帧 + .cch-wrapper，1s 步进至 40s
      for (let i = 0; i < 40; i++) {
        const f = page.frames().find(x => /cdpn\.io/.test(x.url()));
        if (f) {
          rec.previewUrl = f.url().slice(0, 90);
          let n = 0;
          try { n = await f.evaluate(() => document.querySelectorAll('.cch-wrapper').length); } catch {}
          if (n > 0) { rec.tWrapperMs = Date.now() - t0; rec.previewWrapper = n; break; }
        }
        await page.waitForTimeout(1000);
      }
      rec.mainWrapper = await page.mainFrame().evaluate(() => document.querySelectorAll('.cch-wrapper').length);
    }
  } catch (e) { rec.error = String(e && e.message || e).split('\n')[0].slice(0, 120); }
  rec.pageErrors = errs.length;
  console.log(JSON.stringify(rec));
  await browser.close();
}
