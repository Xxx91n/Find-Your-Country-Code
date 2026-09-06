// 收口步骤1修正：状态表行匹配要区分「波次表行」（| W | NN |）与「状态表行」（| NN slug |）
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery';
const readme = readFileSync(join(BASE, 'README.md'), 'utf8');
const problems = [];
const info = [];
let checks = 0;

const TICKETS = [
  ['01', 'modular-skeleton'], ['02', 'scoring-engine'], ['03', 'iti-adapter'],
  ['04', 'rescan-shadow-dom'], ['05', 'site-rules-engine'], ['06', 'playwright-e2e'],
  ['07', 'ui-upgrade'], ['08', 'docs-adr'], ['09', 'framework-injection'], ['10', 'release-pipeline'],
];

// 状态表行格式：| 01 模块化工程骨架迁移 | **done（...）** | 报告 | 复核结论 | 波次 |
for (const [nn, slug] of TICKETS) {
  checks++;
  // 精确匹配状态表行：以 "| NN " 开头且含 "**done" 或状态词
  const statusRow = readme.split(/\r?\n/).find(l => l.trim().startsWith(`| ${nn} `) && (l.includes('done') || l.includes('in-progress') || l.includes('blocked')));
  if (!statusRow) { problems.push(`[${nn}] 状态表行未找到`); continue; }
  if (!statusRow.includes('**done')) problems.push(`[${nn}] 状态非 done: ${statusRow.trim().slice(0, 90)}`);
  const reportFiles = readdirSync(join(BASE, 'research/window-reports')).filter(f => f.startsWith(nn + '-'));
  if (reportFiles.length === 0) problems.push(`[${nn}] window-reports 无报告`);
  checks++;
  // 波次表行也应存在（| W | NN | 格式）
  const waveRow = readme.split(/\r?\n/).find(l => /^\|\s*\d+\s*\|\s*\d{2}\s/.test(l.trim()) && l.includes(`| ${nn} `));
  if (!waveRow) problems.push(`[${nn}] 波次表行缺失`);
}

// 修复票最终态
checks++;
if (!readme.includes('03 intl-tel-input 适配层 | **done')) problems.push('README 03 非 done（修复后）');
checks++;
if (!readme.includes('07 面板 UI 升级 | **done')) problems.push('README 07 非 done（修复后）');
checks++;
if (readme.includes('fix-in-progress')) problems.push('README 残留 fix-in-progress');

// 修复报告存在
for (const f of ['03-iti-adapter-fix-report.md', '07-ui-upgrade-fix-report.md']) {
  checks++;
  if (!existsSync(join(BASE, 'research/window-reports', f))) problems.push(`修复报告缺失: ${f}`);
}
// 复核链
for (const f of ['review-wave2.md', 'review-03fix.md', 'review-wave3.md', 'review-wave4.md', 'review-07fix.md', 'review-10.md']) {
  checks++;
  if (!existsSync(join(BASE, 'verification', f))) problems.push(`复核记录缺失: ${f}`);
}
// 10 号报告版本决策记录
checks++;
const r10 = readFileSync(join(BASE, 'research/window-reports/10-release-pipeline-report.md'), 'utf8');
if (!r10.includes('v1.4.0')) problems.push('10 报告缺 v1.4.0 决策记录');
checks++;
if (!readme.includes('v1.4.0')) problems.push('README 缺 v1.4.0 收口状态');

console.log('CHECKS=' + checks);
console.log('PROBLEMS=' + problems.length);
for (const p of problems) console.log('PROBLEM: ' + p);
console.log(problems.length === 0 ? 'VERDICT=REPORTS-CONSISTENT' : 'VERDICT=INCONSISTENT');
process.exit(problems.length === 0 ? 0 : 1);
