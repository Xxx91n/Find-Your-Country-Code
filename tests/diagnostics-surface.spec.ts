// \u7968 03 [A-028] \u8BCA\u65AD\u9762 E2E\uFF1A\u5165\u53E3\u6536\u655B\uFF08\u5355\u4E00 GM \u8BCA\u65AD\u83DC\u5355\u9879 \u2192 \u76F4\u8FBE\u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE\uFF09/ \u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE\u9F50\u5907
// \uFF08\u51B3\u7B56\u94FE\u65F6\u95F4\u7EBF + \u56DB\u5C42\u68C0\u67E5\u77E9\u9635 + \u8BA1\u6570\u5668 + \u8FC7\u6EE4\u5668 + \u5BFC\u51FA\uFF09/ \u9762\u677F\u4E0E\u673A\u5668\u53EF\u8BFB\u8F93\u51FA\u540C\u6E90\uFF08\u4E0D\u5F97\u5404\u81EA\u91C7\u96C6\uFF09
// / \u5206\u7EA7\u95E8\u63A7\uFF08error\u00B7warn\u00B7\u8BA1\u6570\u5668\u6052\u5F00\uFF0C\u4EC5\u5168\u94FE\u8DEF trace \u95E8\u63A7\uFF09/ \u56DB\u5C42\u5224\u5B9A\u5168\u94FE\u8DEF + \u5DF2\u9A8C\u8BC1\u56E0\u679C\u3002
// \u8FD0\u884C\uFF1Anpm run e2e\uFF08\u5148 vite build \u51FA dist \u518D playwright test\uFF0CCI \u6267\u884C\uFF09\u3002
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, openPanel } from './helpers/userscript';

// \u5BFC\u51FA\u8D70 navigator.clipboard\uFF08\u540C\u6E90 localhost = \u5B89\u5168\u4E0A\u4E0B\u6587\uFF09\uFF0C\u9700\u663E\u5F0F\u6388\u6743\u624D\u80FD\u8BFB\u56DE\u9A8C\u8BC1
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

type LayerState = { verdict: string; reason: string; point: string };
type Rec = { seq: number; level: string; layer: string; point: string; verdict: string; reason: string; verified: boolean };
type Snap = {
  version: number; trace: boolean; health: string;
  counters: Record<string, number>;
  layers: Record<string, LayerState>;
  records: Rec[];
};

async function boot(page: Page): Promise<void> {
  await installUserscript(page);
  await page.goto('/fixtures/rules-ui.html');
}

function snap(page: Page): Promise<Snap> {
  return page.evaluate(() => (window as any).__cchDiag());
}

// GM \u83DC\u5355\u300C\u8BCA\u65AD\u300D\u547D\u4EE4\uFF1A\u672C\u7968\u552F\u4E00\u8BCA\u65AD\u5165\u53E3\uFF08\u4E0D\u4E3A\u6BCF\u4E2A\u8BCA\u65AD\u529F\u80FD\u5404\u8BBE\u83DC\u5355\u9879\uFF09
async function invokeMenuDiagnostics(page: Page): Promise<void> {
  const ok = await page.evaluate(() => {
    const menu = (window as any).__cchMenu || [];
    const hits = menu.filter((c: any) => /\u8BCA\u65AD|diagnostics/i.test(c.title));
    if (hits.length !== 1) return false;
    hits[0].fn();
    return true;
  });
  expect(ok, 'GM \u83DC\u5355\u5E94\u6070\u597D\u767B\u8BB0\u4E00\u4E2A\u8BCA\u65AD\u547D\u4EE4').toBe(true);
}

// \u9762\u677F\u5185\u5165\u53E3\uFF1A\u5217\u8868\u89C6\u56FE\u6458\u8981\u6761\u4E0A\u7684\u300C\u8BCA\u65AD\u300D\u6309\u94AE \u2192 \u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE
async function openDiagView(page: Page): Promise<void> {
  await page.locator('#cch-diag-tg').click();
  await expect(page.locator('#cch-diag-view')).toBeVisible();
}

