// ══════════════════════════════════════════════════════════════════
// probe-perf-04.mjs — 票 04 性能基线探针（1000 节点级防抖窗口实测）
// 用法：node .scratch/architecture-recovery/research/scripts/probe-perf-04.mjs
// 口径：静态页初始 scan 耗时样本 + 增量注入 200 节点后重扫 wall time（含 350ms 防抖）
// ══════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
const PORT = 4273;

const server = spawn(process.execPath, [join(ROOT, 'tests', 'server.mjs')], {
  env: { ...process.env, E2E_PORT: String(PORT) }, stdio: 'ignore',
});
await new Promise(r => setTimeout(r, 800));

try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const GM = `
    (() => {
      const KEY = '__cch_gm__';
      const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
      window.GM_getValue = (k, d) => { const s = read(); return k in s ? s[k] : d; };
      window.GM_setValue = (k, v) => { const s = read(); s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
      window.GM_addValueChangeListener = () => 0;
    })();
  `;
  await page.addInitScript(GM);
  await page.addInitScript(readFileSync(join(ROOT, 'dist', 'find-your-country-code.user.js'), 'utf8'));

  await page.goto('http://127.0.0.1:' + PORT + '/fixtures/perf-1000.html');
  await page.waitForFunction(() => window.__cchPerf && window.__cchPerf.scans > 0);
  await page.waitForTimeout(800); // 静置过初始防抖窗口，隔离初始样本
  const init = await page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    scans: window.__cchPerf.scans,
    samples: window.__cchPerf.samples.slice(),
    maxMs: window.__cchPerf.maxMs,
  }));

  await page.locator('#perf-add').click();
  const t0 = Date.now();
  await page.waitForSelector('.cch-wrapper select#perf-code2', { timeout: 3000 });
  const rescanWallMs = Date.now() - t0;
  const after = await page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    scans: window.__cchPerf.scans,
    samples: window.__cchPerf.samples.slice(),
    maxMs: window.__cchPerf.maxMs,
  }));

  console.log(JSON.stringify({
    staticNodes: init.nodes,
    staticScans: init.scans,
    staticScanSamplesMs: init.samples,
    staticScanMaxMs: init.maxMs,
    afterNodes: after.nodes,
    rescanWallMs, // 点击→图标可见（含 350ms 防抖）
    rescanScanSamplesMs: after.samples.slice(init.scans - 1),
    overallScanMaxMs: after.maxMs,
    debounceWindowMs: 350,
    withinDebounceWindow: after.maxMs < 350,
  }, null, 2));
  await browser.close();
} finally {
  server.kill();
}
