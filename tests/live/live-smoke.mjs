// ══════════════════════════════════════════════════════════════════
// live-smoke.mjs — 票 32 真实站点低频冒烟层（第二层）
// 定位：与密封 E2E（第一层，CI 必跑、零外网、PR 阻断）解耦。本层只做「低频 / 手动触发 +
//       可跳过白名单 + 弱断言 + 失败 advisory」，永不出现在 pull_request 触发面。
// 硬校验（exit 1）：白名单契约（跳过条目必须带非空 reason + ticket）；expect="injected" 的
//       目标必须真的注入（harness 自证）。
// 软观测（不退出）：expect="observe" 的目标只记录观测值（供票 27/28/29 作复现基线）。
// 用法: node tests/live/live-smoke.mjs [--json out.json] [--out out.md] [--all]
// 前置: npm run build（需 dist/find-your-country-code.user.js）
// ══════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const MANIFEST = join(here, 'site-manifest.json');
const PAGES = join(here, 'pages');
const DIST = join(ROOT, 'dist', 'find-your-country-code.user.js');
const PORT = Number(process.env.CCH_LIVE_PORT || 4399);
const SETTLE_MS = Number(process.env.CCH_LIVE_SETTLE_MS || 800);
const LIVE_TIMEOUT_MS = Number(process.env.CCH_LIVE_TIMEOUT_MS || 20000);

// GM_* 替身（与 tests/helpers/userscript.ts 同口径；此处内联以避免 .mjs 导入 .ts 链）
const GM_STUB = [
  '(() => {',
  '  const KEY = "__cch_gm__";',
  '  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };',
  '  window.GM_getValue = (k, d) => { const s = read(); return k in s ? s[k] : d; };',
  '  window.GM_setValue = (k, v) => { const s = read(); s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };',
  '  window.GM_addValueChangeListener = () => 0;',
  '  window.GM_registerMenuCommand = () => 0;',
  '})();',
].join('\n');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function arg(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; }
function writeOut(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }

// ── 契约校验：白名单必须可审计（跳过 ≠ 静默丢失） ──
function validate(manifest) {
  const v = [];
  if (!Array.isArray(manifest.targets) || !manifest.targets.length) { v.push('targets 缺失或为空'); return v; }
  const seen = new Set();
  for (const t of manifest.targets) {
    for (const f of ['id', 'kind', 'expect', 'enabled', 'reason', 'ticket']) {
      if (t[f] === undefined || t[f] === null || t[f] === '') v.push((t.id || '?') + ': 字段缺失 ' + f);
    }
    if (seen.has(t.id)) v.push('target id 重复: ' + t.id);
    seen.add(t.id);
    if (!['mirror', 'live'].includes(t.kind)) v.push(t.id + ': kind 非法 ' + t.kind);
    if (!['injected', 'observe'].includes(t.expect)) v.push(t.id + ': expect 非法 ' + t.expect);
    if (t.kind === 'mirror' && !t.page) v.push(t.id + ': mirror 缺 page');
    if (t.kind === 'live' && !t.url) v.push(t.id + ': live 缺 url');
    if (!t.enabled && (!t.reason || !t.ticket)) v.push(t.id + ': 跳过条目必须携带 reason + ticket（可审计白名单）');
  }
  return v;
}

// ── 本地镜像静态服务器（零依赖；只服务 tests/live/pages） ──
function servePages() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'mirror-three-forms.html';
    if (name.includes('..')) { res.writeHead(403); res.end('forbidden'); return; }
    const file = join(PAGES, name);
    if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const violations = validate(manifest);
const only = arg('--target');

if (!existsSync(DIST)) {
  console.log('缺少构建产物 ' + DIST + ' —— 先跑 npm run build（或 npm run e2e）');
  process.exit(2);
}
const userscript = readFileSync(DIST, 'utf8');

const selected = manifest.targets.filter(t => (only ? t.id === only : true));
const skipped = selected.filter(t => !t.enabled);
const runnable = selected.filter(t => t.enabled);

const results = [];
const failures = [];
let browser = null;
let server = null;

