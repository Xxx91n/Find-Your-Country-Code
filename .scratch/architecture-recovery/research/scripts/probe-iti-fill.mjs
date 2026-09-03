// 探针：观察 v18.2.1 下 Fill.fillIti 的真实终态（供票 06 基线断言 + 票 03 适配参考）。
// 用法：node research/scripts/probe-iti-fill.mjs（需先 npm run build）
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const CDN = 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/';
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let body;
    if (p.startsWith('/vendor/iti/')) {
      const f = path.join(ROOT, 'node_modules/intl-tel-input/build', p.slice('/vendor/iti/'.length));
      if (p.endsWith('intlTelInputWithUtils.js')) {
        const dir = path.join(ROOT, 'node_modules/intl-tel-input/build/js');
        body = Buffer.concat((await Promise.all(['utils.js', 'data.js', 'intlTelInput.js'].map(f => readFile(path.join(dir, f))))).flatMap(b => [b, Buffer.from('\n')]));
      } else body = await readFile(f);
    } else {
      body = await readFile(path.join(ROOT, 'test', p.slice(1)));
      if (p.endsWith('.html')) body = Buffer.from(body.toString('utf8').split(CDN).join('/vendor/iti/'));
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(x => server.listen(0, '127.0.0.1', x));
const port = server.address().port;

const gm = `(() => { const s={}; window.GM_getValue=(k,d)=>k in s?s[k]:d; window.GM_setValue=(k,v)=>s[k]=v; window.GM_addValueChangeListener=()=>0; })()`;
const code = await readFile(path.join(ROOT, 'dist/find-your-country-code.user.js'), 'utf8');

const b = await chromium.launch();
const p = await b.newPage();
await p.addInitScript(gm);
await p.addInitScript(code);
await p.goto(`http://127.0.0.1:${port}/cch-test-page2.html`);
await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'intl-tel-input' }).click();
await p.locator('.cch-wrapper', { has: p.locator('#iti-phone-1') }).locator('.cch-btn').click();
await p.locator('#cch-si').fill('Japan');
await p.locator('.cch-row[data-iso="jp" i]').click();
await p.waitForTimeout(600);
const obs = await p.evaluate(() => {
  const el = document.getElementById('iti-phone-1');
  const iti = document.querySelector('.iti');
  const wrap = el.closest('.iti');
  const g = window.intlTelInputGlobals || window.intlTelInput;
  const inst = g.getInstance(el);
  const c = inst.getSelectedCountryData();
  const items = [...wrap.querySelectorAll('li[data-country-code]')].map(li => li.getAttribute('data-country-code')).slice(0, 5);
  const btn = wrap.querySelector('.iti__selected-country, .iti__flag-container, .selected-flag');
  return {
    inputValue: el.value,
    datasetId: el.getAttribute('data-intl-tel-input-id') != null,
    hasGetIntanceOnFactory: typeof window.intlTelInput.getInstance,
    instancesOnFactory: !!window.intlTelInput.instances,
    selectedIso: c.iso2, selectedDial: c.dialCode,
    flagBtnSelectorHit: btn ? btn.className : null,
    liAttrsSample: items,
    liCount: wrap.querySelectorAll('li').length,
    firstLiHTML: wrap.querySelector('li') ? wrap.querySelector('li').outerHTML.slice(0, 200) : null,
    itiContainerClass: iti ? 'iti exists' : 'no .iti',
    toast: document.getElementById('cch-toast')?.textContent || null,
  };
});
console.log(JSON.stringify(obs, null, 2));
await b.close();
server.close();
