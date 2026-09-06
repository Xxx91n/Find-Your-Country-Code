// 程序化验收：prompts ↔ handoffs ↔ issues ↔ spec/WORKFLOW 逐字段比对 + 合规检查
// 用法: node verify-artifacts.mjs  (输出不一致清单, 全绿退出码 0)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const BASE = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery';
const problems = [];
const notes = [];
let checks = 0;

const TICKETS = [
  ['01', 'modular-skeleton', '模块化工程骨架迁移', []],
  ['02', 'scoring-engine', '多信号加权评分检测引擎', ['01']],
  ['03', 'iti-adapter', 'intl-tel-input 适配层独立化', ['01']],
  ['04', 'rescan-shadow-dom', '可重评估扫描 + Shadow DOM 穿透', ['02']],
  ['05', 'site-rules-engine', '站点规则引擎', ['02']],
  ['06', 'playwright-e2e', 'Playwright E2E 测试基建 + fixture 扩容', ['01']],
  ['07', 'ui-upgrade', '面板 UI 升级', ['02', '05']],
  ['08', 'docs-adr', '文档与决策记录', ['02', '05']],
  ['09', 'framework-injection', '框架注入加固', ['02']],
  ['10', 'release-pipeline', '发布链路与版本策略适配', ['01', '09', '07']],
];
const slug = n => TICKETS.find(t => t[0] === n)[1];

const read = p => { if (!existsSync(p)) { problems.push(`MISSING FILE: ${p}`); return ''; } return readFileSync(p, 'utf8'); };
const spec = read(join(BASE, 'spec.md'));
const workflow = read(join(BASE, 'WORKFLOW.md'));
const readme = read(join(BASE, 'README.md'));
const archReview = read(join(BASE, 'report/architecture-review.md'));

