// 独立复现探针（03-iti-adapter-fix）：质疑大脑双根因结论，自己跑通并核对数据。
// 前置：npm run build（dist 需为最新）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Aworker/mozilla/choose-your-country';
const PORT = 4399;
const dist = readFileSync(ROOT + '/dist/find-your-country-code.user.js', 'utf8');

// 拉起 hermetic fixture server（tests/server.mjs，06 票已验证）
const srv = spawn(process.execPath, [ROOT + '/tests/server.mjs'], {
  env: { ...process.env, E2E_PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise(res => setTimeout(res, 800));

const gm = `(() => { const s={}; window.GM_getValue=(k,d)=>k in s?s[k]:d; window.GM_setValue=(k,v)=>s[k]=v; window.GM_addValueChangeListener=()=>0; })()`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(gm);
await page.addInitScript(dist);
await page.goto('http://127.0.0.1:' + PORT + '/test/cch-test-page2.html', { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'intl-tel-input' }).click();
await page.waitForTimeout(200);

const out = await page.evaluate(() => {
  const el = document.getElementById('iti-phone-1');
  const g0 = window.intlTelInput, g1 = window.intlTelInputGlobals;
  const wrap = el.closest('.iti');
  const q = sel => wrap.querySelector(sel);
  const has = sel => !!q(sel);
  const r = {
    typeofWindowIntlTelInput: typeof g0,
    windowIntlTelInput_hasGetInstance: !!(g0 && typeof g0.getInstance === 'function'),
    typeofIntlTelInputGlobals: typeof g1,
    globals_hasGetInstance: !!(g1 && typeof g1.getInstance === 'function'),
    // 根因一：_global() 现写法 window.intlTelInput || window.intlTelInputGlobals 命中谁
    globalCurrentFirst: typeof (g0 || g1) === 'function' ? 'function(no getInstance)' : (typeof (g0 || g1)),
    currentFirst_hasGetInstance: !!(g0 || g1) && typeof (g0 || g1).getInstance === 'function',
    // 根因二：v18 DOM 形状
    hasFlagContainer: has('.iti__flag-container'),
    hasSelectedFlag: has('.iti__selected-flag'),
    hasSelectedCountry: has('.iti__selected-country'),
    hasSelectedFlagV16: has('.selected-flag'),
    // 现选择器（祖先优先，文档序先命中 .iti__flag-container）
    currentSelectorHit: (q('.iti__selected-country') || q('.selected-flag') || q('.iti__flag-container'))?.className || null,
  };
  // 反事实1：点 .iti__selected-flag → ul 开
  const flag = q('.iti__selected-flag');
  const list = wrap.querySelector('.iti__country-list');
  const hideBefore = list && list.classList.contains('iti__hide');
  flag && flag.click();
  const hideAfter = list && list.classList.contains('iti__hide');
  r.cf1 = { hideBefore, hideAfter, ulOpened: hideBefore === true && hideAfter === false };
  // 反事实1续：点 li[data-country-code=jp]
  const li = wrap.querySelector('li[data-country-code="jp"]');
  if (li) li.click();
  const inst = g1.getInstance(el);
  r.cf1_syncedIso = inst.getSelectedCountryData().iso2;
  // 反事实2：getInstance 后 setNumber('+81')
  const i2 = g1.getInstance(el);
  i2.setNumber('+81');
  r.cf2_isoAfterSetNumber = i2.getSelectedCountryData().iso2;
  return r;
});
console.log('REPRO=' + JSON.stringify(out, null, 2));
await browser.close();
srv.kill();
process.exit(0);
