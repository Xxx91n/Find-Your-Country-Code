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
//   P0 门自身接线（plan 注册 + audit 全绿；matrix 面由 A15/A16 守，不另设解析）
//   P1 镜像保真：原样镜像 audit 全绿（负例基线，防止镜像本身是坏的就乱报）
//   N1 删一个 LEGACY 键 → A2 与 A4 同红（不变量真的在守）
//   N2 删一个**新**键（非 LEGACY）→ A2 保持绿，A16 红（不变量不越权）
//   N3 plan 加键但 matrix 缺行 → A15 红（新增面的等全守卫仍在）
//   N4 plan 加键 + matrix 区块外的裸列表项 → A15 仍红（区块外不算覆盖）
//   N5 matrix 区块改名 → A14b/A15 红（解析不到 ≠ 全覆盖，fail-closed）
//   N6 matrix 内注释不打断解析（YAML 注释不结束结构）
//   N7 双引号票号正常解析（合法项不静默跳过）
//   N8 后续 job 的 ticket 列表不被冒充（搜索止于本 matrix 区块）
//   N9 对象型条目内的同名 ticket: 不冒充票号轴（只认直接子键）
//   N10 flush 序列写法（与 ticket: 同缩进）正常解析
//   N11 不支持的列表项 → A14b/A15 红（解析不了即 fail-closed）
//   N12 后续 job 的数值型 matrix 项不被当成插入锚点（只认本 matrix.ticket）
//   N13 双引号票号列表也能找到锚点并保持引号风格（与 audit 同口径）
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

