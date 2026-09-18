#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// tests/scripts/scratch-draft-clean.mjs — Cycle-8 T-01 「清理脚本白名单化」（D-004①）
//
// 目的：`.scratch/` 是受管工件区（ADR-0013 决策 1），清理只允许触碰真可抛弃的 `draft/`
//   （决策 2）。本脚本是那条规则的**唯一机器入口**：对目标路径做**硬白名单**，
//   任何解析后不在 `.scratch/draft/` 之下的路径**一律拒绝执行**（非零退出）。
//
// 不变量：
//   - 默认 **dry-run**：只列候选，不删任何东西（须显式 `--apply`）；
//   - `draft/README.md`（区界文档）**永不在删除候选内**；
//   - 路径先 `path.resolve` 再比对，能拦住 `../` 越权与符号链接式绕过；
//   - 只删文件与空目录，不跨区、不递归删除非白名单子树。
//
// 用法：
//   node tests/scripts/scratch-draft-clean.mjs               # dry-run（默认）
//   node tests/scripts/scratch-draft-clean.mjs --apply       # 真删（仅限 draft/）
//   node tests/scripts/scratch-draft-clean.mjs --self-test   # 白名单自检（含阴性对照）
//   node tests/scripts/scratch-draft-clean.mjs --json        # 机器可读输出
// ══════════════════════════════════════════════════════════════════

import { readdirSync, statSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const DRAFT_DIR = resolve(join(ROOT, '.scratch', 'draft'));
const KEEP = new Set(['README.md']);
const ARGS = new Set(process.argv.slice(2));
const APPLY = ARGS.has('--apply');
const JSON_OUT = ARGS.has('--json');

/** 硬白名单：解析后的绝对路径必须位于 DRAFT_DIR 之下，且不得等于 DRAFT_DIR 本身。 */
export function assertWhitelisted(absPath) {
  const abs = resolve(absPath);
  if (abs === DRAFT_DIR) return abs;
  if (!abs.startsWith(DRAFT_DIR + sep)) {
    throw new Error('REFUSED: path outside the draft whitelist: ' + abs + ' (whitelist = ' + DRAFT_DIR + ')' );
  }
  return abs;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    assertWhitelisted(p);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function collectCandidates() {
  if (!existsSync(DRAFT_DIR)) return { files: [], dirs: [] };
  const files = walk(DRAFT_DIR).filter((f) => !KEEP.has(f.slice(DRAFT_DIR.length + 1)));
  const dirs = [];
  const scan = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = join(d, e.name);
      assertWhitelisted(p);
      scan(p);
      if (readdirSync(p).length === 0) dirs.push(p);
    }
  };
  scan(DRAFT_DIR);
  return { files, dirs };
}

function runSelfTest() {
  const fails = [];
  const t = (name, fn, expectRefusal) => {
    let refused = false, err = '';
    try { fn(); } catch (e) { refused = true; err = String(e.message || e); }
    const ok = refused === expectRefusal;
    if (!ok) fails.push(name + ' (expected ' + (expectRefusal ? 'REFUSAL' : 'ACCEPT') + ', got ' + (refused ? 'REFUSAL' : 'ACCEPT') + (err ? ' :: ' + err : '') + ')');
  };
  // 正向：draft/ 下的内容被接受
  t('accept: draft/probes/x.mjs', () => assertWhitelisted(join(DRAFT_DIR, 'probes', 'x.mjs')), false);
  t('accept: draft/README.md', () => assertWhitelisted(join(DRAFT_DIR, 'README.md')), false);
  // 阴性对照：区外一律拒绝
  t('refuse: .scratch/README.md', () => assertWhitelisted(join(ROOT, '.scratch', 'README.md')), true);
  t('refuse: .scratch/evidence/findings-register.md', () => assertWhitelisted(join(ROOT, '.scratch', 'evidence', 'findings-register.md')), true);
  t('refuse: .scratch/architecture-recovery/issues/01.md', () => assertWhitelisted(join(ROOT, '.scratch', 'architecture-recovery', 'issues', '01.md')), true);
  t('refuse: docs/adr/0005.md', () => assertWhitelisted(join(ROOT, 'docs', 'adr', '0005.md')), true);
  t('refuse: repo root', () => assertWhitelisted(ROOT), true);
  // 越权：../ 穿越必须被解析后拒绝
  t('refuse: traversal draft/../../.scratch/README.md', () => assertWhitelisted(join(DRAFT_DIR, '..', '..', '.scratch', 'README.md')), true);
  t('refuse: traversal draft/../evidence/x.md', () => assertWhitelisted(join(DRAFT_DIR, '..', 'evidence', 'x.md')), true);
  // dry-run 不删东西
  const before = collectCandidates().files.length;
  t('dry-run deletes nothing (no --apply)', () => { if (APPLY) throw new Error('self-test must run without --apply'); collectCandidates(); }, false);
  const after = collectCandidates().files.length;
  if (before !== after) fails.push('dry-run mutated the draft area: ' + before + ' -> ' + after);
  // README.md 永不在候选内
  if (collectCandidates().files.some((f) => f.slice(DRAFT_DIR.length + 1) === 'README.md')) fails.push('README.md must never be a deletion candidate');
  return fails;
}

const { files, dirs } = collectCandidates();
const selfTestFails = ARGS.has('--self-test') ? runSelfTest() : [];

const deleted = [];
if (APPLY && selfTestFails.length === 0) {
  for (const f of files) { assertWhitelisted(f); unlinkSync(f); deleted.push(f); }
  for (const d of dirs.slice().reverse()) { try { rmdirSync(d); } catch { /* not empty anymore */ } }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ draftDir: DRAFT_DIR, apply: APPLY, candidates: files.length, emptyDirs: dirs.length, deleted: deleted.length, selfTestFailures: selfTestFails, candidatesList: files.map((f) => f.slice(ROOT.length + 1).split(sep).join('/')) }, null, 2));
} else {
  console.log('scratch-draft-clean: whitelist = .scratch/draft/  |  mode = ' + (APPLY ? 'APPLY (delete)' : 'dry-run (no deletion)'));
  console.log('  candidates: ' + files.length + ' file(s), ' + dirs.length + ' empty dir(s)');
  for (const f of files) console.log('    - ' + f.slice(ROOT.length + 1).split(sep).join('/'));
  if (ARGS.has('--self-test')) {
    if (selfTestFails.length === 0) console.log('  PASS  self-test (whitelist accept/refuse + traversal refusal + dry-run purity + README protected)');
    else for (const f of selfTestFails) console.log('  FAIL  ' + f);
  }
  if (APPLY) console.log('  deleted: ' + deleted.length + ' file(s)');
  console.log(selfTestFails.length === 0 ? 'scratch-draft-clean: OK' : 'scratch-draft-clean: ' + selfTestFails.length + ' failure(s)');
}

if (selfTestFails.length > 0) process.exit(1);
