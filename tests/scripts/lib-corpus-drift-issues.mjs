// ══════════════════════════════════════════════════════════════════
// lib-corpus-drift-issues.mjs — 漂移 issue 载荷与投递计划的唯一生成处
//                              （票 T6 / issue #15；spec #9 Q4/Q7）
//
// 为什么单独成库：编排器（06-corpus-drift.mjs）产出漂移矩阵，投递脚本
//   （06-drift-issue.mjs）调用 gh 开 issue / 追加评论。两侧都必须能离线
//   验证——**决策规则**（只有 minor/major 开 issue）与**正文契约**（报告
//   指针 + 结构 diff 输出 + 归因纪律）放在这里，门脚本直接 import 断言，
//   不靠文本正则猜行为。
//
// 红线（spec #9 Q7）：issue 是告警面，不是写回面。本库只生成载荷：
//   不读写语料、不碰 git、不更新骨架。归因与 bump 永远人工。
// ══════════════════════════════════════════════════════════════════

export const DRIFT_ISSUE_TIERS = ['MINOR', 'MAJOR'];
export const DRIFT_ISSUE_LABEL = 'needs-triage';
export const DRIFT_REPORT_ARTIFACT = 'corpus-drift';

// 去重只认 bot 开的票：仓库是公开的，他人可在 issue 正文里伪造 marker 把告警
// 劫持到自己的票下。按 author.is_bot 判定而不是登录名字面量——gh 对 App bot
// 可能返回 app/github-actions，而登录名也可能是 github-actions[bot]；is_bot
// 两种形态都成立。
export function isBotAuthor(author) {
  if (!author) return false;
  if (author.is_bot === true) return true;
  return /\[bot\]$/.test(String(author.login || ''));
}

// REST /issues 分页结果 → 去重所需的 {number, body, author}。
// 去重必须看到全部 open issue：gh issue list 的 --limit 有上限，命中票落在上限外
// 会被误判为「未见过」并重复开票，故调用方用 gh api --paginate 拉全量。
// /issues 同时返回 PR，必须过滤；author.is_bot 由 user.type === 'Bot' 映射。
export function issuesFromPages(pages) {
  if (!Array.isArray(pages) || pages.some((p) => !Array.isArray(p))) {
    throw new Error('GitHub issues API 返回非分页数组');
  }
  return pages.flat()
    .filter((issue) => issue && !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      body: issue.body,
      author: {
        login: issue.user && issue.user.login,
        is_bot: !!(issue.user && issue.user.type === 'Bot'),
      },
    }));
}

// 同一源的稳定去重标记（issue 正文内）；后续探测命中同标记时追加评论而不是
// 每周重复开票。标记只含 source id（tier 升级也归到同一票下）。
export function issueMarker(id) {
  return '<!-- corpus-drift:' + id + ' -->';
}

const cell = (v) => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function evidenceSummary(evidence, drift) {
  const e = evidence || {};
  const bits = [];
  if (e.browser_status != null) bits.push('browser=' + e.browser_status);
  if (e.http_status != null) bits.push('raw=' + e.http_status);
  if (e.markers && e.markers.length) bits.push('markers=' + e.markers.join(','));
  if (e.title) bits.push('title=' + JSON.stringify(e.title));
  if (e.error) bits.push('error=' + e.error);
  if (drift && drift.changes != null) bits.push('changes=' + drift.changes);
  return bits.join('; ') || '—';
}

function reportPointer(report) {
  const r = report || {};
  const artifact = r.artifact || DRIFT_REPORT_ARTIFACT;
  if (r.run_url) {
    return 'artifact `' + artifact + '`（run ' + r.run_url + '）→ `drift-report.md` / ' +
      '`drift-summary.json`；逐源证据 `evidence/<id>.json`、`evidence/<id>.diff.log`';
  }
  return '`' + (r.local_report || 'live-out/corpus-drift/drift-report.md') +
    '`（本地运行，无 artifact）；逐源证据 `evidence/<id>.json`、`evidence/<id>.diff.log`';
}

export function issueTitle(row) {
  return '形态漂移：' + row.id + ' ' + row.drift.tier + '（corpus-drift 自动探测）';
}

