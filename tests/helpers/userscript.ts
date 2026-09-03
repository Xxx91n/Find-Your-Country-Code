// E2E 注入 helper：GM_* 替身 + 构建产物 addInitScript 注入。
// 等价于 Tampermonkey 环境：GM 存储用 localStorage 承载（刷新/同源页面间持久）。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from 'playwright/test';

const DIST = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'find-your-country-code.user.js');

let cached: string | undefined;

export function userscriptCode(): string {
  if (cached === undefined) cached = readFileSync(DIST, 'utf8');
  return cached;
}

const GM_STUB = `
(() => {
  const KEY = '__cch_gm__';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  window.GM_getValue = (k, d) => { const s = read(); return k in s ? s[k] : d; };
  window.GM_setValue = (k, v) => { const s = read(); s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  window.GM_addValueChangeListener = () => 0;
})();
`;

export async function installUserscript(page: Page): Promise<void> {
  await page.addInitScript(GM_STUB);
  await page.addInitScript(userscriptCode());
}

// 目标字段是否已被包进 .cch-wrapper（= 注入了 🌐 图标）
export function wrapperFor(page: Page, target: string) {
  return page.locator('.cch-wrapper', { has: page.locator(target) });
}

export async function openPanel(page: Page, target: string): Promise<void> {
  await wrapperFor(page, target).locator('.cch-btn').click();
  await expect(page.locator('#cch-pop')).toBeVisible();
}
