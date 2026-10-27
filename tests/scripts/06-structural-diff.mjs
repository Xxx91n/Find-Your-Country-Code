#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-structural-diff.mjs — 形态语料退化回路：确定性结构 diff + 分级判定
//                          （票 06 / A-030；第 2–3 步）
//
// 定位：站点改版的**确定性**探测（**非像素 diff**）。比较两份结构骨架
//   （基线 vs 新捕），按差异性质**分级**给出 bump 建议：
//     · none  —— 无结构差异（可忽略内容替换）
//     · patch —— 仅文本**形状类别**微变（值域形态变化，如 +86 ↔ CN）
//     · minor —— 属性 / 重复计数变化（选项增减、role 增补）
//     · major —— 标签 / class / 子节点数变化（结构改版）
//
// 纪律：**绝不为修绿而盲目更新快照**。diff 非空即须先归因（站点改版 /
//   抓取环境差异 / 归一化缺陷），归因结论落报告后才 bump 与更新镜像页。
//
// 用法：
//   node tests/scripts/06-structural-diff.mjs --base <baseline.json> --new <new.json>
//   node tests/scripts/06-structural-diff.mjs --id <id> [--archive <dir>]   # 重捕后比对已提交基线
// 退出码：0 = none/patch，或 reconstructed SKIP（显式跳过，非判定）；1 = minor/major；
//         2 = 失败
//
// 手工重构镜像排除（issue #13 / spec #9 Q9）：基线骨架 source=reconstructed 的
//   条目**一律跳过结构比对**——无可信基线，diff 只会误报。skip 是显式动作：
//   输出 SKIP 行留记录（不静默）、不产 tier 判定（不 none/patch/minor/major）。
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FORMS = path.join(REPO, 'tests', 'corpus', 'forms');
const DEFAULT_ARCHIVE =
  process.env.CCH_ARCHIVE_ROOT || 'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

function diff(a, b, p, out) {
  if (!a || !b) { out.push({ kind: 'major', path: p, msg: 'node missing on one side' }); return; }
  // 标签不同只记一条 major 后**继续**比对子树（issue #33）：提前 return 会让同一处
  // 改版只报父节点那一条，子树里真实的 class / 属性差异被吞（iti-v29 `div → span`
  // 同时国旗 class 由 jp 变 us，旧行为只报 1 条）。tier 语义不变：major 已是最重档。
  if (a.tag !== b.tag) { out.push({ kind: 'major', path: p, msg: 'tag ' + a.tag + ' → ' + b.tag }); }
  if (JSON.stringify(a.class || null) !== JSON.stringify(b.class || null)) {
    out.push({ kind: 'major', path: p, msg: 'class ' + JSON.stringify(a.class || []) + ' → ' + JSON.stringify(b.class || []) });
  }
  if (JSON.stringify(a.attrs || null) !== JSON.stringify(b.attrs || null)) {
    out.push({ kind: 'minor', path: p, msg: 'attrs ' + JSON.stringify(a.attrs || {}) + ' → ' + JSON.stringify(b.attrs || {}) });
  }
  const ar = a.repeat || 1, br = b.repeat || 1;
  if (ar !== br) out.push({ kind: 'minor', path: p, msg: 'repeat ' + ar + ' → ' + br });
  if ((a.text || '') !== (b.text || '')) out.push({ kind: 'patch', path: p, msg: 'text-shape "' + (a.text || '') + '" → "' + (b.text || '') + '"' });
  const ac = a.children || [], bc = b.children || [];
  if (ac.length !== bc.length) out.push({ kind: 'major', path: p, msg: 'children ' + ac.length + ' → ' + bc.length });
  for (let i = 0; i < Math.min(ac.length, bc.length); i++) diff(ac[i], bc[i], p + '/' + i, out);
}

function loadSkeleton(p) { return JSON.parse(readFileSync(p, 'utf8')); }

