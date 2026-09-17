#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-07.mjs — Cycle-6 票 07「真实站点层全阶梯 + 发布门」结构门（A-029）
// 方法：读文本做结构断言 + 直接驱动发布门纯判定函数（无浏览器、无 npm 依赖、零外网，node 直跑）。
//
// 断言面：
//   G1 阶梯契约（manifest）：逐目标声明 ladder；injected 默认满 L0–L4，非全阶梯必须带
//      degradeReason + ticket；observe 挂账强制非空 reason + ticket（ADR-0010 条款 4）
//   G2 五级实现（live 层）：L0 静默健康 / L1 注入 + 档位 / L2 面板可见 + 搜索收窄（跨帧双端）/
//      L3 宿主 value + input·change / L4 反馈出现；驱动链消费共享原语唯一来源
//   G3 触发面与 advisory：真实站点层不进 pull_request；仅 schedule + workflow_dispatch；
//      失败只告警不阻断合入；本票新增的 PR 门只跑静态断言（不把真实站点拉进 PR 面）
//   G4 发布门（ADR-0010 条款 2）：release job 以 needs 硬依赖挂在门上；门不得 continue-on-error；
//      双判据（绿 / 显式 ack + 立票）机器可验；判定函数行为由用例直接驱动；无法判定即 fail-closed
//   G5 覆盖声明：A-029 在 manifest / live 层 / 发布门脚本三处声明
//   G6 只升不降：L1 在既有「wrapper 存在」之上加强档位判据；阶梯仍为 L0–L4 五级全集
// 用法：node tests/scripts/verify-ticket-07.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide, selfTest, checkTicket, ACK_REL, MIN_REASON, WORKFLOW_FILE } from './release-gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

let pass = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name + (detail ? ' — ' + detail : '')); }
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
const count = (src, re) => (src.match(re) || []).length;

/** 取 YAML 顶层 job 块（2 空格缩进的 key 起，至下一个顶层 key 止）。 */
function jobBlock(yaml, name) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => new RegExp('^  ' + name + ':\\s*$').test(l));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { if (/^  [A-Za-z0-9_-]+:/.test(lines[i])) { end = i; break; } }
  return lines.slice(start, end).join('\n');
}

/** 取 on: 块（顶层 on: 起，至下一个非缩进顶层键止）。 */
function onBlock(yaml) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => /^on:\s*$/.test(l));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { if (/^[A-Za-z_]/.test(lines[i])) { end = i; break; } }
  return lines.slice(start + 1, end).join('\n');
}

// ══ S0 自证（已知好样本干跑；WORKFLOW §5 教训）══
{
  const FILES = ['tests/live/site-manifest.json', 'tests/live/live-smoke.mjs', 'tests/helpers/primitives.mjs',
    'tests/scripts/release-gate.mjs', '.github/release-gate-ack.json', '.github/workflows/release.yml',
    '.github/workflows/real-site-smoke.yml', '.github/workflows/verify-tickets.yml'];
  const missing = FILES.filter((f) => !has(f));
  check('S0 全部工件存在', missing.length === 0, missing.join(','));
  check('S0 全部工件可读非空', FILES.every((f) => has(f) && read(f).length > 0));
  if (missing.length) { console.log('\n' + pass + ' PASS, ' + failures.length + ' FAIL'); process.exit(1); }
}

const MANIFEST_SRC = read('tests/live/site-manifest.json');
const LIVE = read('tests/live/live-smoke.mjs');
const GATE = read('tests/scripts/release-gate.mjs');
const ACK = JSON.parse(read('.github/release-gate-ack.json'));
const REL = read('.github/workflows/release.yml');
const SMOKE = read('.github/workflows/real-site-smoke.yml');
// Cycle-7 D-004：票级 workflow 合并 —— verify-07.yml 删除，本票 CI 挂接点 = 调用方
// verify-tickets.yml（PR 门控声明处）+ verify-ticket-plan.json 的 '07' 条目（脚本与覆盖声明）。
const V7 = read('.github/workflows/verify-tickets.yml');
const T7 = (JSON.parse(read('tests/scripts/verify-ticket-plan.json')).tickets || {})['07'] || {};

let manifest = null; let parseErr = null;
try { manifest = JSON.parse(MANIFEST_SRC); } catch (e) { parseErr = String(e.message); }
check('G1a site-manifest.json 可解析', !!manifest && !parseErr, parseErr || '');
if (!manifest) { console.log('\n' + pass + ' PASS, ' + failures.length + ' FAIL'); process.exit(1); }
const targets = Array.isArray(manifest.targets) ? manifest.targets : [];
const LADDER_ALL = ['L0', 'L1', 'L2', 'L3', 'L4'];
const isFull = (t) => LADDER_ALL.every((l) => (t.ladder || []).includes(l));

