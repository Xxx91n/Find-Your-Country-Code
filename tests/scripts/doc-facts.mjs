#!/usr/bin/env node
// tests/scripts/doc-facts.mjs — D-006 doc-facts lint
// 校验 tests/ACCEPTANCE-SURFACE.md 记录的观测面与 src/ 实际实现一致：
//   1) 文档中出现的每个 #cch-* / .cch-* 选择器都必须存在于 src/；
//   2) 文档记录的「菜单命令注册（顶层 N 条）」必须等于 src/main.ts 的真实注册处数。
// 仓库根以本文件位置上溯两级锚定；失败时退出码非零。不新增 workflow 文件（D-004）。

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC_PATH = join(ROOT, 'tests', 'ACCEPTANCE-SURFACE.md');
const SRC_DIR = join(ROOT, 'src');
const MAIN_PATH = join(ROOT, 'src', 'main.ts');
const NL = String.fromCharCode(10);
const SEP = String.fromCharCode(92); // path separator, avoids a literal backslash in source

const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html']);

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(p, out);
    else if (SRC_EXT.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

const rel = (p) => p.slice(ROOT.length + 1).split(SEP).join('/');
let failures = 0;
const pass = (m) => console.log('PASS  ' + m);
const fail = (m) => { failures++; console.log('FAIL  ' + m); };

const doc = readFileSync(DOC_PATH, 'utf8');
const docLines = doc.split(NL);
const srcBlob = collectFiles(SRC_DIR).map((f) => readFileSync(f, 'utf8')).join(NL);

// selector names are [A-Za-z0-9_-] only, so no regex escaping is required.
const existsInSrc = (name) => new RegExp('(^|[^A-Za-z0-9_-])' + name + '([^A-Za-z0-9_-]|$)').test(srcBlob);

// --- 1. selector tokens documented in the acceptance surface ---
const tokens = [...new Set(doc.match(/[#.][A-Za-z0-9_-]*cch[A-Za-z0-9_-]*/g) || [])];
const missing = [];
for (const tok of tokens) {
  if (!existsInSrc(tok.slice(1))) {
    const lines = docLines.map((l, i) => (l.includes(tok) ? i + 1 : 0)).filter(Boolean);
    missing.push(tok + ' (' + rel(DOC_PATH) + ':' + lines.join(',') + ')');
  }
}
if (missing.length === 0) pass('selectors: ' + tokens.length + '/' + tokens.length + ' documented #cch-*/.cch-* tokens exist in src/');
else fail('selector(s) documented but absent from src/: ' + missing.join(' | '));

// --- 2. top-level menu-command count ---
const realCount = readFileSync(MAIN_PATH, 'utf8')
  .split(NL)
  .filter((l) => {
    const t = l.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
  })
  .filter((l) => !l.includes('declare function'))
  .filter((l) => l.includes('GM_registerMenuCommand('))
  .length;

const m = doc.match(/菜单命令注册[（(]顶层[^0-9]*([0-9]+)[^0-9]*条[）)]/);
if (!m) fail('menu-command count: doc sentence not found in ' + rel(DOC_PATH));
else {
  const docCount = Number(m[1]);
  if (docCount === realCount) pass('menu-command count: doc=' + docCount + ' real=' + realCount + ' (' + rel(MAIN_PATH) + ')');
  else fail('menu-command count drift: doc says ' + docCount + ', src/main.ts registers ' + realCount);
}

if (failures === 0) console.log('doc-facts: OK (' + tokens.length + ' selectors, ' + realCount + ' menu commands)');
else { console.log('doc-facts: ' + failures + ' failure(s)'); process.exit(1); }
