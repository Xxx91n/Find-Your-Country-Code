#!/usr/bin/env node
// ================================================================
// 12-ab-cap-fidelity.mjs - 票 12（A-036）2x2 对照：写路径上限强制 x 替身投递保真度
// 命题一：S4「上限生效」在「替身按引用投递 + 无写路径强制」下为绿 ⇒ 该绿是替身别名旁路效应，非实现保证。
// 命题二：补上结构化克隆（真实 BC 语义）后，S4 的绿必须来自写路径强制，否则复红。
// 方法：从 tests/scripts/verify-ticket-05.mjs 与 src/store/index.ts 的当前原文派生 4 个变体，
//   仅两个自变量：① 写路径上限强制（有/无）；② 替身投递保真度（结构化克隆/按引用）。
//   派生改写共 3 处，对四个变体同等适用，不构成差异：
//     - ROOT 常量固化（脚本迁出 tests/scripts/ 的位置副产物）
//     - bundle 中 store 源文件路径（自变量①：指向去上限的临时副本）
//     - 替身 postMessage 的投递方式（自变量②：删克隆行 + 改回按引用）
//   断言面零改动：四个变体共用同一份断言文本。
// 用法：node .scratch/architecture-recovery/research/scripts/12-ab-cap-fidelity.mjs
// ================================================================
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const NL = String.fromCharCode(10);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
const GATE = join(ROOT, 'tests', 'scripts', 'verify-ticket-05.mjs');
const STORE = join(ROOT, 'src', 'store', 'index.ts');

const GATE_SRC = readFileSync(GATE, 'utf8');
const STORE_SRC = readFileSync(STORE, 'utf8');

const ROOT_LINE = "const ROOT = join(here, '..', '..');";
const STORE_REF = "  toModuleBody(join(ROOT, 'src', 'store', 'index.ts')),";
const CLONE_LINE = "      const data = structuredClone(msg);" + NL;
const DELIVER_LINE = "      for (const fn of inst._handlers) fn({ data, origin: DOC_ORIGIN });" + NL;
const DELIVER_REF = "      for (const fn of inst._handlers) fn({ data: msg, origin: DOC_ORIGIN });" + NL;
const CAP_LINE = "    if (r.overrides.length >= RULES_MAX_OVERRIDES) return null;" + NL;

const cnt = (s, n) => s.split(n).length - 1;
function need(s, n, label) {
  const c = cnt(s, n);
  if (c !== 1) { console.error('锚点不唯一 ' + label + ' count=' + c); process.exit(2); }
}
need(GATE_SRC, ROOT_LINE, 'ROOT_LINE');
need(GATE_SRC, STORE_REF, 'STORE_REF');
need(GATE_SRC, CLONE_LINE, 'CLONE_LINE');
need(GATE_SRC, DELIVER_LINE, 'DELIVER_LINE');
need(STORE_SRC, CAP_LINE, 'CAP_LINE');

const dir = mkdtempSync(join(tmpdir(), 'cch12-2x2-'));
const storeCapless = join(dir, 'store-capless.ts');
writeFileSync(storeCapless, STORE_SRC.replace(CAP_LINE, ''), 'utf8');

function build(capped, faithful) {
  let s = GATE_SRC.replace(ROOT_LINE, 'const ROOT = ' + JSON.stringify(ROOT) + ';');
  if (!capped) s = s.replace(STORE_REF, '  toModuleBody(' + JSON.stringify(storeCapless) + '),');
  if (!faithful) {
    s = s.replace(CLONE_LINE, '');
    s = s.replace(DELIVER_LINE, DELIVER_REF);
  }
  const p = join(dir, (capped ? 'cap' : 'nocap') + '-' + (faithful ? 'clone' : 'ref') + '.mjs');
  writeFileSync(p, s, 'utf8');
  return p;
}

function run(file) {
  let stdout = '', code = 0;
  try {
    stdout = execFileSync(process.execPath, [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stdout = String(e.stdout || '');
    code = e.status == null ? -1 : e.status;
  }
  const lines = stdout.split(NL);
  const s4 = lines.filter((l) => l.includes('S4 RULES_MAX_OVERRIDES')).join(' | ');
  const tot = lines.filter((l) => l.includes('ticket-05')).join('');
  return { code, s4: s4 || '(S4 断言行未输出)', tot: tot || '(无汇总行)' };
}

const cells = [
  ['A 写路径强制 + 结构化克隆（本票目标态）', build(true, true)],
  ['B 无写路径强制 + 结构化克隆（真实 BC 语义）', build(false, true)],
  ['C 无写路径强制 + 按引用投递（旧替身形态）', build(false, false)],
  ['D 写路径强制 + 按引用投递', build(true, false)],
];

console.log('=== 2x2 对照（自变量：写路径上限强制 / 替身投递保真度） ===');
for (const [name, file] of cells) {
  const r = run(file);
  console.log((r.code === 0 ? '[GREEN] ' : '[RED]   ') + name);
  console.log('        exit=' + r.code + '  ' + r.tot);
  console.log('        S4: ' + r.s4);
}
rmSync(dir, { recursive: true, force: true });
console.log('临时目录已清理: ' + dir);
