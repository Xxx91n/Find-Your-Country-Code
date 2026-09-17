#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// release-gate.mjs — 发布门（Cycle-6 票 07 / A-029；决策依据 ADR-0010 条款 2/4）
//
// 判据（二选一，**不得静默绕过**）：
//   (1) 绿：真实站点层（.github/workflows/real-site-smoke.yml）在默认分支上的**最近一次运行**
//       conclusion === "success"；
//   (2) 显式 ack + 立票：.github/release-gate-ack.json 满足 schema ——
//       acknowledged:true + reason（>=20 字符）+ ticket（仓库内可解析的文件路径 / #NNN /
//       GitHub issue URL）+ acknowledgedBy + runId（须指向被判定的那次运行）。
//
// 「无运行记录」不视为绿，必须 ack —— 不得以「还没跑过」静默放行（ADR-0010 条款 2）。
// ack 记录即审计：谁 ack、为什么、对应哪次运行、跟踪票在哪，逐项强制留痕（业界对标见
// .scratch/architecture-recovery/research/atomcode-04-release-gate.md §4「如何留痕」）。
//
// 位置：本脚本置于 tests/scripts/（ADR-0006 决策 1 —— 一切被 CI 引用的脚本住 tests/scripts/，
// .github/workflows/*.yml 禁止出现 .scratch/ 路径引用）。
//
// 本地自证：node tests/scripts/release-gate.mjs --self-test        （纯函数判定表，零外网）
// 本地干跑：RELEASE_GATE_REPO_JSON=<file> RELEASE_GATE_RUNS_JSON=<file> \
//           node tests/scripts/release-gate.mjs                    （以夹具替代 GitHub API）
// ══════════════════════════════════════════════════════════════════
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..');
export const WORKFLOW_FILE = 'real-site-smoke.yml';
export const ACK_REL = '.github/release-gate-ack.json';
export const ACK_PATH = join(ROOT, ACK_REL);
export const MIN_REASON = 20;

