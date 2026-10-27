#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-45.mjs — corpus-drift 正式模式验收门（issue #15 / 票 T6）
// （门 key 45 按 verify-ticket-runner 的 key 规则取现有最大 key 的下一个序号；
//   与 GitHub issue 号无关，溯源见 plan entry 的 name）
//
// 依据：spec #9 Q4/Q7 —— 原型（票 T5 / issue #14）连续两次绿后转常：
//   · 触发面 = schedule（weekly）+ workflow_dispatch，永不进 pull_request；
//   · tier=minor/major 自动开 needs-triage issue（报告指针 + 结构 diff 输出），
//     none/patch 不开；同源按 marker 去重（后续漂移追加评论）；
//   · workflow 无任何写回仓库的 step（唯一写动作 = 开 issue）。
//
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）：
//   V0 门自身接线；V1 触发面；V2 权限与无写回；V3 投递接线；
//   V4 载荷决策（import lib 直接断言，不猜文本）；V5 投递计划 / 去重 /
//   边界（空载荷、缺失载荷、非法载荷）；V6 编排器端到端（fixture archive，
//   零网络）产票集合与摘要一致、语料零副作用；V7 文档与账本成文。
//
// 用法：node tests/scripts/verify-ticket-45.mjs
// ══════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { before, containsToken, writeScopesIn } from './gate-assert.mjs';
import {
  buildDriftIssues,
  deliverPlan,
  DRIFT_ISSUE_LABEL,
  DRIFT_ISSUE_TIERS,
  excerptLog,
  exitCodeFor,
  isBotAuthor,
  issueMarker,
  issuesFromPages,
  outcomeOf,
  planDeliveries,
} from './lib-corpus-drift-issues.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const sha256File = (p) => sha256(readFileSync(p));

const FORMS = 'tests/corpus/forms';
const FILES = {
  sources: FORMS + '/sources.json',
  manifest: FORMS + '/manifest.json',
  readme: FORMS + '/README.md',
  registry: FORMS + '/drift-degradations.json',
  orchestrator: 'tests/scripts/06-corpus-drift.mjs',
  issueTool: 'tests/scripts/06-drift-issue.mjs',
  issuesLib: 'tests/scripts/lib-corpus-drift-issues.mjs',
  workflow: '.github/workflows/corpus-drift.yml',
  plan: 'tests/scripts/verify-ticket-plan.json',
  runner: 'tests/scripts/verify-ticket-runner.mjs',
  caller: '.github/workflows/verify-tickets.yml',
  glossary: 'GLOSSARY.md',
};