// 在 `matrix: ticket:` 列表区间末尾插入一行（沿用末项自身缩进，不写死空格数）。
// 区间口径与 runner 的 matrixTicketKeys 一致：只认 `matrix:` 的直接子键 `ticket:`，
// 区块与列表都止于缩进回退——否则后续 job 的数值型 matrix 项会被当成「最后一项」
// 而把票号插到别的矩阵里（P2 随之假红，且假绿无从谈起）。
// 返回锚点信息供调用方核验位置：不把票号写死在这里（否则下一张票落地时本门变红，
// 正是 #20 要消除的跨票耦合）。
// 与 runner 的 matrixTicketKeys 同口径的票号项：单引号 / 双引号 / 裸非纯数字。
// 只认单引号会让「workflow 改用双引号」时 addMatrixKey 找不到锚点而抛错，
// 尽管 audit 那边完全接受该写法。
const TICKET_KEY = /^[0-9][0-9a-z-]*$/;
function ticketItemOf(line) {
  const m = /^(\s*)-\s+(.*)$/.exec(line);
  if (!m) return null;
  const quoted = /^(['"])(.*)\1\s*(#.*)?$/.exec(m[2]);
  if (quoted) return TICKET_KEY.test(quoted[2])
    ? { indent: m[1], value: quoted[2], quote: quoted[1] }
    : null;
  const bare = /^([0-9][0-9a-z-]*)\s*(#.*)?$/.exec(m[2]);
  // 裸纯数字在 YAML 里是整数，与字符串键不等价，不算票号项
  if (!bare || /^[0-9]+$/.test(bare[1])) return null;
  return { indent: m[1], value: bare[1], quote: null };
}

// 锚点下一行是否为缩进一致的票号项（与引号风格无关）
function followsWithKey(line, indent, key) {
  const item = line == null ? null : ticketItemOf(line);
  return !!item && item.indent === indent && item.value === key;
}
function addMatrixKey(root, key) {
  const p = join(root, FILES.workflow);
  const src = readFileSync(p, 'utf8');
  const lines = src.split('\n');
  const indentOf = (l) => l.match(/^\s*/)[0].length;
  const isSkippable = (l) => !l.trim() || /^\s*#/.test(l);

  const matrixAt = lines.findIndex((l) => /^(\s*)matrix:\s*(#.*)?$/.test(l));
  if (matrixAt < 0) throw new Error('mirror workflow has no matrix block: ' + FILES.workflow);
  const matrixIndent = indentOf(lines[matrixAt]);

  let childIndent = -1;
  for (let i = matrixAt + 1; i < lines.length; i++) {
    if (isSkippable(lines[i])) continue;
    const ind = indentOf(lines[i]);
    if (ind <= matrixIndent) break;
    childIndent = ind;
    break;
  }

  let ticketAt = -1;
  for (let i = matrixAt + 1; i < lines.length; i++) {
    if (isSkippable(lines[i])) continue;
    const ind = indentOf(lines[i]);
    if (ind <= matrixIndent) break;
    if (ind === childIndent && /^\s*ticket:\s*(#.*)?$/.test(lines[i])) { ticketAt = i; break; }
  }
  if (ticketAt < 0) throw new Error('mirror workflow has no matrix.ticket list: ' + FILES.workflow);

  const ticketIndent = indentOf(lines[ticketAt]);
  let lastAt = -1;
  let lastItem = null;
  for (let i = ticketAt + 1; i < lines.length; i++) {
    if (isSkippable(lines[i])) continue;
    const ind = indentOf(lines[i]);
    if (ind < ticketIndent) break;
    if (!/^\s*-\s+/.test(lines[i])) {
      if (ind === ticketIndent) break;
      continue;
    }
    const item = ticketItemOf(lines[i]);
    if (item) { lastAt = i; lastItem = item; }
  }
  if (lastAt < 0) throw new Error('mirror matrix.ticket has no ticket items: ' + FILES.workflow);

  const anchorLine = lines[lastAt];
  const indent = lastItem.indent;
  // 新行沿用锚点的引号风格（双引号列表里不混入单引号）
  const rendered = lastItem.quote === '"' ? '"' + key + '"' : "'" + key + "'";
  lines.splice(lastAt + 1, 0, indent + '- ' + rendered);
  writeFileSync(p, lines.join('\n'));
  return { anchorLine, indent };
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
  // matrix 接线不再单独断言：A15（每个 plan 键都在 matrix 内）与上面的
  // 「plan 含 46」合起来已蕴含「matrix 含 46」，重复断言只会引入第二套解析口径。
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
  check(sawFail(r.out, 'A15'), 'N4 A15 变红（matrix 区块外的列表项不算覆盖）');
}

// ══════════════════════════════════════════════════════════════════
// N5 matrix 区块被改名 → A14b/A15 红（解析不到要报「解析不到」，不是「缺票」）
//   锁住 fail-closed：找不到 `matrix:`/`ticket:` 时绝不能当作「全都覆盖了」。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      const p = join(root, FILES.workflow);
      writeFileSync(p, readFileSync(p, 'utf8').replace(/^(\s*)matrix:/m, '$1matrix2:'));
    },
    runAudit
  );
  eq(r.code, 1, 'N5 matrix 区块改名后 audit 退出 1（红）');
  check(sawFail(r.out, 'A14b'), 'N5 A14b 变红（报解析不到 matrix，成因单一）');
  check(sawFail(r.out, 'A15'), 'N5 A15 变红（不把「解析不到」当作「全覆盖」）');
}

// ══════════════════════════════════════════════════════════════════
// N6 注释行不打断 matrix 区块与列表（#39 review）
//   YAML 里注释不结束结构。旧口径按缩进 break，`ticket:` 同缩进的注释行
//   会让列表提前结束 → 有效 workflow 被误判成「缺票」。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      const p = join(root, FILES.workflow);
      const src = readFileSync(p, 'utf8');
      // 在 ticket: 与其首项之间插一行同缩进注释，并在列表中部再插一行
      const withComment = src
        .replace(/^(\s*)ticket:\s*$/m, '$1ticket:\n$1# matrix 说明：注释不结束列表')
        .replace(/^(\s*)- '12'$/m, '$1# 中部注释\n$1- \'12\'');
      writeFileSync(p, withComment);
    },
    runAudit
  );
  eq(r.code, 0, 'N6 matrix 内注释不打断解析（audit 仍绿）');
  check(sawPass(r.out, 'A15') && sawPass(r.out, 'A16'), 'N6 A15/A16 皆 PASS（注释未截断票号清单）');
}

// ══════════════════════════════════════════════════════════════════
// N7 双引号票号 → 正常解析，不静默跳过（#39 review）
//   旧口径只认单引号，`- "99"` 被跳过：若 plan 键都在，A14b/A16 仍绿，
//   而 reusable 收到一个解析不出 plan 的票号。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      const p = join(root, FILES.workflow);
      writeFileSync(p, readFileSync(p, 'utf8').replace(/^(\s*)- '45'$/m, '$1- \'45\'\n$1- "99"'));
    },
    runAudit
  );
  eq(r.code, 0, 'N7 双引号票号被正常解析（audit 绿）');
  check(sawPass(r.out, 'A15') && sawPass(r.out, 'A16'), 'N7 A15/A16 皆 PASS（双引号项未被跳过）');
}

