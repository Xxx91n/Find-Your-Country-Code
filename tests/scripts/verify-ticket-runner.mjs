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
//     以 matrix 逐票号调用 reusable）——ADR-0006 决策 2 的 pull_request 由调用方声明。
//
// 用法：
//   node tests/scripts/verify-ticket-runner.mjs --list
//   node tests/scripts/verify-ticket-runner.mjs --plan <ticket>   # 输出 GITHUB_OUTPUT 行
//   node tests/scripts/verify-ticket-runner.mjs --run <ticket>
//   node tests/scripts/verify-ticket-runner.mjs --audit           # 零覆盖丢失守卫（本地 + CI 可跑）
// ══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// ADR-0006 决策 1：脚本以自身位置上溯 2 级锚定仓库根
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const PLAN = join(here, 'verify-ticket-plan.json');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

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
  'verify-12.yml': ['verify-ticket-12.mjs'],
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

if (mode === '--audit') {
  let pass = 0, fail = 0;
  const failures = [];
  const ck = (n, c, d) => {
    if (c) { pass++; console.log('PASS ' + n); }
    else { fail++; failures.push(n + (d ? ' :: ' + d : '')); console.log('FAIL ' + n + (d ? ' :: ' + d : '')); }
  };

  const pKeys = keysOf(plan);
  const legacyWfs = Object.keys(LEGACY);
  ck('A1 plan schema=1', plan.schema === 1, 'got ' + plan.schema);
  ck('A2 plan has 21 tickets', pKeys.length === 21, 'got ' + pKeys.length);
  ck('A3 legacy baseline has 21 workflows', legacyWfs.length === 21, 'got ' + legacyWfs.length);

  const legacyScripts = new Set(Object.values(LEGACY).flat());
  const planScripts = new Set(pKeys.flatMap(k => plan.tickets[k].scripts || []));
  const missing = [...legacyScripts].filter(s => !planScripts.has(s));
  const extra = [...planScripts].filter(s => !legacyScripts.has(s));
  ck('A4 zero script coverage loss (legacy scripts subset of plan)', missing.length === 0, 'missing: ' + missing.join(', '));
  ck('A5 no script beyond legacy set', extra.length === 0, 'extra: ' + extra.join(', '));
  ck('A6 legacy script count = 22 (21 workflows, verify-15 runs 2)', legacyScripts.size === 22, 'got ' + legacyScripts.size);

  const mism = [];
  for (const wf of legacyWfs) {
    const key = wf.replace(/^verify-/, '').replace(/\.yml$/, '');
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
    ck('A14 caller declares pull_request (ADR-0006 条款2)', /^\s*pull_request:/m.test(c));
    const matrixKeys = [...c.matchAll(/^\s*-\s*'([0-9][0-9a-z-]*)'\s*$/gm)].map(m => m[1]);
    const missKeys = pKeys.filter(k => !matrixKeys.includes(k));
    const extraKeys = matrixKeys.filter(k => !pKeys.includes(k));
    ck('A15 caller matrix covers every plan ticket', missKeys.length === 0, 'missing: ' + missKeys.join(', '));
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
  ck('A19 workflow count reduced 30 -> 11', wfFiles.length === 11, 'got ' + wfFiles.length + ': ' + wfFiles.sort().join(', '));

  console.log('');
  console.log('AUDIT ' + pass + ' passed / ' + fail + ' failed');
  if (fail) console.log('failures: ' + failures.join(' | '));
  process.exit(fail ? 1 : 0);
}

console.error('usage: verify-ticket-runner.mjs --list | --plan <ticket> | --run <ticket> | --audit');
process.exit(2);
