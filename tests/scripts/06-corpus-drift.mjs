#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-corpus-drift.mjs — 形态漂移探测的编排器（票 T6 / issue #15；spec #9 Q4/Q7）
//
// 定位：**advisory 正式模式**。把既有采集 / 骨架 / 结构 diff 脚本族串成一次
//   可审计的运行，产出「可达性矩阵 + 漂移报告」artifact。零新引擎代码：
//   归一化与分级判定的唯一定义处仍是 06-skeleton / 06-structural-diff。
//   tier=minor/major 漂移另写 drift-issues.json（载荷契约见
//   lib-corpus-drift-issues.mjs），由 06-drift-issue.mjs 投递为 needs-triage
//   issue 交人工归因；none/patch 不写、不开票。
//
// 红线（spec #9 Q7；本票验收项 3）：
//   ① 永不写回仓库：骨架一律 --out 到仓库外 archive；报告只许落
//      live-out/ 等非语料目录（tests/corpus/** 一律拒绝）。
//   ② 不伪造绿：非 ok 的源（challenged / unreachable）必须在
//      drift-degradations.json 登记 reason + ticket；未登记 = 如实红
//      （exit 1）。已恢复的源却仍有登记 = stale（同样红）——登记是双向
//      契约，不是一次性豁免。
//   ③ 被拦源如实登记为 challenged / unreachable，不「跳过」成绿。
//   ④ 告警 ≠ 写回：issue 由独立投递脚本开立；本脚本只产载荷。
//
// 用法：
//   node tests/scripts/06-corpus-drift.mjs [--archive <dir>] [--out <dir>]
//        [--id <id> ...] [--no-capture] [--degradations <file>]
//        [--strict] [--headless] [--country <iso2>]
//   --no-capture     复用 archive 里已有的 CAPTURE-MANIFEST（离线 / 门测试）
//   --id             可重复；多个 id 时抓取全量再本地过滤（capture CLI 只收单个 --id）
//   --country        传给采集工具的固定初始国家（默认 us）；--no-capture 时只作
//                    「本次运行按什么条件跑」的声明，逐源实况看骨架 meta
//                    （issue #34：不固定国别 = 换个出口 IP 就报一次假漂移）
//   --degradations   降级登记文件（默认 tests/corpus/forms/drift-degradations.json）
//   --strict         漂移 minor/major 也判红（仅手动诊断；schedule 不带——
//                    正式模式的「红灯」是开 issue，不阻断运行）
//   退出码：0 = 报告产出且契约成立（可含如实降级行）；1 = 契约违规
//          （未登记 / stale / 派生失败）；2 = 无法运行（护栏 / 抓取基础设施 /
//          登记文件非法）。
// ══════════════════════════════════════════════════════════════════
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertArchiveOutsideRepo } from './12-login-capture.mjs';
import { DEFAULT_COUNTRY, normalizeCountry } from './06-capture-country.mjs';
import {
  buildDriftIssues,
  DRIFT_ISSUE_LABEL,
  DRIFT_ISSUE_TIERS,
  DRIFT_REPORT_ARTIFACT,
  excerptLog,
} from './lib-corpus-drift-issues.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FORMS = path.join(REPO, 'tests', 'corpus', 'forms');

const TOOLS = {
  capture: path.join(HERE, '06-capture-forms.mjs'),
  skeleton: path.join(HERE, '06-skeleton.mjs'),
  diff: path.join(HERE, '06-structural-diff.mjs'),
};

const DEFAULT_ARCHIVE =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';
const DEFAULT_OUT = path.join(REPO, 'live-out', 'corpus-drift');
const DEFAULT_DEGRADATIONS = path.join(FORMS, 'drift-degradations.json');

const TICKET = '15';
const TIERS = ['NONE', 'PATCH', 'MINOR', 'MAJOR', 'SKIP', 'ERROR', 'NOT_EVALUATED'];