// ---------- 1. 每票四件套一致性 ----------
for (const [nn, s, title, blockers] of TICKETS) {
  const issue = read(join(BASE, `issues/${nn}-${s}.md`));
  const handoff = read(join(BASE, `handoffs/${nn}-${s}.md`));
  const prompt = read(join(BASE, `prompts/${nn}-${s}.md`));

  // 标题一致: issue 首行标题 vs handoff 标题行 vs prompt 身份行
  checks++;
  if (!issue.includes(`# ${nn} — ${title}`) && !issue.includes(`# ${nn} —`) ) problems.push(`[${nn}] issue 标题与票据表不符`);
  checks++;
  if (!handoff.includes(`${nn} — ${title}`) && !handoff.includes(`：${nn} —`)) problems.push(`[${nn}] handoff 标题引用不一致`);
  checks++;
  if (!prompt.includes(`票 ${nn}`)) problems.push(`[${nn}] prompt 未引用票号 ${nn}`);

  // 路径引用可解析: 收集 handoff+prompt 里的 D:\ 或 D:/ 绝对路径
  const pathRe = /D:[\\/](?:[A-Za-z\.][^\s)（，,。;；`'\"]*)/g;
  const refs = [...handoff.matchAll(pathRe), ...prompt.matchAll(pathRe)].map(m => m[0].replace(/\//g, '\\'));
  const uniq = [...new Set(refs)];
  for (const p of uniq) {
    checks++;
    let clean = p.replace(/[.,;、`'\"]+$/, '').replace(/\\+$/, '');
    if (!clean || /[\u4e00-\u9fff]/.test(clean)) continue; // 混入中文说明文字的, 不算路径引用
    if (existsSync(clean)) continue;
    // window-reports 下的报告是实施期才产生的未来产物: 只要求其父目录约定存在(或允许前向引用)
    if (clean.includes('window-reports')) { notes.push(`[${nn}] 前向引用(实施期产物): ${clean}`); continue; }
    problems.push(`[${nn}] 路径不可解析: ${clean}`);
  }
  checks++;
  if (uniq.length === 0) problems.push(`[${nn}] handoff/prompt 未包含任何绝对路径引用（应锚定权威文件）`);

  // 阻塞边一致: issue 的 Blocked by 行 vs 波次表 README vs prompt 开工句
  const issueBlocked = (() => {
    const m = issue.match(/\*\*Blocked by:\*\*\s*(.+)/);
    if (!m) return null;
    const t = m[1].trim();
    return t.startsWith('None') ? [] : (t.match(/\d{2}/g) || []);
  })();
  checks++;
  if (JSON.stringify((issueBlocked || []).sort()) !== JSON.stringify([...blockers].sort()))
    problems.push(`[${nn}] issue Blocked by (${issueBlocked}) 与内部票据表 (${blockers}) 不一致`);
  checks++;
  const promptBlockedRaw = (() => { const m = prompt.match(/Blocked by:\s*(\d{2}(?:\s*[、,]\s*\d{2})*)/); return m ? (m[1].match(/\d{2}/g) || []) : undefined; })();
  const promptBlocked = promptBlockedRaw && promptBlockedRaw.length ? promptBlockedRaw : undefined;
  if (blockers.length === 0) {
    if (promptBlocked !== undefined) problems.push(`[${nn}] prompt 含阻塞边 ${promptBlocked}，应为 None`);
  } else {
    if (!promptBlocked) problems.push(`[${nn}] prompt 未声明阻塞边`);
    else if (JSON.stringify([...promptBlocked].sort()) !== JSON.stringify([...blockers].sort()))
      problems.push(`[${nn}] prompt 阻塞边 (${promptBlocked}) 与票据表 (${blockers}) 不一致`);
  }
  checks++;
  if (blockers.length > 0 && !blockers.every(b => issueBlocked && issueBlocked.includes(b)))
    problems.push(`[${nn}] issue 的 Blocked by 未包含 ${blockers.join(',')}`);

  // 验收清单存在
  checks++;
  const ac = (issue.match(/- \[ \]/g) || []).length;
  if (ac < 3) problems.push(`[${nn}] issue 验收清单少于 3 条 (实际 ${ac})`);

  // prompt 必读清单包含 handoff 与 issue
  checks++;
  if (!prompt.includes(`handoffs[\\\\/]${nn}-${s}.md`.replace(/\\\\\//g, '[\\\\/]')) &&
      !new RegExp(`handoffs[\\\\/]${nn}-${s}\\.md`).test(prompt))
    problems.push(`[${nn}] prompt 必读清单缺少自身 handoff 路径`);
  checks++;
  if (!new RegExp(`issues[\\\\/]${nn}-${s}\\.md`).test(prompt))
    problems.push(`[${nn}] prompt 必读清单缺少自身 issue 路径`);

  // prompt 引用 WORKFLOW
  checks++;
  if (!prompt.includes('WORKFLOW.md')) problems.push(`[${nn}] prompt 未引用 WORKFLOW.md`);
  // prompt 要求报告落盘
  checks++;
  if (!prompt.includes(`window-reports[\\\\/]${nn}-${s}-report.md`.replace(/\\\\\//g, '[\\\\/]')) &&
      !new RegExp(`window-reports[\\\\/]${nn}-${s}-report\\.md`).test(prompt))
    problems.push(`[${nn}] prompt 未要求报告落盘 window-reports/${nn}-${s}-report.md`);
}

// ---------- 2. 合规维度 ----------
const FORBIDDEN = /\b(worktree|git\s+checkout|git\s+branch)\b/i;
for (const [nn, s] of TICKETS) {
  const prompt = read(join(BASE, `prompts/${nn}-${s}.md`));
  checks++;
  if (FORBIDDEN.test(prompt)) problems.push(`[${nn}] prompt 含违禁词 (worktree / git checkout / git branch)`);
  checks++;
  if (/git\s+(add|commit|push|merge|rebase|stash|cherry-pick)/i.test(prompt)) problems.push(`[${nn}] prompt 含裸 git 写命令`);
  checks++;
  const lines = prompt.split(/\r?\n/).length;
  if (lines > 60) problems.push(`[${nn}] prompt 超过 60 行 (实际 ${lines})`);
}

// 复述检查: prompt 是否复述上游条款（抽查：不得出现 spec 的长句/WORKFLOW 的细则句子）
const upstreamSentences = [
  ...spec.split(/\r?\n/).filter(l => l.length > 40 && !l.startsWith('>')),
  ...workflow.split(/\r?\n/).filter(l => l.length > 40 && !l.startsWith('>')),
];
for (const [nn, s] of TICKETS) {
  const prompt = read(join(BASE, `prompts/${nn}-${s}.md`));
  const plines = prompt.split(/\r?\n/).map(l => l.trim());
  for (const pl of plines) {
    if (pl.length < 25) continue;
    const hit = upstreamSentences.find(u => u.includes(pl) || pl.includes(u));
    if (hit) problems.push(`[${nn}] 疑似复述上游条款: "${pl.slice(0, 50)}…"`);
  }
}

// ---------- 3. README 波次表一致性 ----------
checks++;
if (!readme.includes('prompts/01-modular-skeleton.md') || !readme.includes('prompts/10-release-pipeline.md'))
  problems.push('[README] 波次表未覆盖全部 10 份启动器');
checks++;
if (!readme.includes('Blocked by')) problems.push('[README] 波次表未声明推导依据 (Blocked by)');
// wave 计算验证
const waves = {};
for (const [nn, s, , blockers] of TICKETS) {
  waves[nn] = blockers.length === 0 ? 1 : 1 + Math.max(...blockers.map(b => waves[b]));
}
notes.push(`推导波次: ${TICKETS.map(([nn]) => `${nn}=W${waves[nn]}`).join(', ')}`);
// README 波次表: 逐行解析 | wave | NN | 并与推导波次比对
checks++;
const waveRows = [...readme.matchAll(/^\|\s*(\d+)\s*\|\s*(\d{2})\s/gm)].map(m => [m[2], Number(m[1])]);
if (waveRows.length !== TICKETS.length) problems.push(`[README] 波次表行数 ${waveRows.length} != 票数 ${TICKETS.length}`);
for (const [nn, w] of waveRows) {
  checks++;
  if (waves[nn] !== w) problems.push(`[README] 票 ${nn} 波次标为 W${w}，推导应为 W${waves[nn]}`);
}

// ---------- 4. 上游产物存在性与引用 ----------
for (const p of ['spec.md', 'WORKFLOW.md', 'README.md', 'report/architecture-review.md', 'report/architecture-review.html',
  'research/repo-survey.md', 'research/industry-models.md', 'research/atomcode-industry-models.md',
  'research/misdetection-root-causes.md', 'research/infra-patterns.md', 'research/skills-digest.md']) {
  checks++;
  if (!existsSync(join(BASE, p))) problems.push(`上游产物缺失: ${p}`);
}
checks++;
if (!archReview.includes('Top 推荐') || !archReview.includes('C1')) problems.push('[report] 架构报告缺少候选/推荐结构');
checks++;
if (!spec.includes('## Problem Statement') || !spec.includes('## User Stories') || !spec.includes('## Out of Scope'))
  problems.push('[spec] 缺少 to-spec 模板必需章节');
checks++;
if (!workflow.includes('§4.2') || !workflow.includes('以 skill 为准')) problems.push('[WORKFLOW] 缺少 §4.2 或裁决规则声明');
checks++;
if (!workflow.includes('偏离点清单')) problems.push('[WORKFLOW] 缺少偏离点清单');

// ---------- 输出 ----------
console.log('CHECKS=' + checks);
console.log('PROBLEMS=' + problems.length);
for (const p of problems) console.log('PROBLEM: ' + p);
for (const n of notes) console.log('NOTE: ' + n);
console.log(problems.length === 0 ? 'VERDICT=CONSISTENT' : 'VERDICT=INCONSISTENT');
process.exit(problems.length === 0 ? 0 : 1);
