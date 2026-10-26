#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-capture-forms.mjs — 形态语料原始快照抓取（票 06 / A-030）
//
// 定位：**退化回路第 1 步「定期重捕」** 的工具实现（见
//   tests/corpus/forms/README.md §退化回路）。
//   抓取候选指定页的原始快照（raw HTML + 渲染后 DOM + 截图），写入
//   **仓库外 archive**（复用既有证据归档模式，绝不入库）；库内只留
//   SHA256 指纹与元数据清单（tests/corpus/forms/manifest.json）。
//
// 纪律（本票硬约束）：
//   ① 公开页只做匿名 GET + 渲染；不登录、不提交表单、不抓取 PII；
//   ② 原始快照（含品牌内容与版权）**绝不写进仓库工作树**——输出根默认
//      指向仓库外 archive，且脚本拒绝把输出写进 REPO 内；
//   ③ 抓取是显式动作（人工 / 定期），不进 CI `pull_request` 门；
//   ④ 登录态镜像（issue #12 / GLOSSARY「登录态镜像」）：CI/自动化永不登录。
//      登录页经 --attach（CDP 附着用户本地已登录标签页）人工采集，产物与
//      公开页同构、标 login-derived，敏感字段值替换为形状占位；操作手册见
//      tests/corpus/forms/LOGIN-CAPTURE.md。成对拒绝（机器纪律）：
//      匿名模式拒绝 login:true source；附着模式只服务 login:true source。
//
// 用法：
//   node tests/scripts/06-capture-forms.mjs [--id <id>] [--archive <dir>] [--no-render]
//   node tests/scripts/06-capture-forms.mjs --attach --id <id> [--cdp-port 9222] [--tab <url 子串>]
//   CCH_ARCHIVE_ROOT=<dir> 可覆盖归档根（CI / 异机用）。
//   CCH_CAPTURE_HEADLESS=1 强制 headless（默认有头，同 live-smoke 的启动口径）。
//
// 启动模式（票 T5 / issue #14；复用真实站点冒烟层已验证的模式）：
//   真实站点普遍前置反爬托管挑战，headless shell 常被拦。默认有头启动；
//   CI 用 xvfb-run 提供虚拟显示。无 DISPLAY 的 Linux 自动回退 headless 并
//   打印告警（受挑战的源会如实失败，不伪造绿）。不采用 UA 伪造与反自动化
//   指纹开关。
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertArchiveOutsideRepo,
  assertCaptureDiscipline,
  redactSensitiveValues,
  buildAttachEntry,
  mergeCaptureManifest,
  newCaptureReport,
} from './12-login-capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

const DEFAULT_ARCHIVE_ROOT =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 启动口径与 tests/live/live-smoke.mjs 同轴（票 T5）：默认有头；无 DISPLAY 的
// Linux 回退 headless 并告警；CCH_CAPTURE_HEADLESS=1 强制 headless。
const NO_DISPLAY_LINUX = process.platform === 'linux' && !process.env.DISPLAY;
const FORCE_HEADLESS = process.env.CCH_CAPTURE_HEADLESS === '1';
const HEADLESS = FORCE_HEADLESS || NO_DISPLAY_LINUX;

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function parseArgs(argv) {
  const out = { id: null, archive: DEFAULT_ARCHIVE_ROOT, render: true, attach: false, cdpPort: 9222, tab: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') out.id = argv[++i];
    else if (a === '--archive') out.archive = argv[++i];
    else if (a === '--no-render') out.render = false;
    else if (a === '--attach') out.attach = true;
    else if (a === '--cdp-port') out.cdpPort = Number(argv[++i]);
    else if (a === '--tab') out.tab = argv[++i];
  }
  return out;
}

function loadSources() {
  const p = path.join(REPO, 'tests', 'corpus', 'forms', 'sources.json');
  const doc = JSON.parse(readFileSync(p, 'utf8'));
  return doc.sources;
}

async function fetchRaw(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 30000);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: c.signal,
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, buf };
  } finally {
    clearTimeout(t);
  }
}

async function renderDom(url, shotPath) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: HEADLESS });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // 等 SPA 首屏挂载：网络空闲或 3s 上限，不硬等（退化回路要的是形态，不是完整加载）
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const html = await page.content();
    await page.screenshot({ path: shotPath, fullPage: false });
    // 子帧快照：`srcdoc` / 嵌套预览帧的内容不在 `page.content()` 里（CodePen 形态必需）
    const frames = [];
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      try { frames.push({ url: f.url(), html: await f.content() }); } catch {}
    }
    return { html, frames };
  } finally {
    await browser.close();
  }
}