// 反爬挑战识别（与 tests/live/live-smoke.mjs 的 CHALLENGE_RE / CHALLENGE_FRAME_RE
// 同轴；只用于可达性诊断，不作控制流）：命中即 challenged，不伪造 ok。
// 按页面部位分域匹配（review #27）：标题只认拦截页文案；正文只认 block-page
// 标记；帧 URL 只认真实挑战帧。表单自带的 Turnstile / captcha 组件会加载
// challenges.cloudflare.com，但不算被拦——不把「页面里提到某产品」当拦截。
const TITLE_MARKERS = [
  { name: 'cloudflare-title', re: /just a moment|attention required|checking your browser|verify you are human/i },
  { name: 'ddos-guard-title', re: /ddos-guard/i },
  { name: 'waf-title', re: /access denied|unusual traffic|are you a robot|security check/i },
];
const BODY_MARKERS = [
  { name: 'cloudflare-block', re: /challenge-platform|cf-chl/i },
  { name: 'imperva-block', re: /_incapsula_resource|incapsula incident|pardon our interruption/i },
  { name: 'perimeterx-block', re: /px-captcha/i },
  { name: 'aliyun-waf-block', re: /acw_sc__v2/i },
];
// 帧 URL 只认挑战帧路径；challenges.cloudflare.com 是 Turnstile 组件的通用宿主
// （表单自带的验证码也用它），故排除，只认 cdn-cgi/challenge-platform。
const FRAME_MARKERS = [
  { name: 'cloudflare-challenge-frame', re: /cdn-cgi\/challenge-platform/i },
  { name: 'datadome-frame', re: /captcha-delivery\.com/i },
  { name: 'imperva-frame', re: /_incapsula_resource/i },
];

const rel = (p) => path.relative(REPO, p).replace(/\\/g, '/');
const posix = (p) => String(p).replace(/\\/g, '/');

function parseArgs(argv) {
  const o = {
    archive: DEFAULT_ARCHIVE,
    out: DEFAULT_OUT,
    ids: [],
    noCapture: false,
    degradations: DEFAULT_DEGRADATIONS,
    strict: false,
    headless: false,
    country: DEFAULT_COUNTRY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--archive') o.archive = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--id') o.ids.push(argv[++i]);
    else if (a === '--no-capture') o.noCapture = true;
    else if (a === '--degradations') o.degradations = argv[++i];
    else if (a === '--strict') o.strict = true;
    else if (a === '--headless') o.headless = true;
    else if (a === '--country') o.country = argv[++i];
    else throw new Error('unknown arg: ' + a);
  }
  return o;
}

// 报告目录护栏（验收项 3：workflow 无任何写回 skeleton / manifest / 镜像页的 step）。
// 语料目录、CI 门定义与构建产物一律拒写——报告只能进 live-out/ 一类非语料目录。
function assertReportOutsideCorpus(outDir) {
  const o = path.resolve(outDir);
  const forbidden = ['tests', 'dist', '.github', '.git'].map((d) => path.join(REPO, d));
  for (const f of forbidden) {
    if (o === f || o.startsWith(f + path.sep)) {
      throw new Error('拒绝写入：报告目录不得位于 ' + rel(f) + '/ 内 → ' + o);
    }
  }
}

function run(args, env) {
  const r = spawnSync(process.execPath, args, {
    cwd: REPO,
    env: { ...process.env, ...(env || {}) },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    error: r.error ? String(r.error.message || r.error) : null,
  };
}

const logOf = (r) => ((r.stdout || '') + (r.stderr || '')).trim();
const tail = (s, n) => s.split('\n').slice(-n).join('\n');

function archiveFile(archiveRoot, file) {
  return path.join(archiveRoot, 'corpus-forms', String(file));
}

function titleOf(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || '');
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 120) : '';
}

function readPage(archiveRoot, entry) {
  for (const f of [entry.dom && entry.dom.file, entry.raw && entry.raw.file]) {
    if (!f) continue;
    try { return readFileSync(archiveFile(archiveRoot, f), 'utf8'); } catch {}
  }
  return '';
}

function detectChallenge({ title, html, frames }) {
  const hits = [];
  const frameUrls = (frames || []).map((f) => f.url || '').join('\n');
  for (const m of TITLE_MARKERS) if (m.re.test(title || '')) hits.push(m.name);
  for (const m of BODY_MARKERS) if (m.re.test(html || '')) hits.push(m.name);
  for (const m of FRAME_MARKERS) if (m.re.test(frameUrls)) hits.push(m.name);
  return hits;
}

