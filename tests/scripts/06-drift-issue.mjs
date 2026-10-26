#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-drift-issue.mjs — 漂移告警的投递面（票 T6 / issue #15；spec #9 Q4/Q7）
//
// 输入：06-corpus-drift.mjs 产出的 drift-issues.json（只含 MINOR / MAJOR 载荷，
//   决策规则在 lib-corpus-drift-issues.mjs，本脚本不重新判定 tier）。
// 动作：读 open issue，按正文 marker 去重——
//   · 未见过 → gh issue create（label needs-triage）
//   · 已见过 → gh issue comment 追加本次运行证据（不每周重复开票）
//   去重只认 bot 作者的票（author.is_bot；兼容 github-actions[bot] 与
//   app/github-actions 两种登录名形态）：仓库公开，他人伪造 marker 不得把
//   告警劫持到自己的 issue 下。
// 唯一外部写动作 = GitHub issue；不碰仓库内容、不碰骨架 / 清单 / 镜像页。
//
// 用法：
//   node tests/scripts/06-drift-issue.mjs [--issues <drift-issues.json>]
//        [--out <drift-issue-outcome.json>] [--existing <json>] [--dry-run]
//   --existing  [{number,body,author:{login}}] 离线去重夹具：仅与 --dry-run 连用
//               （真实投递必须查询线上 open issue，防止夹具造成重复开票）
//   --dry-run   只打印投递计划 JSON；**不调用 gh**。未给 --existing 时按
//               「无同类 open issue」生成计划（计划里的 create 不代表线上真实状态）
// 退出码：0 = 无漂移或全部投递成功；1 = 有投递失败（告警未送达，如实红）；
//         2 = 无法运行（载荷缺失 / 非法、gh 不可用）。
// ══════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { deliverPlan, exitCodeFor, issuesFromPages, outcomeOf, planDeliveries } from './lib-corpus-drift-issues.mjs';

const DEFAULT_ISSUES = path.join('live-out', 'corpus-drift', 'drift-issues.json');
const DEFAULT_OUT = path.join('live-out', 'corpus-drift', 'drift-issue-outcome.json');

function parseArgs(argv) {
  const o = { issues: DEFAULT_ISSUES, out: DEFAULT_OUT, existing: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--issues') o.issues = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--existing') o.existing = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
    else throw new Error('unknown arg: ' + a);
  }
  return o;
}

function readJson(p, label) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(label + ' 读取/解析失败：' + p + ' :: ' + e.message);
  }
}

// 载荷合法性：缺 title/body/marker/labels 一律拒绝——不能把空票开出去，
// 也不能让去重标记缺失（否则每周重复开票）；同一 marker 只允许出现一次。
function validateIssues(doc) {
  const list = doc && doc.issues;
  if (!Array.isArray(list)) throw new Error('drift-issues.json 缺少 issues 数组');
  const seen = new Set();
  for (const issue of list) {
    const missing = ['id', 'tier', 'marker', 'title', 'body'].filter(
      (k) => issue[k] === undefined || issue[k] === null || String(issue[k]).trim() === ''
    );
    if (missing.length) throw new Error('issue 载荷缺少 ' + missing.join('+') + '（id=' + (issue.id || '?') + '）');
    if (!Array.isArray(issue.labels) || issue.labels.length === 0) {
      throw new Error('issue 载荷缺少 labels（id=' + issue.id + '）');
    }
    if (!String(issue.body).includes(issue.marker)) {
      throw new Error('issue 载荷正文不含去重 marker（id=' + issue.id + '）');
    }
    if (seen.has(issue.marker)) {
      throw new Error('issue 载荷重复 marker（同一源只能一张票）：' + issue.id);
    }
    seen.add(issue.marker);
  }
  return list;
}

// 分页 REST 响应可能超过 execFileSync 的默认 stdout 上限（Node 22 为 1 MiB），
// 默认值会在开票前抛 ENOBUFS，等于告警投递整体失败。显式放宽到 64 MiB：
// 100 条/页 × 多页的 issue 正文足够覆盖本仓规模；仍超限则如实 exit 2。
const GH_MAX_BUFFER = 64 * 1024 * 1024;

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: GH_MAX_BUFFER,
  }).trim();
}

