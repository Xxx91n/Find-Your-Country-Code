// 票 06 双探测**共用口径**（返工轮次 R1 新增；非交付物）。
//
// 缺陷背景（R1 复核已复现）：R1 之前 06-probe-real.mjs 设 Chrome/124 UA 且走
// `domcontentloaded → networkidle(8000) → settle(1500)`，而 06-probe-mirrors.mjs
// **未设 UA** 且走 `load → settle(1200)`；报告 §3.1 却声称二者为「同口径双探测」。
//
// 本模块是两份探测的**唯一条件来源**：UA / 导航等待序列 / 注入面扫描函数三者
// 在此定义一次，两份探测只允许 import，不得就地重写——使「同口径」成为结构事实，
// 而不是又一句只能靠人工比对维持的文本声明。
export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const NAV = { waitUntil: 'domcontentloaded', timeout: 45000 };
export const IDLE_MS = 8000;
export const SETTLE_MS = 1500;

/**
 * 导航后等待序列（两份探测逐字同口径）。
 * `networkidle` 超时按「本地页无网络活动」的正常情形吞掉（与 R1 前真实页探测一致）。
 */
export async function settle(page, url) {
  await page.goto(url, NAV);
  await page.waitForLoadState('networkidle', { timeout: IDLE_MS }).catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
}

/** 注入面快照扫描函数（在页面上下文内执行；两份探测共用同一实现）。 */
export function scanWrappers() {
  const out = [];
  document.querySelectorAll('.cch-wrapper').forEach((w) => {
    const btn = w.querySelector('.cch-btn');
    const t = w.firstElementChild || w;
    out.push({
      tag: t.tagName.toLowerCase(),
      id: t.id || null,
      cls: (t.className || '').toString().slice(0, 60),
      tier: btn ? btn.getAttribute('data-cch-tier') : null,
      score: btn ? btn.getAttribute('data-cch-score') : null,
      lowkey: btn ? btn.classList.contains('cch-btn-lowkey') : null,
    });
  });
  return out;
}
