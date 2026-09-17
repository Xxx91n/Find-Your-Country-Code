#!/usr/bin/env node
// tests/scripts/issue-checkbox-audit.mjs
// ─────────────────────────────────────────────────────────────────────────────
// 票据勾销标记 × 窗口报告完成自述 —— 一致性门（Cycle-7 / D-010）
//
// 病根：窗口报告自述「issue 全部 N 项验收项勾销」，而票据文件的验收复选框实际
//       仍停在 0/N（Cycle-6 票 04 即此情形）——报告与票据实物相反。
//
// 判定口径
//   ① 票据侧：解析 .scratch/architecture-recovery/issues/*.md 的验收复选框标记
//      `- [x]`（已勾）/ `- [ ]`（未勾），得 ticked/total。
//   ② 报告侧：报告用「完成自述」声明其宣称已勾销的条数。识别两种形式——
//      a) 显式机器可读指令  <!-- issue-checkbox-audit: ticked=N total=M -->
//      b) 本仓既有完成自查行  `issue 全部 … 验收项勾销`（可带 `N 项`），
//         辅以同报告的 `§X N 条逐条` / `issue N 条勾销` 取数。
//   ③ 比对：声明勾销数 ≠ 票据实际勾选数 → FAIL（退出非零）。
//   ④ 未作完成自述的报告 → SKIP，显式打印，**绝不算作 PASS**。
//   ⑤ **unknown 不得静默合并为 pass**：报告作了完成自述、但数字缺失或无法解析
//      → 记 UNKNOWN 并**退出非零**；缺数据绝不推导出「已完成」。
//
// 复用性：不硬编码任何票号；后续周期的报告只要采用上述自述形式即自动纳入。
// 根锚定：从本脚本自身路径上溯两级 = 仓库根。
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ISSUES_DIR = join(ROOT, '.scratch', 'architecture-recovery', 'issues');
const REPORTS_DIR = join(ROOT, '.scratch', 'architecture-recovery', 'research', 'window-reports');

// —— 票据侧：验收复选框标记 ——
const RE_TICKED = /^[ \t]*[-*][ \t]+\[[xX]\]/gm;
const RE_UNTICKED = /^[ \t]*[-*][ \t]+\[[ \t]\]/gm;

// —— 报告侧：完成自述 ——
const RE_DIRECTIVE = /<!--\s*issue-checkbox-audit:\s*ticked=(\d+)\s+total=(\d+)\s*-->/;
const RE_ASSERT = /issue\s*全部[^\n]*验收项\s*勾销/;

// 中文数字 → 阿拉伯数字（报告惯用「六条」「七项」）
const CN = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function parseCount(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s);
  let n = 0;
  for (const ch of s) {
    if (ch === '十') { n = (n === 0 ? 1 : n) * 10; continue; }
    if (CN[ch] === undefined) return NaN;
    n += CN[ch];
  }
  return n;
}

function countCheckboxes(text) {
  const ticked = (text.match(RE_TICKED) || []).length;
  const unticked = (text.match(RE_UNTICKED) || []).length;
  return { ticked, unticked, total: ticked + unticked };
}

// 返回 { ticked, total, how }；自述存在但数字缺失/不可解析 → ticked = NaN
function extractClaim(reportText) {
  const d = RE_DIRECTIVE.exec(reportText);
  if (d) return { ticked: Number(d[1]), total: Number(d[2]), how: '指令 ticked=' + d[1] + ' total=' + d[2] };
  let m = /([零一二三四五六七八九十\d]+)\s*项\s*验收项\s*勾销/.exec(reportText);
  if (m) return { ticked: parseCount(m[1]), total: NaN, how: '自述「' + m[0].trim() + '」' };
  m = /§\s*\d+\s*([零一二三四五六七八九十\d]+)\s*条\s*逐条/.exec(reportText);
  if (m) return { ticked: parseCount(m[1]), total: NaN, how: '自述「' + m[0].trim() + '」' };
  m = /issue\s*([零一二三四五六七八九十\d]+)\s*(?:项|条)\s*勾销/.exec(reportText);
  if (m) return { ticked: parseCount(m[1]), total: NaN, how: '自述「' + m[0].trim() + '」' };
  return { ticked: NaN, total: NaN, how: '完成自述的数字缺失/不可解析' };
}