// 可达性分类：ok / challenged / unreachable / reconstructed（重构条目显式排除，
// 不是「不可达」——它根本不参与重捕与结构比对）。
function classifySource(source, entry, archiveRoot) {
  if (source.adoption === 'reconstructed') {
    return {
      status: 'reconstructed',
      evidence: { detail: '手工重构镜像：页面不可重现，不重捕、不参与结构比对（GLOSSARY）' },
    };
  }
  if (!entry) {
    return {
      status: 'unreachable',
      evidence: { detail: 'CAPTURE-MANIFEST 无该源条目（抓取未执行或提前失败）' },
    };
  }
  const rawStatus = entry.http_status == null ? null : entry.http_status;
  const browserStatus = entry.browser_status == null ? null : entry.browser_status;
  if (!entry.ok) {
    return {
      status: 'unreachable',
      evidence: { http_status: rawStatus, browser_status: browserStatus, error: entry.error || null },
    };
  }
  const html = readPage(archiveRoot, entry);
  const title = titleOf(html);
  const markers = detectChallenge({ title, html, frames: entry.frames });
  if (markers.length) {
    return {
      status: 'challenged',
      evidence: { http_status: rawStatus, browser_status: browserStatus, title, markers },
    };
  }
  // 可达性以浏览器导航为准（review #27）：裸 fetch 的 403/503 只作证据。
  // 反爬站点常对裸 fetch 回 403/503、对有头浏览器正常渲染；已渲染 DOM 在场时
  // 即使 raw fetch 被拦也不算不可达。无浏览器状态时以「有 DOM」为准。
  const rendered = !!(entry.dom && entry.dom.bytes);
  const status = browserStatus != null ? browserStatus : (rendered ? null : rawStatus);
  if (status != null && status >= 400) {
    return {
      status: 'unreachable',
      evidence: { http_status: rawStatus, browser_status: browserStatus, title, detail: 'browser HTTP ' + status },
    };
  }
  return {
    status: 'ok',
    evidence: {
      http_status: rawStatus,
      browser_status: browserStatus,
      title,
      dom_bytes: entry.dom ? entry.dom.bytes : null,
      raw_bytes: entry.raw ? entry.raw.bytes : null,
    },
  };
}

// 降级登记（reason + ticket 硬校验）：文件本身非法 → 在抓取（任何网络/写盘动作）
// 之前就失败；未知 id / 重复 id 同样拒绝。空登记是合法的（尚未发现被拦源）。
function loadDegradations(file, sourceIds) {
  if (!existsSync(file)) return new Map();
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error('drift-degradations 解析失败：' + rel(file) + ' :: ' + e.message);
  }
  if (!Array.isArray(doc.sources)) throw new Error('drift-degradations.sources 必须是数组');
  const map = new Map();
  for (const d of doc.sources) {
    const missing = ['id', 'status', 'reason', 'ticket'].filter(
      (k) => d[k] === undefined || d[k] === null || String(d[k]).trim() === ''
    );
    if (missing.length) {
      throw new Error(
        'drift-degradations 条目 ' + JSON.stringify(d.id || '?') + ' 缺少 ' + missing.join('+') +
        ' —— 被拦源必须如实登记 reason + ticket（沿用跳过白名单纪律）'
      );
    }
    if (!['challenged', 'unreachable'].includes(d.status)) {
      throw new Error('drift-degradations 条目 ' + d.id + ' 的 status 非法：' + d.status);
    }
    if (map.has(d.id)) throw new Error('drift-degradations 重复登记：' + d.id);
    if (!sourceIds.has(d.id)) {
      throw new Error(
        'drift-degradations 含未知源：' + d.id +
        ' —— 登记不是删除：先核对 sources.json（被拦源仍在重捕/比对集中）'
      );
    }
    map.set(d.id, d);
  }
  return map;
}

function decide(source, reach, degradation) {
  if (reach.status === 'reconstructed') return { decision: 'excluded-reconstructed' };
  if (reach.status === 'ok') {
    if (degradation) {
      return {
        decision: 'stale-degradation',
        violation:
          source.id + ': 源已恢复（reachability=ok），但 drift-degradations.json 仍登记降级 —— ' +
          '恢复是显式动作：删除登记后重跑（stale 登记会在下次真被拦时伪造放行）',
      };
    }
    return { decision: 'collect' };
  }
  if (!degradation) {
    return {
      decision: 'unregistered-degradation',
      violation:
        source.id + ': reachability=' + reach.status +
        ' 未在 drift-degradations.json 登记 reason+ticket（不伪造绿）',
    };
  }
  if (degradation.status !== reach.status) {
    return {
      decision: 'degraded',
      warning:
        source.id + ': 登记 status=' + degradation.status + ' 与实测 ' + reach.status +
        ' 不一致（保留登记，报告如实记录实测状态）',
    };
  }
  return { decision: 'degraded' };
}

