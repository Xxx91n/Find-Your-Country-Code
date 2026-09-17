// ══════════════════════════════════════════════════════════════════
// cdp-autofill-fitness.mjs — 票 32 检查点：CDP Autofill.trigger 适配度评估（先评估后决定）
// 性质：opt-in 评估工具，不进入任何断言面、不进 CI 门禁、不阻断任何流程。
// 问题：CDP Autofill 域（trigger / FilledField / addressFormFilled）能否用来断言
//       userscript 注入的区号填充？
// 调研结论（atomcode 两源互证，2026-09-12）：不能。Autofill 域是浏览器原生
//       AutofillManager 的驱动/观测接口；userscript 走原生 value setter +
//       input/change/blur 合成事件，不经过 AutofillManager，因此
//       addressFormFilled 不会为脚本注入触发。本脚本把这个结论跑成可复现证据。
// 用法: node tests/live/cdp-autofill-fitness.mjs [--json out.json]
// ══════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const PAGES = join(here, 'pages');
const PORT = Number(process.env.CCH_LIVE_PORT || 4401);
const PAGE = 'mirror-three-forms.html';
const TARGET = '#m-iso2';

function arg(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; }
function serve() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '') || PAGE;
    if (name.includes('..')) { res.writeHead(403); res.end(); return; }
    const f = join(PAGES, name);
    if (!existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(f));
  });
  return new Promise(r => server.listen(PORT, '127.0.0.1', () => r(server)));
}

const steps = [];
const add = (name, status, detail) => steps.push({ name, status, detail: String(detail || '').slice(0, 240) });

const server = await serve();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const fired = [];

let cdp = null;
try {
  cdp = await ctx.newCDPSession(page);
  await cdp.send('Autofill.enable').then(() => add('Autofill.enable', 'ok', '域可用')).catch(e => add('Autofill.enable', 'unavailable', e.message));
  cdp.on('Autofill.addressFormFilled', e => fired.push({ at: 'native', fields: (e.filledFields || []).length }));

  await page.goto('http://127.0.0.1:' + PORT + '/' + PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // ── 阶段 A：原生 oracle 路径（CDP 驱动浏览器自己的填充） ──
  try {
    await cdp.send('Autofill.setAddresses', { addresses: [{ fields: [
      { name: 'country', value: 'US' },
      { name: 'tel-country-code', value: '+1' },
      { name: 'phone', value: '2025550123' },
    ] }] });
    add('Autofill.setAddresses', 'ok', '注入了一个地址 profile（浏览器侧）');
  } catch (e) { add('Autofill.setAddresses', 'unavailable', e.message); }

  try {
    await cdp.send('Autofill.trigger', { fieldId: TARGET });
    add('Autofill.trigger', 'accepted', 'fieldId 直接用 DOM 选择器传入被接受（需人工核实语义）');
  } catch (e) {
    add('Autofill.trigger', 'not-drivable', 'fieldId 需浏览器内部字段 id，无法由外部 DOM 直接构造 → ' + e.message);
  }
  await page.waitForTimeout(500);
  add('阶段A: addressFormFilled', fired.length ? 'fired' : 'not-fired', '原生路径事件数=' + fired.length);

  // ── 阶段 B：userscript 注入路径（本仓库 _inject 的同构写法） ──
  const before = fired.length;
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('target not found: ' + sel);
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
    setter.call(el, 'cn');
    ['input', 'change', 'blur'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  }, TARGET);
  await page.waitForTimeout(500);
  const delta = fired.length - before;
  add('阶段B: userscript 注入后 addressFormFilled', delta ? 'fired' : 'not-fired',
    '注入值=' + (await page.inputValue(TARGET)) + '，新增事件=' + delta);
} catch (e) {
  add('fatal', 'error', e.message);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}

const notFired = steps.some(s => s.name.indexOf('阶段B') === 0 && s.status === 'not-fired');
const verdict = notFired
  ? 'NOT-ADOPTED（不采用为脚本填充断言面）：CDP Autofill 域对 userscript 注入零观测，断言面继续用注入后 DOM 值 + input/change 事件'
  : 'INCONCLUSIVE：未观测到期望的“脚本注入不触发”证据，需人工复核';

const pad = (s, n) => String(s).padEnd(n);
console.log('— CDP Autofill.trigger 适配度评估（票 32）');
for (const s of steps) console.log('[' + pad(s.status, 13) + '] ' + pad(s.name, 42) + ' ' + s.detail);
console.log('判定: ' + verdict);

const out = { ticket: 32, purpose: 'CDP Autofill 域对 userscript 注入的适配度', verdict, steps,
  decision: '不硬套：不以 CDP Autofill 断言脚本填充；保留为可选的“原生分类 oracle”（fixture 侧）候选，本轮不接线' };
const p = arg('--json');
if (p) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); console.log('json → ' + p); }
process.exit(0);
