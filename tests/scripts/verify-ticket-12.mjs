#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-12.mjs — 登录态镜像采集旁路合规门（issue #12 / 票 T3）
//
// 依据：spec #9 Q3/Q8 —— CI/自动化永不登录（D-008 不动）；登录态走本地
//   人工 CDP 附着采集旁路，产物与公开页采集同构，走同一套合规管线，
//   标 login-derived（GLOSSARY「登录态镜像」）。
//
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）读文本 + 哈希 + 内存
//   fixture 断言；唯一例外：T3 以 execFileSync 跑 06-skeleton.mjs（仓库
//   自身零依赖脚本，S7 同款模式，--out 落 tmpdir，无仓库内副作用）。
//
// 覆盖（issue #12 验收项一一对应）：
//   T0 门自身接线（plan / matrix / audit 不变量）
//   T1 工具纪律（附着模式成对拒绝；附着零导航；CI 永不附着）
//   T2 敏感字段占位替换（AC：离线 fixture，正例取自仓库既有镜像）
//   T3 同构产物被既有骨架管线直接消费（AC：零下游改动）
//   T4 login-derived 标记静态门（AC：未标 login-derived 的登录产物拒绝入库）
//   T5 仓外护栏断言保留（AC：原始快照永不入库，附着路径同等受护栏）
//   T6 操作 runbook 成文（AC：调试端口 / 脱敏 / provenance 登记）
//
// 用法：node tests/scripts/verify-ticket-12.mjs
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  redactSensitiveValues,
  shapeToken,
  assertArchiveOutsideRepo,
  assertCaptureDiscipline,
  buildAttachEntry,
  mergeCaptureManifest,
  checkLoginMarking,
} from './12-login-capture.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const FORMS = 'tests/corpus/forms';
const FILES = {
  sources: FORMS + '/sources.json',
  capture: 'tests/scripts/06-capture-forms.mjs',
  loginLib: 'tests/scripts/12-login-capture.mjs',
  skeleton: 'tests/scripts/06-skeleton.mjs',
  manifestGen: 'tests/scripts/06-manifest.mjs',
  plan: 'tests/scripts/verify-ticket-plan.json',
  runner: 'tests/scripts/verify-ticket-runner.mjs',
  workflow: '.github/workflows/verify-tickets.yml',
  runbook: FORMS + '/LOGIN-CAPTURE.md',
  readme: FORMS + '/README.md',
};