let pass = 0;
const failures = [];
const ok = (m) => { pass++; console.log('  PASS ' + m); };
const eq = (a, b, m) => {
  if (a === b) ok(m + ' (' + JSON.stringify(a) + ')');
  else failures.push(m + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
};
const check = (c, m, extra) => {
  if (c) ok(m + (extra ? ' — ' + extra : ''));
  else failures.push(m + (extra ? ' — ' + extra : ''));
};

// ══════════════════════════════════════════════════════════════════
// V0 门自身接线（plan / matrix / audit）
// ══════════════════════════════════════════════════════════════════
{
  const plan = JSON.parse(read(FILES.plan));
  const t45 = plan.tickets['45'];
  check(!!t45, 'V0 plan 注册票 45（issue #15 / T6 corpus-drift 正式模式）');
  eq(JSON.stringify(t45 && t45.scripts), JSON.stringify(['verify-ticket-45.mjs']),
    'V0 票 45 门脚本唯一指向本文件');
  check(/-\s*'45'/.test(read(FILES.caller)), 'V0 verify-tickets.yml matrix 含 45（A15/A16 全等守卫面）');
  let auditCode = 0;
  try {
    execFileSync(process.execPath, [abs(FILES.runner), '--audit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { auditCode = e.status; }
  eq(auditCode, 0, 'V0 audit 全绿（A2 为不变量，加票不触发跨票维护）');
}

const WF = read(FILES.workflow);
const ORCH = read(FILES.orchestrator);
const ISSUE_TOOL = read(FILES.issueTool);

function onBlockOf(src) {
  const lines = src.split('\n');
  let onStart = -1, onEnd = lines.length;
  for (let i = 0; i < lines.length; i++) { if (/^on:\s*$/.test(lines[i])) { onStart = i; break; } }
  if (onStart >= 0) {
    for (let i = onStart + 1; i < lines.length; i++) {
      if (/^[A-Za-z_]/.test(lines[i])) { onEnd = i; break; }
    }
  }
  return onStart >= 0 ? lines.slice(onStart + 1, onEnd).join('\n') : '';
}

// ══════════════════════════════════════════════════════════════════
// V1 触发面：仅 schedule + workflow_dispatch（永不进 pull_request）
// ══════════════════════════════════════════════════════════════════
{
  const onBlock = onBlockOf(WF);
  check(onBlock !== '', 'V1 corpus-drift.yml 存在 on: 块');
  check(/^\s{2}workflow_dispatch:/m.test(onBlock), 'V1 触发面含 workflow_dispatch（手动诊断入口）');
  check(/^\s{2}schedule:/m.test(onBlock), 'V1 触发面含 schedule（每周低频转常）');
  check(!/pull_request/.test(onBlock), 'V1 触发面不含 pull_request（advisory：失败不阻断 PR）');
  check(!/^\s{2}push:/m.test(onBlock), 'V1 触发面不含 push（不重开分支生命周期触发）');
  const triggers = [...onBlock.matchAll(/^\s{2}([a-z_]+):/gm)].map((m) => m[1]).sort();
  eq(JSON.stringify(triggers), JSON.stringify(['schedule', 'workflow_dispatch']),
    'V1 触发面唯一 = schedule + workflow_dispatch');

  const cronMatch = /^\s*-\s*cron:\s*'([^']+)'/m.exec(onBlock);
  check(!!cronMatch, 'V1 schedule 声明 cron');
  if (cronMatch) {
    const f = cronMatch[1].trim().split(/\s+/);
    eq(f.length, 5, 'V1 cron 为 5 段（分钟 时 日 月 周）');
    check(f[0] !== '*' && f[1] !== '*' && f[4] !== '*',
      'V1 cron 是低频周排期（分钟/小时/星期均固定）', cronMatch[1]);
    check(/^[0-7](,[0-7])*$/.test(f[4]) || /^[A-Za-z]{3}$/.test(f[4]),
      'V1 星期字段为具体星期（非每天通配）', f[4]);
  }
}

// ══════════════════════════════════════════════════════════════════
// V2 权限与无写回（唯一写动作 = issue；仓库内容只读）
// ══════════════════════════════════════════════════════════════════
{
  const perm = /^permissions:\n([\s\S]*?)(?=^\S)/m.exec(WF);
  check(!!perm, 'V2 声明 permissions 块');
  check(!!perm && /contents:\s*read/.test(perm[1]), 'V2 contents: read（仓库内容只读）');
  check(!!perm && /issues:\s*write/.test(perm[1]), 'V2 issues: write（唯一写权限，用于漂移告警）');
  // 全文件扫描（含 job 级 permissions）：任何层级都只允许 issues: write。
  const writeScopes = writeScopesIn(WF);
  eq(JSON.stringify(writeScopes), JSON.stringify(['issues']),
    'V2 全文件唯一 write scope = issues（workflow / job 级、引号 / 行尾注释均算）');
  check(!/contents:\s*['"]?write/.test(WF), 'V2 无 contents: write（含引号写法）');
  check(!/write-all/.test(WF), 'V2 无 permissions: write-all（整体写权限）');
  // 检测器自检：确认写法覆盖（否则门可能对绕过写法恒绿）
  eq(JSON.stringify(writeScopesIn('permissions:\n  contents: write')),
    JSON.stringify(['contents']), 'V2 检测器命中未加引号的 contents: write');
  eq(JSON.stringify(writeScopesIn("permissions:\n  contents: 'write'")),
    JSON.stringify(['contents']), 'V2 检测器命中引号值');
  eq(JSON.stringify(writeScopesIn('permissions:\n  "contents": write')),
    JSON.stringify(['contents']), 'V2 检测器命中引号键');
  eq(JSON.stringify(writeScopesIn('permissions:\n  contents: &w write')),
    JSON.stringify(['contents']), 'V2 检测器命中 YAML 锚点前缀');
  eq(JSON.stringify(writeScopesIn('permissions:\n  contents: write # note')),
    JSON.stringify(['contents']), 'V2 检测器命中行尾注释');
  eq(JSON.stringify(writeScopesIn('permissions: write-all')),
    JSON.stringify(['permissions']), 'V2 检测器命中 permissions: write-all');

  check(!/\bgit\s+(add|commit|push|tag)\b/.test(WF), 'V2 workflow 无 git 写动作');
  check(!/06-manifest\.mjs/.test(WF) && !/06-manifest\.mjs/.test(ORCH),
    'V2 workflow / 编排器都不调用 06-manifest（清单更新永远是人工显式动作）');
  for (const tool of ['06-capture-forms', '06-skeleton', '06-structural-diff']) {
    check(!new RegExp(tool + '\\.mjs').test(WF), 'V2 workflow 不直接调 ' + tool + '.mjs（编排在脚本内）');
  }
  check(!/create-pull-request/.test(WF), 'V2 无 PR 自动创建动作');
  check(!/continue-on-error/.test(WF), 'V2 运行时步不吞失败（如实红：投递失败可见）');
  check(!/(?:--out|>>?)\s*['"]?tests\//.test(WF), 'V2 workflow 无向 tests/ 写盘的重定向或 --out');
  check(/assertReportOutsideCorpus\s*\(/.test(ORCH), 'V2 编排器保留报告目录护栏（tests/corpus/** 拒写）');
  check(/assertArchiveOutsideRepo/.test(ORCH), 'V2 编排器保留仓外 archive 护栏');
  {
    // 护栏先于第一次抓取 / 写盘（检查在首个 mutation 之前）
    const guard = before(ORCH, 'assertReportOutsideCorpus(outDir);', 'TOOLS.capture,');
    check(guard.ok, 'V2 报告护栏先于抓取动作（检查在首个 mutation 之前）', guard.detail);
  }
}

// ══════════════════════════════════════════════════════════════════
// V3 告警投递接线（载荷 → 脚本 → issue；失败可见）
// ══════════════════════════════════════════════════════════════════
{
  check(/drift-issues\.json/.test(ORCH), 'V3 编排器产出 drift-issues.json 载荷');
  check(/buildDriftIssues\s*\(/.test(ORCH), 'V3 编排器经 lib 生成载荷（决策唯一处）');
  check(/drift-issues\.json/.test(WF), 'V3 workflow 读取 drift-issues.json');
  check(/06-drift-issue\.mjs/.test(WF), 'V3 workflow 调用投递脚本');
  check(/GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/.test(WF), 'V3 投递步使用 github.token（GH_TOKEN）');
  check(/GH_REPO:\s*\$\{\{\s*github\.repository\s*\}\}/.test(WF), 'V3 投递步显式指定 GH_REPO');

  const runStep = before(WF, 'Run corpus drift (capture', '06-drift-issue.mjs');
  check(runStep.ok, 'V3 投递在漂移运行之后', runStep.detail);
  const upStep = before(WF, '06-drift-issue.mjs', 'Upload drift report artifact');
  check(upStep.ok, 'V3 投递先于 artifact 上传（outcome 随报告归档）', upStep.detail);
  check(/if: \$\{\{ always\(\) && hashFiles\('live-out\/corpus-drift\/drift-issues\.json'\) != '' \}\}/.test(WF),
    'V3 投递步 if 绑定 always() + 载荷存在（锚定实际调用行，不靠注释里的 always()）');
  check(/drift-issue-outcome\.json/.test(WF), 'V3 投递结果落 outcome（可见、可归档）');
  check(/^concurrency:\n\s+group:\s*corpus-drift/m.test(WF),
    'V3 并发组 corpus-drift（周排期与手动触发串行，防双开票）');
  check(/^concurrency:[\s\S]{0,120}cancel-in-progress:\s*false/m.test(WF),
    'V3 不取消进行中的运行（投递不被中途打断）');

  check(DRIFT_ISSUE_LABEL === 'needs-triage', 'V3 告警 label = needs-triage（仓内 canonical triage 角色）');
  check(/isBotAuthor\s*\(/.test(read(FILES.issuesLib)),
    'V3 去重按 author.is_bot 识别 bot（兼容 app/github-actions 与 *[bot] 登录名）');
  check(isBotAuthor({ is_bot: true, login: 'app/github-actions' }),
    'V3 author.is_bot=true 的 App bot 参与去重（生产 gh 返回形态）');
  check(isBotAuthor({ login: 'github-actions[bot]' }),
    'V3 *[bot] 登录名同样识别为 bot');
  check(!isBotAuthor({ is_bot: false, login: 'mallory' }), 'V3 人类作者不参与去重');
  check(/'issue', 'create'/.test(ISSUE_TOOL), 'V3 投递脚本调用 gh issue create');
  check(/'issue', 'comment'/.test(ISSUE_TOOL), 'V3 同源后续漂移调用 gh issue comment（不重复开票）');
  check(/number: issue\.number/.test(read(FILES.issuesLib)) && /body: issue\.body/.test(read(FILES.issuesLib)) &&
    /author:/.test(read(FILES.issuesLib)),
    'V3 分页映射产出 number + body + author（去重字段齐全）');
  check(/'api', '--paginate', '--slurp'/.test(ISSUE_TOOL), 'V3 去重查询分页拉全量 open issue（无 --limit 上限）');
  check(/per_page=100/.test(ISSUE_TOOL), 'V3 分页页大小 100');
  check(/issuesFromPages\s*\(/.test(ISSUE_TOOL), 'V3 分页结果经 lib 映射（PR 过滤 / is_bot 可离线测）');
  check(/GH_MAX_BUFFER = 64 \* 1024 \* 1024/.test(ISSUE_TOOL) && /maxBuffer:\s*GH_MAX_BUFFER/.test(ISSUE_TOOL),
    'V3 gh 分页输出上限显式放宽（防 1 MiB 默认 buffer 中止投递）');
  check(/deliverPlan\s*\(/.test(ISSUE_TOOL), 'V3 投递执行经 lib（失败路径可离线锁定）');
  check(/outcomeOf\s*\(/.test(ISSUE_TOOL), 'V3 结果账本经 lib（计数唯一处）');
  check(/exitCodeFor\(outcome\)/.test(ISSUE_TOOL), 'V3 失败映射经 lib exitCodeFor（可单测）');
  check(/'--body-file'/.test(ISSUE_TOOL), 'V3 正文经 --body-file 传递（不走 shell 拼接）');
  check(!/shell:\s*true/.test(ISSUE_TOOL), 'V3 不启用 shell（无插值注入面）');
  check(/--dry-run/.test(ISSUE_TOOL), 'V3 投递脚本支持 --dry-run（离线可验）');
  check(/planDeliveries\s*\(/.test(ISSUE_TOOL), 'V3 投递计划经 lib（去重规则可离线测试）');
}

// ══════════════════════════════════════════════════════════════════
// V4 载荷决策（唯一处：只有 MINOR / MAJOR 产票）
// ══════════════════════════════════════════════════════════════════
const mkRow = (id, tier, extra) => Object.assign({
  id,
  family: 'fixture',
  url: 'https://example.invalid/' + id,
  adoption: 'adopted',
  reachability: 'ok',
  evidence: { browser_status: 200, http_status: 403, title: 'Fixture', markers: [] },
  skeleton: { status: 'ok' },
  drift: {
    tier,
    changes: tier === 'NONE' ? 0 : 2,
    exit_code: ['MINOR', 'MAJOR'].includes(tier) ? 1 : 0,
    log_excerpt: 'structural-diff [' + id + ']\n  tier: ' + tier +
      '  (bump: x)  changes: 2\n    [major] /  tag div → span',
  },
  decision: tier === 'NOT_EVALUATED' ? 'degraded' : 'collect',
  degradation: null,
}, extra || {});

let issues = [];
{
  const summary = {
    generated_at: '2026-10-26T00:00:00.000Z',
    run: { run_url: 'https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/123', commit: 'a'.repeat(40) },
    matrix: [
      mkRow('src-none', 'NONE'),
      mkRow('src-patch', 'PATCH'),
      mkRow('src-minor', 'MINOR'),
      mkRow('src-major', 'MAJOR'),
      mkRow('src-skip', 'SKIP'),
      mkRow('src-error', 'ERROR'),
      mkRow('src-not-evaluated', 'NOT_EVALUATED'),
    ],
  };
  check(summary.matrix.filter((r) => ['NONE', 'PATCH'].includes(r.drift.tier)).length === 2,
    'V4 反例刺激在场（NONE / PATCH 行确实在输入中）');
  issues = buildDriftIssues(summary, { reportPath: 'live-out/corpus-drift/drift-report.md' });
  eq(JSON.stringify(issues.map((i) => i.id)), JSON.stringify(['src-minor', 'src-major']),
    'V4 只有 MINOR / MAJOR 产票（NONE / PATCH / SKIP / ERROR / NOT_EVALUATED 不开）');
  eq(JSON.stringify(DRIFT_ISSUE_TIERS), JSON.stringify(['MINOR', 'MAJOR']), 'V4 告警 tier 集合显式 = MINOR/MAJOR');

  const major = issues.find((i) => i.id === 'src-major');
  check(!!major, 'V4 MAJOR 载荷存在');
  eq(major.marker, '<!-- corpus-drift:src-major -->', 'V4 载荷携带稳定去重 marker');
  eq(JSON.stringify(major.labels), JSON.stringify(['needs-triage']), 'V4 载荷 label = needs-triage');
  check(major.title.includes('src-major') && major.title.includes('MAJOR'),
    'V4 标题含源 id 与 tier', major.title);
  for (const token of [
    '报告摘录',
    '结构 diff 输出',
    'tier: MAJOR',
    'actions/runs/123',
    'tests/corpus/forms/README.md',
    '禁止把「更新基线」当作消除红灯的手段',
    'corpus-drift:src-major',
  ]) {
    const hit = containsToken(major.body, token);
    check(hit.ok, 'V4 issue 正文含「' + token + '」', hit.detail);
  }
  const minor = issues.find((i) => i.id === 'src-minor');
  check(minor.body.includes('tier: MINOR'), 'V4 MINOR 正文带本次结构 diff 输出');

  const local = buildDriftIssues(
    Object.assign({}, summary, { run: { run_url: null, commit: null } }),
    { reportPath: 'live-out/corpus-drift/drift-report.md' }
  );
  check(local.length === 2 && local[0].body.includes('live-out/corpus-drift/drift-report.md'),
    'V4 本地运行（无 run URL）时报告指针落到本地报告路径');

  // 页面内容里的反引号不得提前闭合 diff 代码块（class 名可含任意非空白字符）
  const fenced = buildDriftIssues({
    generated_at: '2026-10-26T00:00:00.000Z',
    run: { run_url: null, commit: null },
    matrix: [mkRow('src-fence', 'MAJOR', {
      drift: { tier: 'MAJOR', changes: 1, exit_code: 1, log_excerpt: 'class ```evil``` → span' },
    })],
  }, {});
  check(fenced.length === 1 && fenced[0].body.includes('````text') && fenced[0].body.includes('````\n'),
    'V4 正文围栏长度自适应（内容含 ``` 时用更长围栏，代码块不被撑破）');

  // 长 diff 摘录必须保留 tier 头（只取 tail 会把它截掉）
  const longLog = [
    'structural-diff [src-long]',
    '  base: /a.json (10n, aaaa…)',
    '  new : /b.json (10n, bbbb…)',
    '  tier: MAJOR  (bump: major)  changes: 80',
    ...Array.from({ length: 60 }, (_, i) => '    [major] /p/' + i + '  tag div → span'),
    '  → 需归因后再决定 bump 与镜像页更新',
  ].join('\n');
  const cut = excerptLog(longLog);
  check(cut.includes('tier: MAJOR') && cut.includes('（省略') && cut.includes('需归因后再决定'),
    'V4 长 diff 摘录保留 tier 头与尾部变化（截断有标注）');
  eq(excerptLog('a\nb', 8, 20), 'a\nb', 'V4 短 diff 原样返回（不插入省略标记）');
}

// ══════════════════════════════════════════════════════════════════
// V5 投递计划 / 去重 / 边界（离线，不调用 gh）
// ══════════════════════════════════════════════════════════════════
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch45-plan-'));
  const runTool = (args, env) => {
    try {
      return {
        code: 0,
        out: execFileSync(process.execPath, [abs(FILES.issueTool), ...args],
          { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(env || {}) } }),
        err: '',
      };
    } catch (e) {
      return { code: e.status, out: e.stdout || '', err: e.stderr || '' };
    }
  };
  try {
    const created = planDeliveries(issues, []);
    eq(JSON.stringify(created.map((p) => p.action)), JSON.stringify(['create', 'create']),
      'V5 无同类 open issue → 两张新票');

    const withMinor = planDeliveries(issues, [{
      number: 7,
      author: { login: 'app/github-actions', is_bot: true },
      body: 'note\n' + issueMarker('src-minor') + '\n',
    }]);
    eq(withMinor.find((p) => p.issue.id === 'src-minor').action, 'comment', 'V5 同 marker 已存在 → 追加评论');
    eq(withMinor.find((p) => p.issue.id === 'src-minor').number, 7, 'V5 评论目标 = 已存在 issue 号');
    eq(withMinor.find((p) => p.issue.id === 'src-major').action, 'create', 'V5 不同源仍开新票');

    // gh 对 App bot 的登录名可能是 github-actions[bot] 或 app/github-actions；
    // 两种形态都必须命中（最终评审实测的回归点）。
    const loginBot = planDeliveries(issues, [{
      number: 11,
      author: { login: 'github-actions[bot]' },
      body: issueMarker('src-minor'),
    }]);
    eq(loginBot.find((p) => p.issue.id === 'src-minor').action, 'comment',
      'V5 *[bot] 登录名（无 is_bot 字段）同样参与去重');
    eq(loginBot.find((p) => p.issue.id === 'src-minor').number, 11, 'V5 登录名 bot 的评论目标正确');

    // 分页映射（CR finding）：/issues 会同时返回 PR，必须过滤；user.type 映射 is_bot。
    const pages = [
      [
        { number: 21, body: 'bot ' + issueMarker('src-minor'), user: { login: 'app/github-actions', type: 'Bot' } },
        { number: 22, body: 'a PR with the same marker', pull_request: { url: 'https://example.invalid/pr/22' }, user: { login: 'app/github-actions', type: 'Bot' } },
      ],
      [
        { number: 23, body: 'human', user: { login: 'mallory', type: 'User' } },
      ],
    ];
    const flattened = issuesFromPages(pages);
    eq(flattened.length, 2, 'V5 分页映射过滤 PR（只保留 issue）');
    eq(flattened[0].number, 21, 'V5 分页映射保留 issue 号');
    eq(flattened[0].author.is_bot, true, 'V5 user.type=Bot 映射为 is_bot=true');
    eq(flattened[1].author.is_bot, false, 'V5 user.type=User 映射为 is_bot=false');
    check(flattened[0].body.includes('src-minor'), 'V5 分页映射保留正文（marker 去重可用）');
    let pageThrew = false;
    try { issuesFromPages([{}, []]); } catch { pageThrew = true; }
    check(pageThrew, 'V5 非分页数组 → 抛出（不静默当空列表）');

    const unrelated = planDeliveries(issues, [{ number: 9, author: { login: 'app/github-actions', is_bot: true }, body: 'unrelated' }]);
    eq(JSON.stringify(unrelated.map((p) => p.action)), JSON.stringify(['create', 'create']),
      'V5 无关 open issue 不误判为同源');

    // 公共仓库防劫持：他人 issue 正文里伪造 marker 不得让告警评论到他的票下
    const spoofed = planDeliveries(issues, [{
      number: 8,
      author: { login: 'mallory', is_bot: false },
      body: 'look ' + issueMarker('src-minor'),
    }]);
    eq(spoofed.find((p) => p.issue.id === 'src-minor').action, 'create',
      'V5 非 workflow 作者的 marker 不参与去重（防告警劫持）');

    let threw = false;
    try {
      planDeliveries([issues[0]], [{
        number: 'x',
        author: { login: 'app/github-actions', is_bot: true },
        body: issues[0].marker,
      }]);
    } catch { threw = true; }
    check(threw, 'V5 已存在 issue 的 number 非法 → 抛出（不静默评论到错误目标）');

    // 投递失败路径（review.md Q3）：一票失败不中断其余票，失败计入 outcome → 调用方判红
    const seen = [];
    const failedActions = deliverPlan([
      { action: 'create', issue: issues[0] },
      { action: 'comment', number: 7, issue: issues[1] },
    ], {
      create: (issue) => { seen.push('create:' + issue.id); throw new Error('boom'); },
      comment: (issue, n) => { seen.push('comment:' + n); return 'https://example.invalid/comment/1'; },
      errorText: (e) => String(e.message),
    });
    eq(JSON.stringify(seen), JSON.stringify(['create:src-minor', 'comment:7']),
      'V5 一票投递失败不中断后续票');
    eq(failedActions[0].ok, false, 'V5 失败票如实记 ok=false');
    eq(failedActions[0].error, 'boom', 'V5 失败票携带错误信息');
    eq(failedActions[1].ok, true, 'V5 后续票仍成功');
    const failedOutcome = outcomeOf('fixture.json', 2, failedActions);
    eq(failedOutcome.counts.failed, 1, 'V5 outcome 计 failed=1（调用方据此判红）');
    eq(failedOutcome.counts.create, 0, 'V5 失败不计入 created');
    eq(failedOutcome.counts.comment, 1, 'V5 成功评论计入 commented');
    eq(exitCodeFor(failedOutcome), 1, 'V5 exitCodeFor：有失败 → 1（告警未送达判红）');
    eq(exitCodeFor(outcomeOf('fixture.json', 2, [])), 0, 'V5 exitCodeFor：无失败 → 0');

    const issuesFile = join(tmp, 'drift-issues.json');
    writeFileSync(issuesFile, JSON.stringify({ issues }, null, 2) + '\n');
    const existingFile = join(tmp, 'existing.json');
    writeFileSync(existingFile, JSON.stringify([{
      number: 7,
      author: { login: 'app/github-actions', is_bot: true },
      body: issueMarker('src-minor'),
    }], null, 2) + '\n');

    // --existing 是离线夹具：不带 --dry-run 的真实投递必须拒绝，防止夹具造成重复开票
    const fixtureAsLive = runTool(['--issues', issuesFile, '--existing', existingFile]);
    eq(fixtureAsLive.code, 2, 'V5 --existing 不带 --dry-run → 退出 2');
    check(/仅用于 --dry-run/.test(fixtureAsLive.err), 'V5 拒绝信息说明 --existing 只服务 dry-run');

    const dry = runTool(['--issues', issuesFile, '--existing', existingFile, '--dry-run']);
    eq(dry.code, 0, 'V5 投递脚本 dry-run 退出 0');
    let planDoc = null;
    try { planDoc = JSON.parse(dry.out); } catch {}
    check(!!planDoc && planDoc.mode === 'dry-run', 'V5 dry-run 输出机器可读计划');
    check(!!planDoc && planDoc.actions.length === 2, 'V5 dry-run 计划覆盖两张票');
    const minorPlan = planDoc && planDoc.actions.find((a) => a.id === 'src-minor');
    check(!!minorPlan && minorPlan.action === 'comment' && minorPlan.number === 7,
      'V5 dry-run 计划：同源 → comment #7');
    check(!!minorPlan && minorPlan.body.includes('corpus-drift:src-minor'), 'V5 dry-run 计划携带正文（可审计）');

    // dry-run 的「不调用 gh」是硬承诺：PATH 清空后若仍尝试 gh 会 exit 2
    const offline = runTool(['--issues', issuesFile, '--dry-run'], { PATH: '' });
    eq(offline.code, 0, 'V5 --dry-run 无 --existing 也不调用 gh（PATH 为空仍退出 0）');
    let offlineDoc = null;
    try { offlineDoc = JSON.parse(offline.out); } catch {}
    check(!!offlineDoc && offlineDoc.actions.every((a) => a.action === 'create'),
      'V5 无 --existing 的 dry-run 按「无同类 open issue」出计划');

    const emptyFile = join(tmp, 'empty.json');
    writeFileSync(emptyFile, JSON.stringify({ issues: [] }, null, 2) + '\n');
    const emptyOut = join(tmp, 'nested', 'deeper', 'empty-outcome.json');
    const empty = runTool(['--issues', emptyFile, '--out', emptyOut]);
    eq(empty.code, 0, 'V5 空载荷（none/patch）→ 退出 0（不开票、不伪造告警）');
    check(existsSync(emptyOut), 'V5 空载荷仍落 outcome，且输出目录可自动新建（含多级）');
    if (existsSync(emptyOut)) {
      const eo = JSON.parse(readFileSync(emptyOut, 'utf8'));
      eq(eo.counts.detected, 0, 'V5 空载荷 detected=0');
      eq(eo.counts.create, 0, 'V5 空载荷 create=0');
    }

    const missing = runTool(['--issues', join(tmp, 'no-such.json'), '--out', join(tmp, 'o.json')]);
    eq(missing.code, 2, 'V5 载荷缺失 → 退出 2（不静默当无漂移）');
    check(/漂移载荷不存在/.test(missing.err), 'V5 缺失载荷错误信息可读');

    const badFile = join(tmp, 'bad.json');
    writeFileSync(badFile, JSON.stringify({
      issues: [{ id: 'bad', tier: 'MAJOR', marker: '<!-- corpus-drift:bad -->', title: 't', body: 'no marker here', labels: ['needs-triage'] }],
    }, null, 2) + '\n');
    const bad = runTool(['--issues', badFile, '--out', join(tmp, 'bad-out.json')]);
    eq(bad.code, 2, 'V5 正文缺 marker 的载荷 → 退出 2（去重契约不可破）');
    check(/marker/.test(bad.err), 'V5 非法载荷错误信息点名 marker');
    check(!existsSync(join(tmp, 'bad-out.json')), 'V5 非法载荷不落 outcome（校验先于写盘）');

    const dupFile = join(tmp, 'dup.json');
    const dupIssue = issues[0];
    writeFileSync(dupFile, JSON.stringify({ issues: [dupIssue, dupIssue] }, null, 2) + '\n');
    const dup = runTool(['--issues', dupFile, '--out', join(tmp, 'dup-out.json')]);
    eq(dup.code, 2, 'V5 重复 marker 的载荷 → 退出 2（同一源不重复开票）');
    check(/重复 marker/.test(dup.err), 'V5 重复 marker 错误信息可读');
    check(!existsSync(join(tmp, 'dup-out.json')), 'V5 重复 marker 不落 outcome（校验先于写盘）');

    const nonArrayFile = join(tmp, 'existing-object.json');
    writeFileSync(nonArrayFile, JSON.stringify({ number: 1, body: '' }, null, 2) + '\n');
    const nonArray = runTool(['--issues', issuesFile, '--existing', nonArrayFile, '--dry-run']);
    eq(nonArray.code, 2, 'V5 --existing 非数组 → 退出 2（不把畸形输入当「无同类 issue」）');
    check(/必须是数组/.test(nonArray.err), 'V5 非数组 existing 错误信息可读');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// V6 编排器端到端（fixture archive，零网络）：产票集合 = 摘要 tier 集合
// ══════════════════════════════════════════════════════════════════
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch45-e2e-'));
  try {
    const arch = join(tmp, 'archive');
    const corpus = join(arch, 'corpus-forms');
    for (const d of ['dom', 'raw', 'shot']) mkdirSync(join(corpus, d), { recursive: true });

    const itiHtml = readFileSync(abs(FORMS + '/mirrors/iti-v29.html'), 'utf8');
    writeFileSync(join(corpus, 'dom', 'iti-v29.html'), itiHtml);
    writeFileSync(join(corpus, 'raw', 'iti-v29.html'), itiHtml);

    const challengeHtml = '<!doctype html><html><head><title>Just a moment...</title>' +
      '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></head>' +
      '<body>Checking your browser before accessing the site.</body></html>';
    writeFileSync(join(corpus, 'dom', 'rpn-input.html'), challengeHtml);
    writeFileSync(join(corpus, 'raw', 'rpn-input.html'), challengeHtml);

    const chosenHtml = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>\n' +
      readFileSync(abs(FORMS + '/mirrors/chosen-select.html'), 'utf8');
    writeFileSync(join(corpus, 'dom', 'chosen-select.html'), chosenHtml);
    writeFileSync(join(corpus, 'raw', 'chosen-select.html'), chosenHtml);

    const entry = (id, file, html, extra) => Object.assign({
      id,
      source_url: 'https://example.invalid/' + id,
      family: 'fixture',
      // 采集条件（issue #34）：fixture 建模重捕之后的 CAPTURE-MANIFEST 形状；
      // 骨架派生对缺这两个键的台账硬拒（--no-capture 复用旧 archive 同样被拒）。
      capture_country: 'us',
      browser_locale: 'en-US',
      http_status: 200,
      raw: { file: 'raw/' + file, bytes: Buffer.byteLength(html), sha256: '0'.repeat(64) },
      dom: { file: 'dom/' + file, bytes: Buffer.byteLength(html), sha256: '0'.repeat(64) },
      frames: [],
      ok: true,
    }, extra || {});
    writeFileSync(join(corpus, 'CAPTURE-MANIFEST.json'), JSON.stringify({
      capturedAt: '2026-10-26T00:00:00.000Z',
      archiveRoot: arch.replace(/\\/g, '/'),
      archiveDir: 'corpus-forms',
      userAgent: 'fixture',
      entries: [
        entry('iti-v29', 'iti-v29.html', itiHtml, { http_status: 403, browser_status: 200 }),
        entry('rpn-input', 'rpn-input.html', challengeHtml, { browser_status: 200 }),
        entry('chosen-select', 'chosen-select.html', chosenHtml, { browser_status: 200 }),
        {
          id: 'mui-autocomplete', source_url: 'https://example.invalid/mui', family: 'fixture',
          capture_country: 'us', browser_locale: null, ok: false, error: 'net::ERR_NAME_NOT_RESOLVED',
        },
      ],
    }, null, 2) + '\n');

    const regFile = join(tmp, 'degradations.json');
    writeFileSync(regFile, JSON.stringify({
      sources: [
        { id: 'rpn-input', status: 'challenged', reason: 'fixture: Cloudflare interstitial', ticket: '14' },
        { id: 'mui-autocomplete', status: 'unreachable', reason: 'fixture: DNS failure', ticket: '14' },
      ],
    }, null, 2) + '\n');

    const skelDir = abs(FORMS + '/skeletons');
    const snapshot = () => JSON.stringify(readdirSync(skelDir).sort().map((f) => [f, sha256File(join(skelDir, f))])) +
      '|' + sha256File(abs(FILES.manifest)) + '|' + sha256File(abs(FILES.registry)) + '|' + sha256File(abs(FILES.sources));
    const beforeRun = snapshot();

    const outDir = join(tmp, 'out');
    const args = [
      abs(FILES.orchestrator), '--archive', arch, '--out', outDir,
      '--no-capture', '--degradations', regFile,
      '--id', 'iti-v29', '--id', 'rpn-input', '--id', 'mui-autocomplete', '--id', 'chosen-select',
    ];
    let code = 0;
    try {
      execFileSync(process.execPath, args, {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GITHUB_REPOSITORY: 'Xxx91n/Find-Your-Country-Code',
          GITHUB_RUN_ID: '999',
          GITHUB_SHA: 'b'.repeat(40),
          GITHUB_SERVER_URL: 'https://github.com',
        },
      });
    } catch (e) { code = e.status; }
    eq(code, 0, 'V6 fixture 运行退出 0（降级登记如实，契约成立）');

    const summary = JSON.parse(readFileSync(join(outDir, 'drift-summary.json'), 'utf8'));
    const issueDoc = JSON.parse(readFileSync(join(outDir, 'drift-issues.json'), 'utf8'));
    const expected = summary.matrix.filter((r) => ['MINOR', 'MAJOR'].includes(r.drift.tier)).map((r) => r.id).sort();
    check(expected.length > 0, 'V6 反例刺激在场（fixture 至少产出一个 minor/major 漂移）',
      JSON.stringify(summary.matrix.map((r) => r.id + ':' + r.drift.tier)));
    eq(JSON.stringify(issueDoc.issues.map((i) => i.id).sort()), JSON.stringify(expected),
      'V6 产票集合 = 摘要中 MINOR/MAJOR 行（none/patch 等不产票）');
    check(issueDoc.issues.every((i) => ['MINOR', 'MAJOR'].includes(i.tier)),
      'V6 每张票的 tier 都是告警档');
    check(issueDoc.issues.some((i) => i.id === 'iti-v29'), 'V6 漂移源 iti-v29 产票（刺激在场）');
    check(!issueDoc.issues.some((i) => i.id === 'rpn-input'), 'V6 challenged 源不产票（NOT_EVALUATED）');
    check(!issueDoc.issues.some((i) => i.id === 'mui-autocomplete'), 'V6 unreachable 源不产票');
    eq(issueDoc.report.artifact, 'corpus-drift', 'V6 载荷报告指针 = artifact 名');
    eq(JSON.stringify(summary.drift_alerts.map((a) => a.id).sort()), JSON.stringify(expected),
      'V6 摘要 drift_alerts 与产票集合一致');
    eq(summary.counts.drift_alerts, expected.length, 'V6 摘要计数 drift_alerts 与产票数一致');

    const iti = issueDoc.issues.find((i) => i.id === 'iti-v29');
    check(!!iti && iti.body.includes('actions/runs/999'), 'V6 issue 正文携带 run URL 报告指针');
    check(!!iti && iti.body.includes('结构 diff 输出') && /tier: (MINOR|MAJOR)/.test(iti.body),
      'V6 issue 正文携带结构 diff 输出');
    check(!!iti && iti.body.includes('corpus-drift:iti-v29'), 'V6 issue 正文携带去重 marker');

    const existingFile = join(tmp, 'existing-iti.json');
    writeFileSync(existingFile, JSON.stringify([{
      number: 42,
      author: { login: 'app/github-actions', is_bot: true },
      body: issueMarker('iti-v29'),
    }], null, 2) + '\n');
    let dryPlan = null;
    try {
      const out = execFileSync(process.execPath, [
        abs(FILES.issueTool), '--issues', join(outDir, 'drift-issues.json'),
        '--existing', existingFile, '--dry-run',
      ], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      dryPlan = JSON.parse(out);
    } catch {}
    const itiPlan = dryPlan && dryPlan.actions.find((a) => a.id === 'iti-v29');
    check(!!itiPlan && itiPlan.action === 'comment' && itiPlan.number === 42,
      'V6 端到端：同源已有 open issue → 投递计划为追加评论（不重复开票）');

    eq(snapshot(), beforeRun, 'V6 语料目录零副作用（骨架 / 清单 / 登记账本 / 清单输入字节不变）');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// V7 文档与账本成文
// ══════════════════════════════════════════════════════════════════
{
  const md = read(FILES.readme);
  check(/corpus-drift/.test(md), 'V7 README 载明 corpus-drift workflow');
  check(/schedule/.test(md) && /workflow_dispatch/.test(md), 'V7 README 载明 schedule + workflow_dispatch 双触发面');
  check(/minor[\s\S]{0,40}major|major[\s\S]{0,40}minor/.test(md), 'V7 README 载明 minor/major 漂移告警');
  check(/none[\s\S]{0,20}patch|patch[\s\S]{0,20}none/.test(md), 'V7 README 载明 none/patch 不开票');
  check(/needs-triage/.test(md), 'V7 README 载明告警 label = needs-triage');
  check(/06-drift-issue\.mjs/.test(md), 'V7 README 指向投递脚本');
  check(/写回|永不自动更新基线|禁止任何 workflow 自动写回/.test(md), 'V7 README 载明无写回红线');

  const gl = read(FILES.glossary);
  check(/形态漂移探测/.test(gl) && /corpus-drift/.test(gl), 'V7 GLOSSARY「形态漂移探测」指向 corpus-drift workflow');
  check(/schedule/.test(gl), 'V7 GLOSSARY 反映 weekly schedule 正式模式');
  check(/自动开[^。\n]{0,40}issue/.test(gl), 'V7 GLOSSARY 载明 minor/major 自动开 issue');

  const src = read(FILES.sources);
  check(/driftDegradations/.test(src), 'V7 sources.json _meta 指向漂移降级登记');
  check(/schedule/.test(src) && /needs-triage/.test(src), 'V7 sources.json _meta 反映正式模式与告警 label');

  check(/drift-issues\.json/.test(ORCH) && /lib-corpus-drift-issues/.test(ORCH),
    'V7 编排器经 lib 产出 drift-issues.json');
  check(/DRIFT_ISSUE_TIERS/.test(ORCH) && /DRIFT_ISSUE_LABEL/.test(ORCH),
    'V7 编排器策略引用 lib 常量（tier / label 不二次硬编码）');
  check(/excerptLog\s*\(/.test(ORCH), 'V7 编排器用 excerptLog 保留 diff 头部（不裸取 tail）');
  check(/is_bot/.test(md), 'V7 README 载明去重只认 bot 作者的票（防 marker 劫持）');
  check(existsSync(abs(FILES.issuesLib)), 'V7 载荷库在盘');
  check(existsSync(abs(FILES.issueTool)), 'V7 投递脚本在盘');
}

console.log('-----------------------------');
console.log('verify-ticket-45: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
