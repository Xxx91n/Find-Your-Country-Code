// cycle4-launcher-selfcheck.mjs — 逐份自检 prompts/handoffs/issues + 对账闸交叉核对
// 用法: node research/scripts/cycle4-launcher-selfcheck.mjs （从 .scratch/architecture-recovery/ 运行）
import fs from 'node:fs';
const REPO = 'D:/Aworker/mozilla/choose-your-country';
const BASE = REPO + '/.scratch/architecture-recovery';
const tickets = [
  ['27', 'detection-coverage-floor'],
  ['28', 'iso2-dial-evidence'],
  ['29', 'scan-candidates-expansion'],
  ['30', 'rules-tier-scope-fix'],
  ['31', 'fill-feedback-loop'],
  ['32', 'real-site-corpus'],
  ['33', 'version-bump-delivery'],
  ['34', 'gate-slimming'],
  ['35', 'history-landing-discipline'],
];
const problems = [];
const forbidden = [['worktree', /worktree/i], ['git checkout', /git\s+checkout/i], ['git branch', /git\s+branch/i]];
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => { try { fs.statSync(p); return true; } catch { return false; } };
function extractPaths(txt) {
  const out = new Set();
  for (const m of txt.matchAll(/`([^`\n]+)`/g)) {
    let s = m[1].trim();
    if (/window-reports/.test(s)) continue; // 报告为输出路径，不查存在性
    let cand = null;
    if (/^D:\\/i.test(s)) cand = s.replace(/\\/g, '/');
    else if (/^(src|tests|docs|\.github|greasyfork)\\/i.test(s)) cand = REPO + '/' + s.replace(/\\/g, '/');
    if (cand) out.add(cand.replace(/[（(].*$/, '').trim());
  }
  return [...out];
}
const stats = { prompts: 0, handoffs: 0, issues: 0, lineCounts: {} };
// ── prompts ──
for (const [nn, slug] of tickets) {
  const p = `${BASE}/prompts/${nn}-${slug}.md`;
  if (!exists(p)) { problems.push(`prompt ${nn} missing`); continue; }
  const t = read(p); stats.prompts++;
  const lines = t.split(/\r?\n/).length;
  stats.lineCounts['prompt-' + nn] = lines;
  if (lines > 60) problems.push(`prompt ${nn} lines=${lines} >60`);
  for (const [name, re] of forbidden) if (re.test(t)) problems.push(`prompt ${nn} FORBIDDEN "${name}"`);
  for (const rp of extractPaths(t)) if (!exists(rp)) problems.push(`prompt ${nn} path unresolved: ${rp}`);
  if (!/版本控制遵循\s*(WORKFLOW\s*)?§4\.2/.test(t)) problems.push(`prompt ${nn} missing §4.2 ref`);
  if (!t.includes('Blocked by')) problems.push(`prompt ${nn} missing blockers`);
  if (/串行护栏|续跑锚定|证据铁律|对标行业成熟心智模型/.test(t)) problems.push(`prompt ${nn} restates research-req block (复述)`);
  if (!/覆盖 A-0\d\d/.test(t) && !t.includes('（覆盖 A-0')) problems.push(`prompt ${nn} missing A-xxx declaration`);
  if (!t.includes('先复述')) problems.push(`prompt ${nn} missing 开工第一句`);
}
// ── handoffs ──
for (const [nn, slug] of tickets) {
  const p = `${BASE}/handoffs/${nn}-${slug}.md`;
  if (!exists(p)) { problems.push(`handoff ${nn} missing`); continue; }
  const t = read(p); stats.handoffs++;
  for (const [name, re] of forbidden) if (re.test(t)) problems.push(`handoff ${nn} FORBIDDEN "${name}"`);
  for (const rp of extractPaths(t)) if (!exists(rp)) problems.push(`handoff ${nn} path unresolved: ${rp}`);
  if (!/覆盖 A-0\d\d/.test(t)) problems.push(`handoff ${nn} missing A coverage declaration`);
  const blockCount = (t.match(/通用调研要求/g) || []).length;
  if (blockCount !== 1) problems.push(`handoff ${nn} 通用调研要求 block count=${blockCount} (须恰 1 次)`);
  if (!t.includes('串行护栏')) problems.push(`handoff ${nn} missing serial guardrail`);
  if (!t.includes('atomcode')) problems.push(`handoff ${nn} missing atomcode research req`);
  if (!t.includes('CONTEXT.md')) problems.push(`handoff ${nn} missing CONTEXT/ADR review req`);
}
// ── issues ──
for (const [nn, slug] of tickets) {
  const p = `${BASE}/issues/${nn}-${slug}.md`;
  if (!exists(p)) { problems.push(`issue ${nn} missing`); continue; }
  const t = read(p); stats.issues++;
  if (!t.includes('**覆盖 A-xxx:**')) problems.push(`issue ${nn} missing A-xxx declaration`);
  if (!t.includes('**Blocked by:**')) problems.push(`issue ${nn} missing Blocked by`);
}
// ── 对账闸交叉核对 ──
const ledger = read(BASE + '/decision-ledger.md');
const spec = read(BASE + '/spec.md');
const ids = []; for (let i = 1; i <= 10; i++) ids.push('A-' + String(i).padStart(3, '0'));
let ledgerHit = 0, specHit = 0;
for (const id of ids) {
  if (ledger.includes('| ' + id + ' ')) ledgerHit++; else problems.push(`ledger row missing ${id}`);
  if (spec.includes(id)) specHit++; else problems.push(`spec coverage missing ${id}`);
}
// ── 波次由 Blocked by 推导 ──
const blockers = {};
for (const [nn, slug] of tickets) {
  const t = read(`${BASE}/issues/${nn}-${slug}.md`);
  const m = t.match(/\*\*Blocked by:\*\*\s*([^\n]+)/);
  blockers[nn] = /None/.test(m[1]) ? [] : [...m[1].matchAll(/\b(2[7-9]|3[0-5])\b/g)].map((x) => x[1]);
}
const done = new Set(); const waves = [];
let rem = Object.keys(blockers);
while (rem.length) {
  const w = rem.filter((n) => blockers[n].every((b) => done.has(b))).sort();
  if (!w.length) { problems.push('blockers cycle detected'); break; }
  waves.push(w); w.forEach((n) => done.add(n));
  rem = rem.filter((n) => !w.includes(n));
}
const expect = [['30', '31', '32', '34'], ['27', '28', '29'], ['33'], ['35']];
if (JSON.stringify(waves) !== JSON.stringify(expect)) problems.push(`wave mismatch derived=${JSON.stringify(waves)}`);
// ── 报告落盘 ──
const now = new Date().toISOString();
const rpt = [
  '# Launcher 自检报告 — Cycle-4（票 27–35）', '',
  `> 生成: ${now} | 工具: node research/scripts/cycle4-launcher-selfcheck.mjs`, '',
  `- prompts 检查: ${stats.prompts}/8；handoffs: ${stats.handoffs}/8；issues: ${stats.issues}/8`,
  `- prompt 行数: ${tickets.map(([n]) => n + '=' + stats.lineCounts['prompt-' + n]).join(', ')}（上限 60）`,
  `- 违禁词（worktree / git checkout / git branch）: 0 命中 = ${problems.some((p) => /FORBIDDEN/.test(p)) ? 'FAIL' : 'PASS'}`,
  `- 路径可解析: ${problems.filter((p) => /unresolved|missing$/.test(p)).length === 0 ? 'PASS' : '见问题清单'}`,
  `- A-xxx 声明: ledger ${ledgerHit}/10，spec 覆盖 ${specHit}/10，issue/handoff/prompt 全含声明`,
  `- 复述检查: prompts 不含「通用调研要求/串行护栏」块 = ${problems.some((p) => /restates/.test(p)) ? 'FAIL' : 'PASS'}`,
  `- 波次推导（Blocked by）: ${JSON.stringify(waves)}`, '',
  '## 问题清单', '',
  ...(problems.length ? problems.map((p) => '- ' + p) : ['- 无 — 全部检查通过']), '',
].join('\n');
fs.writeFileSync(BASE + '/research/launcher-selfcheck.md', rpt, 'utf8');
console.log(`prompts=${stats.prompts} handoffs=${stats.handoffs} issues=${stats.issues} ledgerA=${ledgerHit}/10 specA=${specHit}/10`);
console.log('waves=' + JSON.stringify(waves));
console.log('PROBLEMS=' + problems.length);
problems.forEach((p) => console.log(' - ' + p));
console.log('report -> research/launcher-selfcheck.md');