// 正文契约：marker（去重）+ 报告摘录 + 结构 diff 输出 + 归因纪律。
// 报告摘录用来在 issue 里直接看见「哪一源、什么 tier、几条变化」；结构 diff
// 输出取编排器落盘的 log_excerpt（tier 行 + 逐项 [major]/[minor]/[patch] 行）。
// 代码围栏长度自适应：diff 日志来自页面结构（class 名可含反引号），固定 ``` 会被
// 内容提前闭合——取内容中最长反引号串 +1 作围栏，保证代码块不被页面内容撑破。
export function issueBody(row, report) {
  const d = row.drift || {};
  const log = String(d.log_excerpt || '').trim();
  const fence = '`'.repeat(Math.max(3, (log.match(/`+/g) || []).reduce((n, s) => Math.max(n, s.length), 0) + 1));
  return [
    issueMarker(row.id),
    '## 形态漂移探测：`' + row.id + '` — ' + (d.tier || '?'),
    '',
    '> 本 issue 由 corpus-drift workflow 自动开立（票 T6 / issue #15）。漂移只告警；归因与 bump 永远人工。',
    '',
    '- 检测时间：' + ((report && report.generated_at) || '（未知）'),
    '- 运行：' + ((report && report.run_url) || '（本地运行，无 run URL）'),
    '- commit：' + ((report && report.commit) || '（本地）'),
    '- 报告指针：' + reportPointer(report),
    '- 源 URL：' + (row.url || '（未记录）'),
    '',
    '### 报告摘录',
    '',
    '| 项 | 值 |',
    '|---|---|',
    '| 源 | ' + cell(row.id) + ' |',
    '| 族 | ' + cell(row.family) + ' |',
    '| 可达性 | ' + cell(row.reachability) + ' |',
    '| 结构漂移 | ' + cell(d.tier) + ' |',
    '| 变化数 | ' + (d.changes == null ? '?' : d.changes) + ' |',
    '| 证据 | ' + cell(evidenceSummary(row.evidence, d)) + ' |',
    '',
    '### 结构 diff 输出',
    '',
    fence + 'text',
    log || '（无 diff 日志：见报告 artifact 内 evidence/' + row.id + '.diff.log）',
    fence,
    '',
    '### 处置纪律',
    '',
    '1. 先归因：① 站点真实改版；② 抓取环境差异（UA / 地区 / A-B 实验）；③ 归一化缺陷。',
    '2. 归因结论写进本 issue 或提交信息后，才决定 bump 与镜像页 / 骨架更新。',
    '3. 禁止把「更新基线」当作消除红灯的手段；本 workflow 永不写回骨架 / 清单 / 镜像页（spec #9 Q7）。',
    '4. 分级含义见 `tests/corpus/forms/README.md` §4。',
    '',
    '同一源的后续漂移会以评论追加到本 issue；归因完成并关闭后，再次漂移会重新开票。',
    '',
  ].join('\n');
}

// 决策唯一处：只有 MINOR / MAJOR 产载荷。NONE / PATCH（无漂移或仅值域形状微变）
// 以及 SKIP / ERROR / NOT_EVALUATED（未裁定）一律不开 issue。
export function buildDriftIssues(summary, opts) {
  const report = {
    artifact: DRIFT_REPORT_ARTIFACT,
    run_url: (summary.run && summary.run.run_url) || null,
    commit: (summary.run && summary.run.commit) || null,
    generated_at: summary.generated_at || null,
    local_report: (opts && opts.reportPath) || 'live-out/corpus-drift/drift-report.md',
  };
  return (summary.matrix || [])
    .filter((row) => row && row.drift && DRIFT_ISSUE_TIERS.includes(row.drift.tier))
    .map((row) => ({
      id: row.id,
      tier: row.drift.tier,
      marker: issueMarker(row.id),
      title: issueTitle(row),
      body: issueBody(row, report),
      labels: [DRIFT_ISSUE_LABEL],
    }));
}

// 投递计划：正文含同一 marker 的 open issue 已存在 → 评论追加（不重复开票）；
// 否则开新票。existing 为 gh issue list --json number,body,author 的结果；
// 只有 bot 作者的票参与去重（公共仓库防 marker 劫持）。
export function planDeliveries(issues, existing) {
  const open = Array.isArray(existing) ? existing : [];
  return issues.map((issue) => {
    const hit = open.find((e) =>
      e && isBotAuthor(e.author) &&
      String(e.body || '').includes(issue.marker)
    );
    if (!hit) return { action: 'create', issue };
    const number = Number(hit.number);
    if (!Number.isInteger(number) || number <= 0) {
      throw new Error('existing issue 的 number 非法：' + JSON.stringify(hit.number));
    }
    return { action: 'comment', number, issue };
  });
}

// 结构 diff 摘录：保留头部（tier 行 / base / new 路径）与尾部（逐项变化），
// 中间省略并标注行数。只取 tail 会把 tier 行截掉——长 diff 的 issue 正文将
// 看不出这次是 minor 还是 major。
export function excerptLog(log, headLines = 8, tailLines = 20) {
  const text = String(log || '');
  const lines = text.split('\n');
  if (lines.length <= headLines + tailLines) return text;
  const omitted = lines.length - headLines - tailLines;
  return lines.slice(0, headLines).join('\n') + '\n…（省略 ' + omitted + ' 行）…\n' +
    lines.slice(-tailLines).join('\n');
}

// 投递执行（io 注入：create / comment / errorText）。一票失败不中断其余票；
// 失败如实记入 outcome，调用方据此判红（告警未送达）。门脚本用假 io 锁定该路径。
export function deliverPlan(plan, io) {
  const actions = [];
  for (const p of plan) {
    const base = { id: p.issue.id, tier: p.issue.tier, action: p.action };
    try {
      if (p.action === 'create') {
        actions.push(Object.assign(base, { ok: true, url: String(io.create(p.issue) || '').trim() }));
      } else {
        actions.push(Object.assign(base, {
          number: p.number,
          ok: true,
          url: String(io.comment(p.issue, p.number) || '').trim(),
        }));
      }
    } catch (e) {
      actions.push(Object.assign(base, {
        number: p.number,
        ok: false,
        error: io.errorText ? io.errorText(e) : String((e && e.message) || e),
      }));
    }
  }
  return actions;
}

export function outcomeOf(issuesFile, detected, actions) {
  return {
    tool: 'tests/scripts/06-drift-issue.mjs',
    generated_at: new Date().toISOString(),
    issues_file: issuesFile,
    counts: {
      detected,
      create: actions.filter((a) => a.ok && a.action === 'create').length,
      comment: actions.filter((a) => a.ok && a.action === 'comment').length,
      failed: actions.filter((a) => !a.ok).length,
    },
    actions,
  };
}

// 退出码映射单独成函数：outcome 有失败即 1（告警未送达，如实红），否则 0。
export function exitCodeFor(outcome) {
  return outcome && outcome.counts && outcome.counts.failed ? 1 : 0;
}
