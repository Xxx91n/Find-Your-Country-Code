import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const ADAPTER_SOURCE = fs.readFileSync(path.join(ROOT, 'src/iti-adapter/index.ts'), 'utf8')
  .replace('export function createItiAdapter', 'function createItiAdapter');
const DIST = fs.readFileSync(path.join(ROOT, 'dist/find-your-country-code.user.js'), 'utf8');
const TEST_PAGE = fs.readFileSync(path.join(ROOT, 'test/cch-test-page2.html'), 'utf8')
  .replace('https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/css/intlTelInput.css', '/vendor/intlTelInput.css')
  .replace('https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/intlTelInputWithUtils.js', '/vendor/intlTelInputWithUtils.js');
const ITI_JS = fs.readFileSync(path.join(ROOT, 'node_modules/intl-tel-input/build/js/intlTelInput.js'), 'utf8');
const ITI_CSS = fs.readFileSync(path.join(ROOT, 'node_modules/intl-tel-input/build/css/intlTelInput.css'), 'utf8');
const COUNTRY = { code: '+86', iso: 'CN', country: '中国', countryEn: 'China', flag: '🇨🇳' };

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function adapterPage(browser, setup = '') {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><body></body>');
  await page.addScriptTag({ content: ADAPTER_SOURCE });
  await page.evaluate((setup) => { window.__setup = setup; }, setup);
  return page;
}

async function runAdapterCases(browser) {
  // Each case gets a fresh document/global namespace so a successful earlier path cannot mask a later path.
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); input.value = '138 0013 8000'; document.body.append(input);
      const calls = [];
      const inst = { setNumber(v) { calls.push(['setNumber', v]); }, setCountry() { calls.push(['setCountry']); } };
      window.intlTelInput = { getInstance: () => inst };
      const ok = createItiAdapter().fill(input, country, () => {});
      return { ok, calls };
    }, COUNTRY);
    record('getInstance + setNumber priority', out.ok && out.calls.length === 1 && out.calls[0][0] === 'setNumber' && out.calls[0][1] === '+86 138 0013 8000', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); document.body.append(input);
      const calls = [];
      window.intlTelInput = { getInstance: () => ({ setSelectedCountry: v => calls.push(v) }) };
      return { ok: createItiAdapter().fill(input, country, () => {}), calls };
    }, COUNTRY);
    record('getInstance + setSelectedCountry', out.ok && out.calls.join() === 'cn', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); document.body.append(input);
      const calls = [];
      window.intlTelInput = { getInstance: () => ({ setCountry: v => calls.push(v) }) };
      return { ok: createItiAdapter().fill(input, country, () => {}), calls };
    }, COUNTRY);
    record('getInstance + legacy setCountry', out.ok && out.calls.join() === 'cn', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); document.body.append(input);
      const calls = [];
      input.iti = { setCountry: v => calls.push(v) };
      window.intlTelInput = {};
      return { ok: createItiAdapter().fill(input, country, () => {}), calls };
    }, COUNTRY);
    record('el.iti instance path', out.ok && out.calls.join() === 'cn', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); input.dataset.intlTelInputId = '7'; document.body.append(input);
      const calls = [];
      window.intlTelInputGlobals = { instances: { '7': { setSelectedCountry: v => calls.push(v) } } };
      return { ok: createItiAdapter().fill(input, country, () => {}), calls };
    }, COUNTRY);
    record('dataset id + instances path', out.ok && out.calls.join() === 'cn', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const input = document.createElement('input'); document.body.append(input);
      const calls = [];
      const jq = () => ({ data: () => ({ setCountry: v => calls.push(v) }) });
      jq.fn = {};
      window.jQuery = jq; window.$ = jq; window.intlTelInput = {};
      return { ok: createItiAdapter().fill(input, country, () => {}), calls };
    }, COUNTRY);
    record('jQuery data instance path', out.ok && out.calls.join() === 'cn', JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const wrap = document.createElement('div'); wrap.className = 'iti';
      const input = document.createElement('input'); wrap.append(input);
      const selected = document.createElement('button'); selected.className = 'iti__selected-country';
      const item = document.createElement('li'); item.className = 'iti__country'; item.dataset.countryCode = 'cn';
      let opened = 0, selectedCount = 0;
      selected.onclick = () => { opened++; wrap.append(item); };
      item.onclick = () => { selectedCount++; };
      wrap.append(selected); document.body.append(wrap); window.intlTelInput = {};
      const ok = createItiAdapter().fill(input, country, () => {});
      return { ok, opened, selectedCount };
    }, COUNTRY);
    record('v29 DOM .iti__selected-country fallback', out.ok && out.opened === 1 && out.selectedCount === 1, JSON.stringify(out));
    await p.close();
  }
  {
    const p = await adapterPage(browser);
    const out = await p.evaluate((country) => {
      const wrap = document.createElement('div'); wrap.className = 'iti';
      const input = document.createElement('input'); wrap.append(input);
      const selected = document.createElement('div'); selected.className = 'iti__flag-container';
      const old = document.createElement('div'); old.className = 'selected-flag'; selected.append(old);
      const item = document.createElement('li'); item.className = 'country'; item.dataset.countryCode = 'cn';
      let opened = 0, selectedCount = 0;
      old.onclick = () => { opened++; wrap.append(item); };
      item.onclick = () => { selectedCount++; };
      wrap.append(selected); document.body.append(wrap); window.intlTelInput = {};
      selected.onclick = () => old.click();
      const ok = createItiAdapter().fill(input, country, () => {});
      return { ok, opened, selectedCount };
    }, COUNTRY);
    record('v16 DOM .iti__flag-container/.selected-flag fallback', out.ok && out.opened === 1 && out.selectedCount === 1, JSON.stringify(out));
    await p.close();
  }
}