function parseDiff(result) {
  const out = logOf(result);
  if (/SKIP source=reconstructed/.test(out)) {
    return { tier: 'SKIP', changes: null, exitCode: result.status, log: out };
  }
  const m = /tier:\s*(NONE|PATCH|MINOR|MAJOR)/i.exec(out);
  const c = /changes:\s*(\d+)/.exec(out);
  if (m) {
    return {
      tier: m[1].toUpperCase(),
      changes: c ? Number(c[1]) : null,
      exitCode: result.status,
      log: out,
    };
  }
  return { tier: 'ERROR', changes: null, exitCode: result.status, log: out };
}

function runMetadata() {
  const repo = process.env.GITHUB_REPOSITORY || null;
  const runId = process.env.GITHUB_RUN_ID || null;
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  return {
    commit: process.env.GITHUB_SHA || null,
    ref: process.env.GITHUB_REF || null,
    run_url: repo && runId ? server + '/' + repo + '/actions/runs/' + runId : null,
  };
}

function browserMode(args) {
  if (args.headless || process.env.CCH_CAPTURE_HEADLESS === '1') return 'headless';
  if (process.platform === 'linux' && !process.env.DISPLAY) return 'headless (no DISPLAY fallback)';
  return 'headed';
}

function mdCell(v) {
  return String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function evidenceText(row) {
  const e = row.evidence || {};
  const bits = [];
  if (e.browser_status != null) bits.push('browser=' + e.browser_status);
  if (e.http_status != null) bits.push('raw=' + e.http_status);
  if (e.markers && e.markers.length) bits.push('markers=' + e.markers.join(','));
  if (e.title) bits.push('title=' + JSON.stringify(e.title));
  if (e.error) bits.push('error=' + e.error);
  if (e.detail && !e.title) bits.push(e.detail);
  if (row.skeleton && row.skeleton.status === 'ok') {
    bits.push('nodes=' + row.skeleton.node_count);
    // 采集实况（骨架 meta）与 summary 的请求值同栏并列，归因时一眼可比
    if (row.skeleton.capture_country !== undefined) bits.push('country=' + row.skeleton.capture_country);
  }
  if (row.drift && row.drift.changes != null) bits.push('changes=' + row.drift.changes);
  return bits.join('; ') || '—';
}

function renderMarkdown(summary) {
  const L = [];
  L.push('# corpus-drift 漂移与可达性报告（票 T6 / issue #' + TICKET + '）');
  L.push('');
  L.push('- 生成时间: ' + summary.generated_at);
  L.push('- commit: ' + (summary.run.commit || '（本地运行）'));
  if (summary.run.run_url) L.push('- run: ' + summary.run.run_url);
  L.push('- 浏览器: ' + summary.browser + '（CI 经 xvfb-run 提供有头虚拟显示）');
  L.push('- 采集国别（本次运行请求）: `' + summary.capture_country_requested + '`' +
    '（路由拦截 ipapi.co lookup；逐源实况见矩阵证据列 `country=`，取自骨架 meta——' +
    '桩未被请求的源如实记 null，即固定对它没有作用）');
  L.push('- archive: ' + summary.archive_root + '（仓库外；原始快照不入库）');
  L.push('- 契约: ' + (summary.contract.ok ? 'OK' : 'VIOLATION ×' + summary.contract.violations.length));
  L.push('');
  L.push('## 1 可达性矩阵');
  L.push('');
  L.push('| 源 | 族 | adoption | 可达性 | 结构漂移 | 处置 | 证据 |');
  L.push('|---|---|---|---|---|---|---|');
  for (const r of summary.matrix) {
    L.push(
      '| ' + mdCell(r.id) + ' | ' + mdCell(r.family) + ' | ' + mdCell(r.adoption) + ' | ' +
      mdCell(r.reachability) + ' | ' + mdCell(r.drift.tier) + ' | ' + mdCell(r.decision) + ' | ' +
      mdCell(evidenceText(r)) + ' |'
    );
  }
  L.push('');
  L.push('## 2 正式采集集裁定');
  L.push('');
  if (summary.official_set.length) {
    L.push('**收编（可达 = ok）**: ' + summary.official_set.join(', '));
  } else {
    L.push('**收编**: （空——本次没有可达源）');
  }
  const degraded = summary.matrix.filter((r) => r.decision === 'degraded');
  if (degraded.length) {
    L.push('');
    L.push('**降级登记（如实红，reason + ticket）**:');
    for (const r of degraded) {
      const d = r.degradation || {};
      L.push('- ' + r.id + ' [' + r.reachability + '] ticket=' + d.ticket + ' — ' + d.reason);
    }
  }
  const excluded = summary.matrix.filter((r) => r.decision === 'excluded-reconstructed');
  if (excluded.length) {
    L.push('');
    L.push('**重构排除（不参与结构比对）**: ' + excluded.map((r) => r.id).join(', '));
  }
  L.push('');
  L.push('## 3 结构漂移明细');
  L.push('');
  for (const r of summary.matrix) {
    L.push('### ' + r.id + ' — ' + r.drift.tier);
    L.push('');
    if (r.drift.tier === 'SKIP') L.push('`SKIP source=reconstructed` —— 无可信基线，显式跳过（不静默、不产判定）');
    else if (r.drift.tier === 'NOT_EVALUATED') L.push('未比对：可达性 = ' + r.reachability + '（无新骨架，或重构条目）');
    else if (r.drift.tier === 'ERROR') L.push('比对失败（见 evidence/' + r.id + '.diff.log）');
    else L.push('tier=' + r.drift.tier + ' changes=' + (r.drift.changes == null ? '?' : r.drift.changes) +
      ' —— 分级含义见 tests/corpus/forms/README.md §4');
    L.push('');
    if (r.drift.log_excerpt) {
      L.push('```');
      L.push(r.drift.log_excerpt);
      L.push('```');
      L.push('');
    }
  }
  L.push('## 4 契约');
  L.push('');
  if (summary.contract.violations.length) {
    L.push('**VIOLATIONS（如实红）**:');
    for (const v of summary.contract.violations) L.push('- ' + v);
  } else {
    L.push('- 无违规：所有非 ok 源均已登记 reason+ticket，所有登记均与实测一致。');
  }
  if (summary.contract.warnings.length) {
    L.push('');
    L.push('**WARNINGS**:');
    for (const w of summary.contract.warnings) L.push('- ' + w);
  }
  L.push('');
  L.push('## 5 自动告警（minor/major）');
  L.push('');
  if (summary.drift_alerts && summary.drift_alerts.length) {
    L.push('以下漂移由 06-drift-issue.mjs 投递为 needs-triage issue（人工归因，禁止自动 bump）：');
    for (const a of summary.drift_alerts) L.push('- ' + a.id + ' (' + a.tier + ')');
  } else {
    L.push('- 无 minor/major 漂移：本次不开 issue（none/patch 不开）。');
  }
  L.push('');
  L.push('## 6 下一步');
  L.push('');
  const steps = [];
  const unregistered = summary.matrix.filter((r) => r.decision === 'unregistered-degradation');
  const stale = summary.matrix.filter((r) => r.decision === 'stale-degradation');
  const drifting = summary.matrix.filter((r) => DRIFT_ISSUE_TIERS.includes(r.drift.tier));
  if (unregistered.length) {
    steps.push('未登记被拦源: ' + unregistered.map((r) => r.id).join(', ') +
      ' —— 在 drift-degradations.json 如实登记 reason + ticket 后重跑（登记不是删除）。');
  }
  if (stale.length) {
    steps.push('stale 登记: ' + stale.map((r) => r.id).join(', ') + ' —— 源已恢复，删除登记（恢复是显式动作）。');
  }
  if (drifting.length) {
    steps.push('结构漂移: ' + drifting.map((r) => r.id + '(' + r.drift.tier + ')').join(', ') +
      ' —— **先归因**（站点改版 / 抓取环境差异 / 归一化缺陷），禁止为修绿盲目更新快照。');
  }
  steps.push('minor/major 漂移由 06-drift-issue.mjs 自动开 needs-triage issue（none/patch 不开）；归因与 bump 永远人工。');
  for (const s of steps) L.push('- ' + s);
  L.push('');
  return L.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const archiveRoot = path.resolve(args.archive);
  const outDir = path.resolve(args.out);

  // ── 全部护栏先于第一次写盘 / 网络动作（review：检查必须在首个 mutation 之前） ──
  args.country = normalizeCountry(args.country);
  assertArchiveOutsideRepo(path.join(archiveRoot, 'corpus-forms'), REPO);
  assertReportOutsideCorpus(outDir);

  const sources = JSON.parse(readFileSync(path.join(FORMS, 'sources.json'), 'utf8')).sources;
  const sourceIds = new Set(sources.map((s) => s.id));
  const unknownIds = args.ids.filter((id) => !sourceIds.has(id));
  if (unknownIds.length) throw new Error('未知 source id：' + unknownIds.join(', ') + '（见 tests/corpus/forms/sources.json）');
  const scope = args.ids.length ? sources.filter((s) => args.ids.includes(s.id)) : sources;
  if (scope.length === 0) throw new Error('没有匹配的 source（--id ' + args.ids.join(',') + '）');
  const degradations = loadDegradations(path.resolve(args.degradations), sourceIds);

  const captureLog = [];
  let captureStatus = null;
  if (!args.noCapture) {
    const capArgs = [TOOLS.capture, '--archive', archiveRoot];
    // 国别显式传给采集（issue #34）：GitHub runner 的出口 IP 每次可能不同，
    // 不传就等于让「按哪个国家采」继续由运气决定——假漂移的成因本身。
    capArgs.push('--country', args.country);
    // capture CLI 的 --id 只收单个（后者覆盖前者）；多 id 时抓全量再在本地过滤。
    if (scope.length === 1) capArgs.push('--id', scope[0].id);
    const r = run(capArgs, args.headless ? { CCH_CAPTURE_HEADLESS: '1' } : null);
    captureStatus = r.status;
    captureLog.push(logOf(r));
    console.log('— capture: exit ' + r.status + (r.status === 0 ? '' : '（逐条结果见 CAPTURE-MANIFEST）'));
    if (r.status === 2) {
      throw new Error('抓取基础设施失败（capture exit 2）:\n' + tail(logOf(r), 20));
    }
  }

  const repoRootPrefix = REPO.replace(/\\/g, '/');
  const capPath = path.join(archiveRoot, 'corpus-forms', 'CAPTURE-MANIFEST.json');
  const capturable = scope.filter((s) => s.adoption !== 'reconstructed');
  let capEntries = [];
  if (existsSync(capPath)) {
    const cap = JSON.parse(readFileSync(capPath, 'utf8'));
    capEntries = Array.isArray(cap.entries) ? cap.entries : [];
    // 防止 archive 指到仓库内（例如误把 --archive 指成 repo）：台账里的路径必须是
    // 归档相对路径，不得是仓库绝对路径。
    const bad = capEntries.filter((e) =>
      [e.raw && e.raw.file, e.dom && e.dom.file].filter(Boolean).some((f) => posix(f).includes(repoRootPrefix))
    );
    if (bad.length) throw new Error('CAPTURE-MANIFEST 含仓库内路径（archive 不得指向仓库内）: ' + bad.map((e) => e.id).join(','));
  } else if (capturable.length && !args.noCapture) {
    throw new Error('抓取未产出 CAPTURE-MANIFEST：' + capPath);
  } else if (capturable.length && args.noCapture) {
    throw new Error('--no-capture 模式下缺少 CAPTURE-MANIFEST：' + capPath + '（先跑 06-capture-forms.mjs）');
  }
  const capById = new Map(capEntries.map((e) => [e.id, e]));

  mkdirSync(path.join(outDir, 'evidence'), { recursive: true });

  const violations = [];
  const warnings = [];
  const matrix = [];
  const driftCounts = Object.fromEntries(TIERS.map((t) => [t, 0]));

  for (const source of scope) {
    const reach = classifySource(source, capById.get(source.id), archiveRoot);

    // ② 结构骨架（只对可达源派生；challenged 的 DOM 是拦截页，派生只会污染基线）
    let skeleton = { status: 'skipped', reason: 'reachability=' + reach.status };
    if (reach.status === 'reconstructed') {
      skeleton = { status: 'skipped', reason: 'source=reconstructed' };
    } else if (reach.status === 'ok') {
      const outPath = path.join(archiveRoot, 'corpus-forms', 'skeletons', source.id + '.json');
      const r = run([
        TOOLS.skeleton, '--id', source.id, '--from', 'archive',
        '--archive', archiveRoot, '--out', outPath,
      ]);
      if (r.status === 0) {
        const skel = JSON.parse(readFileSync(outPath, 'utf8'));
        skeleton = {
          status: 'ok',
          file: posix(path.relative(archiveRoot, outPath)),
          node_count: skel.node_count,
          tree_sha256: skel.sha256,
          // 实况而非声明：这一行的国别来自骨架自带 meta（= 采集时的固定值）。
          // 与 summary.capture_country_requested（本次运行请求的值）对照即可看出
          // 「条件变了」还是「站点改了」（issue #34）。
          capture_country: skel.capture_country ?? null,
        };
      } else {
        skeleton = { status: 'failed', log: tail(logOf(r), 12) };
        violations.push(source.id + ': 骨架派生失败（可达源）—— ' + tail(logOf(r), 3));
      }
    }

    // ③ 确定性结构 diff（重构条目也跑，留下显式 SKIP 记录）
    let drift;
    if (reach.status === 'reconstructed' || (reach.status === 'ok' && skeleton.status === 'ok')) {
      drift = parseDiff(run([TOOLS.diff, '--id', source.id, '--archive', archiveRoot]));
      if (drift.tier === 'ERROR') {
        violations.push(source.id + ': 结构 diff 失败 exit=' + drift.exitCode + ' —— ' + tail(drift.log, 3));
      }
    } else {
      drift = { tier: 'NOT_EVALUATED', changes: null, exitCode: null, log: '' };
    }
    driftCounts[drift.tier] = (driftCounts[drift.tier] || 0) + 1;

    const degradation = degradations.get(source.id) || null;
    const d = decide(source, reach, degradation);
    if (d.violation) violations.push(d.violation);
    if (d.warning) warnings.push(d.warning);

    const row = {
      id: source.id,
      family: source.family,
      url: source.url,
      adoption: source.adoption,
      reachability: reach.status,
      evidence: reach.evidence,
      skeleton,
      drift: {
        tier: drift.tier,
        changes: drift.changes,
        exit_code: drift.exitCode,
        // 头部（tier / base / new）与尾部（逐项变化）都保留；只取 tail 会把
        // tier 行截掉，长 diff 的 issue 正文就看不出 minor 还是 major。
        log_excerpt: drift.log ? excerptLog(drift.log) : '',
      },
      decision: d.decision,
      degradation: degradation
        ? { status: degradation.status, reason: degradation.reason, ticket: degradation.ticket }
        : null,
    };
    matrix.push(row);

    // 证据落 artifact（截图 + 逐源 diff log）；不写回语料目录
    const evPath = path.join(outDir, 'evidence', source.id + '.json');
    writeFileSync(evPath, JSON.stringify(row, null, 2) + '\n');
    if (drift.log) {
      writeFileSync(path.join(outDir, 'evidence', source.id + '.diff.log'), drift.log + '\n');
    }
    const cap = capById.get(source.id);
    if (cap && cap.shot && cap.shot.file) {
      const shot = archiveFile(archiveRoot, cap.shot.file);
      if (existsSync(shot)) {
        try { copyFileSync(shot, path.join(outDir, 'evidence', source.id + '.png')); } catch {}
      }
    }

    const prefix = row.decision === 'collect' ? 'OK  ' :
      row.decision === 'degraded' ? 'WARN' :
      row.decision.startsWith('excluded') ? 'SKIP' : 'FAIL';
    console.log(
      prefix + ' ' + source.id.padEnd(24) + ' reach=' + reach.status.padEnd(14) +
      ' drift=' + drift.tier.padEnd(14) + ' decision=' + row.decision
    );
    if (row.decision === 'degraded') {
      console.log('::warning::corpus-drift ' + source.id + ' [' + reach.status + '] ' +
        degradation.reason + ' (ticket ' + degradation.ticket + ')');
    }
    if (DRIFT_ISSUE_TIERS.includes(drift.tier)) {
      console.log('::warning::corpus-drift ' + source.id + ' 结构漂移 tier=' + drift.tier +
        '（先归因再决定 bump；禁止为修绿盲目更新快照）');
    }
  }

  for (const v of violations) console.log('::error::corpus-drift ' + v);
  for (const w of warnings) console.log('::warning::corpus-drift ' + w);

  const countOf = (s) => matrix.filter((r) => r.reachability === s).length;
  const summary = {
    tool: 'tests/scripts/06-corpus-drift.mjs',
    ticket: TICKET,
    ticket_label: 'T6 corpus-drift 正式模式（weekly schedule + 漂移自动开 issue；spec #9 Q4/Q7）',
    generated_at: new Date().toISOString(),
    run: runMetadata(),
    archive_root: posix(archiveRoot),
    browser: browserMode(args),
    // 本次运行**请求**的固定国别（逐源实况看 matrix[].skeleton.capture_country）；
    // 两者不一致即说明该源压根没被固定（如 --no-render / 不做 lookup 的源）。
    capture_country_requested: args.country,
    mode: args.noCapture ? 'no-capture (existing archive)' : 'capture',
    capture: { exit_code: captureStatus, log_tail: captureLog.length ? tail(captureLog.join('\n'), 40) : '' },
    contract: { ok: violations.length === 0, violations, warnings },
    counts: {
      sources: matrix.length,
      ok: countOf('ok'),
      challenged: countOf('challenged'),
      unreachable: countOf('unreachable'),
      reconstructed: countOf('reconstructed'),
      collect: matrix.filter((r) => r.decision === 'collect').length,
      degraded: matrix.filter((r) => r.decision === 'degraded').length,
      drift: driftCounts,
    },
    official_set: matrix.filter((r) => r.decision === 'collect').map((r) => r.id),
    matrix,
  };

  // 漂移告警载荷（决策规则在 lib：只有 MINOR / MAJOR 产票；none/patch 不产）。
  // 与报告同目录落盘，投递脚本（06-drift-issue.mjs）只负责去重投递，不重新判定。
  const reportPath = rel(path.join(outDir, 'drift-report.md'));
  const driftIssues = buildDriftIssues(summary, { reportPath });
  summary.drift_alerts = driftIssues.map((i) => ({ id: i.id, tier: i.tier, title: i.title }));
  summary.counts.drift_alerts = driftIssues.length;

  const issueDoc = {
    tool: 'tests/scripts/06-corpus-drift.mjs',
    ticket: TICKET,
    ticket_label: summary.ticket_label,
    generated_at: summary.generated_at,
    run: summary.run,
    report: {
      artifact: DRIFT_REPORT_ARTIFACT,
      run_url: summary.run.run_url,
      local_report: reportPath,
      report_md: 'drift-report.md',
      summary_json: 'drift-summary.json',
    },
    policy: {
      tiers: DRIFT_ISSUE_TIERS,
      excluded: TIERS.filter((t) => !DRIFT_ISSUE_TIERS.includes(t)),
      label: DRIFT_ISSUE_LABEL,
      dedupe: '正文 marker + bot author（is_bot）：同源已有 open issue 时追加评论，不重复开票',
      delivery: 'tests/scripts/06-drift-issue.mjs',
    },
    issues: driftIssues,
  };

  writeFileSync(path.join(outDir, 'drift-issues.json'), JSON.stringify(issueDoc, null, 2) + '\n');
  writeFileSync(path.join(outDir, 'drift-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(path.join(outDir, 'drift-report.md'), renderMarkdown(summary) + '\n');

  console.log('---');
  console.log('matrix: ' + matrix.length + ' 源  ok=' + summary.counts.ok + '  challenged=' + summary.counts.challenged +
    '  unreachable=' + summary.counts.unreachable + '  reconstructed=' + summary.counts.reconstructed);
  console.log('official set: ' + (summary.official_set.join(', ') || '（空）'));
  console.log('drift issues: ' + driftIssues.length +
    (driftIssues.length ? '（' + driftIssues.map((i) => i.id + '/' + i.tier).join(', ') + '）' : '（none/patch 不开票）'));
  console.log('report → ' + reportPath + '  summary → ' + rel(path.join(outDir, 'drift-summary.json')) +
    '  issues → ' + rel(path.join(outDir, 'drift-issues.json')));
  if (violations.length) {
    console.log('CONTRACT VIOLATION ×' + violations.length + '（如实红；报告已产出）');
    process.exitCode = 1;
    return;
  }
  if (args.strict && DRIFT_ISSUE_TIERS.some((t) => driftCounts[t])) {
    console.log('STRICT：漂移 minor/major 判红（--strict）');
    process.exitCode = 1;
    return;
  }
  console.log('CONTRACT OK（漂移为 advisory：minor/major 开 issue；--strict 才判红）');
}

try {
  main();
} catch (e) {
  console.error('corpus-drift failed: ' + ((e && e.message) || e));
  process.exitCode = 2;
}
