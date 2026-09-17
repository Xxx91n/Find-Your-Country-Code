#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// corpus-exemption-lint.mjs — 语料豁免元数据门（Cycle-7 T-10 / D-003）
// 契约：tests/corpus/manifest.json 中任何「携带豁免」的条目必须带三个字段——
//   owner（非空）/ reviewBy（合法 ISO YYYY-MM-DD，且不得早于今日）/ reason（非空）。
// 「携带豁免」的判定（任一命中）：
//   ① knownResidual === true        —— 在期豁免（仍在门禁断言集之外）；
//   ② exemptionStatus 为非空字符串 —— 已摘旗但需到期复审的状态位；
//   ③ 残留 owner/reviewBy/reason    —— 防“删一个字段就绕过门”的残迹。
// 到期语义（D-003 ④）：reviewBy 过期即 CI 红，必须重新裁定——
//   摘旗（翻转 knownResidual=false，保留元数据并置 exemptionStatus="lifted"）
//   或续期（更新 reviewBy）。禁止物理删除语料条目（ADR-0008 决策 4 append-only）。
// 覆盖 cases 与 realSiteForms 两段。零依赖、纯 node、无网络/无时钟依赖（仅读今日日期）。
// 仓库根由本文件位置上溯两级锚定（ADR-0006 条款 1）。
// 用法：node tests/scripts/corpus-exemption-lint.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..'); // tests/scripts/ → 仓库根
const MANIFEST = join(ROOT, 'tests', 'corpus', 'manifest.json');
const REL = relative(ROOT, MANIFEST).split(sep).join('/');

const FIELDS = ['owner', 'reviewBy', 'reason'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10); // UTC 日（CI 运行器跨时区一致）
}

function isRealDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const parts = s.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return dt.getUTCFullYear() === parts[0] && dt.getUTCMonth() === parts[1] - 1 && dt.getUTCDate() === parts[2];
}

function carriesExemption(e) {
  if (!e || typeof e !== 'object') return false;
  if (e.knownResidual === true) return true;
  if (typeof e.exemptionStatus === 'string' && e.exemptionStatus.trim() !== '') return true;
  return FIELDS.some(function (f) { return Object.prototype.hasOwnProperty.call(e, f); });
}

let passCount = 0;
let failCount = 0;
const lines = [];
function pass(msg) { passCount++; lines.push('PASS ' + msg); }
function fail(msg) { failCount++; lines.push('FAIL ' + msg); }

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (err) {
  console.log('FAIL 读取/解析 ' + REL + ' 失败: ' + err.message);
  console.log('corpus-exemption-lint: 0 PASS, 1 FAIL');
  process.exit(1);
}

const today = todayISO();
const sections = [['cases', manifest.cases], ['realSiteForms', manifest.realSiteForms]];
const tracked = [];
for (const entry of sections) {
  const section = entry[0];
  const arr = entry[1];
  if (!Array.isArray(arr)) continue;
  for (const e of arr) {
    if (carriesExemption(e)) tracked.push({ section: section, id: (e && e.id) || '(no-id)', e: e });
  }
}

let checked = 0;
if (tracked.length === 0) {
  pass('无携带豁免的条目（无需三字段元数据）');
} else {
  for (const t of tracked) {
    checked++;
    const label = t.section + '/' + t.id;
    const problems = [];
    for (const f of FIELDS) {
      const v = t.e[f];
      if (typeof v !== 'string' || v.trim() === '') problems.push(f + ' 缺失或为空');
    }
    const rb = t.e.reviewBy;
    if (typeof rb === 'string' && rb.trim() !== '') {
      if (!isRealDate(rb)) problems.push('reviewBy 非合法 ISO 日期(' + rb + ')');
      else if (rb < today) problems.push('reviewBy 已过期(' + rb + ' < ' + today + ')，必须重新裁定：摘旗或续期');
    }
    if (problems.length) fail(label + ' — ' + problems.join('；'));
    else pass(label + ' — owner/reviewBy(' + rb + ')/reason 齐全且未过期');
  }
}

console.log(lines.join('\n'));
console.log('\ncorpus-exemption-lint: ' + passCount + ' PASS, ' + failCount + ' FAIL（携带豁免条目 ' + checked + ' / 今日 ' + today + ' / ' + REL + '）');
process.exit(failCount === 0 ? 0 : 1);
