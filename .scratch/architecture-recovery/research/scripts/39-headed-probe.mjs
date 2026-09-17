import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const userscript = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');
const GM_STUB = '(() => { const KEY="__cch_gm__"; const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}; window.GM_getValue=(k,d)=>{const s=read();return k in s?s[k]:d}; window.GM_setValue=(k,v)=>{const s=read();s[k]=v;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}; window.GM_addValueChangeListener=()=>0; window.GM_registerMenuCommand=()=>0; })();';
const URL = 'https://codepen.io/pen/ExzVrPY';
const combos = [
  { id: 'headed+full+defUA', channel: 'chromium', headless: false, ua: undefined },
];
for (const c of combos) {
  const o = { headless: c.headless };
  if (c.channel) o.channel = c.channel;
  const b = await chromium.launch(o);
  const co = { viewport: { width: 1280, height: 900 }, locale: 'en-US' };
  if (c.ua) co.userAgent = c.ua;
  const ctx = await b.newContext(co); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', () => errs.push(1));
  const rec = { combo: c.id, challenged: null, title: null, ua: null, tWrapperMs: null, previewWrapper: 0, pageErrors: 0 };
  try {
    await page.addInitScript(GM_STUB); await page.addInitScript(userscript);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.ua = await page.evaluate(() => navigator.userAgent);
    for (let i = 0; i < 16; i++) { await page.waitForTimeout(2000); const t = await page.title(); if (!/just a moment|checking your browser|attention required/i.test(t)) break; }
    rec.title = (await page.title()).slice(0, 50);
    rec.challenged = /just a moment|checking your browser|attention required/i.test(rec.title);
    if (!rec.challenged) { for (let i = 0; i < 40; i++) { const f = page.frames().find(x => /cdpn\.io/.test(x.url())); if (f) { let n = 0; try { n = await f.evaluate(() => document.querySelectorAll('.cch-wrapper').length); } catch {} if (n > 0) { rec.tWrapperMs = Date.now() - t0; rec.previewWrapper = n; break; } } await page.waitForTimeout(1000); } }
  } catch (e) { rec.error = String(e && e.message || e).split('\n')[0].slice(0, 110); }
  rec.pageErrors = errs.length;
  console.log(JSON.stringify(rec));
  await b.close();
}