try {
  if (runnable.some(t => t.kind === 'mirror')) server = await servePages();
  browser = await chromium.launch({ headless: true });

  for (const t of runnable) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const rec = { id: t.id, kind: t.kind, expect: t.expect, status: 'unknown', detail: '' };
    try {
      await page.addInitScript(GM_STUB);
      await page.addInitScript(userscript);
      if (t.kind === 'mirror') {
        await page.goto('http://127.0.0.1:' + PORT + '/' + t.page, { waitUntil: 'domcontentloaded' });
      } else {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: LIVE_TIMEOUT_MS });
      }
      await page.waitForTimeout(SETTLE_MS);

      const probe = await page.evaluate(sel => {
        const n = document.querySelectorAll('.cch-wrapper').length;
        const b = document.querySelectorAll('.cch-btn').length;
        if (!sel) return { wrappers: n, buttons: b, elementFound: null, wrapped: null };
        const el = document.querySelector(sel);
        if (!el) return { wrappers: n, buttons: b, elementFound: false, wrapped: null };
        return { wrappers: n, buttons: b, elementFound: true, wrapped: !!el.closest('.cch-wrapper') };
      }, t.selector || null);

      rec.observed = probe;
      if (t.expect === 'injected') {
        const ok = probe.elementFound === true && probe.wrapped === true;
        rec.status = ok ? 'pass' : 'fail';
        rec.detail = ok ? '.cch-wrapper 已挂上目标字段' : ('未注入 (elementFound=' + probe.elementFound + ', wrapped=' + probe.wrapped + ')');
        if (!ok) failures.push(t.id + ': ' + rec.detail);
      } else {
        rec.status = 'observed';
        rec.detail = probe.elementFound === null
          ? '未校准（selector 为空，仅记录页面 wrapper/button 计数）'
          : ('wrapped=' + probe.wrapped + ' wrappers=' + probe.wrappers + ' buttons=' + probe.buttons);
      }
    } catch (e) {
      rec.status = t.expect === 'injected' ? 'fail' : 'error';
      rec.detail = String(e && e.message || e).split('\n')[0].slice(0, 200);
      if (t.expect === 'injected') failures.push(t.id + ': ' + rec.detail);
    } finally {
      await ctx.close();
    }
    results.push(rec);
  }
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(r => server.close(r));
}

const gate = violations.length === 0 && failures.length === 0;

const pad = (s, n) => String(s).padEnd(n);
console.log('— 真实站点低频冒烟（票 32 / A-006）：选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length);
for (const r of results) console.log('[' + pad(r.status, 8) + '] ' + pad(r.id, 24) + ' expect=' + pad(r.expect, 8) + ' ' + r.detail);
for (const s of skipped) console.log('[SKIPPED ] ' + pad(s.id, 24) + ' ticket=' + pad(s.ticket, 4) + ' reason=' + String(s.reason).slice(0, 70));
console.log('白名单契约 + harness 自证: ' + (gate ? 'PASS' : 'FAIL'));
for (const v of violations) console.log('  VIOLATION ' + v);
for (const f of failures) console.log('  FAILURE ' + f);

const summary = {
  ticket: 32, coveredA: 'A-006', layer: 'real-site live smoke (advisory)',
  manifest: 'tests/live/site-manifest.json',
  gate: gate ? 'pass' : 'fail', violations, failures,
  counts: { selected: selected.length, runnable: runnable.length, skipped: skipped.length, observed: results.filter(r => r.status === 'observed').length },
  results,
  skipped: skipped.map(s => ({ id: s.id, ticket: s.ticket, reason: s.reason })),
};
const jsonPath = arg('--json');
if (jsonPath) { writeOut(jsonPath, JSON.stringify(summary, null, 2) + '\n'); console.log('json → ' + jsonPath); }
const mdPath = arg('--out');
if (mdPath) {
  const L = [];
  L.push('# 真实站点低频冒烟报告（票 32 / A-006）');
  L.push('');
  L.push('- 层定位: advisory（仅 schedule / workflow_dispatch 触发，不进 PR 触发面）');
  L.push('- 白名单契约: ' + (violations.length ? 'FAIL' : 'PASS') + '；harness 自证: ' + (failures.length ? 'FAIL' : 'PASS'));
  L.push('- 计数: 选中 ' + selected.length + ' / 可跑 ' + runnable.length + ' / 跳过 ' + skipped.length);
  L.push('');
  L.push('| 目标 | 类型 | 期望 | 状态 | 观测 |');
  L.push('|---|---|---|---|---|');
  for (const r of results) L.push('| ' + [r.id, r.kind, r.expect, r.status, r.detail].join(' | ') + ' |');
  for (const s of skipped) L.push('| ' + [s.id, s.kind, s.expect, 'skipped', 'ticket=' + s.ticket].join(' | ') + ' |');
  L.push('');
  writeOut(mdPath, L.join('\n') + '\n');
  console.log('report → ' + mdPath);
}
process.exit(gate ? 0 : 1);