// ══════════════════════════════════════════════════════════════════
// N8 matrix 外的 ticket: 列表不被冒充（#39 review）
//   `ticket:` 的搜索必须止于本 matrix 区块；否则后续 job 的 ticket 列表
//   会被当成 caller 的票号清单，A15/A16 校验错了对象。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      const p = join(root, FILES.workflow);
      // 把真正的 ticket 列表改名（本 matrix 内不再有 ticket:），再在文件末尾
      // 追加另一个 job 的 matrix+ticket 列表。后续 job 的键必须比本 matrix 缩进
      // 更深，否则「全文件找更深缩进的 ticket:」的旧口径根本不会误命中——
      // 那样这条反例就是恒真的。
      const src = readFileSync(p, 'utf8')
        .replace(/^(\s*)ticket:\s*$/m, '$1ticket_list:')
        + '\necho_job:\n  strategy:\n          matrix:\n              ticket:\n                - \'99\'\n';
      writeFileSync(p, src);
    },
    runAudit
  );
  eq(r.code, 1, 'N8 本 matrix 无 ticket 列表时 audit 退出 1（红）');
  check(sawFail(r.out, 'A14b'), 'N8 A14b 变红（不拿后续 job 的 ticket 列表冒充）');
}

// ══════════════════════════════════════════════════════════════════
// N9 对象型 matrix 条目里的同名 ticket: 不冒充票号轴（#39 review 二轮）
//   `matrix.config.ticket` 是对象内部结构，不是矩阵维度。直接子键口径下
//   只认与 matrix 其余直接子键同缩进的那一个。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      const p = join(root, FILES.workflow);
      const src = readFileSync(p, 'utf8');
      // 在 matrix 内加一个对象型条目，其内部含同名 ticket:（含 plan 未知的 99）
      writeFileSync(p, src.replace(
        /^(\s*)ticket:\s*$/m,
        '$1config:\n$1  ticket:\n$1    - \'99\'\n$1ticket:'
      ));
    },
    runAudit
  );
  eq(r.code, 0, 'N9 对象型条目内的 ticket: 不被误取（audit 仍绿）');
  check(sawPass(r.out, 'A16'), 'N9 A16 PASS（99 未被当成 matrix 票号）');
}