function main() {
  const argv = process.argv.slice(2);
  const get = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const baseArg = get('--base');
  const newArg = get('--new');
  const id = get('--id');
  const archive = path.resolve(get('--archive') || DEFAULT_ARCHIVE);

  let basePath, newPath, label;
  if (id) {
    basePath = path.join(FORMS, 'skeletons', id + '.json');
    newPath = get('--new') || path.join(archive, 'corpus-forms', 'skeletons', id + '.json');
    label = id;
  } else {
    if (!baseArg || !newArg) throw new Error('需要 --base <json> --new <json>，或 --id <id>');
    basePath = baseArg; newPath = newArg; label = path.basename(newArg);
  }

  const base = loadSkeleton(basePath);

  // 手工重构镜像（GLOSSARY「手工重构镜像」；issue #13 / spec #9 Q9）：
  // 基线 source=reconstructed ⇒ 无可信基线，结构比对一律显式 skip——
  // 留记录（不静默）、不产 tier 判定（退出 0 是「未裁定」，非 none 判定）。
  // 判定先于 new 侧加载：重构条目没有重捕产物，new 路径多半不存在。
  if (base.source === 'reconstructed') {
    console.log('structural-diff [' + label + ']');
    console.log('  base: ' + basePath.replace(/\\/g, '/'));
    console.log('  new : ' + newPath.replace(/\\/g, '/') + '  （未读取比对）');
    console.log('  SKIP source=reconstructed —— 手工重构镜像：无可信基线，结构比对一律跳过，不产 tier 判定');
    console.log('  provenance: ' + (base.provenance || '（缺失：reconstructed 骨架必须随附 provenance，见 verify-ticket-43）'));
    return;
  }

  const next = loadSkeleton(newPath);
  // new 侧同轴（review #18）：--base/--new 可任意拼接，重构骨架出现在**任一侧**
  // 都不参与比对——否则捕获基线 × 重构 new 会走常规 diff 并误产 tier。
  // （base 侧检查须先于 new 加载：重构条目没有重捕产物，new 路径可能不存在。）
  if (next.source === 'reconstructed') {
    console.log('structural-diff [' + label + ']');
    console.log('  base: ' + basePath.replace(/\\/g, '/'));
    console.log('  new : ' + newPath.replace(/\\/g, '/'));
    console.log('  SKIP source=reconstructed —— 手工重构镜像（new 侧）：无可信基线，结构比对一律跳过，不产 tier 判定');
    console.log('  provenance: ' + (next.provenance || '（缺失：reconstructed 骨架必须随附 provenance，见 verify-ticket-43）'));
    return;
  }
  const changes = [];
  diff(base.tree, next.tree, '', changes);

  let tier = 'none';
  for (const c of changes) tier = worst(tier, c.kind);

  const bump = { none: 'none', patch: 'patch', minor: 'minor', major: 'major' }[tier];
  console.log('structural-diff [' + label + ']');
  console.log('  base: ' + basePath.replace(/\\/g, '/') + '  (' + base.node_count + 'n, ' + String(base.sha256).slice(0, 12) + '…)');
  console.log('  new : ' + newPath.replace(/\\/g, '/') + '  (' + next.node_count + 'n, ' + String(next.sha256).slice(0, 12) + '…)');
  console.log('  tier: ' + tier.toUpperCase() + '  (bump: ' + bump + ')  changes: ' + changes.length);
  const byKind = { major: [], minor: [], patch: [] };
  for (const c of changes) (byKind[c.kind] || (byKind[c.kind] = [])).push(c);
  for (const k of ['major', 'minor', 'patch']) {
    for (const c of (byKind[k] || []).slice(0, 12)) console.log('    [' + k + '] ' + (c.path || '/') + '  ' + c.msg);
    if ((byKind[k] || []).length > 12) console.log('    [' + k + '] … +' + (byKind[k].length - 12) + ' more');
  }
  if (tier === 'none') console.log('  → 无结构差异（内容替换不触发；无需 bump）');
  if (tier !== 'none' && tier !== 'patch') {
    console.log('  → 需归因后再决定 bump 与镜像页更新（**禁止为修绿盲目更新快照**）');
    process.exitCode = 1;
  }
}

try { main(); } catch (e) { console.error('structural-diff failed: ' + ((e && e.message) || e)); process.exit(2); }
