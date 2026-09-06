import fs from 'fs';

const ar = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery';
const tickets = ['11-mental-model-docs','12-iframe-governance','13-visibility-l3-hardening','14-calibration-corpus','15-react19-fill-probe','16-scoring-consistency','17-pseudo-select-forensics','18-pseudo-select-e2e','19-release-links'];
const out = []; let fails = 0;
const ok = m => out.push('[OK]   ' + m);
const bad = m => { out.push('[FAIL] ' + m); fails++; };
const info = m => out.push('[INFO] ' + m);
const FORBIDDEN = ['worktree','git checkout','git branch','git add','git commit','git push','git merge','git rebase','git stash','git cherry-pick'];
const ABS = /([A-Za-z]:[\\\/][^\s(]+)/g;
for (const t of tickets) {
  const f = ar + '/prompts/' + t + '.md';
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n').length;
  if (lines > 60) bad('prompt ' + t + ' has ' + lines + ' lines (>60)'); else ok('prompt ' + t + ': ' + lines + ' lines (<=60)');
  for (const w of FORBIDDEN) if (c.toLowerCase().includes(w)) bad('prompt ' + t + ' contains forbidden: ' + w);
  const head = c.split('本票专属 delta')[0] || c;
  const paths = head.match(ABS) || [];
  for (const p of paths) { const clean = p.replace(/[\\\/]+$/, ''); if (!fs.existsSync(clean)) bad('prompt ' + t + ' path missing: ' + clean); }
  ok('prompt ' + t + ' paths resolvable: ' + paths.length + ' checked');
  const issue = fs.readFileSync(ar + '/issues/' + t + '.md', 'utf8');
  const acc = issue.split('\n').filter(l => l.startsWith('- [ ]')).map(l => l.slice(5).trim());
  const restated = acc.filter(a => a.length > 0 && c.includes(a));
  if (restated.length) bad('prompt ' + t + ' restates acceptance: ' + restated.join(' | ')); else ok('prompt ' + t + ': no acceptance restatement');
}
for (const t of tickets) {
  const c = fs.readFileSync(ar + '/handoffs/' + t + '.md', 'utf8');
  const readZone = c.split('## 报告')[0] || c;
  const paths = readZone.match(ABS) || [];
  for (const p of paths) { const clean = p.replace(/[\\\/]+$/, ''); if (!fs.existsSync(clean)) bad('handoff ' + t + ' path missing: ' + clean); }
  ok('handoff ' + t + ' read-zone paths resolvable: ' + paths.length + ' checked');
}
for (const t of tickets) {
  const nn = t.split('-')[0];
  for (const dir of ['issues','handoffs','prompts']) {
    const f = ar + '/' + dir + '/' + t + '.md';
    if (!fs.existsSync(f)) bad('triplet missing: ' + dir + '/' + t);
    else { const c = fs.readFileSync(f, 'utf8');
      if (dir === 'issues' && !c.startsWith('# ' + nn + ' ')) bad('issue title mismatch: ' + t);
      if (dir === 'handoffs' && !c.includes('Handoff:' + nn)) bad('handoff title mismatch: ' + t); }
  }
}
ok('triplet consistency: 9 tickets x 3 dirs');
const graph = {};
for (const t of tickets) {
  const c = fs.readFileSync(ar + '/issues/' + t + '.md', 'utf8');
  const bm = c.match(/\*\*Blocked by:\*\*([^\n]+)/);
  let blockers = [];
  if (bm) { const line = bm[1].trim();
    if (!line.startsWith('None')) { const nums = (line.match(/\b1[1-9]\b/g) || []).map(s => s.padStart(2,'0'));
      for (const nn of nums) { const full = tickets.find(x => x.startsWith(nn + '-')); if (!full) bad('ticket ' + t + ' references unknown blocker ' + nn); else blockers.push(full); } }
  } else bad('ticket ' + t + ' missing Blocked by field');
  graph[t] = blockers; info(t + ' blocked by: ' + (blockers.join(', ') || '(none)'));
}
const wave = {};
function wv(t, stack) { if (wave[t] !== undefined) return wave[t]; if (stack.includes(t)) { bad('cycle at ' + t); return 0; } let m = 0; for (const b of graph[t]) m = Math.max(m, wv(b, stack.concat(t))); wave[t] = m + 1; return wave[t]; }
for (const t of tickets) wv(t, []);
const waves = {}; for (const t of tickets) (waves[wave[t]] = waves[wave[t]] || []).push(t);
ok('wave derivation from Blocked by: ' + Object.keys(waves).sort().map(w => 'W' + w + '=[' + waves[w].map(x => x.split('-')[0]).join(',') + ']').join(' '));
const spec = fs.readFileSync(ar + '/spec.md', 'utf8'); ok('spec.md exists, ' + spec.length + 'B');
const refs = [ar + '/research/atomcode-mental-model-v2.md', 'D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md', ar + '/spec-cycle-v1.4.0-2026-09.md'];
for (const r of refs) { if (!fs.existsSync(r)) bad('spec reference missing: ' + r); else ok('spec reference exists: ' + r.split('/').pop()); }
const readme = ar + '/README.md';
const sm = '## 票务状态与 frontier(第二周期)';
const statusTail = fs.readFileSync(readme, 'utf8').includes(sm) ? fs.readFileSync(readme, 'utf8').slice(fs.readFileSync(readme, 'utf8').indexOf(sm)) : '';
let rc = fs.readFileSync(readme, 'utf8');
const marker = '## 第二周期(心智模型 v2,2026-09-05)';
if (rc.includes(marker)) rc = rc.slice(0, rc.indexOf(marker));
const sec = [];
sec.push(marker); sec.push('');
sec.push('> 输入: .scratch/mental-model-v2/report.md 宏观调查报告 | spec: spec.md(上一周期 spec 归档为 spec-cycle-v1.4.0-2026-09.md)');
sec.push('> 波次由 issue 的 Blocked by 字段推导,未新造顺序。发布门禁: 19 票完成 + 用户确认后执行发布动作(遵循 WORKFLOW §4.2)。');
sec.push(''); sec.push('| Wave | 票 | Blocked by | 并行性 | 窗口启动器(相对本目录) |'); sec.push('|---|---|---|---|---|');
const wd = Object.keys(waves).sort((a,b) => a - b);
for (const w of wd) { for (const t of waves[w]) { const nn = t.split('-')[0]; const blk = graph[t].length ? graph[t].map(x => x.split('-')[0]).join(', ') : '无'; const note = nn === '19' ? '(发版波: 大脑/用户执行;发布前需全部实施票复核通过)' : ''; sec.push('| ' + w + ' | ' + nn + ' | ' + blk + ' | 同波互不堆叠,可并行 | `prompts/' + t + '.md` ' + note + ' |'); } }
sec.push(''); sec.push('票据 11–19 状态随窗口报告落盘更新;报告路径统一为 `research/window-reports/NN-slug-report.md`。自检报告: `research/launcher-selfcheck.md`。'); sec.push('');
fs.writeFileSync(readme, rc.replace(/\s*$/, '\n\n') + sec.join('\n') + '\n' + statusTail, { encoding: 'utf8' });
ok('wave table regenerated in .scratch/architecture-recovery/README.md');
fs.writeFileSync(ar + '/research/launcher-selfcheck.md', ['# 启动器与票据自检报告(心智模型 v2 周期)','','> 生成: 2026-09-05 | 自检脚本: research/scripts/mmv2-selfcheck.mjs(可重复运行,node 执行)',''].join('\n') + out.join('\n') + '\n', { encoding: 'utf8' });
console.log(out.join('\n')); console.log('\nTOTAL FAILS: ' + fails);
process.exit(fails === 0 ? 0 : 1);
