#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-43.mjs — 手工重构镜像结构门（issue #13 / 票 T4）
//
// 依据：spec #9 Q9 —— 手工重构镜像允许（GLOSSARY「手工重构镜像」）：
//   页面已不可访问、无法再重现时，凭截图 / 存档 / 记忆重建，标
//   source=reconstructed + provenance（重构依据），**永不参与结构比对**
//   （无可信基线，diff 只会误报）。
//
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）读文本 + 哈希断言；
//   例外（T3 同款模式，仓库自身零依赖脚本，产物落 tmpdir，净零副作用）：
//   execFileSync 跑 06-skeleton / 06-structural-diff / 06-manifest /
//   06-capture-forms（重构条目被跳过，零网络）与 verify-ticket-06（既有门）。
//
// 覆盖（issue #13 验收项一一对应）：
//   U0 门自身接线（plan / matrix / audit 期望数）
//   U1 AC1：reconstructed 条目入库可通过既有静态门（verify-ticket-06 实跑 0 FAIL）
//   U2 链条一致性（sources ↔ manifest ↔ skeleton ↔ 镜像头注释）
//   U3 AC2：结构 diff 对 reconstructed 显式 skip 留记录（不静默、不产判定），
//           且捕获条目 tier 判定 machinery 不受伤
//   U4 工具纪律（骨架派生确定性 / 非重构条目拒绝 / 重捕 skip 留记录 /
//           清单生成对「重构 + 抓取记录」互斥硬拒）
//   U5 AC3：README / sources.json / manifest _meta / GLOSSARY 增补成文（附 reason 惯例）
//   U6 负空间（存量 8 条捕获条目不受伤；e2e 验收面未纳入重构镜像）
//
// 用法：node tests/scripts/verify-ticket-43.mjs
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const FORMS = 'tests/corpus/forms';
const RID = 'twilio-iti-reconstructed';
const FILES = {
  sources: FORMS + '/sources.json',
  manifest: FORMS + '/manifest.json',
  readme: FORMS + '/README.md',
  mirror: FORMS + '/mirrors/' + RID + '.html',
  skeleton: FORMS + '/skeletons/' + RID + '.json',
  skeletonTool: 'tests/scripts/06-skeleton.mjs',
  diffTool: 'tests/scripts/06-structural-diff.mjs',
  manifestGen: 'tests/scripts/06-manifest.mjs',
  captureTool: 'tests/scripts/06-capture-forms.mjs',
  gate06: 'tests/scripts/verify-ticket-06.mjs',
  plan: 'tests/scripts/verify-ticket-plan.json',
  runner: 'tests/scripts/verify-ticket-runner.mjs',
  workflow: '.github/workflows/verify-tickets.yml',
  glossary: 'GLOSSARY.md',
  spec: 'tests/corpus-forms.spec.ts',
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

const SOURCES = JSON.parse(read(FILES.sources)).sources;
const MANIFEST = JSON.parse(read(FILES.manifest));
const RSRC = SOURCES.find((s) => s.id === RID);
const RENT = MANIFEST.entries.find((e) => e.id === RID);

// ══════════════════════════════════════════════════════════════════
// U0 门自身接线（plan / matrix / audit 期望数一致）
// ══════════════════════════════════════════════════════════════════
{
  const plan = JSON.parse(read(FILES.plan));
  const t43 = plan.tickets['43'];
  check(!!t43, 'U0 plan 注册票 43（issue #13 手工重构镜像）');
  eq(JSON.stringify(t43 && t43.scripts), JSON.stringify(['verify-ticket-43.mjs']), 'U0 票 43 门脚本唯一指向本文件');
  check(/-\s*'43'/.test(read(FILES.workflow)), 'U0 verify-tickets.yml matrix 含 43（A15/A16 全等守卫面）');
  // 票数期望是 runner 本地常量（加票在同票提交里自维护）；本门只断言 audit 可跑通
  let auditCode = 0;
  try {
    execFileSync(process.execPath, [abs(FILES.runner), '--audit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { auditCode = e.status; }
  eq(auditCode, 0, 'U0 audit 全绿（A2 票数期望由 runner 常量自维护）');
}

// ══════════════════════════════════════════════════════════════════
// U1 AC1：reconstructed 条目入库可通过既有静态门
// ══════════════════════════════════════════════════════════════════
{
  check(!!RSRC && RSRC.adoption === 'reconstructed', 'U1 sources.json 载有重构条目（adoption=reconstructed）');
  check(!!RENT, 'U1 manifest.json 载有重构条目');
  // 既有门实跑（离线；S7 会派生骨架两次，秒级）——重构条目在场时必须全绿
  let out = null, code = 0;
  try {
    out = execFileSync(process.execPath, [abs(FILES.gate06)], { encoding: 'utf8' });
  } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  eq(code, 0, 'U1 verify-ticket-06 退出码 0（重构条目入库后既有静态门不红）');
  check(/verify-ticket-06: \d+ PASS, 0 FAIL/.test(out), 'U1 verify-ticket-06 汇总 0 FAIL（AC1 实证）');
}

// ══════════════════════════════════════════════════════════════════
// U2 链条一致性（sources ↔ manifest ↔ skeleton ↔ 镜像头注释）
// ══════════════════════════════════════════════════════════════════
{
  // sources → manifest
  eq(RENT.adoption, 'reconstructed', 'U2 manifest adoption=reconstructed');
  eq(RENT.provenance, RSRC.provenance, 'U2 manifest provenance 与 sources 一致（重构依据不二写）');
  check(!('captured_at' in RENT), 'U2 manifest 重构条目无 captured_at（页面不可重现，无捕获时点）');
  check(!('capture' in RENT), 'U2 manifest 重构条目无 capture 块（不伪造抓取记录）');
  check(!!RENT.mirror && !!RENT.skeleton, 'U2 manifest 重构条目有镜像页 + 结构骨架（形态语料三层不缺层）');
  eq(RENT.skeleton.derived_from, 'reconstructed', 'U2 manifest skeleton.derived_from=reconstructed');

  // manifest ↔ skeleton 文件
  const skel = JSON.parse(read(FILES.skeleton));
  eq(skel.source, 'reconstructed', 'U2 骨架文件 source=reconstructed');
  eq(skel.provenance, RSRC.provenance, 'U2 骨架文件随附 provenance（= sources 重构依据）');
  eq(sha256(JSON.stringify(skel.tree)), skel.sha256, 'U2 骨架内部树哈希自校验');
  check(skel.source_file.startsWith('tests/corpus/forms/mirrors/'), 'U2 骨架 source_file 指向重构镜像页', skel.source_file);

  // skeleton ↔ mirror 头注释
  const html = read(FILES.mirror);
  check(/source\s*:\s*reconstructed/.test(html), 'U2 镜像头注释标 source: reconstructed');
  for (const key of ['source_url', 'reconstructed_at', 'mirror_of', 'provenance', 'license_note']) {
    check(html.indexOf(key) >= 0, 'U2 镜像头注释标注 ' + key);
  }
  check(html.indexOf('captured_at') < 0, 'U2 镜像头注释不标 captured_at（重构无捕获时点，不伪造）');

  // 镜像登记面：mirrors/ 内 html 恰 10 个，重构镜像已登记无 orphan
  const mirrorFiles = readdirSync(join(abs(FORMS), 'mirrors')).filter((f) => f.endsWith('.html'));
  eq(mirrorFiles.length, 10, 'U2 镜像页数 = 10（8 主 + 1 子帧 + 1 重构）');
  const registered = new Set(SOURCES.flatMap((s) => [s.mirror_file, s.child_mirror_file, s.id + '.html']).filter(Boolean));
  eq(mirrorFiles.filter((f) => !registered.has(f)).length, 0, 'U2 无 orphan 镜像（重构镜像同样须 sources 登记）');
}

// ══════════════════════════════════════════════════════════════════
// U3 AC2：结构 diff 显式 skip 留记录（不静默、不产判定）
// ══════════════════════════════════════════════════════════════════
{
  // (a) --id 模式：new 侧默认指向 archive 骨架（重构条目不存在）——skip 必须先于 new 侧加载
  let out = null, code = 0;
  try {
    out = execFileSync(process.execPath, [abs(FILES.diffTool), '--id', RID], { encoding: 'utf8' });
  } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  eq(code, 0, 'U3 --id 重构条目退出码 0（skip ≠ 判定 ≠ 失败）');
  check(out.indexOf('SKIP source=reconstructed') >= 0, 'U3 输出 SKIP 行（不静默）');
  check(out.indexOf('provenance:') >= 0 && out.indexOf(RSRC.provenance.slice(0, 12)) >= 0, 'U3 SKIP 记录随附 provenance（留记录）');
  check(!/tier:\s*[A-Z]+/.test(out), 'U3 不产 tier 判定（无 NONE/PATCH/MINOR/MAJOR）');

  // (b) --base 模式同轴：基线骨架 source=reconstructed 即 skip（通用面，不依赖 --id）
  const tmp = mkdtempSync(join(tmpdir(), 'cch43-diff-'));
  try {
    const baseCopy = join(tmp, 'base.json');
    copyFileSync(abs(FILES.skeleton), baseCopy);
    let out2 = null, code2 = 0;
    try {
      out2 = execFileSync(process.execPath, [abs(FILES.diffTool), '--base', baseCopy, '--new', baseCopy], { encoding: 'utf8' });
    } catch (e) { code2 = e.status; out2 = (e.stdout || '') + (e.stderr || ''); }
    eq(code2, 0, 'U3 --base 重构基线退出码 0');
    check(out2.indexOf('SKIP source=reconstructed') >= 0 && !/tier:\s*[A-Z]+/.test(out2), 'U3 --base 模式同轴 skip（不产判定）');

    // (b2) new 侧同轴（review #18）：捕获基线 × 重构 new（--base/--new 可任意拼）
    //      ——重构骨架出现在任一侧都不参与比对，否则会走常规 diff 误产 tier
    let out2b = null, code2b = 0;
    try {
      out2b = execFileSync(process.execPath, [abs(FILES.diffTool), '--base', abs(FORMS + '/skeletons/iti-v29.json'), '--new', baseCopy], { encoding: 'utf8' });
    } catch (e) { code2b = e.status; out2b = (e.stdout || '') + (e.stderr || ''); }
    eq(code2b, 0, 'U3 new 侧重构骨架退出码 0（skip ≠ 判定 ≠ 失败）');
    check(out2b.indexOf('SKIP source=reconstructed') >= 0 && out2b.indexOf('（new 侧）') >= 0 &&
      out2b.indexOf(RSRC.provenance.slice(0, 12)) >= 0 && !/tier:\s*[A-Z]+/.test(out2b),
      'U3 new 侧重构骨架同样 skip 并随附 provenance（不产判定）');
  } finally { rmSync(tmp, { recursive: true, force: true }); }

  // (c) 负空间：捕获条目 tier 判定 machinery 不受伤——iti-v29 自比对仍产 tier NONE
  const iti = abs(FORMS + '/skeletons/iti-v29.json');
  let out3 = null, code3 = 0;
  try {
    out3 = execFileSync(process.execPath, [abs(FILES.diffTool), '--base', iti, '--new', iti], { encoding: 'utf8' });
  } catch (e) { code3 = e.status; out3 = (e.stdout || '') + (e.stderr || ''); }
  eq(code3, 0, 'U3 捕获条目自比对退出码 0');
  check(/tier:\s*NONE/.test(out3), 'U3 捕获条目仍产 tier 判定（skip 只作用于 reconstructed，不误伤 diff 本体）');
}

// ══════════════════════════════════════════════════════════════════
// U4 工具纪律（派生确定性 / 成对拒绝 / 重捕 skip / 清单互斥硬拒）
// ══════════════════════════════════════════════════════════════════
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch43-tool-'));
  try {
    // (a) 骨架派生确定性（同源两次派生同哈希；source/provenance 戳记齐全）
    const run = (out) => execFileSync(
      process.execPath, [abs(FILES.skeletonTool), '--id', RID, '--from', 'reconstructed', '--out', out],
      { encoding: 'utf8' });
    const a = join(tmp, 'a.json'), b = join(tmp, 'b.json');
    run(a); run(b);
    eq(sha256(readFileSync(a)), sha256(readFileSync(b)), 'U4 同源两次派生重构骨架哈希一致（确定性归一化）');
    const ja = JSON.parse(readFileSync(a, 'utf8'));
    eq(ja.source, 'reconstructed', 'U4 派生骨架 source 戳记 reconstructed');
    eq(ja.provenance, RSRC.provenance, 'U4 派生骨架随附 provenance（= sources 重构依据）');

    // (b) 成对拒绝：--from reconstructed 只服务 adoption=reconstructed 条目（重构是显式登记动作）
    let cliErr = null;
    try {
      execFileSync(process.execPath, [abs(FILES.skeletonTool), '--id', 'iti-v29', '--from', 'reconstructed', '--out', join(tmp, 'x.json')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { cliErr = e; }
    check(!!cliErr && /只服务 adoption=reconstructed/.test(String(cliErr.stderr)),
      'U4 CLI --from reconstructed --id iti-v29 被拒（重构不可当派生选项滥用）');

    // (b2) 反向成对：reconstructed 条目不许经 mirror/archive 派生（否则 source/provenance
    //      被洗掉，结构比对失去排除依据）。不带 --out 即默认覆盖登记骨架的危险路径——
    //      拒绝必须先于写入，且登记骨架内容（source / provenance）原样。
    let cliErr2 = null;
    try {
      execFileSync(process.execPath, [abs(FILES.skeletonTool), '--id', RID, '--from', 'mirror'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { cliErr2 = e; }
    check(!!cliErr2 && /只许 --from reconstructed/.test(String(cliErr2.stderr)),
      'U4 CLI --id 重构条目 --from mirror 被拒（不洗 source/provenance）');
    const skelAfter = JSON.parse(read(FILES.skeleton));
    eq(skelAfter.source, 'reconstructed', 'U4 拒绝路径未覆盖登记骨架（source 仍 reconstructed）');
    eq(skelAfter.provenance, RSRC.provenance, 'U4 拒绝路径未洗掉 provenance（登记骨架字节原样）');

    // (c) 重捕 skip 留记录（零网络：单跑重构条目即被跳过；重构-only = 空运行）
    const arch = join(tmp, 'archive');
    let capOut = null, capCode = 0;
    try {
      capOut = execFileSync(process.execPath, [abs(FILES.captureTool), '--id', RID, '--archive', arch, '--no-render'], { encoding: 'utf8' });
    } catch (e) { capCode = e.status; capOut = (e.stdout || '') + (e.stderr || ''); }
    eq(capCode, 0, 'U4 重捕工具对重构条目退出码 0（skip ≠ 失败）');
    check(capOut.indexOf('SKIP ' + RID) >= 0 && capOut.indexOf('source=reconstructed') >= 0,
      'U4 重捕输出 SKIP 行留记录（附 reason：source=reconstructed）');
    check(!/^OK  /m.test(capOut) && !/^FAIL/m.test(capOut), 'U4 重捕未发起任何抓取（零网络实证）');
    // 空运行不落盘（review #18）：全新 archive 上不新建台账（不伪造抓取记录）
    const ledgerPath = join(arch, 'corpus-forms', 'CAPTURE-MANIFEST.json');
    check(!existsSync(ledgerPath), 'U4 重构-only 空运行不新建 CAPTURE-MANIFEST（fresh archive 零副作用）');
    // 既有台账字节不变（数据完整性）：空运行不得以空 entries 覆盖既有抓取记录
    const sentinel = JSON.stringify({
      capturedAt: 'sentinel-2026-10-26T00:00:00.000Z', archiveRoot: arch.replace(/\\/g, '/'),
      archiveDir: 'corpus-forms', userAgent: 'sentinel', entries: [{ id: 'iti-v29', ok: true }],
    }, null, 2) + '\n';
    writeFileSync(ledgerPath, sentinel);
    let capCode2 = 0;
    try { execFileSync(process.execPath, [abs(FILES.captureTool), '--id', RID, '--archive', arch, '--no-render'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { capCode2 = e.status; }
    eq(capCode2, 0, 'U4 既有台账下重构-only 运行退出码 0');
    eq(readFileSync(ledgerPath, 'utf8'), sentinel, 'U4 既有台账字节不变（空运行不清空抓取记录）');

    // (d) 清单互斥硬拒：重构条目出现抓取记录 = 标记矛盾，生成器整体拒绝（清单是权威账本）
    const badArch = join(tmp, 'bad-archive');
    mkdirSync(join(badArch, 'corpus-forms'), { recursive: true });
    writeFileSync(join(badArch, 'corpus-forms', 'CAPTURE-MANIFEST.json'), JSON.stringify({
      capturedAt: '2026-10-26T00:00:00.000Z', archiveRoot: badArch.replace(/\\/g, '/'), archiveDir: 'corpus-forms',
      userAgent: 'fixture', entries: [{ id: RID, source_url: RSRC.url, family: RSRC.family, ok: true }],
    }, null, 2));
    const realManifestPath = abs(FILES.manifest);
    const backup = readFileSync(realManifestPath);
    let mgErr = null;
    try {
      execFileSync(process.execPath, [abs(FILES.manifestGen), '--archive', badArch], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { mgErr = e; }
    check(!!mgErr && /不得有抓取记录|标记矛盾/.test(String(mgErr.stderr)),
      'U4 清单生成对「重构 + 抓取记录」互斥硬拒（页面不可重现与抓取成功互斥）');
    eq(readFileSync(realManifestPath).equals(backup), true, 'U4 拒绝路径零副作用（manifest.json 字节不变）');

    // (e) --from-ledger：本机无 archive 时的确定性再生成——旧条目逐字段稳定、净副作用为零
    const backup2 = readFileSync(realManifestPath);
    let lgCode = 0, lgOut = '';
    try {
      lgOut = execFileSync(process.execPath, [abs(FILES.manifestGen), '--from-ledger'], { encoding: 'utf8' });
    } catch (e) { lgCode = e.status; lgOut = (e.stdout || '') + (e.stderr || ''); }
    try {
      eq(lgCode, 0, 'U4 --from-ledger 再生成退出码 0（无 archive 亦可）');
      check(/ledger round-trip/.test(lgOut), 'U4 再生成来源标注 ledger round-trip');
      const regen = JSON.parse(readFileSync(realManifestPath, 'utf8'));
      eq(JSON.stringify(regen.entries), JSON.stringify(JSON.parse(backup2).entries),
        'U4 --from-ledger 旧条目逐字段稳定（仅 generated_at 变）');
    } finally {
      writeFileSync(realManifestPath, backup2);
      eq(readFileSync(realManifestPath).equals(backup2), true, 'U4 --from-ledger 后 manifest.json 字节级还原（净副作用为零）');
    }

    // (e2) 反向（review #24）：sources.json 丢一条 → 旧条目消失属破坏性删除，拒绝写入
    //      （id 集守恒；缺条不得静默落盘）
    const srcPath = abs(FILES.sources);
    const srcBackup = readFileSync(srcPath);
    try {
      const doc = JSON.parse(srcBackup);
      doc.sources = doc.sources.filter((s) => s.id !== 'chosen-select');
      writeFileSync(srcPath, JSON.stringify(doc, null, 2) + '\n');
      let missCode = 0, missErr = '';
      try {
        execFileSync(process.execPath, [abs(FILES.manifestGen), '--from-ledger'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { missCode = e.status; missErr = String(e.stderr); }
      eq(missCode, 1, 'U4 --from-ledger 对旧条目消失拒绝写入（id 集守恒）');
      check(/台账漂移/.test(missErr) && /chosen-select/.test(missErr), 'U4 拒绝信息点名缺失条目');
      eq(readFileSync(realManifestPath).equals(backup2), true, 'U4 缺条拒绝路径零副作用（manifest.json 不变）');
    } finally {
      writeFileSync(srcPath, srcBackup);
      eq(readFileSync(srcPath).equals(srcBackup), true, 'U4 sources.json 字节级还原');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// U5 AC3：文档与语义增补（沿用「附 reason」惯例）
// ══════════════════════════════════════════════════════════════════
{
  const src = read(FILES.sources);
  check(/reconstructed = 手工重构镜像入库/.test(src) && /provenance（重构依据，即「附 reason」惯例）/.test(src),
    'U5 sources.json adoptionValues 增补 reconstructed 语义（附 reason 惯例）');
  const md = read(FILES.readme);
  check(/手工重构镜像/.test(md) && /不参与结构比对|结构比对.*跳过/.test(md), 'U5 README 载明手工重构镜像与结构比对排除');
  check(/source=reconstructed/.test(md) && /provenance/.test(md), 'U5 README 载明 source=reconstructed + provenance 契约');
  check(/reconstructed/.test(read(FILES.skeletonTool)) && /--from reconstructed/.test(read(FILES.skeletonTool)),
    'U5 骨架工具用法成文（--from reconstructed）');
  check(/reconstructed/.test(read(FILES.diffTool)) && /SKIP/.test(read(FILES.diffTool)),
    'U5 结构 diff 排除纪律成文（skip 显式留记录）');
  check(/reconstructed 条目（手工重构镜像，GLOSSARY）以 provenance（重构依据）替代 captured_at/.test(read(FILES.manifest)),
    'U5 manifest _meta 合规口径增补（provenance 替代 captured_at）');
  check(/手工重构镜像/.test(read(FILES.glossary)) && /不参与结构比对/.test(read(FILES.glossary)),
    'U5 GLOSSARY 载有「手工重构镜像」定义（票 7843f68 落盘，Q9 词汇）');
}

// ══════════════════════════════════════════════════════════════════
// U6 负空间（存量 8 条捕获条目不受伤；e2e 验收面未纳入重构镜像）
// ══════════════════════════════════════════════════════════════════
{
  const captured = MANIFEST.entries.filter((e) => e.id !== RID);
  eq(captured.length, 8, 'U6 存量捕获条目仍为 8 条');
  check(captured.every((e) => e.adoption === 'adopted'), 'U6 存量条目 adoption 全 adopted（重构支持不改 lifecycle）');
  check(captured.every((e) => 'captured_at' in e && e.capture && e.capture.raw && e.capture.dom),
    'U6 存量条目 captured_at / capture 指纹原样（无可信基线者只有重构条目）');
  const skelAll = readdirSync(join(abs(FORMS), 'skeletons')).filter((f) => f.endsWith('.json'));
  eq(skelAll.length, 9, 'U6 骨架文件恰 9 份（8 捕获 + 1 重构）');
  check(captured.every((e) => JSON.parse(read(FORMS + '/skeletons/' + e.id + '.json')).source === 'archive'),
    'U6 存量骨架 source 全 archive（真实页基线语义不变）');
  check(read(FILES.spec).indexOf(RID) < 0,
    'U6 e2e 验收面（corpus-forms.spec BASELINE）未纳入重构镜像（recorded 基线只锁捕获页）');
}

console.log('-----------------------------');
console.log('verify-ticket-43: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
