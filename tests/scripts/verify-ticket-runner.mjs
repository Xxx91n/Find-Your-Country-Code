#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-runner.mjs — 票级验证门的统一解析器与执行器（Cycle-7 · D-004）
//
// 背景：Cycle-6 末有 21 个票级 verify-NN*.yml workflow，各自只跑 1-2 个脚本，
//   且触发面写死 push: branches: cch/NN-<slug>（分支生命周期结束后成为死触发）。
//   D-004 裁定：21 个票级 workflow 合并为 1 个 workflow_call reusable（票号作 input）。
//
// 设计：
//   · 唯一数据源 = tests/scripts/verify-ticket-plan.json（ticket key -> scripts + 安装/构建/类型开关）
//   · .github/workflows/verify-ticket.yml  = reusable（on: workflow_call，input: ticket）
//   · .github/workflows/verify-tickets.yml = 调用方（声明 pull_request / push(main,cch/**) / dispatch，
//     以 matrix 逐票号调用 reusable）——PR 触发面由调用方声明。
//
// 用法：
//   node tests/scripts/verify-ticket-runner.mjs --list
//   node tests/scripts/verify-ticket-runner.mjs --plan <ticket>   # 输出 GITHUB_OUTPUT 行
//   node tests/scripts/verify-ticket-runner.mjs --run <ticket>
//   node tests/scripts/verify-ticket-runner.mjs --run-all         # 全部票级脚本（不含 plan 的 install/build/typecheck 前置步）
//   node tests/scripts/verify-ticket-runner.mjs --audit           # 零覆盖丢失守卫（本地 + CI 可跑）
// ══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// CI 脚本位置约定：脚本以自身位置上溯 2 级锚定仓库根
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const PLAN = join(here, 'verify-ticket-plan.json');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

// plan 票面不变量（issue #20）：A2 只守「LEGACY 键面零覆盖丢失」——LEGACY 的每个
//   键都必须出现在 plan 里，**无票数上限**：加票（不新增 workflow）不碰本文件，
//   也不碰任何票级门。新票键**单侧**删除（plan 删了、matrix 没删）由 A15/A16 捕获；
//   plan 与 matrix 同时删除则任何票面守卫都看不见——那是有意的删除动作。
//   负例（删 LEGACY 键 → A2/A4 双红）由 verify-ticket-46 常驻锁住。
// 门 key 规则（retro 2026-10-26）：取现有最大 key 的下一个序号；它与 GitHub
// issue 号、历史 A 号散文（如 calibration corpus 的「票 44」）无关。溯源写在
// plan entry 的 name 里（issue #NN / spec #NN），不让门 key 承担。

// 冻结期望：本合并替换掉的 21 个票级 workflow 及其脚本清单。
// 独立真源（不读 plan）——用于 --audit 的「零票级覆盖丢失」断言。
const LEGACY = {
  'verify-02-settings.yml': ['verify-ticket-02-settings.mjs'],
  'verify-03.yml': ['verify-ticket-03.mjs'],
  'verify-05-harness.yml': ['verify-ticket-05-harness.mjs'],
  'verify-06.yml': ['verify-ticket-06.mjs'],
  'verify-07.yml': ['verify-ticket-07.mjs'],
  'verify-08.yml': ['verify-ticket-08.mjs'],
  'verify-10.yml': ['verify-ticket-10.mjs'],
  'verify-11.yml': ['verify-ticket-11.mjs'],
  'verify-13.yml': ['verify-ticket-13.mjs'],
  'verify-15.yml': ['verify-ticket-15.mjs', 'verify-ticket-09.mjs'],
  'verify-18.yml': ['verify-ticket-18.mjs'],
  'verify-27.yml': ['verify-ticket-27.mjs'],
  'verify-28.yml': ['verify-ticket-28.mjs'],
  'verify-29.yml': ['verify-ticket-29.mjs'],
  'verify-30.yml': ['verify-ticket-05.mjs'],
  'verify-31.yml': ['verify-ticket-31.mjs'],
  'verify-37.yml': ['verify-ticket-37.mjs'],
  'verify-38.yml': ['38-version-consistency.mjs'],
  'verify-39.yml': ['verify-ticket-39.mjs'],
  'verify-42.yml': ['verify-ticket-42.mjs'],
};

