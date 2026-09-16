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
  // [票 12]记录菜单命令注册(断言仅顶层注册)；[票 37]同时记录 {title,fn} 供测试调用菜单命令。
  // [票 02 A-027]还原 Tampermonkey >=5.0 / Violentmonkey >=2.15.9 的 id 原地更新语义：
  //   传入 options.id 时，同 id 重注册只更新 title/fn，不新增条目、不递增计数；
  //   无 id 的旧式调用保持追加语义（向后兼容）。id 语义是被测契约的一部分，不可简化掉。
  window.__cchMenu = [];
  window.__cchMenuIds = [];
  window.__cchMenuCount = 0;
  window.GM_registerMenuCommand = (title, fn, options) => {
    const id = options && options.id != null ? String(options.id) : null;
    if (id !== null) {
      const hit = window.__cchMenu.find((c) => c.id === id);
      if (hit) { hit.title = title; hit.fn = fn; return 0; } // 原地更新：不新增条目
      window.__cchMenu.push({ id: id, title: title, fn: fn });
      window.__cchMenuIds.push(id);
    } else {
      window.__cchMenu.push({ id: null, title: title, fn: fn });
    }
    window.__cchMenuCount = window.__cchMenu.length;
    return 0;
  };
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