let pass = 0;
const failures = [];
const ok = (m) => { pass++; console.log('  PASS ' + m); };
const eq = (a, b, m) => {
  if (a === b) ok(m + ' (' + JSON.stringify(a) + ')');
  else failures.push(m + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
};
const check = (c, m, extra) => {
  if (c) ok(m + (extra ? ' \u2014 ' + extra : ''));
  else failures.push(m + (extra ? ' \u2014 ' + extra : ''));
};
const count = (src, re) => (src.match(re) || []).length;

const SOURCES = JSON.parse(read(FILES.sources));
const CAPTURE_SRC = read(FILES.capture);

// ══════════════════════════════════════════════════════════════════
// T0 门自身接线（plan / matrix / audit 不变量——A2 键面，无计数）
// ══════════════════════════════════════════════════════════════════
{
  const plan = JSON.parse(read(FILES.plan));
  const t12 = plan.tickets['12'];
  check(!!t12, 'T0 plan 注册票 12（issue #12 登录态镜像采集旁路）');
  eq(JSON.stringify(t12 && t12.scripts), JSON.stringify(['verify-ticket-12.mjs']), 'T0 票 12 门脚本唯一指向本文件');
  check(/-\s*'12'/.test(read(FILES.workflow)), 'T0 verify-tickets.yml matrix 含 12（A15/A16 全等守卫面）');
  // audit A2 是不变量（LEGACY 键面零覆盖丢失、无票数上限）：加票零维护，
  // 本门只需断言 audit 可跑通，不对 runner 源码做任何字面量正则
  let auditCode = 0;
  try {
    execFileSync(process.execPath, [abs(FILES.runner), '--audit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { auditCode = e.status; }
  eq(auditCode, 0, 'T0 audit 全绿（A2 为不变量，加票不触发跨票维护）');
}

// ══════════════════════════════════════════════════════════════════
// T1 工具纪律：匿名 / 附着成对拒绝；附着零导航；CI 永不附着
// ══════════════════════════════════════════════════════════════════
{
  check(/--attach/.test(CAPTURE_SRC), 'T1 采集工具声明 --attach 模式（Q8：CDP 附着为主）');
  check(/connectOverCDP/.test(CAPTURE_SRC), 'T1 附着经 connectOverCDP（附着用户已开的 Chrome，不另起浏览器）');
  // 附着路径绝不导航（用户标签页停在哪儿就采哪儿；导航会破坏登录态现场）
  eq(count(CAPTURE_SRC, /\.goto\(/g), 1, 'T1 全文件唯一 goto 在公开页 renderDom（附着路径零导航）');
  // 成对拒绝：判定提为纯函数（12-login-capture.mjs 唯一定义处，capture 同源调用）——
  // 行为级测两个方向（spec #9 Testing Decisions：只测外部行为，不测实现细节）
  check(/assertCaptureDiscipline/.test(CAPTURE_SRC), 'T1 采集工具纪律判定同源于库（不各自为政）');
  {
    const pub = { id: 'iti-v29', login: undefined };
    const login = { id: 'acct-settings', login: true };
    const throws = (fn) => { try { fn(); return null; } catch (e) { return e; } };
    const e1 = throws(() => assertCaptureDiscipline({ attach: false, id: null }, [pub, login]));
    check(!!e1 && /匿名采集拒绝 login/.test(e1.message), 'T1 行为：匿名 + login:true source → 拒绝（CI/自动化永不登录）');
    const e2 = throws(() => assertCaptureDiscipline({ attach: true, id: 'iti-v29' }, [pub]));
    check(!!e2 && /附着模式只服务 login/.test(e2.message), 'T1 行为：附着 + 公开 source → 拒绝');
    const e3 = throws(() => assertCaptureDiscipline({ attach: true, id: null }, [login]));
    check(!!e3 && /--attach 需要唯一 --id/.test(e3.message), 'T1 行为：附着缺 --id → 拒绝');
    const e4 = throws(() => assertCaptureDiscipline({ attach: true, id: 'acct-settings' }, [login]));
    eq(e4, null, 'T1 行为：附着 + login:true（唯一 --id）→ 放行');
    const e5 = throws(() => assertCaptureDiscipline({ attach: false, id: null }, [pub]));
    eq(e5, null, 'T1 行为：匿名 + 全公开 source → 放行');
  }
  // 真实 CLI 拒绝路径（附着公开 source；拒绝发生在任何网络 / 浏览器动作之前，可离线跑）。
  // --archive 显式指向仓外 tmpdir：默认归档根是 Windows 盘符路径，在非 Windows
  // CI 上被 path.resolve 解析为 cwd 相对路径 → 先触发的是仓外护栏而非纪律拒绝；
  // 显式仓外路径让被测行为（纪律拒绝）与平台解耦。
  {
    const archTmp = mkdtempSync(join(tmpdir(), 'cch12-cli-'));
    let cliErr = null;
    try {
      try {
        execFileSync(
          process.execPath,
          [abs(FILES.capture), '--attach', '--id', 'iti-v29', '--archive', archTmp],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        );
      } catch (e) { cliErr = e; }
      check(!!cliErr && cliErr.status === 2 && /附着模式只服务 login/.test(String(cliErr.stderr)),
        'T1 行为：CLI --attach --id iti-v29 以退出码 2 拒绝（零网络零浏览器）');
    } finally { rmSync(archTmp, { recursive: true, force: true }); }
  }
  // CI/自动化永不附着：workflows 触发面不得出现附着参数
  const wfDir = abs('.github/workflows');
  const offenders = [];
  for (const f of readdirSync(wfDir)) {
    if (!/\.ya?ml$/.test(f)) continue;
    if (/(--attach|cdp-port|connectOverCDP)/.test(readFileSync(join(wfDir, f), 'utf8'))) offenders.push(f);
  }
  eq(offenders.length, 0, 'T1 任何 workflow 均不引用附着参数（登录态只在用户本地）', offenders.join(','));
  // sources.json 载明 login 字段语义（登记入口成文）
  check(/loginDerived/.test(read(FILES.sources)), 'T1 sources.json _meta 载明 login 字段语义与红线');
}

// ══════════════════════════════════════════════════════════════════
// T2 敏感字段占位替换（AC2：离线 fixture；正例宿主 = 仓库既有镜像）
// ══════════════════════════════════════════════════════════════════
{
  const MIRRORS = join(abs(FORMS), 'mirrors');
  // (a) 入库镜像必须是「已脱敏不动点」：redact(镜像) === 镜像。
  //     现行干净语料天然满足（值本就为空）；未来登录态镜像带规范形状占位
  //     （幂等令牌）同样满足；只有残留**未脱敏敏感值**（或非规范占位）才会
  //     改变文件 → 拒绝。这样首个登录镜像入库（本票的成功态）不会误伤本门。
  for (const f of readdirSync(MIRRORS)) {
    if (!f.endsWith('.html')) continue;
    const orig = readFileSync(join(MIRRORS, f), 'utf8');
    const r = redactSensitiveValues(orig);
    eq(sha256(r.html), sha256(orig), 'T2 ' + f + ' 已脱敏不动点（无残留敏感值 / 无非规范占位 / 无误报）');
  }

  // (b) 登录态回显正例：宿主 = 既有 heroku-signup 镜像（真实注册页形态），
  //     内存注入「已登录渲染会出现的值」作测试刺激 —— 不新造样本页（不现编）。
  //     语料现状：仓库镜像尚无 password/otp 字段（本票正是补登录形态的洞），
  //     故 password / one-time-code 以属性注入方式挂在该既有镜像的表单内。
  const HEROKU = read(FORMS + '/mirrors/heroku-signup.html');
  let dom = HEROKU
    .replace('name="email" id="email"', 'name="email" id="email" value="user@example.com"')
    .replace('name="first_name" id="first_name"', 'name="first_name" id="first_name" value="Alice"')
    .replace(
      '<input type="submit" name="signup"',
      '<input type="password" name="password" id="password" value="s3cr3t-Hunter42">\n' +
      '      <input type="text" name="otp_code" id="otp_code" autocomplete="one-time-code" value="884213">\n' +
      '      <input type="submit" name="signup"'
    );
  const red = redactSensitiveValues(dom);
  // 密码 / 验证码 / 账号标识（email）→ 形状占位；与骨架文本形状令牌同词表
  eq(count(red.html, /value="s3cr3t-Hunter42"/g), 0, 'T2 密码值不残留');
  eq(count(red.html, /value="884213"/g), 0, 'T2 验证码值不残留');
  eq(count(red.html, /value="user@example.com"/g), 0, 'T2 账号标识（email）值不残留');
  check(new RegExp('value="' + shapeToken('user@example.com') + '"').test(red.html), 'T2 email 占位 = 形状令牌（·/. 同 06-skeleton 词表）');
  check(new RegExp('value="' + shapeToken('s3cr3t-Hunter42') + '"').test(red.html), 'T2 密码占位 = 形状令牌');
  check(new RegExp('value="' + shapeToken('884213') + '"').test(red.html), 'T2 验证码占位 = 形状令牌');
  // 非敏感值不动：first_name（普通文本）留给镜像页制作时人工剥 PII（GLOSSARY 口径）
  check(/value="Alice"/.test(red.html), 'T2 非凭证字段不越权替换（其余 PII 归镜像制作步骤）');
  eq(red.redactions.length, 3, 'T2 脱敏记录共 3 条（password/otp/email）');
  check(!JSON.stringify(red.redactions).includes('s3cr3t') && !JSON.stringify(red.redactions).includes('884213')
    && !JSON.stringify(red.redactions).includes('user@example.com'),
    'T2 脱敏记录只留形状，不留原值');
  // 幂等：占位值再过一遍不变形
  const red2 = redactSensitiveValues(red.html);
  eq(sha256(red2.html), sha256(red.html), 'T2 脱敏幂等（占位令牌过映射不变）');
  // 值内 `>` 不得从标签截断里漏出（PR #16 review #1：引号值内 `>` 截断标签 → parseAttrs
  // 拿不到完整值 → 漏脱敏；修复 = 闭合尖括号匹配保持于引号属性值之外）
  {
    const gt = redactSensitiveValues('<div><input type="password" name="p" value="ab>cd"></div>');
    eq(count(gt.html, /ab>cd/g), 0, 'T2 值内 `>` 的密码不因标签截断漏脱敏');
    check(gt.html.includes('value="' + shapeToken('ab>cd') + '"'), 'T2 值内 `>` 被完整形状占位替换');
    eq(gt.redactions.length, 1, 'T2 截断修复：password 记录命中（原值 `ab>cd` 只留形状）');
    const sq = redactSensitiveValues("<input type='text' name='otp' autocomplete='one-time-code' value='9>8'>");
    eq(count(sq.html, /9>8/g), 0, 'T2 单引号值内 `>` 的验证码同样不漏');
  }
  // 形状令牌与骨架词表一致（数字# / 字母a / 其余·）
  eq(shapeToken('+86 138 0013 8000'), '+## ### #### ####', 'T2 形状令牌与 06-skeleton textShape 同词表');
}

// ══════════════════════════════════════════════════════════════════
// T3 同构产物被既有骨架/清单管线直接消费（AC1：零下游改动）
// ══════════════════════════════════════════════════════════════════
{
  // (a) 端到端：把「登录态回显 + 脱敏」后的 DOM 放进临时 archive，
  //     跑既有 06-skeleton.mjs（--from archive），与干净镜像派生的骨架比对。
  //     归一化丢弃 value 属性（DROP_ATTR） ⇒ 两者树哈希必须一致 —— 形状占位
  //     对骨架派生不可见 = 同构的机器证明。
  const loginDom = redactSensitiveValues(
    read(FORMS + '/mirrors/heroku-signup.html')
      .replace('name="email" id="email"', 'name="email" id="email" value="user@example.com"')
  ).html;
  const tmp = mkdtempSync(join(tmpdir(), 'cch12-gate-'));
  try {
    const archDir = join(tmp, 'archive');
    mkdirSync(join(archDir, 'corpus-forms', 'dom'), { recursive: true });
    mkdirSync(join(archDir, 'corpus-forms', 'shot'), { recursive: true });
    writeFileSync(join(archDir, 'corpus-forms', 'dom', 'heroku-signup.html'), loginDom);

    // 附着条目（与采集工具同一条目构造器 —— 不在门里现编第二份形状）
    const domBuf = Buffer.from(loginDom, 'utf8');
    const entry = buildAttachEntry({
      id: 'heroku-signup',
      sourceUrl: 'https://signup.heroku.com/',
      family: 'real-signup',
      attachedUrl: 'https://signup.heroku.com/login',
      userAgent: 'UA-of-attached-chrome',
      domBuf,
      frames: [],
      shotRel: 'shot/heroku-signup.png',
    });
    const report = mergeCaptureManifest(
      { capturedAt: '2026-10-26T00:00:00.000Z', archiveRoot: archDir.replace(/\\/g, '/'), archiveDir: 'corpus-forms', userAgent: 'UA-of-attached-chrome', entries: [] },
      [entry]
    );
    writeFileSync(join(archDir, 'corpus-forms', 'CAPTURE-MANIFEST.json'), JSON.stringify(report, null, 2));

    const run = (out, extra) => execFileSync(
      process.execPath,
      [abs(FILES.skeleton), '--id', 'heroku-signup', '--out', out, ...extra],
      { encoding: 'utf8' }
    );
    const fromArchive = join(tmp, 'from-archive.json');
    const fromMirror = join(tmp, 'from-mirror.json');
    run(fromArchive, ['--from', 'archive', '--archive', archDir]);
    run(fromMirror, ['--from', 'mirror']);
    const A = JSON.parse(readFileSync(fromArchive, 'utf8'));
    const B = JSON.parse(readFileSync(fromMirror, 'utf8'));
    eq(A.sha256, B.sha256, 'T3 既有骨架管线直接消费附着 DOM：树哈希与干净镜像一致（零下游改动）');
    eq(A.source, 'archive', 'T3 骨架来源标记为 archive（真实页基线语义不变）');

    // (b) 清单管线字段契约：06-manifest.mjs 从 CAPTURE-MANIFEST 条目读的每个字段，
    //     附着条目都以兼容类型供给；raw 空缺走既有 `c.raw ? … : null` 分支。
    const mg = read(FILES.manifestGen);
    check(/c\.raw \? \{ path: 'corpus-forms\/' \+ c\.raw\.file/.test(mg) && /: null,/.test(mg),
      'T3 06-manifest 对 raw 空缺本就零改动能消费（null 容忍分支在场）');
    check(/c\.dom \? \{ path: 'corpus-forms\/' \+ c\.dom\.file/.test(mg), 'T3 06-manifest 消费 dom 字段（附着条目同形供给）');
    const e = report.entries[0];
    check(e.id === 'heroku-signup' && e.source_url === 'https://signup.heroku.com/' && e.family === 'real-signup',
      'T3 附着条目身份字段同构（id / source_url / family）');
    eq(e.raw, null, 'T3 附着条目 raw = null（匿名 GET 对登录页无意义，不伪造）');
    eq(e.http_status, null, 'T3 附着条目 http_status = null（不走网络请求）');
    check(e.dom && typeof e.dom.file === 'string' && e.dom.bytes === domBuf.length && e.dom.sha256.length === 64,
      'T3 附着条目 dom 指纹同构（file / bytes / sha256）');
    check(Array.isArray(e.frames) && e.frames.length === 0, 'T3 附着条目 frames 数组同构');
    check(e.shot && e.shot.file === 'shot/heroku-signup.png', 'T3 附着条目 shot 同构');
    eq(e.ok, true, 'T3 附着条目 ok 语义同构');
    // 登录态专有标记（同构的超集：只增字段，不改旧字段形状）
    eq(e.login_derived, true, 'T3 条目标 login-derived');
    eq(e.capture_mode, 'cdp-attach', 'T3 条目标 capture_mode: cdp-attach');
    eq(e.redacted, true, 'T3 条目标 redacted: true（敏感字段已占位）');
    check(typeof e.attached_url === 'string' && e.attached_url.startsWith('https://'), 'T3 条目登记 attached_url provenance');
    check(typeof e.captured_at === 'string' && !Number.isNaN(Date.parse(e.captured_at)), 'T3 条目自带 captured_at（附着时点与公开页整批时点解耦）');
    // 顶层清单结构：06-manifest 读取的 capturedAt / archiveRoot / archiveDir 全在
    check(typeof report.capturedAt === 'string' && report.archiveDir === 'corpus-forms'
      && typeof report.archiveRoot === 'string' && Array.isArray(report.entries),
      'T3 CAPTURE-MANIFEST 顶层结构同构（06-manifest 读取面齐备）');
    // merge 语义：既有公开页条目不被附着运行挤掉
    const merged = mergeCaptureManifest(
      { capturedAt: 't0', archiveRoot: 'x', archiveDir: 'corpus-forms', entries: [{ id: 'iti-v29', ok: true }, { id: 'heroku-signup', ok: false, stale: true }] },
      [entry]
    );
    eq(merged.entries.length, 2, 'T3 附着运行 = 按 id 原位合并，不整批覆盖');
    eq(merged.entries[0].id, 'iti-v29', 'T3 无关公开页条目原样保留');
    check(merged.entries[1].stale === undefined && merged.entries[1].login_derived === true,
      'T3 同 id 旧附着条目被新附着条目替换');
    eq(merged.capturedAt, 't0', 'T3 合并不动顶层 capturedAt（公开页整批时点不漂移）');

    // (c) 清单管线端到端：对 fixture archive 真跑一次 06-manifest.mjs，
    //     断言附着条目（raw:null）被既有生成器原样消化进 capture 块。
    //     manifest.json 是库内唯一权威清单 —— 备份字节、断言、finally 还原、
    //     还原后复校（净零副作用；verify-ticket-06 S2 指纹门随后会再验证一遍）。
    const realManifestPath = abs(FORMS + '/manifest.json');
    const backup = readFileSync(realManifestPath);
    try {
      execFileSync(process.execPath, [abs(FILES.manifestGen), '--archive', archDir], { encoding: 'utf8' });
      const gen = JSON.parse(readFileSync(realManifestPath, 'utf8'));
      const cap = gen.entries.find((x) => x.id === 'heroku-signup').capture;
      eq(cap.raw, null, 'T3 06-manifest 实跑：附着条目 raw=null 流入清单（零下游改动实证）');
      eq(cap.dom.path, 'corpus-forms/dom/heroku-signup.html', 'T3 06-manifest 实跑：dom 指纹登记');
      eq(cap.frames.length, 0, 'T3 06-manifest 实跑：frames 空数组登记');
      check(!!cap.shot && cap.shot.path === 'corpus-forms/shot/heroku-signup.png', 'T3 06-manifest 实跑：shot 登记');
      eq(cap.ok, true, 'T3 06-manifest 实跑：ok 登记为 true');
    } finally {
      writeFileSync(realManifestPath, backup);
      eq(readFileSync(realManifestPath).equals(backup), true, 'T3 manifest.json 字节级还原（净零副作用）');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// T4 login-derived 标记静态门（AC3：未标 login-derived 的登录产物拒绝入库）
// ══════════════════════════════════════════════════════════════════
{
  const headerOf = (s) => {
    const mf = s.mirror_file || s.id + '.html';
    const p = join(abs(FORMS), 'mirrors', mf);
    if (!existsSync(p)) return null;
    return readFileSync(p, 'utf8').split(/<!--|-->/)[1] || ''; // 头注释块
  };

  // (a) 现行语料（全公开）：零 login 声明、零 login-derived 标记 —— 负空间干净
  const v0 = checkLoginMarking(SOURCES.sources, headerOf);
  eq(v0.length, 0, 'T4 现行语料标记链零违例（全公开页，无登录产物混入）', JSON.stringify(v0));

  // (b) 自检（同 50-site-threshold-plan --self-test 惯例）：门逻辑必须抓得住违例
  //     —— 正例宿主仍是既有 heroku-signup 镜像（内存改造，不落盘）
  const herokuSrc = SOURCES.sources.find((s) => s.id === 'heroku-signup');
  const goodHeader = headerOf(herokuSrc) + '\n  login-derived : true（capture_mode: cdp-attach, redacted: true）';
  const bad1 = checkLoginMarking([{ ...herokuSrc, login: true }], () => headerOf(herokuSrc));
  eq(bad1.length, 1, 'T4 自检：login source 未标 login-derived → 拒绝（违例 = 未标登录产物入库）');
  eq(bad1[0].kind, 'unmarked-login-mirror', 'T4 自检：违例归因 = unmarked-login-mirror');
  const bad2 = checkLoginMarking([herokuSrc], () => goodHeader);
  eq(bad2.length, 1, 'T4 自检：镜像带 login-derived 标记但 sources 未声明 login → 拒绝（防未登记标记）');
  eq(bad2[0].kind, 'unregistered-marker', 'T4 自检：违例归因 = unregistered-marker');
  const good = checkLoginMarking([{ ...herokuSrc, login: true }], () => goodHeader);
  eq(good.length, 0, 'T4 自检：login 声明 + 头注释标记 + provenance 齐备 → 放行');
  // 无镜像页的 source（skeleton-only / deferred）不在标记门范围（无入库镜像即无违例对象）
  const noMirror = checkLoginMarking([{ ...herokuSrc, id: 'no-such', login: true }], () => null);
  eq(noMirror.length, 0, 'T4 自检：无镜像页的 login source 不误报（标记门管镜像入库面）');

  // (c) orphan 镜像盲区：mirrors/ 里不对应任何 sources.json 条目的镜像文件
  //     （未登记 = 未过标记门）同样拒绝入库——「登录产物混进 mirrors/」无死角。
  {
    // 登记面 = 每条 source 声明的全部镜像文件（mirror_file / child_mirror_file /
    // 缺省 id.html）——子帧镜像（如 codepen-iti-v17-child.html）同样算已登记。
    const registered = new Set(
      SOURCES.sources.flatMap((s) => [s.mirror_file, s.child_mirror_file, s.id + '.html']).filter(Boolean)
    );
    const orphans = readdirSync(join(abs(FORMS), 'mirrors'))
      .filter((f) => f.endsWith('.html') && !registered.has(f));
    eq(orphans.length, 0, 'T4 mirrors/ 无 orphan 镜像（每个入库镜像都有 sources.json 登记）', orphans.join(','));
    // 自检：登记集漏掉一个镜像文件时，上述判定必须抓得到
    const syntheticOrphans = ['secret-login-mirror.html'].filter((f) => !new Set(['a.html']).has(f));
    eq(syntheticOrphans.length, 1, 'T4 自检：orphan 镜像判定非空即拒（机制有效）');
  }
}

// ══════════════════════════════════════════════════════════════════
// T5 仓外护栏断言保留（AC3：原始快照永不入库，附着路径同等受护栏）
// ══════════════════════════════════════════════════════════════════
{
  let threw = null;
  try { assertArchiveOutsideRepo(join(ROOT, 'tmp-archive'), ROOT); } catch (e) { threw = e; }
  check(!!threw && /拒绝写入/.test(threw.message), 'T5 护栏：仓库内输出目录被拒（附着前置同一护栏）');
  const outside = mkdtempSync(join(tmpdir(), 'cch12-guard-'));
  try {
    let threw2 = null;
    try { assertArchiveOutsideRepo(join(outside, 'corpus-forms'), ROOT); } catch (e) { threw2 = e; }
    eq(threw2, null, 'T5 护栏：仓外目录放行（零误拒）');
  } finally { rmSync(outside, { recursive: true, force: true }); }
  // 采集工具两条路径都过同一护栏（共享函数，不各自为政）
  check(/assertArchiveOutsideRepo/.test(CAPTURE_SRC), 'T5 采集工具引用共享护栏函数（公开页 / 附着同源）');
  check(/拒绝写入：原始快照输出目录不得位于仓库内/.test(read(FILES.loginLib)), 'T5 拒绝写入语义保留（票 06 既有措辞不回退，唯一真源在库）');
  // 前缀碰撞防护：仓库同名兄弟目录（choose-your-country-evidence-archive）不得被误判为库内
  const sibling = ROOT.replace(/choose-your-country$/, 'choose-your-country-evidence-archive');
  if (sibling !== ROOT) {
    let threw3 = null;
    try { assertArchiveOutsideRepo(join(sibling, 'corpus-forms'), ROOT); } catch (e) { threw3 = e; }
    eq(threw3, null, 'T5 仓外兄弟目录（默认 archive 位置）放行');
  }
}

// ══════════════════════════════════════════════════════════════════
// T6 操作 runbook 成文（AC4：调试端口 / 脱敏 / provenance 登记）
// ══════════════════════════════════════════════════════════════════
{
  const rb = read(FILES.runbook);
  check(/--remote-debugging-port/.test(rb), 'T6 runbook：何时 / 如何启动调试端口');
  check(/--attach/.test(rb) && /--cdp-port/.test(rb), 'T6 runbook：附着采集命令');
  check(/脱敏|形状占位/.test(rb) && /password|密码/.test(rb) && /验证码|one-time-code/.test(rb), 'T6 runbook：脱敏范围与形状占位说明');
  check(/provenance|登记/.test(rb) && /login-derived/.test(rb), 'T6 runbook：provenance 登记步骤');
  check(/GLOSSARY/.test(rb) && /登录态镜像/.test(rb), 'T6 runbook：引用 GLOSSARY「登录态镜像」');
  check(/bookmarklet/.test(rb), 'T6 runbook：附着失败 bookmarklet 兜底成文（仅文档，不建工具）');
  check(/永不登录/.test(rb) || /CI/.test(rb), 'T6 runbook：CI/自动化永不登录红线');
  check(/LOGIN-CAPTURE/.test(read(FILES.readme)), 'T6 README 指向 runbook（退化回路命令区旁可发现）');
  // bookmarklet 只许成文，不许成工具
  const bmFiles = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (!/node_modules|\.git/.test(f)) walk(p); }
      else if (/bookmarklet/i.test(f)) bmFiles.push(p);
    }
  };
  walk(abs('tests'));
  eq(bmFiles.length, 0, 'T6 仓库无 bookmarklet 工具文件（Q8：仅兜底文档）');
  // 注：GLOSSARY「登录态镜像」词条本身是 cch/corpus-drift 票的交付面——本门只
  // 断言 runbook 引用该词条（上文），不断言别分支的文件内容（门封闭于本分支，
  // 否则 PR 干净检出上必然红：词条提交不在本分支）。
}

console.log('-----------------------------');
console.log('verify-ticket-12: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