// ── 立票可解析性：三条合法形式（仓库内文件路径 / #NNN / GitHub issue URL） ──
// 说明：机器只能验证「票存在且可定位」，不能验证「票内容恰当」——后者是人的职责，
// 由 ack.reason + acknowledgedBy 的留痕承担（WORKFLOW §8.2.5：人工门禁不是免检）。
export function checkTicket(ticket) {
  const t = String(ticket === null || ticket === undefined ? '' : ticket).trim();
  if (!t) return { ok: false, why: '为空' };
  if (/^#\d+$/.test(t)) return { ok: true, kind: 'gh-issue-number' };
  if (/^https?:\/\/\S+$/i.test(t)) return { ok: true, kind: 'url' };
  if (/^[\w./-]+\.md$/.test(t)) {
    const abs = resolve(ROOT, t);
    if (!abs.startsWith(resolve(ROOT))) return { ok: false, why: '路径越出仓库根' };
    return existsSync(abs) ? { ok: true, kind: 'repo-file' } : { ok: false, why: '仓库内无此文件: ' + t };
  }
  return { ok: false, why: '格式无法解析（允许：仓库内 .md 路径 / #NNN / GitHub issue URL）: ' + t };
}

// ── 纯判定函数（零 I/O，可被 --self-test 与结构门直接驱动） ──
export function decide(input) {
  const latestRun = input && input.latestRun ? input.latestRun : null;
  const ack = (input && input.ack) || null;
  const defaultBranch = (input && input.defaultBranch) || 'main';
  const facts = [];

  if (latestRun) {
    facts.push('真实站点层最近一次运行: id=' + latestRun.id + ' conclusion=' + latestRun.conclusion
      + (latestRun.created_at ? ' at ' + latestRun.created_at : '') + (latestRun.html_url ? ' ' + latestRun.html_url : ''));
  } else {
    facts.push('真实站点层在 ' + defaultBranch + ' 上无运行记录（不视为绿）');
  }

  if (latestRun && latestRun.conclusion === 'success') {
    return { pass: true, mode: 'green', problems: [], facts };
  }

  // 非绿（含「无运行记录」）→ 必须「显式 ack + 立票」
  const problems = [];
  if (!ack) {
    problems.push('缺少 ack 记录 ' + ACK_REL + '（发布门要求：绿，或失败已被显式 ack 并立票）');
    return { pass: false, mode: 'blocked', problems, facts };
  }
  if (ack.acknowledged !== true) problems.push('ack.acknowledged 必须为 true（显式 ack，不接受默认放行）');
  const reason = String(ack.reason === null || ack.reason === undefined ? '' : ack.reason).trim();
  if (reason.length < MIN_REASON) problems.push('ack.reason 缺失或过短（要求 >= ' + MIN_REASON + ' 字符，实测 ' + reason.length + '）');
  const tk = checkTicket(ack.ticket);
  if (!tk.ok) problems.push('ack.ticket 不可解析：' + tk.why);
  const by = String(ack.acknowledgedBy === null || ack.acknowledgedBy === undefined ? '' : ack.acknowledgedBy).trim();
  if (!by) problems.push('ack.acknowledgedBy 缺失（谁 ack 的必须留痕，不得匿名放行）');
  if (latestRun) {
    if (String(ack.runId === null || ack.runId === undefined ? '' : ack.runId) !== String(latestRun.id)) {
      problems.push('ack.runId 与最近一次运行不符（ack=' + ack.runId + ' ≠ 实际=' + latestRun.id + '）—— 防陈旧 ack 复用');
    }
  } else if (ack.runId) {
    problems.push('ack.runId 指定了 ' + ack.runId + '，但该 workflow 在 ' + defaultBranch + ' 上无运行记录');
  }
  if (problems.length) return { pass: false, mode: 'blocked', problems, facts };
  facts.push('显式 ack 生效: by=' + by + ' ticket=' + String(ack.ticket).trim() + ' runId=' + String(ack.runId === null || ack.runId === undefined ? '(无运行记录)' : ack.runId));
  facts.push('ack.reason: ' + reason);
  return { pass: true, mode: 'ack', problems: [], facts };
}

// ── 自证：纯函数判定表（零外网、零副作用；结构门与 CI 均可直接驱动） ──
const SELF_TEST_CASES = [
  { name: '绿：最近一次运行 success → 放行',
    in: { latestRun: { id: 101, conclusion: 'success' }, ack: null }, want: { pass: true, mode: 'green' } },
  { name: '红 + 合法 ack（reason/ticket/runId/acknowledgedBy 齐备）→ 放行并留痕',
    in: { latestRun: { id: 202, conclusion: 'failure' }, ack: { acknowledged: true, reason: '第三方站点 Cloudflare 挑战导致 advisory 失败，与本次变更无关，已立票跟踪', ticket: '.scratch/architecture-recovery/issues/07-real-site-and-release-gate.md', runId: 202, acknowledgedBy: 'maintainer' } },
    want: { pass: true, mode: 'ack' } },
  { name: '无运行记录 + 合法 ack（无 runId）→ 放行',
    in: { latestRun: null, ack: { acknowledged: true, reason: '该 workflow 尚未产生运行记录，本次发版按显式 ack 放行并立票跟踪', ticket: '#123', acknowledgedBy: 'maintainer' } },
    want: { pass: true, mode: 'ack' } },
  { name: '红 + 无 ack → 阻断', in: { latestRun: { id: 303, conclusion: 'failure' }, ack: null }, want: { pass: false } },
  { name: '无运行记录 + 无 ack → 阻断（不得以「还没跑过」静默放行）', in: { latestRun: null, ack: null }, want: { pass: false } },
  { name: '红 + ack 未显式置 true → 阻断',
    in: { latestRun: { id: 404, conclusion: 'failure' }, ack: { acknowledged: false, reason: '理由足够长足够长足够长足够长', ticket: '#1', runId: 404, acknowledgedBy: 'x' } }, want: { pass: false } },
  { name: '红 + reason 过短 → 阻断',
    in: { latestRun: { id: 505, conclusion: 'failure' }, ack: { acknowledged: true, reason: 'flaky', ticket: '#1', runId: 505, acknowledgedBy: 'x' } }, want: { pass: false } },
  { name: '红 + ticket 不可解析 → 阻断（立票必须可定位）',
    in: { latestRun: { id: 606, conclusion: 'failure' }, ack: { acknowledged: true, reason: '理由足够长足够长足够长足够长', ticket: 'NOPE.md', runId: 606, acknowledgedBy: 'x' } }, want: { pass: false } },
  { name: '红 + ack.runId 与最近一次运行不符 → 阻断（防陈旧 ack 复用）',
    in: { latestRun: { id: 707, conclusion: 'failure' }, ack: { acknowledged: true, reason: '理由足够长足够长足够长足够长', ticket: '#1', runId: 700, acknowledgedBy: 'x' } }, want: { pass: false } },
  { name: '红 + 无 acknowledgedBy → 阻断（不得匿名放行）',
    in: { latestRun: { id: 808, conclusion: 'failure' }, ack: { acknowledged: true, reason: '理由足够长足够长足够长足够长', ticket: '#1', runId: 808, acknowledgedBy: '' } }, want: { pass: false } },
  { name: 'cancelled / timed_out 等非 success 一律按非绿处理',
    in: { latestRun: { id: 909, conclusion: 'cancelled' }, ack: null }, want: { pass: false } },
];

export function selfTest() {
  const failures = [];
  for (const c of SELF_TEST_CASES) {
    const got = decide(c.in);
    const okPass = got.pass === c.want.pass;
    const okMode = c.want.mode === undefined || got.mode === c.want.mode;
    if (!okPass || !okMode) {
      failures.push(c.name + ' → got {pass:' + got.pass + ',mode:' + got.mode + '} want {pass:' + c.want.pass + ',mode:' + (c.want.mode === undefined ? 'any' : c.want.mode) + '}');
    }
  }
  return { total: SELF_TEST_CASES.length, failures };
}

// ── 主流程：取「最近一次运行」+ 读 ack → 判定 → 写 step summary → 退出码 ──
async function fetchLatestRun() {
  const api = process.env.GITHUB_API_URL || 'https://api.github.com';
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('缺少 GITHUB_REPOSITORY（仅 GitHub Actions 内提供；本地干跑请用 RELEASE_GATE_*_JSON 夹具）');
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('缺少 GH_TOKEN / GITHUB_TOKEN（发布门需要 actions: read 权限读取运行记录）');
  const headers = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'cch-release-gate' };
  const repoRes = await fetch(api + '/repos/' + repo, { headers });
  if (!repoRes.ok) throw new Error('读取仓库信息失败 HTTP ' + repoRes.status);
  const repoJson = await repoRes.json();
  const branch = repoJson.default_branch || 'main';
  const runsRes = await fetch(api + '/repos/' + repo + '/actions/workflows/' + WORKFLOW_FILE + '/runs?branch=' + encodeURIComponent(branch) + '&per_page=1', { headers });
  if (!runsRes.ok) throw new Error('读取运行记录失败 HTTP ' + runsRes.status);
  const runsJson = await runsRes.json();
  const run = (runsJson.workflow_runs || [])[0] || null;
  return { defaultBranch: branch, latestRun: run ? { id: run.id, conclusion: run.conclusion, created_at: run.created_at, html_url: run.html_url, head_sha: run.head_sha } : null };
}

