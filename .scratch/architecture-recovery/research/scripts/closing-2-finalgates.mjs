// ══════════════════════════════════════════════════════════
// 收口步骤2：终跑全部门禁 + build，输出留证摘要（供 docs 沉淀引用）
// ══════════════════════════════════════════════════════════
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const R = 'D:/Aworker/mozilla/choose-your-country';
const S = R + '/.scratch/architecture-recovery/research/scripts';
const gates = [
  ['verify-artifacts.mjs', null, '产物一致性（258 检查）'],
  ['verify-ticket-02.mjs', null, '02 评分引擎门'],
  ['verify-ticket-04.mjs', null, '04 重扫/穿透门'],
  ['verify-ticket-05.mjs', null, '05 规则引擎门'],
  ['verify-ticket-07.mjs', null, '07 UI 门'],
  ['verify-ticket-08.mjs', null, '08 文档门'],
  ['verify-ticket-09.mjs', null, '09 注入门'],
  ['verify-ticket-10.mjs', null, '10 发布门（静态）'],
  ['misdetect-repro-v2.mjs', null, '误报回归 harness'],
  ['iti-adapter-verify.mjs', null, '03 iti 联动门'],
];
const results = [];
let allOk = true;

for (const [script, , label] of gates) {
  try {
    const out = execSync(`node "${S}/${script}"`, { cwd: R, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
    // 抽取关键行
    const key = out.split(/\r?\n/).filter(l => /pass|PASS|ALL|合计|RESULT|passed|VERDICT/.test(l)).slice(-3).join(' | ');
    results.push(`PASS ${label} — ${key}`);
  } catch (e) {
    allOk = false;
    const out = (e.stdout || '') + (e.stderr || '');
    const key = out.split(/\r?\n/).filter(l => /fail|FAIL|ERROR/i.test(l)).slice(0, 3).join(' | ');
    results.push(`FAIL ${label} — ${key}`);
  }
}

// build
try {
  const out = execSync('npm run build', { cwd: R, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
  const key = out.split(/\r?\n/).filter(l => /built|kB|modules/.test(l)).slice(-2).join(' | ');
  results.push(`PASS vite build — ${key}`);
} catch (e) {
  allOk = false;
  results.push('FAIL vite build — ' + String(e.stderr || e.message).slice(0, 200));
}

console.log(results.join('\n'));
console.log(allOk ? 'FINAL-VERDICT=ALL-GREEN' : 'FINAL-VERDICT=HAS-FAILURES');
process.exit(allOk ? 0 : 1);
