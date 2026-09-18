import { chromium } from 'playwright';
const urls = process.argv.slice(2);
const PROBE = () => {
  const o = { title: document.title.slice(0, 60), selects: [], tel: 0, combobox: 0, iti: 0, contenteditable: 0 };
  const sels = [...document.querySelectorAll('select')];
  o.tel = document.querySelectorAll('input[type=tel]').length;
  o.combobox = document.querySelectorAll('[role=combobox]').length;
  o.iti = document.querySelectorAll('.iti').length;
  o.contenteditable = document.querySelectorAll('[contenteditable=true]').length;
  o.selects = sels.slice(0, 8).map(s => {
    const txt = [...s.options].map(x => x.text).join('|');
    return { id: s.id || null, name: s.getAttribute('name'), cls: String(s.className || '').slice(0, 36), opts: s.options.length, country: /China|United States|Germany|Japan|France/.test(txt) };
  });
  o.countryish = [...document.querySelectorAll('select,input,[role=combobox],div')].filter(e => /country|dial|phone|flag/i.test(String(e.className || '') + ' ' + (e.getAttribute('name') || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.id || ''))).length;
  return o;
};
const CH = /just a moment|checking your browser|attention required|请稍候|verifying you are human|enable javascript and cookies/i;
const b = await chromium.launch({ headless: false });
for (const url of urls) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e).split('\n')[0].slice(0, 90)));
  const rec = { url, status: 'unknown', title: null, challenged: null, ms: 0, frames: 0, frameUrls: [], main: null, childFrames: [] };
  try {
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(2000); const t = await page.title(); if (!CH.test(t)) break; }
    rec.ms = Date.now() - t0;
    rec.title = (await page.title()).slice(0, 60);
    rec.challenged = CH.test(rec.title);
    rec.status = rec.challenged ? 'challenged' : 'ok';
    await page.waitForTimeout(4000);
    rec.frames = page.frames().length;
    rec.frameUrls = page.frames().map(f => f.url().slice(0, 70));
    for (const f of page.frames()) {
      let p = null; try { p = await f.evaluate(PROBE); } catch {}
      if (f === page.mainFrame()) rec.main = p; else if (p) rec.childFrames.push({ url: f.url().slice(0, 70), probe: p });
    }
  } catch (e) { rec.status = 'goto-fail'; rec.error = String(e && e.message || e).split('\n')[0].slice(0, 130); }
  rec.pageErrors = errs.length;
  console.log(JSON.stringify(rec));
  await ctx.close();
}
await b.close();