function readFixture(path, label) {
  if (!existsSync(path)) throw new Error(label + ' 夹具不存在: ' + path);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeSummary(lines) {
  const out = lines.join('\n') + '\n';
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) { try { appendFileSync(target, out); } catch { /* 摘要非门禁，写失败不改变判定 */ } }
  console.log(out);
}

export async function main() {
  if (process.argv.includes('--self-test')) {
    const r = selfTest();
    for (const f of r.failures) console.log('FAIL ' + f);
    console.log('release-gate --self-test: ' + (r.total - r.failures.length) + '/' + r.total + ' 用例通过');
    process.exit(r.failures.length ? 1 : 0);
  }

  const runsFixture = process.env.RELEASE_GATE_RUNS_JSON;
  const repoFixture = process.env.RELEASE_GATE_REPO_JSON;
  let defaultBranch = 'main';
  let latestRun = null;
  try {
    if (runsFixture && repoFixture) {
      const repoJson = readFixture(repoFixture, 'repo');
      const runsJson = readFixture(runsFixture, 'runs');
      defaultBranch = repoJson.default_branch || 'main';
      const run = (runsJson.workflow_runs || [])[0] || null;
      latestRun = run ? { id: run.id, conclusion: run.conclusion, created_at: run.created_at, html_url: run.html_url, head_sha: run.head_sha } : null;
    } else {
      const got = await fetchLatestRun();
      defaultBranch = got.defaultBranch;
      latestRun = got.latestRun;
    }
  } catch (e) {
    console.log('::error::发布门无法取得真实站点层运行状态：' + String((e && e.message) || e));
    console.log('发布门默认拒绝出包（fail-closed）：无法判定即不放行。');
    process.exit(1);
  }

  let ack = null;
  if (existsSync(ACK_PATH)) {
    try { ack = JSON.parse(readFileSync(ACK_PATH, 'utf8')); }
    catch (e) { console.log('::error::' + ACK_REL + ' 不是合法 JSON：' + String((e && e.message) || e)); process.exit(1); }
  }

  const r = decide({ latestRun, ack, defaultBranch });
  const lines = [];
  lines.push('## 发布门（票 07 / A-029 · ADR-0010 条款 2）');
  lines.push('');
  lines.push('- 判据：真实站点层最近一次运行必须为绿，或失败已被显式 ack 并立票（二者必居其一）');
  lines.push('- 结论：**' + (r.pass ? (r.mode === 'green' ? '通过（绿）' : '通过（显式 ack + 立票）') : '阻断（不出包）') + '**');
  for (const f of r.facts) lines.push('- ' + f);
  for (const p of r.problems) lines.push('- ::error::' + p);
  writeSummary(lines);
  process.exit(r.pass ? 0 : 1);
}

const isMain = process.argv[1] ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) : false;
if (isMain) main();
