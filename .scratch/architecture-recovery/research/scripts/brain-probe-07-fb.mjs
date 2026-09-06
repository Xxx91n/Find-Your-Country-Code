// 大脑探针：完全复刻 rules-ui.spec.ts 的 boot 流程（__cch_gm__ 桶 + installUserscript 同款注入），定位 fb 点击后 _target 为空的原因
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const srv = spawn('node', ['tests/server.mjs'], { cwd: 'D:/Aworker/mozilla/choose-your-country' });
await new Promise(r => setTimeout(r, 1200));
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
// GM stub：与 tests/helpers/userscript.ts 同款语义（先看 spec 的 installUserscript 是否注入 dist）
await p.addInitScript(() => {
  window.__cch_gm_seed__ = {};
  window.GM_getValue = (k, d) => {
    try {
      const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
      return k in bucket ? bucket[k] : d;
    } catch { return d; }
  };
  window.GM_setValue = (k, v) => {
    try {
      const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
      bucket[k] = v;
      localStorage.setItem('__cch_gm__', JSON.stringify(bucket));
    } catch {}
  };
  window.GM_addValueChangeListener = () => 1;
});
const dist = fs.readFileSync('D:/Aworker/mozilla/choose-your-country/dist/find-your-country-code.user.js', 'utf8');
await p.addInitScript(dist);
await p.goto('http://127.0.0.1:4273/fixtures/rules-ui.html');
await p.waitForTimeout(2200);
const state1 = await p.evaluate(() => ({
  btns: document.querySelectorAll('.cch-btn').length,
  ccStrongWrapped: !!document.querySelector('.cch-wrapper')?.querySelector('#cc-strong') || !!document.getElementById('cc-strong')?.closest('.cch-wrapper'),
}));
console.log('STATE1=' + JSON.stringify(state1));
// 打开 #cc-strong 面板（真点击流）
const btn = p.locator('.cch-wrapper:has(#cc-strong) .cch-btn');
if (await btn.count()) {
  await btn.click({ force: true });
  await p.waitForTimeout(400);
  const popOpen = await p.evaluate(() => !!document.getElementById('cch-pop'));
  console.log('POP_OPEN=' + popOpen);
  await p.locator('#cch-fb').click();
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    let gm = null;
    try { gm = JSON.parse(JSON.parse(localStorage.getItem('__cch_gm__') || '{}')['cch_site_rules_v1'] || 'null'); } catch {}
    return { toast: document.getElementById('cch-toast')?.textContent || '', overrides: gm ? gm.overrides.length : 'no-doc', wrappedAfter: !!document.getElementById('cc-strong')?.closest('.cch-wrapper') };
  });
  console.log('RESULT=' + JSON.stringify(r));
} else {
  console.log('NO_BTN_FOUND');
}
console.log('PAGEERR=' + JSON.stringify(errs.slice(0, 3)));
await b.close(); srv.kill();
process.exit(0);
