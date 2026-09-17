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
//   ① 只采公开页；不登录、不提交表单、不抓取 PII；
//   ② 原始快照（含品牌内容与版权）**绝不写进仓库工作树**——输出根默认
//      指向仓库外 archive，且脚本拒绝把输出写进 REPO 内；
//   ③ 抓取是显式动作（人工 / 定期），不进 CI `pull_request` 门。
//
// 用法：
//   node tests/scripts/06-capture-forms.mjs [--id <id>] [--archive <dir>] [--no-render]
//   CCH_ARCHIVE_ROOT=<dir> 可覆盖归档根（CI / 异机用）。
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

const DEFAULT_ARCHIVE_ROOT =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function parseArgs(argv) {
  const out = { id: null, archive: DEFAULT_ARCHIVE_ROOT, render: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') out.id = argv[++i];
    else if (a === '--archive') out.archive = argv[++i];
    else if (a === '--no-render') out.render = false;
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
  const browser = await chromium.launch();
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const archiveRoot = path.resolve(args.archive);
  const outDir = path.join(archiveRoot, 'corpus-forms');

  // 硬护栏：输出必须落在仓库外（原始快照不入库）
  if (outDir === REPO || outDir.startsWith(REPO + path.sep)) {
    throw new Error('拒绝写入：原始快照输出目录不得位于仓库内 → ' + outDir);
  }

  const sources = loadSources().filter((s) => !args.id || s.id === args.id);
  if (sources.length === 0) throw new Error('没有匹配的 source（--id ' + args.id + '）');

  for (const sub of ['raw', 'dom', 'shot']) mkdirSync(path.join(outDir, sub), { recursive: true });

  const report = {
    capturedAt: new Date().toISOString(),
    archiveRoot: archiveRoot.replace(/\\/g, '/'),
    archiveDir: 'corpus-forms',
    userAgent: UA,
    entries: [],
  };

  for (const s of sources) {
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