// \u8FFD\u52A0\u4E00\u4E2A\u65B0\u533A\u53F7\u5B57\u6BB5\uFF1A\u65B0\u5019\u9009\u5143\u7D20\u89E6\u53D1\u9632\u6296\u91CD\u626B\uFF0C\u4EA7\u751F\u65B0\u7684\u5224\u5B9A\u8BB0\u5F55
// \uFF08\u5DF2\u5904\u7406\u7684\u65E7\u5143\u7D20\u6307\u7EB9\u672A\u53D8\u4F1A\u77ED\u8DEF\u8FD4\u56DE\uFF0C\u4E0D\u4F1A\u91CD\u590D\u4EA7\u8BB0\u5F55\uFF09
async function appendCountryField(page: Page): Promise<void> {
  await page.evaluate(() => {
    const form = document.getElementById('host-form') as HTMLFormElement;
    const anchor = document.getElementById('go');
    const label = document.createElement('label');
    label.setAttribute('for', 'cc-dyn'); label.textContent = '\u56FD\u5BB6\u533A\u53F7';
    const sel = document.createElement('select');
    sel.id = 'cc-dyn'; sel.name = 'country_code_2';
    ['+86', '+1', '+44'].forEach((c) => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
    });
    form.insertBefore(label, anchor); form.insertBefore(sel, anchor);
  });
  // \u9632\u6296 350ms + \u626B\u63CF\uFF1B\u7B49\u4E8B\u5B9E\u6E90\u51FA\u73B0\u8BB0\u5F55\u5373\u8BC1\u660E\u91CD\u626B\u5DF2\u8DD1
  await expect.poll(async () => (await snap(page)).records.length, { timeout: 8000 }).toBeGreaterThan(0);
}

function diagRows(page: Page) {
  return page.locator('#cch-diag-list .cch-diag-row');
}

