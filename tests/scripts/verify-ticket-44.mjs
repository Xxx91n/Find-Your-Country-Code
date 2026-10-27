#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-44.mjs — corpus-drift workflow 原型票验收门（issue #14 / 票 T5）
//
// 依据：spec #9 Q4/Q7 —— weekly advisory 漂移探测的**原型岔路**：候选源在
//   GitHub-hosted runner 上的可达性只有跑起来才能回答。原型只挂
//   workflow_dispatch；产出可达性矩阵 + 证据 artifact；永不写回骨架/清单/
//   镜像页；被拦源按 reason + ticket 硬校验如实降级。
//
// 演进（issue #15 / 票 T6）：原型连续两次绿后已按 spec Q4 升级为 schedule 正式
//   模式，并启用 minor/major 自动开 issue。因此本门不再断言「仅 workflow_dispatch /
//   不自动开 issue」这两条原型期约束，只守仍然成立的不变量——
//   advisory（无 pull_request）/ 仓库无写回 / 降级纪律 / 可达性矩阵；
//   新触发面与告警面的验收归 verify-ticket-45。
//
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）读文本 + 哈希断言；
//   H 段以 execFileSync 跑编排器 --no-capture（fixture archive，零网络），
//   并断言语料目录字节不变（净零副作用）。唯一外部副作用在 tmpdir。
//
// 覆盖（issue #14 验收项一一对应）：
//   V0 门自身接线（plan / matrix / audit）
//   V1 触发面：advisory 红线（无 pull_request / 无 push）；完整触发口径归 verify-ticket-45
//   V2 无写回：编排器复用三脚本、骨架 --out 到仓外、报告拒写语料目录；
//      workflow 不直接调 06-manifest / 采集 / 骨架 / diff，无 git 写动作
//   V3 可达性矩阵：xvfb 有头、archive 在 workspace 外、报告 artifact 上传
//   V4 降级纪律：reason + ticket 双向硬校验（未登记 / stale / 空登记 / 非法登记）
//   V5 端到端（fixture archive）：矩阵分类 ok / challenged / unreachable、
//      漂移 tier 产出、失败即如实红、登记后绿、语料目录零副作用
//   V6 文档与登记账本成文
//
// 用法：node tests/scripts/verify-ticket-44.mjs
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { before, containsToken, writeScopesIn } from './gate-assert.mjs';

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
  capture: 'tests/scripts/06-capture-forms.mjs',
  skeleton: 'tests/scripts/06-skeleton.mjs',
  diff: 'tests/scripts/06-structural-diff.mjs',
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
  const t44 = plan.tickets['44'];
  check(!!t44, 'V0 plan 注册票 44（issue #14 / T5 corpus-drift）');
  eq(JSON.stringify(t44 && t44.scripts), JSON.stringify(['verify-ticket-44.mjs']),
    'V0 票 44 门脚本唯一指向本文件');
  check(/-\s*'44'/.test(read(FILES.caller)), 'V0 verify-tickets.yml matrix 含 44（A15/A16 全等守卫面）');
  let auditCode = 0;
  try {
    execFileSync(process.execPath, [abs(FILES.runner), '--audit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { auditCode = e.status; }
  eq(auditCode, 0, 'V0 audit 全绿（A2 为不变量，加票不触发跨票维护）');

  // V0b 共享断言器自检：缺失 / 逆序都必须红（防「门恒真」回归）
  eq(before('alpha beta', 'alpha', 'beta').ok, true, 'V0 gate-assert 顺序成立 → ok');
  eq(before('alpha beta', 'missing', 'beta').ok, false, 'V0 gate-assert 缺失 token → 红（-1 不得恒真）');
  eq(before('alpha beta', 'beta', 'alpha').ok, false, 'V0 gate-assert 逆序 → 红');
  eq(containsToken('alpha', 'alpha').ok, true, 'V0 gate-assert 刺激在场 → ok');
  eq(containsToken('alpha', 'missing').ok, false, 'V0 gate-assert 刺激缺失 → 红（fixture 空操作可见）');
}

const WF = read(FILES.workflow);
const ORCH = read(FILES.orchestrator);

// ══════════════════════════════════════════════════════════════════
// V1 触发面（advisory：永不进 pull_request；原型期已按 #15 升为 schedule）
// ══════════════════════════════════════════════════════════════════
{
  const lines = WF.split('\n');
  let onStart = -1, onEnd = lines.length;
  for (let i = 0; i < lines.length; i++) { if (/^on:\s*$/.test(lines[i])) { onStart = i; break; } }
  if (onStart >= 0) {
    for (let i = onStart + 1; i < lines.length; i++) {
      if (/^[A-Za-z_]/.test(lines[i])) { onEnd = i; break; }
    }
  }
  const onBlock = onStart >= 0 ? lines.slice(onStart + 1, onEnd).join('\n') : '';
  check(onStart >= 0, 'V1 corpus-drift.yml 存在 on: 块');
  // 触发面的完整口径（schedule + workflow_dispatch + 无 push）归 verify-ticket-45；
  // 本门只守原型票留下的 advisory 红线——永不进 PR。
  check(!/pull_request/.test(onBlock), 'V1 触发面不含 pull_request（advisory：失败不阻断 PR）');

  const perm = /^permissions:\n([\s\S]*?)(?=^\S)/m.exec(WF);
  check(!!perm, 'V1 声明 permissions 块');
  check(!!perm && /contents:\s*['"]?read/.test(perm[1]), 'V1 permissions contents: read（仓库内容只读）');
  const writes = writeScopesIn(WF);
  check(!writes.includes('contents'), 'V1 无 contents: write（含引号键 / 锚点写法）', JSON.stringify(writes));
  check(!writes.includes('permissions'), 'V1 无 permissions: write-all（整体写权限）');
}

// ══════════════════════════════════════════════════════════════════
// V2 无写回（编排器复用既有脚本族；骨架出仓；workflow 不碰写入口）
// ══════════════════════════════════════════════════════════════════
{
  const TOOL_NAMES = { capture: '06-capture-forms', skeleton: '06-skeleton', diff: '06-structural-diff' };
  for (const k of Object.keys(TOOL_NAMES)) {
    check(ORCH.indexOf(TOOL_NAMES[k]) >= 0,
      'V2 编排器复用既有 ' + k + ' 脚本（零新引擎代码）');
  }
  check(/'--out', outPath/.test(ORCH), 'V2 新骨架经 --out 落仓外 archive（不覆盖已提交基线）');
  check(/assertArchiveOutsideRepo/.test(ORCH), 'V2 复用共享仓外护栏（公开页 / 附着 / 漂移同源）');
  check(/assertReportOutsideCorpus\s*\(/.test(ORCH), 'V2 报告目录护栏存在');
  {
    // 匹配调用点（带分号）而不是函数定义；token 缺失时 before 返回 ok:false，
    // 不再依赖 indexOf 的 -1 恰好小于（review #27 / retro 2026-10-26）。
    const guardOrder = before(ORCH, 'assertReportOutsideCorpus(outDir);', 'TOOLS.capture,');
    check(guardOrder.ok, 'V2 报告护栏先于抓取动作（检查在首个 mutation 之前）', guardOrder.detail);
  }
  check(/拒绝写入：报告目录不得位于/.test(ORCH), 'V2 报告写进语料目录被硬拒');
  check(!/06-manifest\.mjs/.test(ORCH), 'V2 编排器不调用 06-manifest（清单更新永远是人工显式动作）');
  check(!/06-manifest\.mjs/.test(WF), 'V2 workflow 不调用 06-manifest（无写回清单 step）');
  for (const tool of ['06-capture-forms', '06-skeleton', '06-structural-diff']) {
    check(!new RegExp(tool + '\\.mjs').test(WF), 'V2 workflow 不直接调 ' + tool + '.mjs（编排在脚本内）');
  }
  check(!/\bgit\s+(add|commit|push|tag)\b/.test(WF), 'V2 workflow 无 git 写动作');
  check(!/create-pull-request/.test(WF) && !/contents:\s*write/.test(WF),
    'V2 无 PR / 仓库写动作（issue 告警面由 verify-ticket-45 单独守）');
  check(!/continue-on-error/.test(WF), 'V2 运行时步不吞失败（如实红：契约违规 exit 1 可见）');
}

// ══════════════════════════════════════════════════════════════════
// V3 可达性矩阵运行面（xvfb 有头 / archive 在仓外 / artifact）
// ══════════════════════════════════════════════════════════════════
{
  check(/xvfb-run/.test(WF), 'V3 CI 以 xvfb-run 提供有头虚拟显示（复用冒烟层启动口径）');
  check(/playwright install/.test(WF), 'V3 安装 Playwright Chromium');
  check(/CCH_ARCHIVE_ROOT:\s*\$\{\{\s*github\.workspace\s*\}\}\/\.\.\//.test(WF),
    'V3 archive 根锚定在 workspace 兄弟目录（仓外；原始快照不入库）');
  check(/06-corpus-drift\.mjs --out live-out\/corpus-drift/.test(WF), 'V3 workflow 调用编排器并指明报告目录');
  check(/name:\s*corpus-drift/.test(WF), 'V3 artifact 名为 corpus-drift');
  check(/path:\s*live-out\/corpus-drift\//.test(WF), 'V3 artifact 收 live-out/corpus-drift/');
  check(/Upload drift report artifact[\s\S]{0,200}if:\s*always\(\)/.test(WF), 'V3 artifact 上传 if: always()（红也留证据）');
  check(/timeout-minutes:/.test(WF), 'V3 job 有超时上限');
  check(/inputs\.strict/.test(WF) && /--strict/.test(ORCH), 'V3 strict 模式为显式输入（原型默认关）');
  check(/cloudflare|challenge-platform/i.test(ORCH), 'V3 挑战识别标记成文（可达性三态诊断）');
  check(/'challenged'/.test(ORCH) && /'unreachable'/.test(ORCH) && /'reconstructed'/.test(ORCH),
    'V3 可达性三态 + 重构排除显式建模');
}

// ══════════════════════════════════════════════════════════════════
// V4 降级纪律（reason + ticket 双向硬校验）
// ══════════════════════════════════════════════════════════════════
{
  check(/缺少|missing/.test(ORCH) && /reason \+ ticket/.test(ORCH),
    'V4 登记缺 reason/ticket 即拒（硬校验）');
  check(/stale-degradation/.test(ORCH), 'V4 反向：源已恢复但仍有登记 = stale（同样红）');
  check(/unregistered-degradation/.test(ORCH), 'V4 未登记的非 ok 源 = 如实红（不伪造绿）');
  check(/登记不是删除/.test(ORCH), 'V4 登记 ≠ 删除源（被拦源仍留在抓取/比对集）');
  const reg = JSON.parse(read(FILES.registry));
  check(Array.isArray(reg.sources), 'V4 降级登记文件 sources 为数组');
  check(!!reg._meta && /reason/i.test(JSON.stringify(reg._meta)) && /ticket/i.test(JSON.stringify(reg._meta)),
    'V4 登记账本 _meta 载明 reason + ticket 纪律');
  const bad = reg.sources.filter((d) =>
    !d.id || !['challenged', 'unreachable'].includes(d.status) ||
    d.reason === undefined || d.ticket === undefined || String(d.reason).trim() === '' || String(d.ticket).trim() === '');
  eq(bad.length, 0, 'V4 仓库登记账本每一条都带非空 reason + ticket', bad.map((d) => d.id || '?').join(','));
}

// ══════════════════════════════════════════════════════════════════
// V5 端到端（fixture archive，零网络）：分类 / 漂移 / 如实红 / 登记后绿
// ══════════════════════════════════════════════════════════════════
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch44-drift-'));
  try {
    const arch = join(tmp, 'archive');
    const corpus = join(arch, 'corpus-forms');
    for (const d of ['dom', 'raw', 'shot']) mkdirSync(join(corpus, d), { recursive: true });

    // 已知好样本：仓库既有镜像页充当 archive DOM（离线、确定性）
    const itiHtml = readFileSync(abs(FORMS + '/mirrors/iti-v29.html'), 'utf8');
    writeFileSync(join(corpus, 'dom', 'iti-v29.html'), itiHtml);
    writeFileSync(join(corpus, 'raw', 'iti-v29.html'), itiHtml);

    // 拦截页样本（HTTP 200 但内容是反爬挑战）：必须判 challenged，不得判 ok
    const challengeHtml = '<!doctype html><html><head><title>Just a moment...</title>' +
      '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></head>' +
      '<body>Checking your browser before accessing the site.</body></html>';
    writeFileSync(join(corpus, 'dom', 'rpn-input.html'), challengeHtml);
    writeFileSync(join(corpus, 'raw', 'rpn-input.html'), challengeHtml);

    // 表单自带 Turnstile 组件的普通页（既有镜像 + 注入组件脚本）：不得误判
    // challenged（review #27：标记按页面部位分域，通用 Turnstile 宿主不算拦截）
    const chosenHtml = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>\n' +
      readFileSync(abs(FORMS + '/mirrors/chosen-select.html'), 'utf8');
    writeFileSync(join(corpus, 'dom', 'chosen-select.html'), chosenHtml);
    writeFileSync(join(corpus, 'raw', 'chosen-select.html'), chosenHtml);
    // 刺激断言取精确前缀（review #29）：只查域名会让畸形 Turnstile URL 蒙混过关，
    // 无法证明注入契约本身成立。
    const chosenStimulus = chosenHtml.startsWith(
      '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>\n'
    );
    check(chosenStimulus, 'V5 反例刺激在场（Turnstile 组件脚本确实注入）');

    const entry = (id, file, html, extra) => Object.assign({
      id,
      source_url: 'https://example.invalid/' + id,
      family: 'fixture',
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
        // 反爬站点对裸 fetch 回 403、浏览器正常渲染（review #27）：可达性以浏览器为准
        entry('iti-v29', 'iti-v29.html', itiHtml, { http_status: 403, browser_status: 200 }),
        entry('rpn-input', 'rpn-input.html', challengeHtml, { browser_status: 200 }),
        entry('chosen-select', 'chosen-select.html', chosenHtml, { browser_status: 200 }),
        { id: 'mui-autocomplete', source_url: 'https://example.invalid/mui', family: 'fixture', ok: false, error: 'net::ERR_NAME_NOT_RESOLVED' },
      ],
    }, null, 2) + '\n');

    const skelDir = abs(FORMS + '/skeletons');
    const snapshot = () => JSON.stringify(readdirSync(skelDir).sort().map((f) => [f, sha256File(join(skelDir, f))])) +
      '|' + sha256File(abs(FILES.manifest)) + '|' + sha256File(abs(FILES.registry));
    const before = snapshot();

    const writeReg = (name, sources) => {
      const p = join(tmp, name);
      writeFileSync(p, JSON.stringify({ sources }, null, 2) + '\n');
      return p;
    };
    const IDS = ['--id', 'iti-v29', '--id', 'rpn-input', '--id', 'mui-autocomplete', '--id', 'chosen-select'];
    const runDrift = (out, reg) => {
      const args = [abs(FILES.orchestrator), '--archive', arch, '--out', out,
        '--no-capture', '--degradations', reg, ...IDS];
      try {
        const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        return { code: 0, out: stdout, err: '' };
      } catch (e) {
        return { code: e.status, out: e.stdout || '', err: e.stderr || '' };
      }
    };
    const summaryOf = (out) => JSON.parse(readFileSync(join(out, 'drift-summary.json'), 'utf8'));
    const rowOf = (s, id) => s.matrix.find((r) => r.id === id);

    // (a) 空登记 + 两个非 ok 源 → 如实红（exit 1），报告仍产出
    const emptyReg = writeReg('empty.json', []);
    const outA = join(tmp, 'out-a');
    const a = runDrift(outA, emptyReg);
    eq(a.code, 1, 'V5 未登记被拦源 → exit 1（如实红）');
    const sA = summaryOf(outA);
    eq(sA.matrix.length, 4, 'V5 矩阵覆盖 4 个在册源（--id 过滤）');
    eq(rowOf(sA, 'iti-v29').reachability, 'ok', 'V5 正常页判 ok');
    eq(rowOf(sA, 'iti-v29').evidence.http_status, 403, 'V5 裸 fetch 403 原样留作证据');
    eq(rowOf(sA, 'iti-v29').evidence.browser_status, 200, 'V5 可达性以浏览器导航状态为准（raw 403 不判 unreachable）');
    eq(rowOf(sA, 'rpn-input').reachability, 'challenged', 'V5 HTTP 200 的拦截页判 challenged（不伪造 ok）');
    eq(rowOf(sA, 'chosen-select').reachability, 'ok', 'V5 表单自带 Turnstile 组件的普通页不误判 challenged');
    eq((rowOf(sA, 'chosen-select').evidence.markers || []).length, 0, 'V5 通用 Turnstile 宿主不计入拦截标记');
    eq(rowOf(sA, 'mui-autocomplete').reachability, 'unreachable', 'V5 抓取失败判 unreachable');
    check(rowOf(sA, 'rpn-input').evidence.markers.length > 0, 'V5 challenged 行带挑战标记证据',
      JSON.stringify(rowOf(sA, 'rpn-input').evidence.markers));
    check(['NONE', 'PATCH', 'MINOR', 'MAJOR'].includes(rowOf(sA, 'iti-v29').drift.tier),
      'V5 可达源产出确定性结构 diff tier', rowOf(sA, 'iti-v29').drift.tier);
    eq(rowOf(sA, 'rpn-input').drift.tier, 'NOT_EVALUATED', 'V5 challenged 源不派生骨架（拦截页会污染基线）');
    eq(rowOf(sA, 'iti-v29').decision, 'collect', 'V5 可达源进入正式采集集');
    eq(rowOf(sA, 'rpn-input').decision, 'unregistered-degradation', 'V5 未登记被拦源如实标红');
    eq(sA.contract.ok, false, 'V5 契约不成立（violations 2）');
    eq(sA.contract.violations.length, 2, 'V5 两个非 ok 源各一条违规');
    check(existsSync(join(outA, 'drift-report.md')) && existsSync(join(outA, 'drift-summary.json')),
      'V5 报告 artifact 产出（红也留证据）');
    check(existsSync(join(outA, 'evidence', 'iti-v29.json')) && existsSync(join(outA, 'evidence', 'iti-v29.diff.log')),
      'V5 逐源证据落 artifact（JSON + diff log）');
    check(/正式采集集/.test(readFileSync(join(outA, 'drift-report.md'), 'utf8')) &&
      /rpn-input/.test(readFileSync(join(outA, 'drift-report.md'), 'utf8')),
      'V5 报告成文：可达性矩阵 + 正式采集集裁定');

    // (b) 如实登记两个被拦源 → 契约成立（exit 0）
    const goodReg = writeReg('good.json', [
      { id: 'rpn-input', status: 'challenged', reason: 'fixture: Cloudflare interstitial (title=Just a moment...)', ticket: '14', observed_at: '2026-10-26' },
      { id: 'mui-autocomplete', status: 'unreachable', reason: 'fixture: DNS failure net::ERR_NAME_NOT_RESOLVED', ticket: '14', observed_at: '2026-10-26' },
    ]);
    const outB = join(tmp, 'out-b');
    const b = runDrift(outB, goodReg);
    eq(b.code, 0, 'V5 如实登记后 exit 0（降级 ≠ 失败；如实红已入账）');
    const sB = summaryOf(outB);
    eq(sB.contract.ok, true, 'V5 登记后契约成立');
    eq(JSON.stringify(sB.official_set), JSON.stringify(['iti-v29', 'chosen-select']), 'V5 正式采集集 = 可达源');
    eq(rowOf(sB, 'rpn-input').decision, 'degraded', 'V5 被拦源处置 = degraded');
    check(rowOf(sB, 'rpn-input').degradation.ticket === '14' &&
      /Cloudflare/.test(rowOf(sB, 'rpn-input').degradation.reason), 'V5 处置行携带 reason + ticket');

    // (c) 反向：已恢复（ok）却仍有登记 → stale，同样红
    const staleReg = writeReg('stale.json', [
      { id: 'rpn-input', status: 'challenged', reason: 'fixture', ticket: '14' },
      { id: 'mui-autocomplete', status: 'unreachable', reason: 'fixture', ticket: '14' },
      { id: 'iti-v29', status: 'challenged', reason: 'fixture: stale', ticket: '14' },
    ]);
    const outC = join(tmp, 'out-c');
    const c = runDrift(outC, staleReg);
    eq(c.code, 1, 'V5 stale 登记 → exit 1（恢复是显式动作）');
    eq(rowOf(summaryOf(outC), 'iti-v29').decision, 'stale-degradation', 'V5 已恢复源仍登记 → stale-degradation');

    // (d) 非法登记（缺 ticket）→ 运行前硬拒（exit 2），零报告副作用
    const badReg = writeReg('bad.json', [{ id: 'rpn-input', status: 'challenged', reason: 'no ticket' }]);
    const outD = join(tmp, 'out-d');
    const d = runDrift(outD, badReg);
    eq(d.code, 2, 'V5 登记缺 ticket → exit 2（reason + ticket 硬校验先于抓取）');
    check(/ticket/.test(d.err) && /缺少/.test(d.err), 'V5 拒绝信息点名缺失字段 ticket');
    check(!existsSync(join(outD, 'drift-summary.json')), 'V5 非法登记不产出报告（检查先于 mutation）');

    // (e) 未知源登记 → 同样硬拒（登记不是删除 / 不能给不存在的源开后门）
    const unknownReg = writeReg('unknown.json', [{ id: 'no-such-source', status: 'challenged', reason: 'x', ticket: '14' }]);
    const e = runDrift(join(tmp, 'out-e'), unknownReg);
    eq(e.code, 2, 'V5 未知源登记 → exit 2');
    check(/未知源/.test(e.err), 'V5 拒绝信息点名未知源');

    // (e2) 未知 --id：静默忽略会掩盖拼写错误 → 运行前硬拒
    let e2 = { code: 0, out: '', err: '' };
    try {
      e2.out = execFileSync(process.execPath, [
        abs(FILES.orchestrator), '--archive', arch, '--out', join(tmp, 'out-e2'),
        '--no-capture', '--degradations', emptyReg, '--id', 'no-such-source',
      ], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) { e2 = { code: err.status, out: err.stdout || '', err: err.stderr || '' }; }
    eq(e2.code, 2, 'V5 未知 --id → exit 2（拼写错误不被静默忽略）');
    check(/未知 source id/.test(e2.err), 'V5 拒绝信息点名未知 id');

    // (f) 空运行：只有 reconstructed 条目 + 无 CAPTURE-MANIFEST → 不伪造抓取、
    //     显式 SKIP、契约成立（review 第 4 问的 empty case）
    const emptyArch = join(tmp, 'archive-empty');
    const outF = join(tmp, 'out-f');
    let f = { code: 0, out: '', err: '' };
    try {
      f.out = execFileSync(process.execPath, [
        abs(FILES.orchestrator), '--archive', emptyArch, '--out', outF,
        '--no-capture', '--degradations', emptyReg, '--id', 'twilio-iti-reconstructed',
      ], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) { f = { code: err.status, out: err.stdout || '', err: err.stderr || '' }; }
    eq(f.code, 0, 'V5 重构-only 空运行 exit 0（skip ≠ 失败）');
    const sF = summaryOf(outF);
    eq(sF.matrix.length, 1, 'V5 空运行矩阵仍记录重构条目');
    eq(rowOf(sF, 'twilio-iti-reconstructed').reachability, 'reconstructed', 'V5 重构条目可达性 = reconstructed');
    eq(rowOf(sF, 'twilio-iti-reconstructed').drift.tier, 'SKIP', 'V5 重构条目结构比对显式 SKIP');
    eq(rowOf(sF, 'twilio-iti-reconstructed').decision, 'excluded-reconstructed', 'V5 重构条目排除在正式采集集外');
    eq(JSON.stringify(sF.official_set), JSON.stringify([]), 'V5 空运行正式采集集为空（不伪造绿）');

    // 净零副作用：已提交骨架 / manifest / 登记账本字节不变
    eq(snapshot(), before, 'V5 语料目录零副作用（骨架 / 清单 / 登记账本字节不变）');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// V6 文档与登记账本成文
// ══════════════════════════════════════════════════════════════════
{
  const md = read(FILES.readme);
  check(/corpus-drift/.test(md), 'V6 README 载明 corpus-drift workflow');
  check(/drift-degradations\.json/.test(md), 'V6 README 指向降级登记账本');
  check(/不伪造绿/.test(md) && /reason \+ ticket/.test(md), 'V6 README 载明 reason + ticket 硬校验与不伪造绿');
  check(/写回|永不自动更新基线|禁止任何 workflow 自动写回/.test(md), 'V6 README 载明无写回红线');
  const src = read(FILES.sources);
  check(/driftDegradations/.test(src), 'V6 sources.json _meta 指向漂移降级登记');
  const gl = read(FILES.glossary);
  check(/形态漂移探测/.test(gl) && /corpus-drift/.test(gl), 'V6 GLOSSARY「形态漂移探测」指向 corpus-drift workflow');
  check(/CCH_CAPTURE_HEADLESS/.test(read(FILES.capture)) && /headless: HEADLESS/.test(read(FILES.capture)),
    'V6 采集工具采用有头启动 / 无 DISPLAY 回退口径（与冒烟层同源）');
  check(/browser_status/.test(read(FILES.capture)) && /response\.status\(\)/.test(read(FILES.capture)),
    'V6 采集工具记录浏览器导航状态（漂移矩阵以浏览器为准，raw fetch 仅作证据）');
}

console.log('-----------------------------');
console.log('verify-ticket-44: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
