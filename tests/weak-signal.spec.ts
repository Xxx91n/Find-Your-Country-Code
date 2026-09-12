// 票 27 [A-001] 检测覆盖率下限：弱信号区号字段（纯关键字 / placeholder、无 label、无锚、
// 无内容证据）须跨过低置信线被低调注入；「本地固话区号 / 语言前缀」类负例不得被抬回。
// 复现基线：改前 L1:kw:strong(+30) < SCORE_LOWKEY(35) → none（见 tests/corpus/manifest.json
// 的 rs-weak-input-* 与 tests/scripts/27-weak-signal-calibration.mjs [7] 改前/改后对照）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor } from './helpers/userscript';

const WEAK_POSITIVES = [
  ['#ws-name-camel', 'name=countryCode（camelCase）'],
  ['#ws-name-snake', 'name=country_code（snake_case）'],
  ['#ws-dial-camel', 'name=dialCode（camelCase）'],
  ['#ws-placeholder', 'placeholder=Country code（无 name）'],
  ['#ws-placeholder-dial', 'placeholder=Dial code'],
] as const;

const GUARD_NEGATIVES = [
  ['#ws-neg-local', '本地固话区号（areaCode + 本地固话区号）'],
  ['#ws-neg-areacode', 'area-code 专名：命中 KW_STRONG 但非强短语组，不得越线'],
  ['#ws-neg-lang', '语言前缀（L4 排除）'],
  ['#ws-neg-plain', '无关字段'],
] as const;

test.describe('票 27 [A-001] 弱信号字段检测覆盖率下限', () => {
  test.beforeEach(async ({ page }) => {
    await installUserscript(page);
  });

  test("无锚弱信号字段跨过低置信线 → 低调注入（lowkey）", async ({ page }) => {
    await page.goto('/fixtures/weak-signal.html');
    for (const [sel] of WEAK_POSITIVES) {
      const wrap = wrapperFor(page, sel);
      await expect(wrap).toHaveCount(1, { timeout: 5000 });
      // 低调档而非高置信档：SCORE_AUTO(70) 语义未动，38 分只到 lowkey
      await expect(wrap.locator('.cch-btn')).toHaveAttribute('data-cch-tier', 'lowkey');
    }
  });

  test("护栏：本地固话区号 / 语言前缀 / 无关字段不进注入档", async ({ page }) => {
    await page.goto('/fixtures/weak-signal.html');
    for (const [sel] of GUARD_NEGATIVES) {
      await expect(wrapperFor(page, sel)).toHaveCount(0);
    }
  });

  test("弱信号注入总数守恒：5 正例注入、4 负例不注入", async ({ page }) => {
    await page.goto('/fixtures/weak-signal.html');
    // 先等正例就位，再断言总数（避免早于脚本首扫）
    await expect(wrapperFor(page, '#ws-name-camel')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('.cch-btn')).toHaveCount(WEAK_POSITIVES.length);
  });
});
