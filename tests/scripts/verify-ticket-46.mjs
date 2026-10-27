#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-46.mjs — audit A2 不变量负例回归门（issue #20）
//
// 依据：issue #20 —— audit A2 曾是硬编码精确票数（20→21→22→…→24 每逢加票
//   手动 bump），跨票耦合。现 A2 改为不变量：LEGACY 全键必须在 plan 中
//   （键面零覆盖丢失），无票数上限，加票零维护。
//
// 本门守的是「不变量真的在守」——一个不能失败的门等于没有门
//   （docs/agents/review.md 第 5 问）。方法：把 runner + plan + workflows
//   复制到 tmpdir 镜像树，逐例改动后实跑 --audit，断言 A2/A4/A15/A16 的
//   红绿方向。**离线**（无网络、无浏览器、无 npm 依赖），仓库内零写入。
//
// 覆盖：
//   P0 门自身接线（plan / matrix / audit 全绿）
//   P1 镜像保真：原样镜像 audit 全绿（负例基线，防止镜像本身是坏的就乱报）
//   N1 删一个 LEGACY 键 → A2 与 A4 同红（不变量真的在守）
//   N2 删一个**新**键（非 LEGACY）→ A2 保持绿，A16 红（不变量不越权）
//   N3 plan 加键但 matrix 缺行 → A15 红（新增面的等全守卫仍在）
//   N4 plan 加键 + matrix 注释行 → A15 仍红（被注释的票不算覆盖）
//   P2 plan + matrix 同步加假票 → audit 全绿（无票数上限：加票零维护）
//
// 用法：node tests/scripts/verify-ticket-46.mjs
// ══════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');