// ══ G1 阶梯契约 ══
const noLadder = targets.filter((t) => !Array.isArray(t.ladder) || !t.ladder.length).map((t) => t.id);
check('G1b 每个目标声明非空 ladder', noLadder.length === 0, noLadder.join(','));
const badLevel = [];
for (const t of targets) for (const l of (t.ladder || [])) if (!LADDER_ALL.includes(l)) badLevel.push(t.id + ':' + l);
check('G1c ladder 级别取值合法（L0–L4 子集）', badLevel.length === 0, badLevel.join(','));
const injected = targets.filter((t) => t.expect === 'injected');
const degradedUnlogged = injected.filter((t) => !isFull(t) && (!String(t.degradeReason || '').trim() || !String(t.ticket || '').trim())).map((t) => t.id);
check('G1d expect=injected 默认满 L0–L4；非全阶梯必须带非空 degradeReason + ticket', degradedUnlogged.length === 0, degradedUnlogged.join(','));
const enabledLiveFull = targets.filter((t) => t.kind === 'live' && t.enabled === true && isFull(t));
check('G1e 至少 1 个 enabled live 目标声明满 L0–L4（真实站点不得止于 L0–L1，D-004(c)）', enabledLiveFull.length >= 1, enabledLiveFull.map((t) => t.id).join(','));
const enabledLiveInjected = targets.filter((t) => t.kind === 'live' && t.enabled === true && t.expect === 'injected');
check('G1f 至少 1 个 enabled live 目标为断言型（expect=injected，可报绿）', enabledLiveInjected.length >= 1, enabledLiveInjected.map((t) => t.id).join(','));
const observe = targets.filter((t) => t.expect === 'observe');
const anonObserve = observe.filter((t) => !String(t.reason || '').trim() || !String(t.ticket || '').trim()).map((t) => t.id);
check('G1g observe 挂账逐条携带非空 reason + ticket（不得匿名挂账，ADR-0010 条款 4）', observe.length >= 1 && anonObserve.length === 0, 'observe=' + observe.length + ' 匿名=' + (anonObserve.join(',') || 'none'));
check('G1h _meta 声明 ladderRule（阶梯契约成文）', typeof manifest._meta?.ladderRule === 'string' && manifest._meta.ladderRule.length > 50, String(manifest._meta?.ladderRule || '').slice(0, 30));
check('G1i _meta 声明 ladderProbe（未校准目标的驱动参数）', !!manifest._meta?.ladderProbe && !!manifest._meta.ladderProbe.iso && !!manifest._meta.ladderProbe.query);
check('G1j live 层 validate() 硬校验 ladder 契约', /ladder 缺失或为空/.test(LIVE) && /非全阶梯（/.test(LIVE) && /degradeReason/.test(LIVE));
check('G1k live 层 validate() 硬校验 observe 挂账 reason + ticket', /observe 挂账必须携带非空 reason \+ ticket/.test(LIVE));

