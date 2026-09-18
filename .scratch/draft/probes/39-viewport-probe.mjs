import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const userscript = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');
const GM_STUB = '(() => { const KEY="__cch_gm__"; const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}; window.GM_getValue=(k,d)=>{const s=read();return k in s?s[k]:d}; window.GM_setValue=(k,v)=>{const s=read();s[k]=v;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}; window.GM_addValueChangeListener=()=>0; window.GM_registerMenuCommand=()=>0; })();';
const URL = 'https://codepen.io/pen/ExzVrPY';
const cases = [
  { id: 'default-viewport', ctx: {} },
  { id: 'vp-1280x900', ctx: { viewport: { width: 1280, height: 900 } } },
];
for (const c of cases) {
  const b = await chromium.launch({ headless: false });
  const ctx = await b.newContext(c.ctx);
  const page = await ctx.newPage();
  await page.addInitScript(GM_STUB); await page.addInitScript(userscript);
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(2000); const t = await page.title(); if (!/just a moment|checking/i.test(t)) break; }
  console.log(c.id + ' | title=' + (await page.title()).slice(0, 40) + ' | vp=' + JSON.stringify(page.viewportSize()));
  for (let k = 0; k < 6; k++) {
    await page.waitForTimeout(5000);
    const fr = page.frames().map(f => f.url().slice(0, 60));
    let w = 0;
    const cf = page.frames().find(f => /cdpn\.io/.test(f.url()));
    if (cf) { try { w = await cf.evaluate(() => document.querySelectorAll('.cch-wrapper').length); } catch {} }
    console.log('  t=' + Math.round((Date.now() - t0) / 1000) + 's frames=' + fr.length + ' cdpn=' + (cf ? 'yes' : 'no') + ' wrapper=' + w + ' | ' + JSON.stringify(fr));
  }
  await b.close();
}
