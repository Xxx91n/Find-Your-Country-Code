// \u7968 42 \u8BED\u8A00\u5207\u6362\u6536\u53E3 E2E\uFF08A-019\uFF09\uFF1A\u9762\u677F\u8BED\u8A00\u9009\u62E9 + GM \u6301\u4E45\u5316 + \u5237\u65B0\u540E\u4ECD\u751F\u6548 +
// \u8BED\u8A00\u504F\u597D\u4E0E\u6536\u85CF/\u89C4\u5219\u952E\u89E3\u8026\u3002
// \u8FD0\u884C\uFF1Anpm run e2e\uFF08\u5148 vite build \u51FA dist \u518D playwright test\uFF0CCI \u6267\u884C\uFF09\u3002
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

type Seed = { prefs?: unknown };

// GM \u79CD\u5B50\u5FC5\u987B\u5728 userscript \u6CE8\u5165\u524D\u5199\u5165\uFF08\u4E0E rules-ui.spec.ts \u540C\u53E3\u5F84\uFF09
async function boot(page: Page, seed: Seed = {}): Promise<void> {
  await page.addInitScript((s) => {
    if (!s.prefs) return;
    if (localStorage.getItem('__cch_seed_done__')) return;
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    bucket['cch_ui_prefs_v1'] = JSON.stringify(s.prefs);
    localStorage.setItem('__cch_gm__', JSON.stringify(bucket));
    localStorage.setItem('__cch_seed_done__', '1');
  }, { prefs: seed.prefs ?? null });
  await installUserscript(page);
  await page.goto('/fixtures/rules-ui.html');
}

async function gmPrefs(page: Page): Promise<any> {
  return page.evaluate(() => {
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    return JSON.parse(bucket['cch_ui_prefs_v1'] || 'null');
  });
}

async function openRules(page: Page): Promise<void> {
  await page.locator('#cch-rules-tg').click();
  await expect(page.locator('#cch-rules-view')).toBeVisible();
}

const ZH_SEARCH = '\u641C\u7D22\u56FD\u5BB6\u6216\u533A\u53F7\u2026';
const EN_SEARCH = 'Search country or code\u2026';

test('\u9A8C\u65361 \u6301\u4E45\u5316\u8BED\u8A00\u4F18\u5148\u4E8E\u6D4F\u89C8\u5668\u8BED\u8A00\uFF08Chromium=en-US\uFF0C\u79CD\u5B50 zh \u2192 \u9762\u677F\u4E2D\u6587\uFF09', async ({ page }) => {
  await boot(page, { prefs: { version: 1, locale: 'zh' } });
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', ZH_SEARCH);
  await expect(page.locator('.cch-sec-favs .cch-sec-hd')).toHaveText('\u6536\u85CF');
});

test('\u9A8C\u65361 \u9762\u677F\u5207\u6362\u8BED\u8A00 \u2192 \u5199\u5165 GM \u952E\u5E76\u5373\u65F6\u6539\u6587\u6848\uFF08\u4E0D\u5237\u65B0\uFF09', async ({ page }) => {
  await boot(page); // \u65E0\u504F\u597D \u2192 auto\uFF0C\u8DDF\u968F\u6D4F\u89C8\u5668 en-US \u2192 \u82F1\u6587
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', EN_SEARCH);
  await openRules(page);
  const tg = page.locator('#cch-locale-tg');
  await expect(tg).toBeVisible();
  await expect(tg).toHaveText('Auto (follow browser)');
  await tg.click(); // auto -> zh
  await expect(tg).toHaveText('\u4E2D\u6587');
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', ZH_SEARCH);
  await expect(page.locator('.cch-sec-all .cch-sec-hd')).toHaveText('\u5168\u90E8');
  const p = await gmPrefs(page);
  expect(p.locale).toBe('zh');
  expect(p.lowkeyMode).toBe('dim');      // 既有 lowkeyMode 与新增 locale 同文档共存、互不覆写
});

test('\u9A8C\u65363 \u5237\u65B0\u540E\u6301\u4E45\u5316\u8BED\u8A00\u4ECD\u751F\u6548\uFF08GM \u6301\u4E45\u5316\uFF09', async ({ page }) => {
  await boot(page, { prefs: { version: 1, locale: 'zh' } });
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', ZH_SEARCH);
  await page.reload();
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', ZH_SEARCH);
  const after = await gmPrefs(page);
  expect(after.locale).toBe('zh');
});

test('\u9A8C\u65363 \u8BED\u8A00\u504F\u597D\u5199\u5165 UI_PREFS_KEY\uFF0C\u4E0D\u6C61\u67D3\u6536\u85CF/\u89C4\u5219\u952E', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openRules(page);
  await page.locator('#cch-locale-tg').click();
  const bucket = await page.evaluate(() => JSON.parse(localStorage.getItem('__cch_gm__') || '{}'));
  const keys = Object.keys(bucket).sort();
  expect(keys).toContain('cch_ui_prefs_v1');
  expect(keys).not.toContain('cch_site_rules_v1');
  expect(keys).not.toContain('cch_v33');
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(1); // \u5207\u6362\u8BED\u8A00\u4E0D\u5F71\u54CD\u6CE8\u5165
});