// ══════════════════════════════════════════════════════════════════
// N10 flush 序列写法（同 `ticket:` 缩进）被正常解析（#39 review 二轮）
//   YAML 允许序列项与父键同缩进；旧口径按 `<= ticketIndent` 直接 break，
//   把这种合法写法判成空列表。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      const p = join(root, FILES.workflow);
      const src = readFileSync(p, 'utf8');
      // 把 10 空格缩进的列表项整体改成与 ticket: 同缩进的 flush 写法
      writeFileSync(p, src.replace(
        /^(\s*)ticket:\n((?:\s*- '[^']*'\n)+)/m,
        (m, ind, items) => ind + 'ticket:\n' +
          items.split('\n').filter(Boolean).map((l) => l.replace(/^ {10}/, '        ')).join('\n') + '\n'
      ));
    },
    runAudit
  );
  eq(r.code, 0, 'N10 flush 序列写法 audit 仍绿');
  check(sawPass(r.out, 'A15') && sawPass(r.out, 'A16'), 'N10 A15/A16 皆 PASS（flush 写法未被判成空列表）');
}

// ══════════════════════════════════════════════════════════════════
// N11 不支持的列表项 → A14b 必须红（#39 review 二轮 nitpick）
//   N7 证明合法项不被跳过；这里补反向：保留全部合法票号、只加一个解析不了
//   的项，A14b/A15 必须红——否则「静默跳过 + 其余键都在」会重新变绿。
// ══════════════════════════════════════════════════════════════════
{
  const r = withMirror(
    (root) => {
      const p = join(root, FILES.workflow);
      writeFileSync(p, readFileSync(p, 'utf8').replace(
        /^(\s*)- '45'$/m,
        '$1- \'45\'\n$1- \'not-a-ticket\''
      ));
    },
    runAudit
  );
  eq(r.code, 1, 'N11 含不支持的列表项时 audit 退出 1（红）');
  check(sawFail(r.out, 'A14b'), 'N11 A14b 变红（解析不了的项不静默跳过）');
  check(sawFail(r.out, 'A15'), 'N11 A15 变红（不把「少解析了一项」当作全覆盖）');
}

// ══════════════════════════════════════════════════════════════════
// N12 后续 job 的数值型 matrix 项不被当成插入锚点（#39 review 首轮 unverified）
//   addMatrixKey 曾全文件匹配 `- 'NN'`，后续 job 若有 `- '18'` 这类数值项，
//   票号会被插进那个矩阵（P2 假红）。改为与 audit 同口径：只用本 matrix 的
//   `ticket:` 列表区间。
// ══════════════════════════════════════════════════════════════════
{
  let anchor = null;
  let addError = null;
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      const p = join(root, FILES.workflow);
      // 追加一个后续 job，其 matrix 含数值型列表项——旧口径会选中它
      writeFileSync(p, readFileSync(p, 'utf8') +
        '\nsmoke:\n  strategy:\n    matrix:\n      node:\n        - \'18\'\n');
      try { anchor = addMatrixKey(root, '99'); } catch (e) { addError = e.message; }
    },
    (root) => {
      const audit = runAudit(root);
      const lines = readFileSync(join(root, FILES.workflow), 'utf8').split('\n');
      const at = anchor == null ? -1 : lines.findIndex((l) => l === anchor.anchorLine);
      const next = at < 0 ? null : lines[at + 1];
      // 后续 job 的 node 列表必须原样保留（未被插入）
      const smokeAt = lines.findIndex((l) => l.trim() === 'smoke:');
      const smokeTail = smokeAt < 0 ? [] : lines.slice(smokeAt);
      const nodeItems = smokeTail.filter((l) => /^\s*-\s+'/.test(l));
      return { audit, at, next, smokeUntouched: nodeItems.length === 1, nodeItems };
    }
  );
  const { audit, at, next, smokeUntouched, nodeItems } = r;
  eq(addError, null, 'N12 能找到 ticket 列表锚点（未抛错）');
  eq(audit.code, 0, 'N12 存在后续数值型 matrix job 时 audit 仍绿');
  // 与引号风格无关：只要求锚点下一行是缩进一致的票号项 '99'
  check(anchor != null && at >= 0 && followsWithKey(next, anchor.indent, '99'),
    'N12 票号插在 ticket 列表末项之后（未跑到后续 job）',
    JSON.stringify({ at, next }));
  check(smokeUntouched, 'N12 后续 job 的 matrix 未被改动', JSON.stringify(nodeItems));
}

