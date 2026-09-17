#!/usr/bin/env node
// ================================================================
// 12-gates.mjs - 票 12（A-036）本地回归矩阵运行器
// 目的：一次性跑全部本地 node 门，输出紧凑表（退出码 + 汇总行），
//   避免对话内内联长管道（WORKFLOW §2.6）。
// 用法：node .scratch/architecture-recovery/research/scripts/12-gates.mjs [组名...]
//   不带参数 = 跑全部；带参数 = 只跑匹配的组（子串匹配）
// ================================================================
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const NL = String.fromCharCode(10);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
const SDIR = join(ROOT, 'tests', 'scripts');

const files = readdirSync(SDIR)
  .filter((f) => /^verify-ticket-.*[.]mjs$/.test(f))
  .map((f) => 'tests/scripts/' + f)
  .sort();

const filters = process.argv.slice(2);
const selected = filters.length ? files.filter((f) => filters.some((x) => f.includes(x))) : files;

const SUMMARY = /(PASS|pass|FAIL|FAILURES|ALL GREEN|failures)/i;
const rows = [];
for (const rel of selected) {
  const t0 = Date.now();
  let stdout = '', code = 0;
  try {
    stdout = execFileSync(process.execPath, [join(ROOT, rel)], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT, timeout: 300000,
    });
  } catch (e) {
    stdout = String(e.stdout || '');
    code = e.status == null ? -1 : e.status;
  }
  const lines = stdout.split(NL).filter((l) => l.trim());
  const tail = lines.slice(-4).filter((l) => SUMMARY.test(l));
  const sum = (tail.length ? tail : lines.slice(-2)).join(' | ').slice(0, 160);
  rows.push({ rel, code, ms: Date.now() - t0, sum });
}

const W = Math.max(...rows.map((r) => r.rel.length));
for (const r of rows) {
  const flag = r.code === 0 ? 'OK  ' : 'RED ';
  console.log(flag + r.rel.padEnd(W) + '  exit=' + String(r.code).padEnd(4) + ' ' + String(r.ms + 'ms').padEnd(8) + ' ' + r.sum);
}
const red = rows.filter((r) => r.code !== 0);
console.log('---');
console.log('总计 ' + rows.length + ' 道门，红 ' + red.length + (red.length ? '：' + red.map((r) => r.rel).join(', ') : '（全部 OK）'));
