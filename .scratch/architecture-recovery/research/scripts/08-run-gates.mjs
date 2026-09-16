// 08-run-gates.mjs — 票 08 本地自证：逐门实跑 + 紧凑汇总（stdout 只输出摘要）
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const NODE = 'C:/Users/Administrator/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe';
const R = 'D:/Aworker/mozilla/choose-your-country/';
const GATES = [
  'tests/scripts/verify-ticket-02.mjs', 'tests/scripts/verify-ticket-02-settings.mjs',
  'tests/scripts/verify-ticket-03.mjs', 'tests/scripts/verify-ticket-05.mjs',
  'tests/scripts/verify-ticket-05-harness.mjs', 'tests/scripts/verify-ticket-06.mjs',
  'tests/scripts/verify-ticket-07.mjs', 'tests/scripts/verify-ticket-08.mjs',
  'tests/scripts/verify-ticket-09.mjs', 'tests/scripts/verify-ticket-11.mjs', 'tests/scripts/verify-ticket-13.mjs',
  'tests/scripts/verify-ticket-15.mjs', 'tests/scripts/verify-ticket-18.mjs',
  'tests/scripts/verify-ticket-27.mjs', 'tests/scripts/verify-ticket-28.mjs',
  'tests/scripts/verify-ticket-29.mjs', 'tests/scripts/verify-ticket-31.mjs',
  'tests/scripts/verify-ticket-37.mjs', 'tests/scripts/verify-ticket-39.mjs',
  'tests/scripts/verify-ticket-42.mjs', 'tests/scripts/misdetect-repro-v2.mjs',
  'tests/scripts/38-version-consistency.mjs', 'tests/scripts/release-gate.mjs',
];
let ok = 0, bad = 0;
for (const g of GATES) {
  if (!existsSync(R + g)) { console.log('MISSING  ' + g); bad++; continue; }
  const args = g.endsWith('release-gate.mjs') ? ['--self-test'] : [];
  let out = '', code = 0;
  try { out = execFileSync(NODE, [R + g, ...args], { cwd: R, encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { code = e.status === undefined ? -1 : e.status; out = (e.stdout || '') + (e.stderr || ''); }
  const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
  const tail = lines.filter(l => /pass|PASS|FAIL|\u5408\u8ba1|\u7ed3\u8bba|EXIT|failed/i.test(l)).slice(-2).join(' || ').slice(0, 130);
  console.log((code === 0 ? 'OK   ' : 'RED  ') + g.replace('tests/scripts/', '') + '  exit=' + code + '  ' + tail);
  if (code === 0) ok++; else bad++;
}
console.log('\n\u672c\u5730\u81ea\u8bc1\u6c47\u603b: ' + ok + ' \u7eff / ' + bad + ' \u7ea2  (\u5171 ' + GATES.length + ' \u95e8)');
