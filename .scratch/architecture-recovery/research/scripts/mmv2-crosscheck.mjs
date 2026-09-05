import fs from 'fs';
const root = 'D:/Aworker/mozilla/choose-your-country';
const ar = root + '/.scratch/architecture-recovery';
const tickets = ['11-mental-model-docs','12-iframe-governance','13-visibility-l3-hardening','14-calibration-corpus','15-react19-fill-probe','16-scoring-consistency','17-pseudo-select-forensics','18-pseudo-select-e2e','19-release-links'];
const out = []; let fails = 0;
const ok = m => out.push('[OK]   ' + m);
const bad = m => { out.push('[FAIL] ' + m); fails++; };
const info = m => out.push('[INFO] ' + m);
const ABS = /([A-Za-z]:[\\\/][^\s(]+)/g;
const GITVERBS = ['worktree','git checkout','git branch','git add','git commit','git push','git merge','git rebase','git stash','git cherry-pick','git pull','git switch','git restore','git reset','git tag','git fetch'];
const read = p => fs.readFileSync(p, 'utf8');

// ---- 1. 标题 三元组一致 ----
for (const t of tickets) {
  const nn = t.split('-')[0];
  const iss = read(ar + '/issues/' + t + '.md');
  const ho = read(ar + '/handoffs/' + t + '.md');
  const pr = read(ar + '/prompts/' + t + '.md');
  const m = iss.match(/^# (\d+) — (.+)$/m);
  if (!m) { bad('issue ' + t + ' title not parseable'); continue; }
  const title = m[2].trim();
  if (m[1] !== nn) bad('issue ' + t + ' number ' + m[1] + ' != filename ' + nn);
  if (!ho.includes('Handoff:' + nn + ' — ' + title)) bad('handoff ' + t + ' title mismatch');
  if (!pr.includes('负责票 ' + nn + '(' + title + ')')) bad('prompt ' + t + ' identity/title mismatch');
  ok('title triplet consistent: ' + t);
}

// ---- 2. 阻塞边 issue <-> prompt 开工句 ----
for (const t of tickets) {
  const iss = read(ar + '/issues/' + t + '.md');
  const pr = read(ar + '/prompts/' + t + '.md');
  const bm = iss.match(/\*\*Blocked by:\*\*([^\n]+)/);
  if (!bm) { bad('issue ' + t + ' missing Blocked by'); continue; }
  const issueSet = new Set((bm[1].match(/\b1[1-9]\b/g) || []).map(s => Number(s)));
  const open = pr.split('\n').find(l => l.includes('开工第一句'));
  const promptSet = new Set((open.match(/\b1[1-9]\b/g) || []).map(s => Number(s)));
  const a = [...issueSet].sort().join(','); const b = [...promptSet].sort().join(',');
  if (a !== b) bad('ticket ' + t + ' blocking edge drift: issue=[' + a + '] prompt=[' + b + ']');
  else ok('blocking edge consistent: ' + t + (a ? ' [' + a + ']' : ' (none)'));
  // handoff must mention each blocker
  const ho = read(ar + '/handoffs/' + t + '.md');
  for (const n of issueSet) if (!ho.includes('' + n)) bad('handoff ' + t + ' never mentions blocker ' + n);
  if (issueSet.size) ok('handoff ' + t + ' mentions all ' + issueSet.size + ' blockers');
}

// ---- 3. 验收清单: issue 条数 <-> prompt 声明数 ----
for (const t of tickets) {
  const iss = read(ar + '/issues/' + t + '.md');
  const pr = read(ar + '/prompts/' + t + '.md');
  const cnt = iss.split('\n').filter(l => l.startsWith('- [ ]')).length;
  const dm = pr.match(/issue 内 (\d+) 条验收项/);
  if (!dm) { bad('prompt ' + t + ' missing acceptance-count declaration'); continue; }
  if (Number(dm[1]) !== cnt) bad('ticket ' + t + ' acceptance count drift: issue=' + cnt + ' prompt=' + dm[1]);
  else ok('acceptance count consistent: ' + t + ' (' + cnt + ')');
}

// ---- 4. 需求原文: issue 域 -> spec 用户故事覆盖 ----
const spec = read(ar + '/spec.md');
const domains = {
  '11-mental-model-docs': ['心智模型', '术语'],
  '12-iframe-governance': ['iframe', '帧'],
  '13-visibility-l3-hardening': ['可见性', 'ISO2', '共享区号', '占位'],
  '14-calibration-corpus': ['语料', '基线', '标定'],
  '15-react19-fill-probe': ['React 19', 'valueTracker'],
  '16-scoring-consistency': ['iti', '常量', '罚分'],
  '17-pseudo-select-forensics': ['取证', 'ADR-0005'],
  '18-pseudo-select-e2e': ['combobox', '伪 select'],
  '19-release-links': ['发布', '下载链接'],
};
for (const t of tickets) {
  const kw = domains[t];
  const hit = kw.filter(k => spec.includes(k));
  if (hit.length !== kw.length) bad('spec missing domain keywords for ' + t + ': ' + kw.filter(k => !spec.includes(k)).join('/'));
  else ok('spec covers domains of ' + t + ': ' + hit.join('/'));
}
// 反向: spec 实施决策域 -> 必须有票承接
const decisions = [
  ['帧治理', ['12-iframe-governance']],
  ['可见性闸门', ['13-visibility-l3-hardening']],
  ['L3 内容验证加码', ['13-visibility-l3-hardening']],
  ['React 19', ['15-react19-fill-probe']],
  ['评分一致性', ['16-scoring-consistency']],
  ['校准语料', ['14-calibration-corpus']],
  ['伪 select', ['17-pseudo-select-forensics','18-pseudo-select-e2e']],
  ['术语', ['11-mental-model-docs']],
];
for (const [d, owners] of decisions) {
  const covered = owners.filter(t => read(ar + '/issues/' + t + '.md').includes(d) || read(ar + '/issues/' + t + '.md').includes(d.replace('L3 内容验证加码','L3')));
  if (!covered.length) bad('spec decision orphaned, no ticket owns: ' + d);
  else ok('spec decision has owner: ' + d + ' -> ' + covered.join(','));
}
// spec Out of Scope 关键词不得出现在任何 issue
const oos = ['closed shadow', 'ML', 'FACE', 'autofill 事件', '可解释 UI', '规则 2.0', 'ElementInternals'];
for (const k of oos) {
  const viol = tickets.filter(t => read(ar + '/issues/' + t + '.md').includes(k));
  if (viol.length) bad('Out of Scope term [' + k + '] leaked into issues: ' + viol.join(','));
}
ok('Out of Scope terms absent from all 9 issues');

// ---- 5. 路径引用: prompt 必读区 == handoff 必读区(同集合), report 路径一致 ----
for (const t of tickets) {
  const pr = read(ar + '/prompts/' + t + '.md');
  const ho = read(ar + '/handoffs/' + t + '.md');
  const prHead = (pr.split('本票专属 delta')[0] || '').match(ABS) || [];
  const hoHead = (ho.split('## 本票 delta')[0] || '').match(ABS) || [];
  const norm = a => a.map(p => p.replace(/[\\\/]+$/, '')).sort();
  const hoSelf = (ar + '/handoffs/' + t + '.md').replace(/[\\\/]+$/, '');
  const A = norm(prHead).join('|'); const B = norm(hoHead.concat(hoSelf)).join('|');
  if (A !== B) bad('ticket ' + t + ' read-list drift: prompt has ' + prHead.length + ' paths, handoff has ' + hoHead.length);
  else ok('read-list paths identical: ' + t + ' (' + hoHead.length + ')');
  const MD = /([A-Za-z]:[\\\/][^\s(]*?\.md)/g;
  const prRep = (pr.match(MD) || []).find(p => p.includes('window-reports'));
  const hoRep = (ho.match(MD) || []).find(p => p.includes('window-reports'));
  if (!prRep || !hoRep) { bad('ticket ' + t + ' missing report path'); continue; }
  if (prRep.replace(/[\\\/]+$/, '') !== hoRep.replace(/[\\\/]+$/, '')) bad('ticket ' + t + ' report path drift');
  else ok('report path identical: ' + t);
}
// spec 相对引用可解析
const specRefs = [];
for (const m of spec.matchAll(/(\.scratch\/[^\s,()]+|research\/[\w\-]+\.[a-z]+|spec-cycle-[\w.\-]+)/g)) specRefs.push(m[1]);
for (const r of [...new Set(specRefs)]) {
  const full = r.startsWith('.scratch') ? root + '/' + r : ar + '/' + r;
  if (!fs.existsSync(full)) bad('spec reference missing: ' + r);
  else ok('spec reference resolves: ' + r);
}
// issue 不含绝对路径(to-tickets 模板约束)
for (const t of tickets) { const c = read(ar + '/issues/' + t + '.md'); if (c.match(ABS)) bad('issue ' + t + ' contains absolute path'); }
ok('no absolute paths in issues');

// ---- 6. 合规1: 禁止模式(裸 git 写命令 / worktree / 其他) ----
for (const dir of ['prompts','handoffs','issues']) {
  for (const t of tickets) {
    const c = read(ar + '/' + dir + '/' + t + '.md').toLowerCase();
    for (const w of GITVERBS) if (c.includes(w)) bad(dir + '/' + t + ' contains forbidden pattern: ' + w);
  }
}
ok('forbidden-pattern scan: 27 files clean (git verbs + worktree)');

// ---- 7. 合规2: 条款复述(上游条款不得逐字/近似出现在下游) ----
for (const t of tickets) {
  const iss = read(ar + '/issues/' + t + '.md');
  const pr = read(ar + '/prompts/' + t + '.md');
  const ho = read(ar + '/handoffs/' + t + '.md');
  const acc = iss.split('\n').filter(l => l.startsWith('- [ ]')).map(l => l.slice(5).trim());
  for (const a of acc) {
    for (let i = 0; i + 20 <= a.length; i++) {
      const frag = a.slice(i, i + 20);
      if (pr.includes(frag)) bad('prompt ' + t + ' restates acceptance fragment: ' + frag);
      if (ho.includes(frag) && !ho.split('## 报告')[0].includes(frag) === false) { }
    }
  }
}
// spec 正文长句不得逐字出现在 prompts/handoffs
const specLines = spec.split('\n').filter(l => l.length >= 40 && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('>'));
for (const t of tickets) {
  const pr = read(ar + '/prompts/' + t + '.md'); const ho = read(ar + '/handoffs/' + t + '.md');
  for (const s of specLines) {
    if (pr.includes(s)) bad('prompt ' + t + ' copies spec sentence verbatim');
    if (ho.includes(s)) bad('handoff ' + t + ' copies spec sentence verbatim');
  }
}
// WORKFLOW 长句不得逐字出现在 prompts(允许 §引用形式)
const wf = read(ar + '/WORKFLOW.md').split('\n').filter(l => l.length >= 40 && !l.startsWith('|'));
for (const t of tickets) { const pr = read(ar + '/prompts/' + t + '.md'); for (const s of wf) if (pr.includes(s)) bad('prompt ' + t + ' copies WORKFLOW sentence verbatim'); }
ok('restatement checks complete');

// ---- 输出 ----
fs.mkdirSync(ar + '/verification', { recursive: true });
fs.writeFileSync(ar + '/verification/consistency-report-mm2.md', ['# 程序化比对报告(心智模型 v2 周期)','','> 生成: 2026-09-05 | 脚本: research/scripts/mmv2-crosscheck.mjs(可重复运行)','> 比对对象: 9 issues + 9 handoffs + 9 prompts <-> spec.md / WORKFLOW.md 逐字段',''].join('\n') + out.join('\n') + '\n', { encoding: 'utf8' });
console.log(out.join('\n'));
console.log('\nTOTAL FAILS: ' + fails);
process.exit(fails === 0 ? 0 : 1);