// ══════════════════════════════════════════════════════════════════
// N13 workflow 改用双引号票号 → 仍能找到锚点（#39 review 四轮）
//   audit 接受双引号写法；若 addMatrixKey 只认单引号，会找不到锚点而抛错，
//   N12/P2 一起假红。新行还应沿用锚点的引号风格，避免列表里引号混杂。
// ══════════════════════════════════════════════════════════════════
{
  let anchor = null;
  let addError = null;
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      const p = join(root, FILES.workflow);
      // 把 ticket 列表整体改成双引号写法
      writeFileSync(p, readFileSync(p, 'utf8').replace(
        /^(\s*)- '([0-9][0-9a-z-]*)'$/gm,
        '$1- "$2"'
      ));
      try { anchor = addMatrixKey(root, '99'); } catch (e) { addError = e.message; }
    },
    (root) => {
      const audit = runAudit(root);
      const lines = readFileSync(join(root, FILES.workflow), 'utf8').split('\n');
      const at = anchor == null ? -1 : lines.findIndex((l) => l === anchor.anchorLine);
      const next = at < 0 ? null : lines[at + 1];
      return { audit, at, next };
    }
  );
  const { audit, at, next } = r;
  eq(addError, null, 'N13 双引号列表也能找到锚点（未抛错）');
  eq(audit.code, 0, 'N13 双引号列表下 audit 仍绿');
  check(anchor != null && at >= 0 && followsWithKey(next, anchor.indent, '99'),
    'N13 双引号列表也能定位并插入票号', JSON.stringify({ at, next }));
  check(next != null && next === anchor?.indent + '- "99"',
    'N13 新行沿用双引号风格（列表内引号一致）', JSON.stringify({ next }));
}

// ══════════════════════════════════════════════════════════════════
// P2 plan + matrix 同步加假票 → audit 全绿（无票数上限：加票零维护）
// ══════════════════════════════════════════════════════════════════
{
  let anchor = null;
  let addError = null;
  const r = withMirror(
    (root) => {
      editPlan(root, (plan) => { plan.tickets['99'] = FAKE; });
      try { anchor = addMatrixKey(root, '99'); } catch (e) { addError = e.message; }
    },
    (root) => {
      const audit = runAudit(root);
      // 位置核验（可失败）：假票必须**紧跟在插入前的最后一个 matrix 项之后**且缩进相同。
      // 锚点来自 addMatrixKey 的实际插入点，不写死任何票号——下一张票落地时本门不红。
      // 只数「全文出现几次 '99'」是恒真的——插入点跑到文件别处它照样通过。
      const lines = readFileSync(join(root, FILES.workflow), 'utf8').split('\n');
      const at = anchor == null ? -1 : lines.findIndex((l) => l.trim() === anchor.anchorLine.trim());
      const next = at < 0 ? null : lines[at + 1];
      const placement = { anchor: anchor == null ? null : anchor.anchorLine, at, next,
        ok: anchor != null && at >= 0 && followsWithKey(next, anchor.indent, '99') };
      return { audit, placement };
    }
  );
  const { audit, placement } = r;
  eq(addError, null, 'P2 能找到 ticket 列表锚点（未抛错）');
  eq(audit.code, 0, 'P2 新增票（plan + matrix 同步）后 audit 退出 0');
  check(sawPass(audit.out, 'A15') && sawPass(audit.out, 'A16'), 'P2 A15/A16 皆 PASS（假票真的进了 matrix，非注释蒙混）');
  check(sawPass(audit.out, 'A2'), 'P2 A2 仍为 PASS（无票数上限：加票零维护，AC2 实证）');
  check(placement.ok, 'P2 假票紧跟在原末项之后且缩进一致（插入点在 matrix 内）',
    JSON.stringify(placement));
}

console.log('-----------------------------');
console.log('verify-ticket-46: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