async function runScenarioC(browser, server) {
  const port = server.address().port;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const state = {};
    window.GM_getValue = (k, d) => k in state ? state[k] : d;
    window.GM_setValue = (k, v) => { state[k] = v; };
    window.GM_addValueChangeListener = () => 0;
  });
  await page.addInitScript({ content: DIST });
  await page.goto('http://127.0.0.1:' + port + '/cch-test-page2.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  await page.locator('[onclick="switchTab(\'intl\',this)"]').click();
  await page.waitForTimeout(200);
  const pluginReady = await page.evaluate(() => typeof window.intlTelInput === 'function');
  const itiInputs = await page.locator('#scenario-intl .iti input').count();
  const bodyText = await page.locator('#scenario-intl').innerText();
  const buttons = await page.locator('#scenario-intl .cch-btn').count();
  let selectedDial = null;
  if (buttons > 0) {
    await page.locator('#scenario-intl .cch-btn').first().click();
    await page.locator('#cch-si').fill('China');
    const row = page.locator('#cch-pop .cch-row', { hasText: 'China' }).first();
    await row.click();
    await page.waitForTimeout(250);
    selectedDial = await page.evaluate(() => {
      const input = document.querySelector('#iti-phone-1');
      const g = window.intlTelInputGlobals || window.intlTelInput;
      const inst = g && typeof g.getInstance === 'function' && g.getInstance(input);
      return inst && inst.getSelectedCountryData ? '+' + inst.getSelectedCountryData().dialCode : null;
    });
  }
  record('场景 C iti@18.2.1 injection + fill linkage', buttons >= 1 && selectedDial === '+86' && errors.length === 0, JSON.stringify({ pluginReady, itiInputs, buttons, selectedDial, errors, bodyText: bodyText.slice(0, 80) }));
  await page.close();
}

const server = http.createServer((req, res) => {
  if (req.url === '/cch-test-page2.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(TEST_PAGE); return; }
  if (req.url === '/vendor/intlTelInput.css') { res.writeHead(200, { 'content-type': 'text/css' }); res.end(ITI_CSS); return; }
  if (req.url === '/vendor/intlTelInputWithUtils.js') { res.writeHead(200, { 'content-type': 'application/javascript' }); res.end(ITI_JS); return; }
  res.writeHead(404); res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  await runAdapterCases(browser);
  await runScenarioC(browser, server);
} finally {
  await browser.close(); server.close();
}
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed }, null, 2));
process.exitCode = failed.length ? 1 : 0;