// ══ G2 五级实现 ══
check('G2a L0 静默健康：pageerror 计数判据', /pageerror/.test(LIVE) && /pageErrors\.length > 0/.test(LIVE) && /L0/.test(LIVE));
check('G2b L1 元素已注入 + 档位合法性（在既有 wrapper 判据之上加强）', /injectedOk\(probe/.test(LIVE) && /auto\|lowkey/.test(LIVE) && /data-cch-tier|tier/.test(LIVE));
check('G2c L2 面板可见：同帧 openPanel + 跨帧 openPanelRemote（双端）', /\bopenPanel\(/.test(LIVE) && /openPanelRemote\(/.test(LIVE));
check('G2d L2 搜索收窄：searchType + readVisibleRows + 收窄判据', /searchType\(page, plan\.query\)/.test(LIVE) && /readVisibleRows\(page\)/.test(LIVE) && /rows\.length < before/.test(LIVE));
check('G2e L3 写入结果正确：宿主 value（校准/未校准两路）', /readHostValue\(probeFrame/.test(LIVE) && /readWrappedHostField\(probeFrame/.test(LIVE) && /valueMatches\(/.test(LIVE));
check('G2f L3 事件面：input / change 各 ≥1', /recordFieldEvents\(probeFrame/.test(LIVE) && /recordWrappedFieldEvents\(probeFrame/.test(LIVE) && /events\.includes\('input'\).*events\.includes\('change'\)/.test(LIVE));
check('G2g L4 用户反馈出现：#cch-toast 在场 + 文案非空', /readFeedback\(probeFrame\)/.test(LIVE) && /fb\.present/.test(LIVE) && /String\(fb\.text \|\| ''\)\.trim\(\)/.test(LIVE));
check('G2h 阶梯结果进汇总（逐项 ladderChecks + 覆盖 ladderCoverage + 逐目标 levels）', /ladderChecks/.test(LIVE) && /ladderCoverage/.test(LIVE) && /rec\.levels = reduceLevels\(checks\)/.test(LIVE));
const primitivesUsed = ['openPanel', 'openPanelRemote', 'searchType', 'selectCountry', 'readInjection', 'readVisibleRows', 'readWrappedHostField', 'recordWrappedFieldEvents', 'readRowDialCode'];
const missingPrim = primitivesUsed.filter((n) => !new RegExp('\\b' + n + '\\b').test(LIVE));
check('G2i 驱动链消费共享原语唯一来源（不新造第二套）', missingPrim.length === 0, missingPrim.join(','));
check('G2j 无第二套 GM 替身 / 探针 / 注入装配', count(LIVE, /const GM_STUB/g) === 0 && count(LIVE, /const PROBE/g) === 0 && count(LIVE, /addInitScript\(/g) === 0);
check('G2k 未校准目标期望值同源导出（行内区号），不引入第二份区号表', /readRowDialCode\(page, plan\.iso\)/.test(LIVE) && /plan\.iso/.test(LIVE));
check('G2l L1 未成立时阶梯如实中断登记（不伪造绿）', /L1 未成立，阶梯中断/.test(LIVE) && /status: 'skip'/.test(LIVE));

// ══ G3 触发面与 advisory ══
const smokeOn = onBlock(SMOKE);
check('G3a real-site-smoke.yml 存在 on: 块', smokeOn.length > 0);
check('G3b 真实站点层不进 pull_request 触发面', smokeOn.length > 0 && !/pull_request/.test(smokeOn));
check('G3c 触发面仅 schedule + workflow_dispatch', /schedule:/.test(smokeOn) && /workflow_dispatch:/.test(smokeOn));
check('G3d 失败只告警不阻断合入（冒烟步 continue-on-error）', /continue-on-error:\s*true/.test(SMOKE));
check('G3e 失败以 ::warning:: 浮出（不伪造绿、不静默）', /::warning::/.test(SMOKE));
check('G3f 有头浏览器虚拟显示保留（xvfb-run）', /xvfb-run/.test(SMOKE));
check('G3g 本票新增的 PR 门只跑静态断言（不把真实站点层拉进 PR 面）', (T7.scripts || []).includes('verify-ticket-07.mjs') && !/playwright|xvfb-run|node tests\/live/.test(V7));
check('G3h 票级 PR 门触发面合规（ADR-0006 决策 2：非发版 workflow 声明 pull_request）', /pull_request:/.test(onBlock(V7)));

// ══ G4 发布门 ══
const relOn = onBlock(REL);
const gateJob = jobBlock(REL, 'release-gate');
const releaseJob = jobBlock(REL, 'release');
check('G4a release.yml 存在 release-gate job', gateJob.length > 0);
check('G4b release job 以 needs 硬依赖挂在发布门之后（门不过则不出包）', /needs:\s*release-gate/.test(releaseJob), releaseJob.split('\n').slice(0, 3).join(' | '));
check('G4c 发布门 job 具备 actions: read（可读运行记录）', /actions:\s*read/.test(gateJob));
check('G4d 发布门 job 调用 tests/scripts/release-gate.mjs（ADR-0006 决策 1 位置约定）', /node tests\/scripts\/release-gate\.mjs/.test(gateJob));
check('G4e 发布门步不得 continue-on-error（不得静默放行）', gateJob.length > 0 && !/continue-on-error/.test(gateJob));
check('G4f 发布门 job 不得被 if: always()/失败忽略绕过', gateJob.length > 0 && !/if:\s*always\(\)/.test(gateJob));
check('G4g 发布门脚本实现双判据（绿 / 显式 ack + 立票）', /conclusion === 'success'/.test(GATE) && /acknowledged !== true/.test(GATE) && /checkTicket/.test(GATE));
check('G4h 发布门脚本强制立票可解析（仓库内 .md / #NNN / issue URL）', /gh-issue-number/.test(GATE) && /repo-file/.test(GATE) && /仓库内无此文件/.test(GATE));
check('G4i 发布门脚本防陈旧 ack 复用（runId 必须与最近一次运行一致）', /防陈旧 ack 复用/.test(GATE) && /ack\.runId 与最近一次运行不符/.test(GATE));
check('G4j 无法取得运行状态时 fail-closed（默认拒绝出包）', /fail-closed/.test(GATE) && /发布门默认拒绝出包/.test(GATE));
check('G4k ack 记录 schema 齐备', ['acknowledged', 'reason', 'ticket', 'runId', 'acknowledgedBy'].every((k) => k in ACK) && ACK.acknowledged !== true, 'acknowledged=' + JSON.stringify(ACK.acknowledged));
check('G4l ack 记录默认不放行（acknowledged:false + 空 reason）', ACK.acknowledged === false && !String(ACK.reason || '').trim());
const st = selfTest();
check('G4m 发布门判定函数自证全通过（纯函数判定表）', st.failures.length === 0, st.failures.join(' | ') || (st.total + ' 用例'));
const dGreen = decide({ latestRun: { id: 1, conclusion: 'success' }, ack: null });
const dRedNoAck = decide({ latestRun: { id: 2, conclusion: 'failure' }, ack: null });
const dNoRun = decide({ latestRun: null, ack: null });
const dAckOk = decide({ latestRun: { id: 3, conclusion: 'failure' }, ack: { acknowledged: true, reason: '第三方站点反爬挑战导致 advisory 失败，与本次变更无关，已立票跟踪', ticket: '#1', runId: 3, acknowledgedBy: 'maintainer' } });
check('G4n 绿 → 放行', dGreen.pass === true && dGreen.mode === 'green');
check('G4o 非绿且无 ack → 阻断', dRedNoAck.pass === false);
check('G4p 无运行记录 → 阻断（不得以「还没跑过」静默放行）', dNoRun.pass === false);
check('G4q 非绿 + 合法 ack（reason/ticket/runId/acknowledgedBy 齐备）→ 放行并留痕', dAckOk.pass === true && dAckOk.mode === 'ack');
check('G4r checkTicket 拒绝不可解析的票', checkTicket('NOPE.md').ok === false && checkTicket('#12').ok === true);
check('G4s MIN_REASON 常量成文（reason 不得为敷衍占位）', MIN_REASON >= 20 && /MIN_REASON/.test(GATE));
check('G4t 发布门对象 workflow 为真实站点层（不误绑其他 workflow）', WORKFLOW_FILE === 'real-site-smoke.yml' && has('.github/workflows/' + WORKFLOW_FILE));
check('G4u 发布门属发版系例外路径（release.yml 不声明 pull_request）', relOn.length > 0 && !/pull_request/.test(relOn));
const wfScratch = ['.github/workflows/release.yml', '.github/workflows/verify-tickets.yml', '.github/workflows/verify-ticket.yml', '.github/workflows/real-site-smoke.yml']
  .filter((f) => /\.scratch\//.test(read(f)));
check('G4v workflows 零 .scratch/ 路径引用（ADR-0006 决策 1）', wfScratch.length === 0, wfScratch.join(','));

// ══ G5 覆盖声明 ══
check('G5a manifest 声明本票覆盖 A-029', /A-029/.test(MANIFEST_SRC) && manifest._meta?.coveredA === 'A-029');
check('G5b live 层声明本票覆盖 A-029', /票 07 \[A-029\]/.test(LIVE) && /coveredA: 'A-029'/.test(LIVE));
check('G5c 发布门脚本声明本票覆盖 A-029', /票 07 \/ A-029/.test(GATE));
check('G5d 本票结构门与 workflow 声明 A-029', /A-029/.test(read('tests/scripts/verify-ticket-07.mjs')) && (T7.covers || []).includes('A-029'));

// ══ G6 只升不降（本票不得放宽既有断言）══
check('G6a L1 在既有 wrapper 判据之上加强档位合法性（只升不降）', /injectedOk\(probe, t\.selector\) && tierOk/.test(LIVE) && /档位非法（应为 auto\|lowkey）/.test(LIVE));
check('G6b 阶梯仍为 L0–L4 五级全集（与 ACCEPTANCE-SURFACE §4.1 一致）', /const LADDER_ALL = \['L0', 'L1', 'L2', 'L3', 'L4'\]/.test(LIVE) && LADDER_ALL.length === 5);
check('G6c 既有 observe 观测路径与跳过白名单输出保留', /expect === 'observe'/.test(LIVE) && /\[SKIPPED \]/.test(LIVE));
check('G6d 既有 mirror deep 契约保留（票 05 S7 依赖）', /t\.deep \? t\.deep\.expectValue/.test(LIVE) && /deepChecks:/.test(LIVE));

console.log('\n' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); for (const f of failures) console.log('  - ' + f); process.exit(1); }
