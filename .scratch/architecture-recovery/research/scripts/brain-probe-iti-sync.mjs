// 大脑终审探针 v2：复用 06 票的 hermetic tests/server.mjs（已被 E2E 验证），在其端口上开真实页面验证 03 适配层的 iti 同步
// 前置：node tests/server.mjs（由外层命令负责拉起与清理）
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4273';
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.addInitScript(() => {
  const s = {}; window.GM_getValue = (k, d) => (k in s ? s[k] : d); window.GM_setValue = (k, v) => (s[k] = v); window.GM_addValueChangeListener = () => 0;
});
await p.goto(BASE + '/test/cch-test-page2.html');
await p.waitForTimeout(2500);
// 用户脚本 dist 本身未注入——本探针要先注入 dist（v2 修正：addInitScript）
const dist = (await import('node:fs')).readFileSync('D:/Aworker/mozilla/choose-your-country/dist/find-your-country-code.user.js', 'utf8');
await p.addInitScript(dist);
await p.reload();
await p.waitForTimeout(2200);
const pluginReady = await p.evaluate(() => !!(window.intlTelInputGlobals || window.intlTelInput));
if (!pluginReady) { console.log('VERDICT=PLUGIN_NOT_READY'); await b.close(); process.exit(2); }
const before = await p.evaluate(() => { const g = window.intlTelInputGlobals || window.intlTelInput; const i = g.getInstance(document.getElementById('iti-phone-1')); return i ? i.getSelectedCountryData().iso2 : null; });
// 打开 C1 的图标面板（页面有 tab 切换，C1 可能不在首屏可见——用 E2E 同款 tab 点击 + has 选择器，与探针 v5 一致）
const tabBtn = p.locator('.tab', { hasText: 'intl-tel-input' });
if (await tabBtn.count()) await tabBtn.first().click();
await p.waitForTimeout(300);
const btn = p.locator('.cch-wrapper:has(#iti-phone-1) .cch-btn');
await btn.first().click({ force: true });
await p.waitForTimeout(300);
await p.locator('#cch-si').fill('Japan');
await p.waitForTimeout(300);
// 用 evaluate 内部点击（v6 探针教训：Playwright 可见性判定可能误拦），并检查 row 是否存在
const clicked = await p.evaluate(() => {
  const jp = [...document.querySelectorAll('.cch-row')].find(x => (x.dataset.iso || '').toLowerCase() === 'jp');
  if (!jp) return { ok: false, why: 'no jp row' };
  jp.click();
  return { ok: true };
});
console.log('CLICK=' + JSON.stringify(clicked));
await p.waitForTimeout(900);
const after = await p.evaluate(() => {
  const g = window.intlTelInputGlobals || window.intlTelInput;
  const el = document.getElementById('iti-phone-1');
  const i = g.getInstance(el);
  return { iso2: i ? i.getSelectedCountryData().iso2 : null, inputValue: el.value };
});
console.log('BEFORE_ISO=' + before);
console.log('AFTER=' + JSON.stringify(after));
console.log(after.iso2 === 'jp' ? 'VERDICT=ITI_FILL_SYNCED' : 'VERDICT=ITI_FILL_NOT_SYNCED');
await b.close();
process.exit(after.iso2 === 'jp' ? 0 : 1);