// \u5065\u5EB7\u5EA6\u6587\u6848\u53CC\u8BED\u5BB9\u9519\uFF08E2E \u6D4F\u89C8\u5668 navigator.language \u672A\u56FA\u5B9A \u2192 \u53EF\u80FD zh \u6216 en\uFF09
const HEALTH: Record<string, string[]> = {
  pass: ['\u901A\u8FC7', 'pass'], fail: ['\u5931\u8D25', 'fail'], unknown: ['\u672A\u77E5', 'unknown'],
};

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 1\uFF1A\u5165\u53E3\u6536\u655B\u4E3A\u4E00\u4E2A GM \u83DC\u5355\u9879\uFF0C\u4E14\u76F4\u8FBE\u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65361 \u5165\u53E3\u6536\u655B\uFF1AGM \u83DC\u5355\u6070\u597D\u4E00\u4E2A\u8BCA\u65AD\u5165\u53E3\uFF0C\u70B9\u51FB\u76F4\u8FBE\u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE', async ({ page }) => {
  await boot(page);
  const diagEntries = await page.evaluate(() => ((window as any).__cchMenu || []).filter((c: any) => /\u8BCA\u65AD|diagnostics/i.test(c.title)).length);
  expect(diagEntries, '\u8BCA\u65AD\u5165\u53E3\u5FC5\u987B\u6536\u655B\u4E3A\u4E00\u4E2A\u83DC\u5355\u9879').toBe(1);
  await expect(page.locator('#cch-pop')).toHaveCount(0);
  await invokeMenuDiagnostics(page);
  // \u6253\u5F00\u9762\u677F + \u663E\u5F0F\u5207\u5230\u8BCA\u65AD\u89C6\u56FE\uFF08\u4E0D\u80FD\u53EA\u5F00\u9762\u677F\u505C\u5728\u5217\u8868\u89C6\u56FE\uFF09
  await expect(page.locator('#cch-pop')).toBeVisible();
  await expect(page.locator('#cch-diag-view')).toBeVisible();
  // \u5217\u8868 / \u53EC\u5524 / \u8D1F\u53CD\u9988 / \u6458\u8981\u6761\u5728\u8BCA\u65AD\u89C6\u56FE\u4E0B\u9690\u85CF
  await expect(page.locator('#cch-pop .cch-sec-favs')).toBeHidden();
  await expect(page.locator('#cch-pop .cch-sec-all')).toBeHidden();
  await expect(page.locator('#cch-pop #cch-summon')).toBeHidden();
  await expect(page.locator('#cch-pop #cch-fb')).toBeHidden();
  await expect(page.locator('#cch-pop #cch-diag-sum')).toBeHidden();
});

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 2\uFF1A\u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE\u9F50\u5907\uFF08\u65F6\u95F4\u7EBF + \u56DB\u5C42\u77E9\u9635 + \u8BA1\u6570\u5668 + \u8FC7\u6EE4\u5668 + \u5BFC\u51FA\uFF09
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65362 \u72EC\u7ACB\u8BCA\u65AD\u89C6\u56FE\u9F50\u5907\uFF1A\u56DB\u5C42\u77E9\u9635 + \u8BA1\u6570\u5668 + \u8FC7\u6EE4\u5668 + \u65F6\u95F4\u7EBF + \u5BFC\u51FA', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openDiagView(page);
  // \u56DB\u5C42\u68C0\u67E5\u77E9\u9635\uFF08\u5DE5\u5177 / \u6CE8\u5165 / \u903B\u8F91 / \u5199\u5165\uFF09
  await expect(page.locator('#cch-diag-layers .cch-rule-row')).toHaveCount(4);
  const names = (await page.locator('#cch-diag-layers .cch-rule-host').allTextContents()).join(',');
  expect(names).toMatch(/\u5DE5\u5177\u5C42|Tool/);
  expect(names).toMatch(/\u5199\u5165\u5C42|Write/);
  // \u8FC7\u6EE4\u5668\uFF1A\u7EA7\u522B 5\uFF08all/error/warn/info/trace\uFF09+ \u5C42 5\uFF08all/tool/inject/logic/write\uFF09
  await expect(page.locator('#cch-diag-view .cch-diag-f')).toHaveCount(10);
  await expect(page.locator('#cch-diag-view .cch-diag-cnt')).toBeVisible();
  await expect(page.locator('#cch-diag-list')).toBeVisible();
  await expect(page.locator('#cch-diag-export')).toBeVisible();
  await expect(page.locator('#cch-diag-trace-tg')).toBeVisible();
});

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 3\uFF1A\u9762\u677F\u4E0E\u673A\u5668\u53EF\u8BFB\u8F93\u51FA\u4ECE\u540C\u4E00\u4EFD\u8BCA\u65AD\u6570\u636E\u6E32\u67D3\uFF08delta \u68C0\u67E5\u70B9\u4E00\uFF09
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65363 \u9762\u677F\u4E0E\u673A\u5668\u53EF\u8BFB\u8F93\u51FA\u540C\u6E90\uFF08\u4E0D\u5F97\u5404\u81EA\u91C7\u96C6\uFF09', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openDiagView(page);
  await page.locator('#cch-diag-trace-tg').click();
  await appendCountryField(page);
  // \u540C\u4E00\u6B21 JS \u4EFB\u52A1\u5185\uFF1A\u5148\u540C\u6B65\u91CD\u6E32\u67D3\u9762\u677F\uFF0C\u518D\u8BFB\u673A\u5668\u53EF\u8BFB\u8F93\u51FA \u2014\u2014 \u4E24\u4FA7\u8BFB\u540C\u4E00\u4EFD records\uFF0C\u65E0\u626B\u63CF\u53EF\u63D2\u5165
  const both = await page.evaluate(() => {
    const allBtn = document.querySelector('#cch-diag-view .cch-diag-f[data-filter="level:all"]') as HTMLElement;
    allBtn.click();
    const s = (window as any).__cchDiag();
    const rows = Array.from(document.querySelectorAll('#cch-diag-list .cch-diag-row')).map((r) => {
      const pt = r.querySelector('.cch-diag-pt');
      const rn = r.querySelector('.cch-diag-rn');
      return ((pt && pt.textContent) || '') + '|' + (((rn && rn.textContent) || '').split(' (')[0]);
    });
    const cnt = document.querySelector('#cch-diag-view .cch-diag-cnt');
    const chip = document.querySelector('#cch-diag-view .cch-diag-chip');
    return { s: s, rows: rows, cnt: (cnt && cnt.textContent) || '', chip: ((chip && chip.textContent) || '').trim() };
  });
  expect(both.s.records.length).toBeGreaterThan(0);
  // \u2460 \u65F6\u95F4\u7EBF\u884C\u6570 == \u673A\u5668\u53EF\u8BFB\u8F93\u51FA\u8BB0\u5F55\u6570
  expect(both.rows.length).toBe(both.s.records.length);
  // \u2461 \u65F6\u95F4\u7EBF\u6BCF\u884C\u7684 point|reason \u6765\u81EA\u8BB0\u5F55\u5B57\u6BB5\uFF08\u96C6\u5408\u76F8\u7B49\uFF09
  const machine = both.s.records.map((r) => r.point + '|' + r.reason);
  expect(both.rows.slice().sort()).toEqual(machine.slice().sort());
  // \u2462 \u8BA1\u6570\u5668\u4E0E\u5065\u5EB7\u5EA6\u540C\u6E90
  expect(both.cnt).toContain('scans ' + both.s.counters.scans);
  expect(both.cnt).toContain('inj ' + both.s.counters.injected);
  expect(HEALTH[both.s.health]).toContain(both.chip);
});

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 4\uFF1A\u5206\u7EA7\u95E8\u63A7 \u2014\u2014 error/warn \u4E0E\u8BA1\u6570\u5668\u6052\u5F00\uFF0C\u4EC5\u5168\u94FE\u8DEF trace \u95E8\u63A7
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65364 \u5206\u7EA7\u95E8\u63A7\uFF1A\u8BA1\u6570\u5668\u6052\u5F00 / trace \u5173\u65E0\u5168\u94FE\u8DEF\u8BB0\u5F55 / trace \u5F00\u51FA\u73B0\u4E14\u6301\u4E45\u5316', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openDiagView(page);
  // \u95E8\u63A7\u9ED8\u8BA4\u5173\uFF1A\u8BA1\u6570\u5668\u6052\u5F00\uFF08\u626B\u63CF\u5DF2\u8DD1\uFF09\uFF0C\u4F46\u5168\u94FE\u8DEF trace \u4E0D\u8BB0\u5F55
  const off = await snap(page);
  expect(off.trace).toBe(false);
  expect(off.counters.scans).toBeGreaterThan(0);
  expect(off.records.filter((r) => r.level === 'trace').length).toBe(0);
  // \u6253\u5F00\u5168\u94FE\u8DEF trace \u2192 \u60F0\u6027\u6784\u9020\u901A\u9053\u6253\u5F00\uFF0C\u91CD\u626B\u5373\u4EA7\u751F trace \u8BB0\u5F55
  await page.locator('#cch-diag-trace-tg').click();
  expect((await snap(page)).trace).toBe(true);
  await appendCountryField(page);
  const on = await snap(page);
  expect(on.records.filter((r) => r.level === 'trace').length).toBeGreaterThan(0);
  // \u95E8\u63A7\u6301\u4E45\u5316\uFF08UI_PREFS_KEY / GM \u5B58\u50A8\uFF09\uFF1A\u5237\u65B0\u540E\u4ECD\u4E3A\u5F00
  await page.reload();
  await expect(page.locator('.cch-btn').first()).toBeVisible();
  expect((await snap(page)).trace).toBe(true);
});

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 5\uFF1A\u56DB\u5C42\u5224\u5B9A\u5168\u94FE\u8DEF + fail \u8BB0\u5F55 reason \u6307\u5411\u5DF2\u9A8C\u8BC1\u56E0\u679C
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65365 \u56DB\u5C42\u5224\u5B9A\u5168\u94FE\u8DEF\uFF08\u5DE5\u5177\u2192\u6CE8\u5165\u2192\u903B\u8F91\u2192\u5199\u5165\uFF09+ \u5DF2\u9A8C\u8BC1\u56E0\u679C', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openDiagView(page);
  await page.locator('#cch-diag-trace-tg').click();
  await appendCountryField(page);
  // \u903B\u8F91\u5C42 + \u5199\u5165\u5C42\uFF1A\u771F\u5B9E\u586B\u5145\u94FE\u8DEF\uFF08\u63D0\u4EA4\u524D\u72B6\u6001 \u2192 \u5199\u5165\u52A8\u4F5C \u2192 \u63D0\u4EA4\u540E\u65AD\u8A00\uFF09
  // 回到列表视图：填充入口（搜索框 + 国家行）只在列表视图可见
  await page.locator('#cch-diag-tg').click();
  await expect(page.locator('#cch-diag-list')).toBeHidden();
  await page.locator('#cch-si').fill('Japan');
  await page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="jp" i]').click();
  await expect(page.locator('#cc-strong')).toHaveValue('+81');
  const s = await snap(page);
  for (const L of ['tool', 'inject', 'logic', 'write']) {
    expect(s.layers[L].verdict, L + ' \u5C42\u5E94\u7ED9\u51FA\u5224\u5B9A').not.toBe('unknown');
    expect(s.layers[L].point, L + ' \u5C42\u5E94\u7ED9\u51FA\u5224\u5B9A\u70B9').not.toBe('');
  }
  expect(s.layers.logic.verdict).toBe('pass');
  expect(s.layers.write.verdict).toBe('pass');
  expect(s.counters.fills).toBe(1);
  expect(s.counters.filled).toBe(1);
  // \u5199\u5165\u7ED3\u679C\u4E09\u5143\u7EC4\uFF08\u673A\u5668\u53EF\u8BFB\u4FA7\uFF09
  const last = await page.evaluate(() => (window as any).__cchLastFill);
  expect(last.asserted).toBe(true);
  expect(typeof last.pre).toBe('string');
  expect(String(last.post)).toContain('81');
  // \u5DF2\u9A8C\u8BC1\u56E0\u679C\uFF1A\u6BCF\u6761 reason \u5747\u53D6\u81EA\u95ED\u96C6\uFF08verified=true\uFF09\u4E14\u5F52\u5165\u56DB\u5C42\u4E4B\u4E00
  expect(s.records.length).toBeGreaterThan(0);
  expect(s.records.every((r) => r.verified === true)).toBe(true);
  expect(s.records.every((r) => ['tool', 'inject', 'logic', 'write'].indexOf(r.layer) >= 0)).toBe(true);
  expect(s.records.every((r) => /^(tool|inject|logic|write)-/.test(r.reason))).toBe(true);
});

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u9A8C\u6536 6\uFF1A\u8FC7\u6EE4\u5668\uFF08\u7EA7\u522B + \u5C42\uFF09\u751F\u6548\uFF1B\u5BFC\u51FA\u4EA7\u51FA\u4E0E\u4E8B\u5B9E\u6E90\u540C\u6E90\u7684\u673A\u5668\u53EF\u8BFB\u6587\u672C
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
test('\u9A8C\u65366 \u8FC7\u6EE4\u5668\u751F\u6548\uFF1B\u5BFC\u51FA\u6587\u672C\u4E0E\u4E8B\u5B9E\u6E90\u540C\u6E90', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openDiagView(page);
  await page.locator('#cch-diag-trace-tg').click();
  await appendCountryField(page);
  const F = '#cch-diag-view .cch-diag-f';
  await page.locator(F + '[data-filter="level:all"]').click();
  const total = await diagRows(page).count();
  expect(total).toBeGreaterThan(0);
  // \u5C42\u8FC7\u6EE4\uFF1A\u53EA\u7559 tool \u5C42
  await page.locator(F + '[data-filter="layer:tool"]').click();
  const toolRows = await diagRows(page).count();
  expect(toolRows).toBeGreaterThan(0);
  expect(toolRows).toBeLessThanOrEqual(total);
  const layers = await page.locator('#cch-diag-list .cch-diag-row .cch-diag-ly').allTextContents();
  expect(layers.every((x) => x === 'tool')).toBe(true);
  // \u7EA7\u522B\u8FC7\u6EE4\uFF1A\u53EA\u7559 trace \u7EA7\u522B
  await page.locator(F + '[data-filter="layer:all"]').click();
  await page.locator(F + '[data-filter="level:trace"]').click();
  const levels = await page.locator('#cch-diag-list .cch-diag-row .cch-diag-lv').allTextContents();
  expect(levels.length).toBeGreaterThan(0);
  expect(levels.every((x) => x === 'trace')).toBe(true);
  // \u5BFC\u51FA\uFF1A\u4EBA\u8BFB\u6587\u672C\u6295\u5F71\uFF08\u4E0E snapshot \u540C\u6E90\uFF09\u2192 \u7ECF\u526A\u8D34\u677F\u8BFB\u56DE
  await page.locator('#cch-diag-export').click();
  await expect(page.locator('#cch-toast')).toContainText(/\u8BCA\u65AD\u5DF2\u590D\u5236|Diagnostics copied/);
  const s = await snap(page);
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText().catch(() => '')), { timeout: 8000 })
    .toContain('# cch diagnostics v' + s.version);
  const exported = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  expect(exported).toContain('health=' + s.health);
  expect(exported).toContain('scans=' + s.counters.scans);
});
