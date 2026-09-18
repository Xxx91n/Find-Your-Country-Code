import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const userscript = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');
const GM_STUB = '(() => { const KEY="__cch_gm__"; const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}; window.GM_getValue=(k,d)=>{const s=read();return k in s?s[k]:d}; window.GM_setValue=(k,v)=>{const s=read();s[k]=v;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}; window.GM_addValueChangeListener=()=>0; window.GM_registerMenuCommand=()=>0; })();';
const PROBE = sel => {
  const wrappers = document.querySelectorAll('.cch-wrapper').length;
  const buttons = document.querySelectorAll('.cch-btn').length;
  let el = null, found = null, wrapped = null, tier = null, score = null;
  if (sel) { el = document.querySelector(sel); found = !!el; wrapped = el ? !!el.closest('.cch-wrapper') : null; if (el) { const w = el.closest('.cch-wrapper'); if (w) { const bt = w.querySelector('.cch-btn'); tier = bt && bt.getAttribute('data-cch-tier'); score = bt && bt.getAttribute('data-cch-score'); } } }
  return { title: document.title.slice(0, 40), wrappers, buttons, found, wrapped, tier, score };
};
const CH = /just a moment|checking your browser|attention required|请稍候|verifying you are human/i;
const cases = [
  { url: 'https://codepen.io/pen/ExzVrPY', frame: 'cdpn.io', sel: '#mobile_code' },
  { url: 'https://countrycode.org/', frame: null, sel: '#countrySelect' },
  { url: 'https://cdpn.io/webdevpuneet/fullpage/ExzVrPY', frame: 'srcdoc', sel: null },
];
const b = await chromium.launch({ headless: false });
for (const c of cases) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e).split('\n')[0].slice(0, 90)));
  await page.addInitScript(GM_STUB); await page.addInitScript(userscript);
  const rec = { url: c.url, status: 'unknown', title: null, challenged: null, ms: 0, frame: null, frameUrl: null, probe: null, pageErrors: 0 };
  try {
    const t0 = Date.now();
    await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    for (let i = 0; i < 15; i++) { await page.waitForTimeout(2000); const t = await page.title(); if (!CH.test(t)) break; }
    rec.title = (await page.title()).slice(0, 45);
    rec.challenged = CH.test(rec.title);
    rec.status = rec.challenged ? 'challenged' : 'ok';
    if (!rec.challenged) {
      let target = page.mainFrame();
      for (let i = 0; i < 30; i++) {
        if (c.frame) { const f = page.frames().find(x => x !== page.mainFrame() && x.url().includes(c.frame)); if (f) target = f; else { await page.waitForTimeout(1000); continue; } }
        const p = await target.evaluate(PROBE, c.sel).catch(() => null);
        if (p && p.wrappers > 0) { rec.probe = p; break; }
        rec.probe = p;
        await page.waitForTimeout(1000);
      }
      rec.frameUrl = target.url().slice(0, 80);
    }
    rec.ms = Date.now() - t0;
  } catch (e) { rec.status = 'fail'; rec.error = String(e && e.message || e).split('\n')[0].slice(0, 110); }
  rec.pageErrors = errs.length;
  console.log(JSON.stringify(rec));
  await ctx.close();
}
await b.close();