const FILES = {
  plan: 'tests/scripts/verify-ticket-plan.json',
  runner: 'tests/scripts/verify-ticket-runner.mjs',
  workflow: '.github/workflows/verify-tickets.yml',
  scriptsDir: 'tests/scripts',
  workflowsDir: '.github/workflows',
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

// ── 镜像树：runner 以自身位置上溯 2 级锚定仓库根，plan 与脚本同目录 ──
function mirror() {
  const root = mkdtempSync(join(tmpdir(), 'cch46-'));
  mkdirSync(join(root, 'tests'), { recursive: true });
  mkdirSync(join(root, '.github'), { recursive: true });
  cpSync(abs(FILES.scriptsDir), join(root, FILES.scriptsDir), { recursive: true });
  cpSync(abs(FILES.workflowsDir), join(root, FILES.workflowsDir), { recursive: true });
  return root;
}

// 每例一个全新镜像，跑完必删——用例之间零状态泄漏。
function withMirror(mutate, body) {
  const root = mirror();
  try { mutate(root); return body(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function runAudit(root) {
  try {
    const out = execFileSync(process.execPath, [join(root, FILES.runner), '--audit'], {
      encoding: 'utf8', cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

// 断言某条 audit 断言的**方向**：label 是稳定契约（A2/A4/A15/A16），不是计数字面量。
const sawFail = (out, id) => new RegExp('^FAIL ' + id + '\\b', 'm').test(out);
const sawPass = (out, id) => new RegExp('^PASS ' + id + '\\b', 'm').test(out);

function editPlan(root, mutate) {
  const p = join(root, FILES.plan);
  const plan = JSON.parse(readFileSync(p, 'utf8'));
  mutate(plan);
  writeFileSync(p, JSON.stringify(plan, null, 2) + '\n');
}

const FAKE = { name: 'fake ticket proving no count cap (issue #20)', scripts: ['verify-ticket-46.mjs'] };

// 在 matrix 的**列表项区间**末尾插入一行（不改缩进假设：沿用同行最后一项的前缀）。
// 必须真的落在 `matrix: ticket:` 之下——发散的缩进会让插入变成注释块里的坏 YAML。
const MATRIX_ITEM = /^(\s*)-\s*'([0-9][0-9a-z-]*)'\s*$/gm;
function addMatrixKey(root, key) {
  const p = join(root, FILES.workflow);
  const src = readFileSync(p, 'utf8');
  const items = [...src.matchAll(MATRIX_ITEM)];
  if (!items.length) throw new Error('mirror matrix has no ticket items: ' + FILES.workflow);
  const last = items[items.length - 1];
  const indent = last[1];
  const at = last.index + last[0].length;
  writeFileSync(p, src.slice(0, at) + '\n' + indent + "- '" + key + "'" + src.slice(at));
}

// ══════════════════════════════════════════════════════════════════
// P0 门自身接线（plan / matrix / audit）
// ══════════════════════════════════════════════════════════════════
{
  const plan = JSON.parse(read(FILES.plan));
  const t46 = plan.tickets['46'];
  check(!!t46, 'P0 plan 注册票 46（issue #20 audit A2 不变量）');
  eq(JSON.stringify(t46 && t46.scripts), JSON.stringify(['verify-ticket-46.mjs']),
    'P0 票 46 门脚本唯一指向本文件');
  check(new RegExp("^\\s*-\\s*'46'\\s*$", 'm').test(read(FILES.workflow)),
    'P0 verify-tickets.yml matrix 含 46（A15/A16 全等守卫面）');
  const audit = runAudit(ROOT);
  eq(audit.code, 0, 'P0 仓库本体 audit 全绿');
}

// ══════════════════════════════════════════════════════════════════
// P1 镜像保真：原样镜像 audit 全绿，且 A2 为 PASS（负例的可信基线）
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(() => {}, runAudit);
  eq(r.code, 0, 'P1 原样镜像 audit 退出 0（镜像保真）');
  check(sawPass(r.out, 'A2'), 'P1 原样镜像 A2 为 PASS（负例基线成立）');
}

// ══════════════════════════════════════════════════════════════════
// N1 删一个 LEGACY 键 → A2 与 A4 同红（AC3：不变量真的在守）
// ══════════════════════════════════════════════════════════════════
{
  const legacyKey = '02-settings'; // 来自 LEGACY（冻结面），非本票新增
  const r = withMirror(
    (root) => editPlan(root, (plan) => {
      if (!plan.tickets[legacyKey]) throw new Error('mirror plan lacks LEGACY key ' + legacyKey);
      delete plan.tickets[legacyKey];
    }),
    runAudit
  );
  eq(r.code, 1, 'N1 删 LEGACY 键 ' + legacyKey + ' 后 audit 退出 1（红）');
  check(sawFail(r.out, 'A2'), 'N1 A2 变红（LEGACY 键面零覆盖丢失不变量在守）');
  check(sawFail(r.out, 'A4'), 'N1 A4 变红（脚本面零覆盖丢失同向）');
}

// ══════════════════════════════════════════════════════════════════
// N2 删一个**新**键 → A2 保持绿，A16 红（不变量不越权到新增面）
// ══════════════════════════════════════════════════════════════════
{
  const newKey = '45'; // 不在 LEGACY 中
  const r = withMirror(
    (root) => editPlan(root, (plan) => {
      if (!plan.tickets[newKey]) throw new Error('mirror plan lacks new key ' + newKey);
      delete plan.tickets[newKey];
    }),
    runAudit
  );
  eq(r.code, 1, 'N2 删新增键 ' + newKey + ' 后 audit 退出 1（红）');
  check(sawPass(r.out, 'A2'), 'N2 A2 仍为 PASS（不变量只守 LEGACY 键面，不写死新票）');
  check(sawFail(r.out, 'A16'), 'N2 A16 变红（matrix 含 plan 未知票，新增面删除由等全守卫捕获）');
}

// ══════════════════════════════════════════════════════════════════
// N3 plan 加键但 matrix 缺行 → A15 红（新增面同样受等全守卫约束）
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => editPlan(root, (plan) => { plan.tickets['99'] = FAKE; }),
    runAudit
  );
  eq(r.code, 1, 'N3 plan 加键但 matrix 缺行后 audit 退出 1（红）');
  check(sawFail(r.out, 'A15'), 'N3 A15 变红（caller matrix 必须覆盖每个 plan 键）');
}

// ══════════════════════════════════════════════════════════════════
// N4 matrix 外追加 `- 'NN'` 行 → A15 仍红（只认 matrix 区块内的列表项）
//   锁住 A15 的解析口径：文件别处的列表项 / 注释块里的票号不能冒充 matrix 覆盖。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      const p = join(root, FILES.workflow);
      // 裸列表项（非注释）挂到 matrix 之外的另一个键下：全文件扫 `- 'NN'`
      // 的旧口径会把它当成 matrix 覆盖。
      writeFileSync(p, readFileSync(p, 'utf8') + "\noff_matrix_tickets:\n  branches:\n    - '99'\n");
    },
    runAudit
  );
  eq(r.code, 1, 'N4 matrix 外声明票 99 时 audit 退出 1（红）');
  check(sawFail(r.out, 'A15'), 'N4 A15 变红（matrix 区块外的列表项/注释不算覆盖）');
}

// ══════════════════════════════════════════════════════════════════
// P2 plan + matrix 同步加假票 → audit 全绿（无票数上限：加票零维护）
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      addMatrixKey(root, '99');
    },
    (root) => {
      const audit = runAudit(root);
      // 反向核验插入位置：插入行必须是缩进对齐的真实列表项，不是注释块里的坏 YAML
      const inserted = [...readFileSync(join(root, FILES.workflow), 'utf8').matchAll(MATRIX_ITEM)]
        .map((m) => m[2]);
      return { audit, inserted };
    }
  );
  const { audit, inserted } = r;
  eq(audit.code, 0, 'P2 新增票（plan + matrix 同步）后 audit 退出 0');
  check(sawPass(audit.out, 'A15') && sawPass(audit.out, 'A16'), 'P2 A15/A16 皆 PASS（假票真的进了 matrix，非注释蒙混）');
  check(sawPass(audit.out, 'A2'), 'P2 A2 仍为 PASS（无票数上限：加票零维护，AC2 实证）');
  check(inserted.filter((k) => k === '99').length === 1,
    'P2 假票在 matrix 中恰出现一次（插入点解析正确）');
}

console.log('-----------------------------');
console.log('verify-ticket-46: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
