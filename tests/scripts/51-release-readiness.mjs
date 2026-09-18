#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// tests/scripts/51-release-readiness.mjs
// Cycle-8 D-011（ADR-0016）—— 发版节奏的「收割就绪」数据化判据
//
// 把调研的七条判据中可机械化的三条落地（其余四条属人工裁定）：
//   判据 5 补丁豁免：存在 security 类修复 → releaseNow（**不排队**）
//   判据 7 积累上限：commits > 30 或 diff 行数 > 2000 → harvestNow（立即收割）
//   判据 6 breaking 归位：检测 breaking 信号，提示只进批量点、永不藏进 patch
//
// 性质：**advisory（monitor 类）**——默认恒退 0，不阻断任何 PR/发版；`--strict` 才在 releaseNow 时退 1。
// 零依赖；仓库根以本文件位置上溯两级锚定。
// 用法：
//   node tests/scripts/51-release-readiness.mjs
//   node tests/scripts/51-release-readiness.mjs --self-test
//   node tests/scripts/51-release-readiness.mjs --json
// ══════════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const JSON_OUT = has('--json');

// 可机械化的阈值（ADR-0016 登记值）
export const LIMITS = { maxCommits: 30, maxChangedLines: 2000 };
const SECURITY_RE = /security|cve-|\b安全\b|vuln/i;
const WORKSPACE_SUBJECT = /^GitButler Workspace Commit$/;

/** Conventional Commits 解析 + breaking 检测（`!` 标记或正文 BREAKING CHANGE） */
export function classify(subject, body = '') {
  const m = /^([A-Za-z]+)(?:\(([^)]*)\))?(!)?:\s*(.*)$/.exec(subject);
  const type = m ? m[1].toLowerCase() : '(untyped)';
  const scope = m && m[2] ? m[2] : '';
  const breaking = !!(m && m[3]) || /BREAKING[ -]CHANGE/.test(body);
  const security = (type === 'fix' || type === 'security' || type === 'perf') && SECURITY_RE.test(scope + ' ' + subject);
  return { type, scope, breaking, security };
}

/** 纯判定：输入统计 → 建议（不含任何 IO，便于自检） */
export function decide({ commits, changedLines, breaking, securityPatch }) {
  if (securityPatch) return { releaseNow: true, harvestNow: false, reason: 'security-patch-exemption（判据 5：安全修复不排队）' };
  if (commits > LIMITS.maxCommits) return { releaseNow: false, harvestNow: true, reason: 'accumulation-cap（判据 7：commits ' + commits + ' > ' + LIMITS.maxCommits + '）' };
  if (changedLines > LIMITS.maxChangedLines) return { releaseNow: false, harvestNow: true, reason: 'accumulation-cap（判据 7：diff ' + changedLines + ' 行 > ' + LIMITS.maxChangedLines + '）' };
  if (breaking) return { releaseNow: false, harvestNow: false, reason: 'breaking 已累积：只进下一个批量点 + 附迁移指南（判据 6）' };
  return { releaseNow: false, harvestNow: false, reason: '未达收割阈值，继续积累（判据 4：不超过下游吸收能力）' };
}

function selfTest() {
  const fails = [];
  const t = (n, ok, d) => { if (!ok) fails.push(n + (d !== undefined ? ' :: ' + d : '')); };
  t('classify feat', classify('feat(ui): add panel').type === 'feat');
  t('classify breaking via !', classify('feat(api)!: drop v1').breaking === true);
  t('classify breaking via body', classify('refactor: x', 'BREAKING CHANGE: y').breaking === true);
  t('classify security fix', classify('fix(security): patch CVE-2026-1').security === true);
  t('classify non-security fix', classify('fix(ui): typo').security === false);
  t('classify untyped', classify('random subject').type === '(untyped)');
  t('decide: security exemption wins', decide({ commits: 99, changedLines: 9999, breaking: true, securityPatch: true }).releaseNow === true);
  t('decide: accumulation cap by commits', decide({ commits: 31, changedLines: 10, breaking: false, securityPatch: false }).harvestNow === true);
  t('decide: accumulation cap by lines', decide({ commits: 3, changedLines: 2001, breaking: false, securityPatch: false }).harvestNow === true);
  t('decide: below thresholds → keep accumulating', decide({ commits: 5, changedLines: 100, breaking: false, securityPatch: false }).harvestNow === false);
  t('decide: breaking noted but no harvest', decide({ commits: 5, changedLines: 100, breaking: true, securityPatch: false }).reason.includes('判据 6'));
  t('limits registered', LIMITS.maxCommits === 30 && LIMITS.maxChangedLines === 2000);
  return fails;
}

if (has('--self-test')) {
  const fails = selfTest();
  if (JSON_OUT) console.log(JSON.stringify({ ok: fails.length === 0, failures: fails }, null, 2));
  else {
    if (fails.length === 0) console.log('  PASS  self-test (classify ×6 / decide ×5 / limits)');
    else for (const f of fails) console.log('  FAIL  ' + f);
    console.log(fails.length === 0 ? 'release-readiness: OK' : 'release-readiness: ' + fails.length + ' failure(s)');
  }
  process.exit(fails.length === 0 ? 0 : 1);
}

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
let lastTag = null;
try { lastTag = git(['describe', '--tags', '--abbrev=0']); } catch { /* 无 tag */ }
const range = lastTag ? lastTag + '..HEAD' : 'HEAD';
const raw = git(['log', range, '--format=%s%x1f%b%x1e']);
const entries = raw.split('\x1e').map((c) => c.trim()).filter(Boolean).map((c) => { const [s, ...b] = c.split('\x1f'); return { subject: s, body: b.join(' ') }; });
const real = entries.filter((e) => !WORKSPACE_SUBJECT.test(e.subject));
const cls = real.map((e) => classify(e.subject, e.body));
const byType = {};
for (const c of cls) byType[c.type] = (byType[c.type] || 0) + 1;
const breaking = cls.filter((c) => c.breaking).length;
const securityPatch = cls.some((c) => c.security);
let changedLines = 0;
try { const ss = git(['diff', '--shortstat', range]); const m = /(\d+) insertions?\(\+\)/.exec(ss), d = /(\d+) deletions?\(-\)/.exec(ss); changedLines = (m ? +m[1] : 0) + (d ? +d[1] : 0); } catch { /* ignore */ }
const verdict = decide({ commits: real.length, changedLines, breaking, securityPatch });
const out = { lastTag, commitsSinceTag: real.length, workspaceCommits: entries.length - real.length, byType, breaking, securityPatch, changedLines, limits: LIMITS, verdict, advisory: true };

if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else {
  console.log('══ 发版就绪度（D-011 / ADR-0016）—— advisory（monitor 类，不阻断）══');
  console.log('上一发版 tag：' + (lastTag || '(无)'));
  console.log('自该 tag 以来的提交：' + real.length + '（已排除 GitButler 工作区合成提交 ' + out.workspaceCommits + ' 个）');
  console.log('类型分布：' + (Object.keys(byType).sort().map((k) => k + '=' + byType[k]).join('  ') || '(空)'));
  console.log('breaking 信号：' + breaking + ' ｜ security 修复：' + (securityPatch ? '有' : '无') + ' ｜ diff 行数：' + changedLines);
  console.log('建议：' + (verdict.releaseNow ? '【立即发版】' : verdict.harvestNow ? '【立即收割一个版本】' : '【继续积累】') + ' —— ' + verdict.reason);
}
if (has('--strict') && verdict.releaseNow) process.exit(1);
