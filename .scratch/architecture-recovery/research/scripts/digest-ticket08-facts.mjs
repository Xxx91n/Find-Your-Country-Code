// 票08事实收集：压缩提取窗口报告标题结构 + 关键段落，供文档撰写引用
// 输出紧凑摘要（每报告：标题 + 各节标题 + 节内前2行）
import fs from 'node:fs';
import path from 'node:path';

const base = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports';
const reports = [
  '01-modular-skeleton-report.md',
  '02-scoring-engine-report.md',
  '03-iti-adapter-fix-report.md',
  '04-rescan-shadow-dom-report.md',
  '05-site-rules-engine-report.md',
  '06-playwright-e2e-report.md',
  '09-framework-injection-report.md',
];

const out = [];
for (const f of reports) {
  const p = path.join(base, f);
  if (!fs.existsSync(p)) { out.push(`### ${f}: MISSING`); continue; }
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  out.push(`\n===== ${f} (${lines.length} lines) =====`);
  let currentHeading = null;
  let count = 0;
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      currentHeading = line.trim();
      out.push(currentHeading);
      count = 0;
    } else if (currentHeading && count < 2 && line.trim() && !line.startsWith('>')) {
      out.push(`  ${line.trim().slice(0, 200)}`);
      count++;
    }
  }
}
console.log(out.join('\n'));