// ── 附着采集（登录态镜像；issue #12） ──
// 只读用户已登录的标签页现场：**绝不导航**（goto 会破坏登录态现场），
// 绝不触碰表单；DOM / 子帧先过敏感字段脱敏再落盘，截图只进仓外 archive。
async function attachCapture(source, args, outDir) {
  const { chromium } = await import('playwright');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:' + args.cdpPort);
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    let origin = null;
    try { origin = new URL(source.url).origin; } catch {}
    let candidates = pages.filter((p) => {
      try { return origin != null && new URL(p.url()).origin === origin; } catch { return false; }
    });
    if (args.tab) candidates = candidates.filter((p) => p.url().includes(args.tab));
    if (candidates.length === 0) {
      throw new Error(
        '没有匹配的已登录标签页（source origin: ' + origin + (args.tab ? '，--tab: ' + args.tab : '') + '）。\n' +
        '  当前标签页：\n' + pages.slice(0, 10).map((p) => '    ' + p.url()).join('\n')
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        '同源标签页不止一个，用 --tab <url 子串> 消歧：\n' +
        candidates.map((p) => '    ' + p.url()).join('\n')
      );
    }
    const page = candidates[0];

    const userAgent = await page.evaluate(() => navigator.userAgent);
    const shotRel = 'shot/' + source.id + '.png';
    await page.screenshot({ path: path.join(outDir, shotRel), fullPage: false });

    const { html: domHtml, redactions } = redactSensitiveValues(await page.content());
    const domBuf = Buffer.from(domHtml, 'utf8');
    writeFileSync(path.join(outDir, 'dom', source.id + '.html'), domBuf);

    const frames = [];
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      try {
        const buf = Buffer.from(redactSensitiveValues(await f.content()).html, 'utf8');
        const rel = 'dom/' + source.id + '.frame' + frames.length + '.html';
        writeFileSync(path.join(outDir, rel), buf);
        frames.push({ rel, buf, url: f.url() });
      } catch {}
    }

    const entry = buildAttachEntry({
      id: source.id,
      sourceUrl: source.url,
      family: source.family,
      attachedUrl: page.url(),
      userAgent,
      domBuf,
      frames,
      shotRel,
      redactionCount: redactions.length,
    });

    console.log(
      'OK   ' + entry.id + '  (cdp-attach)\n' +
      '     attached_url=' + entry.attached_url + '\n' +
      '     dom=' + entry.dom.bytes + 'B  frames=' + frames.length + '  脱敏=' + redactions.length + ' 处（password/otp/identity → 形状占位）'
    );
    return entry;
  } finally {
    await browser.close(); // connectOverCDP 的 close = 断开连接，不退出用户的 Chrome
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const archiveRoot = path.resolve(args.archive);
  const outDir = path.join(archiveRoot, 'corpus-forms');

  // 硬护栏：输出必须落在仓库外（原始快照不入库；公开页/附着同源，共享实现于 12-login-capture.mjs）
  assertArchiveOutsideRepo(outDir, REPO);

  const sources = loadSources().filter((s) => !args.id || s.id === args.id);
  if (sources.length === 0) throw new Error('没有匹配的 source（--id ' + args.id + '）');

  // ── 登录纪律（issue #12：CI/自动化永不登录；成对拒绝，判定同源于 12-login-capture.mjs） ──
  assertCaptureDiscipline(args, sources);

  // 启动模式留痕（不伪造绿：无 DISPLAY 时的回退必须可见）
  if (!args.attach) {
    if (NO_DISPLAY_LINUX && !FORCE_HEADLESS) {
      console.log('WARN 无 DISPLAY：浏览器自动回退 headless（受反爬挑战的源会如实失败，不伪造绿；CI 用 xvfb-run 提供有头显示）');
    }
    console.log('browser mode: ' + (args.render ? (HEADLESS ? 'headless' : 'headed') : 'n/a (--no-render)'));
  }

  for (const sub of ['raw', 'dom', 'shot']) mkdirSync(path.join(outDir, sub), { recursive: true });

  // ── 附着路径：按 id 原位合并进既有 CAPTURE-MANIFEST（不整批覆盖公开页条目） ──
  if (args.attach) {
    const entry = await attachCapture(sources[0], args, outDir);
    const capPath = path.join(outDir, 'CAPTURE-MANIFEST.json');
    const report = existsSync(capPath)
      ? mergeCaptureManifest(JSON.parse(readFileSync(capPath, 'utf8')), [entry])
      : newCaptureReport(entry, archiveRoot);
    writeFileSync(capPath, JSON.stringify(report, null, 2) + '\n');
    console.log('---');
    console.log('attached ' + entry.id + ' → ' + archiveRoot + '/corpus-forms（login-derived，已脱敏）');
    console.log('manifest → corpus-forms/CAPTURE-MANIFEST.json（按 id 合并）');
    return;
  }

  const report = {
    capturedAt: new Date().toISOString(),
    archiveRoot: archiveRoot.replace(/\\/g, '/'),
    archiveDir: 'corpus-forms',
    userAgent: UA,
    entries: [],
  };

  for (const s of sources) {
    // 手工重构镜像（issue #13 / spec #9 Q9）：页面已不可访问、无法再重现——
    // 不重捕，显式 SKIP 留记录（跳过附 reason：source=reconstructed + provenance
    // 见 sources.json），也不往 CAPTURE-MANIFEST 塞空壳条目（06-manifest 对
    // reconstructed + 抓取记录互斥有硬校验）。
    if (s.adoption === 'reconstructed') {
      console.log('SKIP ' + s.id + '  source=reconstructed —— 手工重构镜像不重捕（provenance 见 sources.json；结构比对由 06-structural-diff 显式 skip）');
      continue;
    }
    const entry = { id: s.id, source_url: s.url, family: s.family };
    try {
      const raw = await fetchRaw(s.url);
      entry.http_status = raw.status;
      const rawPath = path.join(outDir, 'raw', s.id + '.html');
      writeFileSync(rawPath, raw.buf);
      entry.raw = { file: 'raw/' + s.id + '.html', bytes: raw.buf.length, sha256: sha256(raw.buf) };

      if (args.render) {
        const shotPath = path.join(outDir, 'shot', s.id + '.png');
        const rendered = await renderDom(s.url, shotPath);
        const domBuf = Buffer.from(rendered.html, 'utf8');
        writeFileSync(path.join(outDir, 'dom', s.id + '.html'), domBuf);
        entry.dom = { file: 'dom/' + s.id + '.html', bytes: domBuf.length, sha256: sha256(domBuf) };
        entry.shot = { file: 'shot/' + s.id + '.png' };
        // 子帧快照（srcdoc / 嵌套预览帧）
        entry.frames = [];
        rendered.frames.forEach((fr, i) => {
          const buf = Buffer.from(fr.html, 'utf8');
          const rel = 'dom/' + s.id + '.frame' + i + '.html';
          writeFileSync(path.join(outDir, rel), buf);
          entry.frames.push({ file: rel, bytes: buf.length, sha256: sha256(buf), url: fr.url });
        });
      }
      entry.ok = true;
    } catch (e) {
      entry.ok = false;
      entry.error = String((e && e.message) || e).slice(0, 200);
    }
    report.entries.push(entry);
    console.log(
      (entry.ok ? 'OK  ' : 'FAIL') + ' ' + entry.id +
      '  status=' + (entry.http_status ?? '-') +
      '  raw=' + (entry.raw ? entry.raw.bytes + 'B' : '-') +
      (entry.error ? '  err=' + entry.error : '')
    );
  }

  // 数据完整性（review #18）：空运行不落盘——如 `--id <重构条目>`（全部被 skip）
  // 时 report.entries 为空，若仍写 CAPTURE-MANIFEST 会以空 entries 覆盖既有台账、
  // 抹掉既有抓取记录（「不重捕」≠「清账」）。非空运行照常写。
  if (report.entries.length === 0) {
    console.log('---');
    console.log('no capture entries in this run — CAPTURE-MANIFEST.json left untouched');
    return;
  }

  writeFileSync(
    path.join(outDir, 'CAPTURE-MANIFEST.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  const okN = report.entries.filter((e) => e.ok).length;
  console.log('---');
  console.log('captured ' + okN + '/' + report.entries.length + ' → ' + report.archiveRoot + '/' + report.archiveDir);
  console.log('manifest → corpus-forms/CAPTURE-MANIFEST.json');
  if (okN !== report.entries.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('capture failed: ' + ((e && e.stack) || e));
  process.exit(2);
});