console.log('issue-checkbox-audit — 根锚定: ' + ROOT);

if (!existsSync(ISSUES_DIR) || !existsSync(REPORTS_DIR)) {
  console.log('FAIL  找不到 issues/ 或 window-reports/ 目录（根锚定失效）');
  process.exit(1);
}

const reports = readdirSync(REPORTS_DIR).filter((f) => f.endsWith('.md')).sort();
const audited = [];
const skipped = [];

for (const rep of reports) {
  const text = readFileSync(join(REPORTS_DIR, rep), 'utf8');
  const asserted = RE_ASSERT.test(text) || RE_DIRECTIVE.test(text);
  if (!asserted) { skipped.push(rep); continue; } // 未作完成自述：显式 SKIP，不计为 PASS

  const claim = extractClaim(text);
  const issueName = rep.replace(/-report\.md$/, '.md');
  const issuePath = join(ISSUES_DIR, issueName);

  if (!existsSync(issuePath)) {
    console.log('FAIL  ' + rep + ' → 未找到对应票据 ' + issueName + '（完成自述无法对账）');
    audited.push({ rep, status: 'FAIL' });
    continue;
  }
  const boxes = countCheckboxes(readFileSync(issuePath, 'utf8'));
  if (boxes.total === 0) {
    console.log('FAIL  ' + rep + ' → 票据 ' + issueName + ' 无验收复选框，无法对账');
    audited.push({ rep, status: 'FAIL' });
    continue;
  }
  if (!Number.isFinite(claim.ticked)) {
    // 报告作了完成自述却给不出数字：unknown 是一等状态，绝不合并为 pass。
    console.log('UNKNOWN  ' + rep + ' → ' + claim.how + '（unknown 不得静默合并为 pass）');
    audited.push({ rep, status: 'UNKNOWN' });
    continue;
  }
  if (claim.ticked !== boxes.ticked) {
    console.log('FAIL  ' + rep + ' 自述勾销 ' + claim.ticked + ' ≠ 票据 ' + issueName + ' 实际勾选 ' + boxes.ticked + '/' + boxes.total + '（' + claim.how + '）');
    audited.push({ rep, status: 'FAIL' });
    continue;
  }
  if (Number.isFinite(claim.total) && claim.total !== boxes.total) {
    console.log('FAIL  ' + rep + ' 自述总数 ' + claim.total + ' ≠ 票据 ' + issueName + ' 实际总数 ' + boxes.total);
    audited.push({ rep, status: 'FAIL' });
    continue;
  }
  console.log('PASS  ' + rep + ' → ' + issueName + ' 勾选 ' + boxes.ticked + '/' + boxes.total + '，与报告自述一致（' + claim.how + '）');
  audited.push({ rep, status: 'PASS' });
}

const bad = audited.filter((a) => a.status !== 'PASS');
if (skipped.length) {
  const head = skipped.slice(0, 8).join(', ');
  const more = skipped.length > 8 ? ' …（余 ' + (skipped.length - 8) + ' 份）' : '';
  console.log('SKIP  ' + skipped.length + ' 份报告未作完成自述（未纳入对账，不计为 PASS）：' + head + more);
}
console.log('');
console.log('汇总：审计 ' + audited.length + ' · PASS ' + (audited.length - bad.length) + ' · FAIL/UNKNOWN ' + bad.length + ' · SKIP ' + skipped.length);
if (bad.length) {
  console.log('结果：FAIL（勾销自述与票据实物不一致，或自述数字不可解析）');
  process.exit(1);
}
console.log('结果：PASS（全部完成自述与票据勾销标记一致）');
process.exit(0);
