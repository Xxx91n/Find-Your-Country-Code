import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const userscript = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');
const GM_STUB = '(() => { const KEY="__cch_gm__"; const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}; window.GM_getValue=(k,d)=>{const s=read();return k in s?s[k]:d}; window.GM_setValue=(k,v)=>{const s=read();s[k]=v;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}; window.GM_addValueChangeListener=()=>0; window.GM_registerMenuCommand=()=>0; })();';
const URL = 'https://codepen.io/pen/ExzVrPY';
const b = await chromium.launch({ headless: false });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e).split('\n')[0].slice(0, 120)));
await page.addInitScript(GM_STUB); await page.addInitScript(userscript);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 16; i++) { await page.waitForTimeout(2000); const t = await page.title(); if (!/just a moment|checking your browser|attention required/i.test(t)) break; }
console.log('title:', (await page.title()).slice(0, 50));
let frame = null;
for (let i = 0; i < 40; i++) { frame = page.frames().find(x => /cdpn\.io/.test(x.url())); if (frame) { let n = 0; try { n = await frame.evaluate(() => document.querySelectorAll('.cch-wrapper').length); } catch {} if (n > 0) break; } await page.waitForTimeout(1000); }
console.log('previewFrame:', frame ? frame.url().slice(0, 90) : '(none)');
const info = await frame.evaluate(() => {
  const o = {};
  o.wrappers = document.querySelectorAll('.cch-wrapper').length;
  o.buttons = document.querySelectorAll('.cch-btn').length;
  o.inputs = [...document.querySelectorAll('input')].map(e => ({ type: e.getAttribute('type'), id: e.id || null, name: e.getAttribute('name'), cls: String(e.className || '').slice(0, 50), ph: e.getAttribute('placeholder'), autocomplete: e.getAttribute('autocomplete'), wrapped: !!e.closest('.cch-wrapper') }));
  const w = document.querySelector('.cch-wrapper');
  o.wrapperTag = w ? w.tagName.toLowerCase() : null;
  o.wrapperClass = w ? String(w.className) : null;
  o.wrapperHtml = w ? w.outerHTML.replace(/\s+/g, ' ').slice(0, 500) : null;
  o.wrapperChildTags = w ? [...w.children].map(c => c.tagName.toLowerCase() + '.' + String(c.className || '').split(' ')[0]) : null;
  o.itiInput = [...document.querySelectorAll('input')].filter(e => e.closest('.iti')).map(e => ({ type: e.getAttribute('type'), id: e.id || null, name: e.getAttribute('name'), cls: String(e.className || '') }));
  o.telCount = document.querySelectorAll('input[type=tel]').length;
  o.itiRootCount = document.querySelectorAll('.iti').length;
  return o;
});
console.log(JSON.stringify(info, null, 1));
console.log('pageErrors:', JSON.stringify(errs.slice(0, 5)));
await b.close();