// 去重必须看到全部 open issue：gh issue list 的 --limit 有上限（1000），命中票
// 落在上限外会被误判为「未见过」并重复开票。改用 REST 分页（--paginate --slurp）。
function openIssues() {
  const raw = gh([
    'api', '--paginate', '--slurp',
    'repos/{owner}/{repo}/issues?state=open&per_page=100',
  ]);
  let pages;
  try {
    pages = JSON.parse(raw);
  } catch (e) {
    throw new Error('GitHub issues API 返回非 JSON：' + e.message);
  }
  return issuesFromPages(pages);
}

const errText = (e) => String((e && (e.stderr || e.message)) || e).trim();

function writeOutcome(outPath, outcome) {
  mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  writeFileSync(outPath, JSON.stringify(outcome, null, 2) + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.issues)) {
    throw new Error('漂移载荷不存在：' + args.issues + '（先跑 06-corpus-drift.mjs）');
  }
  const doc = readJson(args.issues, 'drift-issues');
  const issues = validateIssues(doc);

  // 无载荷（none/patch）：不开票；仍落 outcome（含新建输出目录）。
  if (issues.length === 0) {
    writeOutcome(args.out, outcomeOf(args.issues, 0, []));
    console.log('corpus-drift: 无 minor/major 漂移 —— 不开 issue（none/patch 不开）');
    return;
  }

  // dry-run 绝不调用 gh：未提供 --existing 时按「无同类 open issue」出计划。
  // --existing 是离线去重夹具，只允许与 --dry-run 连用：真实投递必须读线上
  // open issue，否则夹具会让脚本在「以为没有同类票」的状态下重复开票。
  if (args.existing && !args.dryRun) {
    throw new Error('--existing 仅用于 --dry-run 离线夹具；真实投递必须查询线上 open issue');
  }
  let existing;
  if (args.existing) {
    existing = readJson(args.existing, 'existing issues');
    if (!Array.isArray(existing)) throw new Error('existing issues 必须是数组：' + args.existing);
  } else if (args.dryRun) {
    existing = [];
    console.error('::notice::--dry-run 未提供 --existing：按「无同类 open issue」生成计划（不调用 gh）');
  } else {
    existing = openIssues();
  }

  const plan = planDeliveries(issues, existing);

  if (args.dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      issues_file: args.issues,
      actions: plan.map((p) => ({
        id: p.issue.id,
        tier: p.issue.tier,
        action: p.action,
        number: p.action === 'comment' ? p.number : null,
        title: p.issue.title,
        labels: p.issue.labels,
        body: p.issue.body,
      })),
    }, null, 2));
    return;
  }

  const tmp = mkdtempSync(path.join(tmpdir(), 'cch-drift-issue-'));
  let actions;
  try {
    const bodyFile = (issue) => {
      const p = path.join(tmp, issue.id + '.md');
      writeFileSync(p, issue.body);
      return p;
    };
    actions = deliverPlan(plan, {
      create: (issue) => gh([
        'issue', 'create', '--title', issue.title, '--body-file', bodyFile(issue),
        ...issue.labels.flatMap((l) => ['--label', l]),
      ]),
      comment: (issue, number) => gh(['issue', 'comment', String(number), '--body-file', bodyFile(issue)]),
      errorText: errText,
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const outcome = outcomeOf(args.issues, issues.length, actions);
  writeOutcome(args.out, outcome);
  for (const a of actions) {
    if (a.ok) {
      const what = a.action === 'create'
        ? '已开漂移 issue ' + a.id + ' (' + a.tier + ') '
        : '已追加评论到 issue #' + a.number + '（' + a.id + ' ' + a.tier + '）';
      console.log('::notice::' + what + (a.url || ''));
    } else {
      console.error('::error::漂移 issue 投递失败 ' + a.id + ' (' + a.action + '): ' + a.error);
    }
  }
  console.log('corpus-drift issues: detected=' + outcome.counts.detected +
    ' created=' + outcome.counts.create + ' commented=' + outcome.counts.comment +
    ' failed=' + outcome.counts.failed);
  if (exitCodeFor(outcome)) process.exitCode = 1;
}

try {
  main();
} catch (e) {
  console.error('drift-issue failed: ' + ((e && e.message) || e));
  process.exitCode = 2;
}