// LEGACY workflow 文件名 -> plan 票键（verify-02-settings.yml -> 02-settings）。
// A2 与 A7 共用本变换，两处对「legacy 键面」的口径永久一致。
const legacyKeyOf = (wf) => wf.replace(/^verify-/, '').replace(/\.yml$/, '');

// caller matrix 的票号清单：只在 `matrix:` 下的 `ticket:` 列表项区间里取。
// 不扫全文件——文件别处的 `- 'NN'`（其他列表、注释块、尾部追加）都不算覆盖。
// 返回 null 表示**解析不出来**（调用方据此报「解析不到」而不是「缺这些票」：
// 一个成因一条消息，否则把 workflow 写坏的人会去补票号）。
// 三个 fail-closed 口径：
//   · `ticket:` 必须在**本 matrix 区块内**——越过区块即停，后续 job 的列表不算；
//   · 注释行与空行不结束区块/列表（YAML 里注释不打断结构）；
//   · 每个列表项都必须能解析成合法票号，解析不了就走 null，**不静默跳过**。
function matrixTicketKeys(src) {
  const indentOf = (l) => l.match(/^\s*/)[0].length;
  const isSkippable = (l) => !l.trim() || /^\s*#/.test(l);
  const lines = src.split('\n');

  const at = lines.findIndex((l) => /^(\s*)matrix:\s*(#.*)?$/.test(l));
  if (at < 0) return null;
  const matrixIndent = indentOf(lines[at]);

  let ticketAt = -1;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (isSkippable(l)) continue;
    if (indentOf(l) <= matrixIndent) break;
    if (/^\s*ticket:\s*(#.*)?$/.test(l)) { ticketAt = i; break; }
  }
  if (ticketAt < 0) return null;

  const ticketIndent = indentOf(lines[ticketAt]);
  const keys = [];
  for (let i = ticketAt + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isSkippable(line)) continue;
    if (indentOf(line) <= ticketIndent) break;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (!item) return null;
    const quoted = /^(['"])(.*)\1\s*(#.*)?$/.exec(item[1]);
    // 裸值只收非纯数字：`- 02` 在 YAML 里是整数 2，与字符串 '02' 不等价，
    // 放行会让 A15 假绿（matrix 实际收到 2，plan 里却是 '02'）。
    const bare = /^([0-9][0-9a-z-]*)\s*(#.*)?$/.exec(item[1]);
    const key = quoted ? quoted[2] : bare && !/^[0-9]+$/.test(bare[1]) ? bare[1] : null;
    if (key === null || !/^[0-9][0-9a-z-]*$/.test(key)) return null;
    keys.push(key);
  }
  return keys;
}

function loadPlan() { return JSON.parse(readFileSync(PLAN, 'utf8')); }
function keysOf(plan) { return Object.keys(plan.tickets); }
function pick(plan, ticket) {
  const t = plan.tickets[ticket];
  if (!t) {
    console.error('unknown ticket: ' + ticket + ' (known: ' + keysOf(plan).join(', ') + ')');
    process.exit(2);
  }
  return t;
}

const argv = process.argv.slice(2);
const mode = argv[0];
const plan = loadPlan();

if (mode === '--list') {
  for (const k of keysOf(plan)) console.log(k);
  process.exit(0);
}

if (mode === '--plan') {
  const t = pick(plan, argv[1]);
  console.log('install=' + (t.install === true));
  console.log('build=' + (t.build === true));
  console.log('typecheck=' + (t.typecheck === true));
  console.log('scripts=' + (t.scripts || []).join(' '));
  console.log('name=' + (t.name || argv[1]));
  process.exit(0);
}

if (mode === '--run') {
  const t = pick(plan, argv[1]);
  let failed = 0;
  for (const s of (t.scripts || [])) {
    const p = join(here, s);
    if (!existsSync(p)) { failed++; console.error('FAIL missing script: ' + s); continue; }
    console.log('::group::' + s);
    try {
      execFileSync(process.execPath, [p], { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
      failed++;
      console.error('FAIL ' + s + ' (exit ' + (e.status === undefined ? 'signal' : e.status) + ')');
    }
    console.log('::endgroup::');
  }
  process.exit(failed ? 1 : 0);
}

if (mode === '--run-all') {
  // 全量票级门：按 plan 顺序串行跑全部脚本，首个失败不中断（一次收全量失败）
  let failed = 0, ran = 0;
  for (const k of keysOf(plan)) {
    for (const s of (plan.tickets[k].scripts || [])) {
      const p = join(here, s);
      ran++;
      if (!existsSync(p)) { failed++; console.error('FAIL [' + k + '] missing script: ' + s); continue; }
      try {
        execFileSync(process.execPath, [p], { encoding: 'utf8', cwd: ROOT });
        console.log('PASS [' + k + '] ' + s);
      } catch (e) {
        failed++;
        // 取末 6 条匹配行（尾部才是最新失败；首部只会有铺垫输出）
        const tail = ((e.stdout || '') + (e.stderr || '')).trim().split('\n')
          .filter((l) => /FAIL|failures|Error/.test(l)).slice(-6);
        console.error('FAIL [' + k + '] ' + s + ' (exit ' + (e.status === undefined ? 'signal' : e.status) + ')');
        if (tail.length) console.error(tail.map((l) => '  ' + l).join('\n'));
      }
    }
  }
  console.log('');
  console.log('RUN-ALL ' + (ran - failed) + ' passed / ' + failed + ' failed (' + ran + ' scripts)');
  process.exit(failed ? 1 : 0);
}

if (mode === '--audit') {
  let pass = 0, fail = 0;
  const failures = [];
  const ck = (n, c, d) => {
    if (c) { pass++; console.log('PASS ' + n); }
    else { fail++; failures.push(n + (d ? ' :: ' + d : '')); console.log('FAIL ' + n + (d ? ' :: ' + d : '')); }
  };

  const pKeys = keysOf(plan);
  const legacyWfs = Object.keys(LEGACY);
  const legacyKeys = legacyWfs.map(legacyKeyOf);
  ck('A1 plan schema=1', plan.schema === 1, 'got ' + plan.schema);
  // A2 不变量（issue #20）：LEGACY 键面零覆盖丢失，**无票数上限**——加票零维护。
  //   期望集合由 LEGACY 自身派生（唯一真源），不写数字；新票键的单侧删除由 A15/A16 捕获。
  const absentKeys = legacyKeys.filter(k => !pKeys.includes(k));
  ck('A2 plan covers every legacy ticket key (no upper cap)', absentKeys.length === 0, 'missing: ' + absentKeys.join(', '));
  ck('A3 legacy baseline has 20 workflows', legacyWfs.length === 20, 'got ' + legacyWfs.length);

  const legacyScripts = new Set(Object.values(LEGACY).flat());
  const planScripts = new Set(pKeys.flatMap(k => plan.tickets[k].scripts || []));
  const missing = [...legacyScripts].filter(s => !planScripts.has(s));
  const extra = [...planScripts].filter(s => !legacyScripts.has(s));
  ck('A4 zero script coverage loss (legacy scripts subset of plan)', missing.length === 0, 'missing: ' + missing.join(', '));
  // 票 12（issue #12 登录态镜像采集旁路）起允许 D-004 合并之后新增票：
  // 冻结面只保「零覆盖丢失」（A4）；新增脚本须在盘（A8 全量断言），
  // 且新票同样受 A15/A16（plan ↔ verify-tickets.yml matrix 全等）约束。
  ck('A5 post-merge additions allowed but must exist on disk', extra.every(s => existsSync(join(here, s))), 'extra missing on disk: ' + extra.filter(s => !existsSync(join(here, s))).join(', '));
  ck('A6 legacy script count = 21 (20 workflows, verify-15 runs 2)', legacyScripts.size === 21, 'got ' + legacyScripts.size);

  const mism = [];
  for (const wf of legacyWfs) {
    const key = legacyKeyOf(wf);
    const t = plan.tickets[key];
    if (!t) { mism.push(wf + ' -> missing plan key ' + key); continue; }
    const a = [...LEGACY[wf]].sort().join(',');
    const b = [...(t.scripts || [])].sort().join(',');
    if (a !== b) mism.push(wf + ': legacy=[' + a + '] plan=[' + b + ']');
  }
  ck('A7 per-ticket script mapping preserved', mism.length === 0, mism.join(' | '));

  const absent = [...planScripts].filter(s => !existsSync(join(here, s)));
  ck('A8 every plan script exists on disk', absent.length === 0, 'absent: ' + absent.join(', '));

  const stillThere = legacyWfs.filter(f => existsSync(join(WORKFLOWS, f)));
  ck('A9 legacy verify-*.yml files removed', stillThere.length === 0, 'still present: ' + stillThere.join(', '));

  const reusable = join(WORKFLOWS, 'verify-ticket.yml');
  const caller = join(WORKFLOWS, 'verify-tickets.yml');
  ck('A10 reusable workflow exists', existsSync(reusable));
  ck('A11 caller workflow exists', existsSync(caller));

  if (existsSync(reusable)) {
    const r = readFileSync(reusable, 'utf8');
    ck('A12 reusable declares workflow_call', /^\s*workflow_call:/m.test(r));
    ck('A13 reusable has no pull_request trigger of its own', !/^\s*pull_request:/m.test(r));
  }
  if (existsSync(caller)) {
    const c = readFileSync(caller, 'utf8');
    ck('A14 caller declares pull_request (non-release workflows must declare PR trigger)', /^\s*pull_request:/m.test(c));
    // 只认 `matrix: ticket:` 区块内的列表项：注释块、文件别处的 `- 'NN'`
    // 都不算覆盖（verify-ticket-46 N4 锁住该口径）。
    const matrixKeys = matrixTicketKeys(c);
    ck('A14b caller has a parseable matrix ticket list', matrixKeys !== null,
      'no `matrix:`/`ticket:` list found in verify-tickets.yml (tickets not verifiable)');
    const missKeys = matrixKeys === null ? pKeys : pKeys.filter(k => !matrixKeys.includes(k));
    const extraKeys = matrixKeys === null ? [] : matrixKeys.filter(k => !pKeys.includes(k));
    ck('A15 caller matrix covers every plan ticket', matrixKeys !== null && missKeys.length === 0,
      matrixKeys === null ? 'matrix unparseable — see A14b' : 'missing: ' + missKeys.join(', '));
    ck('A16 caller matrix has no unknown ticket', extraKeys.length === 0, 'extra: ' + extraKeys.join(', '));
    ck('A17 caller has no literal cch/<NN> dead branch trigger', !/cch\/[0-9]/.test(c));
  }

  const wfFiles = readdirSync(WORKFLOWS).filter(f => /\.ya?ml$/.test(f));
  const deadRefs = [];
  for (const f of wfFiles) {
    const src = readFileSync(join(WORKFLOWS, f), 'utf8');
    if (/cch\/[0-9]/.test(src)) deadRefs.push(f);
  }
  ck('A18 no workflow references a literal cch/<NN> branch', deadRefs.length === 0, 'dead refs in: ' + deadRefs.join(', '));
  // 票 44（corpus-drift 原型 workflow）新增 1 个 advisory workflow：30 -> 12。
  ck('A19 workflow count reduced 30 -> 12', wfFiles.length === 12, 'got ' + wfFiles.length + ': ' + wfFiles.sort().join(', '));

  console.log('');
  console.log('AUDIT ' + pass + ' passed / ' + fail + ' failed');
  if (fail) console.log('failures: ' + failures.join(' | '));
  process.exit(fail ? 1 : 0);
}

console.error('usage: verify-ticket-runner.mjs --list | --plan <ticket> | --run <ticket> | --run-all | --audit');
process.exit(2);
