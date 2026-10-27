// ══════════════════════════════════════════════════════════════════
// verify-ticket-06.mjs — Cycle-6 票 06「形态语料三层架构」结构门（A-030）
// 方法：**离线**（无网络、无浏览器、无 npm 依赖）读文本 + 哈希 + 目录纪律断言。
// 覆盖：S0 自证 / S1 三层架构与目录纪律 / S2 指纹完整性 /
//   S3 合规口径（去品牌·去追踪·provenance）/ S4 原始快照不入库 /
//   S5 退化回路成文与工具链 / S6 命名正交 / S7 结构骨架确定性（含指定国别）/ S8 覆盖声明 /
//   S9 双探测口径同源 / S10 结构 diff 标签变化后继续递归子树（issue #33 负例）/
//   S11 采集国别固定与采集条件入台账（issue #34）.
// 用法：node tests/scripts/verify-ticket-06.mjs
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { before, containsToken } from './gate-assert.mjs';
import {
  DEFAULT_COUNTRY,
  IPAPI_LOOKUP_URL_RE,
  captureConditionFields,
  installCountryRoute,
  normalizeCountry,
  resolvedCountry,
} from './06-capture-country.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const sha256File = (p) => sha256(readFileSync(p));

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
const stripComments = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
// 可见正文文本（去注释 / script / style / 标签）——合规断言只针对「用户可见内容」
const bodyText = (html) => {
  let s = html.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<head[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const FORMS = 'tests/corpus/forms';
const FILES = {
  sources: FORMS + '/sources.json',
  manifest: FORMS + '/manifest.json',
  capture: 'tests/scripts/06-capture-forms.mjs',
  skeleton: 'tests/scripts/06-skeleton.mjs',
  diff: 'tests/scripts/06-structural-diff.mjs',
  manifestGen: 'tests/scripts/06-manifest.mjs',
  server: 'tests/server.mjs',
  spec: 'tests/corpus-forms.spec.ts',
  // Cycle-7 D-004：票级 workflow 已合并 —— verify-06.yml 删除，CI 挂接点 = 调用方
  // .github/workflows/verify-tickets.yml + tests/scripts/verify-ticket-plan.json 的 '06' 条目。
  workflow: '.github/workflows/verify-tickets.yml',
  // R1：双探测口径同源（防回归锁）
  probeCommon: 'tests/corpus/forms/probes/06-probe-common.mjs',
  probeMirrors: 'tests/corpus/forms/probes/06-probe-mirrors.mjs',
  probeReal: 'tests/corpus/forms/probes/06-probe-real.mjs',
  // issue #34：国别固定的唯一实现（工具与门共用，门断言的就是工具跑的）
  country: 'tests/scripts/06-capture-country.mjs',
  drift: 'tests/scripts/06-corpus-drift.mjs',
};

// ══════════════════════════════════════════════════════════════════
// S7 / S11 共用：仓库外 archive 的最小同构体（零网络、零浏览器）
//   骨架 --from archive 需要的现场只有 dom/<id>.html + CAPTURE-MANIFEST 条目；
//   两条路径（确定性、负例）用同一份构造，不各造各的。
//   conditions 三态：完整两键（正常）/ 只一个键（半登记负例）/ null（早于旋钮的旧台账）。
//   形状取自 spec #32 记录的本地离线渲染事实：placeholder 由国家决定
//   （us `201-555-0123` / jp `90-1234-5678`），国旗 class 同步换 iso2。
// ══════════════════════════════════════════════════════════════════
const ITI_SHAPE_HTML = (iso2, dial, placeholder) => [
  '<!doctype html><html><body>',
  '<div class="iti iti--input-container iti--has-country-selector">',
  '<div class="iti__country-container">',
  '<button type="button" class="iti__selected-country" aria-label="Selected country">',
  '<span class="iti__selected-country-primary">',
  '<span class="iti__flag iti__' + iso2 + '"></span>',
  '<span class="iti__arrow"></span></span>',
  '<span class="iti__selected-dial-code">' + dial + '</span></button>',
  '</div>',
  '<input type="tel" class="iti__tel-input" placeholder="' + placeholder + '" aria-label="Phone number">',
  '</div></body></html>',
].join('');

function writeCaptureFixture(archiveRoot, { conditions, html, hits = 1 }) {
  const corpus = join(archiveRoot, 'corpus-forms');
  for (const d of ['dom', 'raw']) mkdirSync(join(corpus, d), { recursive: true });
  writeFileSync(join(corpus, 'dom', 'iti-v29.html'), html);
  writeFileSync(join(corpus, 'raw', 'iti-v29.html'), html);
  const entry = {
    id: 'iti-v29',
    source_url: 'https://example.invalid/iti-v29',
    family: 'iti',
    http_status: 200,
    browser_status: 200,
    raw: { file: 'raw/iti-v29.html', bytes: Buffer.byteLength(html), sha256: '0'.repeat(64) },
    dom: { file: 'dom/iti-v29.html', bytes: Buffer.byteLength(html), sha256: '0'.repeat(64) },
    frames: [],
    ok: true,
  };
  if (conditions) {
    Object.assign(entry, conditions);
    // hits === null 用来造「证据字段缺失」的台账（旧版工具直接落请求值的样子）
    if (hits !== null) entry.ipapi_stub_hits = hits;
  }
  writeFileSync(join(corpus, 'CAPTURE-MANIFEST.json'), JSON.stringify({
    capturedAt: '2026-10-27T00:00:00.000Z',
    archiveRoot: String(archiveRoot).replace(/\\/g, '/'),
    archiveDir: 'corpus-forms',
    userAgent: 'fixture',
    entries: [entry],
  }, null, 2) + '\n');
  return corpus;
}

// 派生一次骨架并留住退出码 + 输出：正例断言 code 0，负例断言「拒绝得干脆」
function deriveFromArchive(archiveRoot, out) {
  const r = spawnSync(
    process.execPath,
    [abs(FILES.skeleton), '--id', 'iti-v29', '--from', 'archive', '--archive', archiveRoot, '--out', out],
    { encoding: 'utf8' }
  );
  return { code: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

// 跑工具 CLI 并留住退出码（负例断言要看拒绝，不是只看消息）
function runTool(script, args) {
  const r = spawnSync(process.execPath, [abs(script), ...args], { encoding: 'utf8' });
  return { code: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

// == S0 自证（已知好样本干跑）==
{
  const missing = Object.entries(FILES).filter(([, p]) => !existsSync(abs(p))).map(([k]) => k);
  check(missing.length === 0, 'S0 全部工件存在', 'missing=' + (missing.join(',') || 'none'));
  if (missing.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
  check(Object.values(FILES).every((p) => read(p).length > 0), 'S0 全部工件可读非空');
  const skel = JSON.parse(read(FORMS + '/skeletons/iti-v29.json'));
  check(!!skel.tree && skel.tree.tag === 'div', 'S0 已知好样本命中 iti-v29 骨架根节点');
  const man = JSON.parse(read(FILES.manifest));
  check(Array.isArray(man.entries) && man.entries.length === 9, 'S0 已知好样本命中 9 条清单条目（8 捕获 + 1 重构，票 T4）');
}

// == S0b 票级 CI 挂接点（Cycle-7 D-004 合并后口径）==
{
  const PLAN06 = JSON.parse(read('tests/scripts/verify-ticket-plan.json'));
  const CALLER06 = read('.github/workflows/verify-tickets.yml');
  check(!!PLAN06.tickets['06'] && CALLER06.includes("'06'"), 'S0b 票 06 已挂接 CI（plan 条目 + 调用方 matrix）');
}

const MANIFEST = JSON.parse(read(FILES.manifest));
const SOURCES = JSON.parse(read(FILES.sources)).sources;

// == S1 三层架构与目录纪律（单一 tests/ 根）==
{
  check(existsSync(abs(FORMS + '/mirrors')) && existsSync(abs(FORMS + '/skeletons')), 'S1 三层目录齐备（mirrors/ + skeletons/）');
  check(!existsSync(abs('corpus')), 'S1 **不新增顶层 corpus/**（仓库只允许一个 tests/ 根）');
  check(abs(FORMS).startsWith(abs('tests')), 'S1 语料位于单一 tests/ 根下');
  eq(MANIFEST.entries.length, SOURCES.length, 'S1 manifest 条目数 == sources 条目数');
  const ids = MANIFEST.entries.map((e) => e.id).sort().join(',');
  eq(ids, SOURCES.map((s) => s.id).sort().join(','), 'S1 manifest 条目 id 与 sources 一致');
  check(MANIFEST.entries.every((e) => e.mirror && e.skeleton), 'S1 每条均有镜像页 + 结构骨架');
  // 手工重构镜像（issue #13 / spec #9 Q9）：adoption 枚举扩展 reconstructed，
  // 与 adopted 正交分账——重构条目必须附 provenance（「附 reason」惯例）
  eq(MANIFEST.entries.filter((e) => e.adoption === 'adopted').length, 8, 'S1 捕获候选全为 adopted（8/8）');
  const recon = MANIFEST.entries.filter((e) => e.adoption === 'reconstructed');
  eq(recon.length, 1, 'S1 重构条目恰 1 条（twilio-iti-reconstructed）');
  check(recon.every((e) => typeof e.provenance === 'string' && e.provenance.trim().length > 20),
    'S1 重构条目附非空 provenance（重构依据）');
  // 不引入对象存储 / S3
  const s3 = ['s3://', 'amazonaws.com', '@aws-sdk', 'minio', 'cloudflare r2', 'backblaze b2'];
  const blob = read(FILES.sources) + read(FILES.manifest) + read(FILES.capture) + read(FILES.manifestGen);
  check(s3.every((t) => blob.toLowerCase().indexOf(t) < 0), 'S1 不引入对象存储/S3（复用既有仓库外 archive 模式）');
}

// == S2 指纹完整性（清单 ↔ 磁盘 ↔ 骨架自校验）==
{
  for (const e of MANIFEST.entries) {
    const mp = abs(e.mirror.file);
    if (!existsSync(mp)) { failures.push('S2 镜像页缺失: ' + e.mirror.file); continue; }
    eq(sha256File(mp), e.mirror.sha256, 'S2 ' + e.id + ' 镜像页 SHA-256 与清单一致');
    if (e.child_mirror) {
      const cp = abs(e.child_mirror.file);
      check(existsSync(cp) && sha256File(cp) === e.child_mirror.sha256, 'S2 ' + e.id + ' 子帧镜像页 SHA-256 一致');
    }
    const sp = abs(e.skeleton.file);
    eq(sha256File(sp), e.skeleton.sha256, 'S2 ' + e.id + ' 骨架文件 SHA-256 与清单一致');
    // 字节数同检（票 T4 增补）：曾发现两处 stale bytes（sha 一致、bytes 差 2）——
    // 指纹门只看哈希会让字节数腐化不可见，此处锁死
    eq(statSync(mp).size, e.mirror.bytes, 'S2 ' + e.id + ' 镜像页字节数与清单一致');
    if (e.child_mirror) eq(statSync(abs(e.child_mirror.file)).size, e.child_mirror.bytes, 'S2 ' + e.id + ' 子帧镜像字节数与清单一致');
    eq(statSync(sp).size, e.skeleton.bytes, 'S2 ' + e.id + ' 骨架字节数与清单一致');
    const skel = JSON.parse(read(e.skeleton.file));
    eq(sha256(JSON.stringify(skel.tree)), skel.sha256, 'S2 ' + e.id + ' 骨架内部树哈希自校验');
    eq(skel.sha256, e.skeleton.tree_sha256, 'S2 ' + e.id + ' 骨架树哈希 == 清单 tree_sha256');
    eq(skel.node_count, e.skeleton.node_count, 'S2 ' + e.id + ' 骨架节点数与清单一致');
    check(e.skeleton.node_count > 0, 'S2 ' + e.id + ' 骨架非空（' + e.skeleton.node_count + ' 节点）');
  }
  check(MANIFEST._meta.generated_by === 'tests/scripts/06-manifest.mjs', 'S2 清单声明生成器（generated ledger）');
}

// == S3 合规口径（去品牌 · 去追踪 · provenance）==
{
  const BRAND = ['international telephone input', 'intl-tel-input', 'intl tel input',
    'react-phone-number-input', 'material ui', 'element plus', 'ant design', 'mui',
    'antd', 'heroku', 'codepen', 'harvesthq', 'chosen', 'twilio'];
  const TRACK = ['google-analytics', 'googletagmanager', 'gtag(', 'analytics.js', '_paq', 'facebook.net', 'hotjar', 'segment.com', 'mixpanel'];
  const mirrorFiles = readdirSync(abs(FORMS + '/mirrors')).filter((f) => f.endsWith('.html'));
  check(mirrorFiles.length === 10, 'S3 镜像页数 = 10（8 主 + 1 子帧 + 1 手工重构）', mirrorFiles.length + ' files');
  for (const f of mirrorFiles) {
    const html = read(FORMS + '/mirrors/' + f);
    const body = bodyText(html).toLowerCase();
    const hit = BRAND.filter((t) => body.indexOf(t) >= 0);
    check(hit.length === 0, 'S3 ' + f + ' 可见正文无品牌内容', hit.join(',') || 'clean');
    // provenance：头注释必须含 source_url / mirror_of / license_note；
    // 捕获镜像另须 captured_at，手工重构镜像（票 T4）以 reconstructed_at + provenance
    // 替代（页面不可重现，无捕获时点——头注释不得声称捕获时点）
    const isReconstructed = /source\s*:\s*reconstructed/.test(html);
    const keys = isReconstructed
      ? ['source_url', 'reconstructed_at', 'mirror_of', 'provenance', 'license_note']
      : ['source_url', 'captured_at', 'mirror_of', 'license_note'];
    for (const key of keys) {
      check(html.indexOf(key) >= 0, 'S3 ' + f + ' 标注 ' + key);
    }
    if (isReconstructed) {
      check(html.indexOf('captured_at') < 0, 'S3 ' + f + ' 重构镜像不标捕获时点（无 captured_at，不伪造捕获 provenance）');
    }
    // 去追踪 + 零外链（hermetic）
    const code = stripComments(html);
    check(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(code), 'S3 ' + f + ' 无外部 src/href（hermetic）');
    check(!/url\(\s*['"]?https?:\/\//i.test(code), 'S3 ' + f + ' CSS 无外部 url()');
    const th = TRACK.filter((t) => code.toLowerCase().indexOf(t) >= 0);
    check(th.length === 0, 'S3 ' + f + ' 无追踪脚本 token', th.join(',') || 'clean');
  }
  check(/publicPagesOnly/.test(read(FILES.manifest)) && /noPii/.test(read(FILES.manifest)),
    'S3 清单声明合规口径（公开页 / 无 PII / 剥品牌 / provenance）');
}

// == S4 原始快照不入库 ==
{
  // 手工重构镜像（票 T4）：页面不可重现 ⇒ 无 capture 块（不伪造抓取记录），
  // 以 provenance（重构依据）替代捕获指纹；原始快照纪律只约束捕获条目
  const capturedEntries = MANIFEST.entries.filter((e) => e.capture);
  const reconEntries = MANIFEST.entries.filter((e) => e.adoption === 'reconstructed');
  eq(capturedEntries.length + reconEntries.length, MANIFEST.entries.length, 'S4 条目二分干净（capture 块 ⇔ 非重构）');
  check(reconEntries.every((e) => !e.capture), 'S4 重构条目无 capture 块（不伪造抓取记录）');
  check(reconEntries.every((e) => !('captured_at' in e) && typeof e.provenance === 'string' && e.provenance.trim()),
    'S4 重构条目无 captured_at、以 provenance 替代（重构依据非空）');
  const archiveRoot = capturedEntries[0].capture.archive_root;
  const rootN = ROOT.replace(/\\/g, '/');
  check(!!archiveRoot && archiveRoot !== rootN && !archiveRoot.startsWith(rootN + '/'),
    'S4 归档根在**仓库外**（前缀碰撞防护：须以分隔符为界）', archiveRoot);
  for (const e of capturedEntries) {
    check(e.capture.raw && e.capture.raw.path.startsWith('corpus-forms/'), 'S4 ' + e.id + ' 原始快照路径为归档相对路径');
    check(!String(e.capture.raw.path).startsWith('/') && !String(e.capture.raw.path).includes(ROOT.replace(/\\/g, '/')),
      'S4 ' + e.id + ' 原始快照路径非仓库绝对路径');
    check(!!e.capture.raw.sha256 && e.capture.raw.sha256.length === 64, 'S4 ' + e.id + ' 原始快照登记 SHA-256 指纹');
  }
  // 仓库内不得出现原始快照 / 渲染 DOM / 截图
  const stray = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(png|warc|warc\.gz)$/i.test(f) || /(^|[-.])dom([-.]|$)/i.test(f) || /raw/i.test(f)) stray.push(p.replace(ROOT, '').replace(/\\/g, '/'));
    }
  };
  walk(abs(FORMS));
  eq(stray.length, 0, 'S4 形态语料目录内无原始快照 / 渲染 DOM / 截图', stray.join(',') || 'clean');
  // 归档在场时做**指纹实物复核**（本地硬验收：只读、无副作用）；
  // CI 无归档 → 显式 SKIP（不伪造绿，也不误报红）
  if (existsSync(archiveRoot)) {
    let verified = 0, mismatch = 0;
    for (const e of capturedEntries) {
      for (const a of [e.capture.raw, e.capture.dom, ...(e.capture.frames || [])]) {
        if (!a) continue;
        const p = join(archiveRoot, a.path);
        if (!existsSync(p)) { mismatch++; continue; }
        if (sha256File(p) === a.sha256) verified++; else mismatch++;
      }
    }
    eq(mismatch, 0, 'S4 归档实物指纹逐条复核（' + verified + ' 项匹配，0 失配）');
  } else {
    console.log('  SKIP S4 归档实物指纹复核（本机无 archive：CI 环境下按 §8.2 显式跳过，不伪造绿）');
  }
}

// == S5 退化回路成文与工具链 ==
{
  check(!!MANIFEST._meta.degradationLoop && !!MANIFEST._meta.degradationLoop.step1_recapture,
    'S5 清单内嵌退化回路定义');
  const diffSrc = read(FILES.diff);
  for (const tier of ['none', 'patch', 'minor', 'major']) {
    check(new RegExp("'" + tier + "'").test(diffSrc) || new RegExp('"' + tier + '"').test(diffSrc), 'S5 结构 diff 分级含 ' + tier);
  }
  check(/非像素 diff/.test(diffSrc), 'S5 结构 diff 声明为「确定性结构 diff（非像素 diff）」');
}

// == S6 命名正交（不与「校准语料」混淆）==
{
  check(MANIFEST._meta.naming.indexOf('校准语料') >= 0, 'S6 清单载明命名正交关系');
  // 形态语料目录内不得出现校准语料的用例结构
  const manSrc = read(FILES.manifest);
  check(!/"polarity"/.test(manSrc) && !/"knownResidual"/.test(manSrc), 'S6 形态语料清单不含校准语料字段（polarity/knownResidual）');
}

// == S7 结构骨架确定性（同源两次派生同哈希）==
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch06-gate-'));
  try {
    const run = (out) => execFileSync(process.execPath, [abs(FILES.skeleton), '--id', 'iti-v29', '--from', 'mirror', '--out', out], { encoding: 'utf8' });
    const a = join(tmp, 'a.json');
    const b = join(tmp, 'b.json');
    run(a); run(b);
    eq(sha256File(a), sha256File(b), 'S7 同源两次派生骨架哈希一致（确定性归一化）');
    const ja = JSON.parse(readFileSync(a, 'utf8'));
    eq(sha256(JSON.stringify(ja.tree)), ja.sha256, 'S7 派生骨架内部树哈希自校验');
    check(ja.source === 'mirror', 'S7 派生来源标记为 mirror（离线可复现）');

    // 指定国别后仍确定（issue #34 / spec #32 Q14：复用的就是这条既有接缝）——
    // 同一份 fixture archive 连派两次必须字节级一致，采集条件入 meta 不引入抖动。
    const archJp = join(tmp, 'arch-jp');
    writeCaptureFixture(archJp, {
      conditions: { capture_country: 'jp', browser_locale: 'en-US' },
      html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'),
    });
    const c1 = join(tmp, 'c1.json');
    const c2 = join(tmp, 'c2.json');
    eq(deriveFromArchive(archJp, c1).code, 0, 'S7 指定国别的 archive 派生成功（fixture 台账齐备）');
    deriveFromArchive(archJp, c2);
    eq(sha256File(c1), sha256File(c2), 'S7 指定国别后同源两次派生同哈希（采集条件入 meta 不破坏确定性）');
    const jc = JSON.parse(readFileSync(c1, 'utf8'));
    eq(jc.capture_country, 'jp', 'S7 骨架 meta 记采集国别（取自 CAPTURE-MANIFEST）');
    eq(jc.browser_locale, 'en-US', 'S7 骨架 meta 记浏览器 locale（只记录，不固定）');
    eq(jc.source, 'archive', 'S7 带采集条件的骨架仍是 archive 基线语义（真实页派生）');
  } catch (e) {
    failures.push('S7 骨架派生失败: ' + ((e && e.message) || e));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// == S8 覆盖声明与 harness 接入 ==
{
  check(/A-030/.test(read(FILES.sources)), 'S8 sources 声明覆盖的 A-030');
  check(/A-030/.test(read(FILES.spec)), 'S8 spec 声明覆盖的 A-030');
  check(/\/corpus\//.test(read(FILES.server)), 'S8 测试服务器已挂载 /corpus/ 路由（镜像页可被 E2E 加载）');
  check(/pull_request/.test(read(FILES.workflow)), 'S8 结构门 workflow 进 pull_request 触发面');
}

// == S9 双探测口径同源（R1 防回归锁：使「同口径」成为结构事实，而非文本声明）==
{
  const common = read(FILES.probeCommon);
  check(/export const UA\s*=/.test(common), 'S9 口径模块定义唯一 UA 常量');
  check(/export const NAV\s*=/.test(common) && /export const IDLE_MS\s*=/.test(common) && /export const SETTLE_MS\s*=/.test(common),
    'S9 口径模块定义导航/空闲/落定三常量');
  check(/export async function settle\(page, url\)/.test(common), 'S9 口径模块定义唯一导航等待序列 settle()');
  check(/export function scanWrappers\(\)/.test(common), 'S9 口径模块定义唯一注入面扫描函数 scanWrappers()');
  for (const [name, p] of [['mirrors', FILES.probeMirrors], ['real', FILES.probeReal]]) {
    const src = read(p);
    check(/import \{[^}]*\bUA\b[^}]*\} from '\.\/06-probe-common\.mjs'/.test(src), 'S9 ' + name + ' 探测从口径模块导入 UA');
    check(/import \{[^}]*\bsettle\b[^}]*\} from '\.\/06-probe-common\.mjs'/.test(src), 'S9 ' + name + ' 探测从口径模块导入 settle()');
    check(/import \{[^}]*\bscanWrappers\b[^}]*\} from '\.\/06-probe-common\.mjs'/.test(src), 'S9 ' + name + ' 探测从口径模块导入 scanWrappers()');
    check(/\bsettle\(page, /.test(src), 'S9 ' + name + ' 探测经 settle() 导航（不自行 goto）');
    check(/fr\.evaluate\(scanWrappers\)/.test(src), 'S9 ' + name + ' 探测共用 scanWrappers 扫描');
    eq(count(src, /Mozilla\/5\.0/g), 0, 'S9 ' + name + ' 探测无就地 UA 字面量');
    eq(count(src, /waitForTimeout\s*\(/g), 0, 'S9 ' + name + ' 探测无就地等待字面量');
    eq(count(src, /waitUntil\s*:/g), 0, 'S9 ' + name + ' 探测无就地导航条件字面量');
    eq(count(src, /\.goto\(/g), 0, 'S9 ' + name + ' 探测不自行 goto（导航只在口径模块内）');
  }
}

// == S10 结构 diff：标签变化后继续递归子树（issue #33 负例）==
// 修复前：父标签不同即 return，子树差异被吞——同一处改版只报父节点一条。
// 该负例在修复前红（只剩 1 条）、修复后绿（父标签 + 子 class 两条）。
{
  const tmp = mkdtempSync(join(tmpdir(), 'cch06-label-recurse-'));
  try {
    const node = (tag, cls, children) => ({ tag, class: cls, ...(children ? { children } : {}) });
    const wrap = (tree) => JSON.stringify({
      id: 'neg-label-recurse',
      skeleton_version: 1,
      source: 'capture',
      source_url: 'https://example.invalid/',
      root_selector: '#neg',
      node_count: 2,
      sha256: '0'.repeat(64),
      tree,
    }, null, 2);
    const basePath = join(tmp, 'base.json');
    const newPath = join(tmp, 'new.json');
    writeFileSync(basePath, wrap(node('div', ['iti__selected-country'], [node('div', ['iti__flag', 'iti__jp'])])));
    writeFileSync(newPath, wrap(node('span', ['iti__selected-country'], [node('div', ['iti__flag', 'iti__us'])])));

    // 先证明刺激在场（读回落盘文件）：父标签 div→span，且子节点 class jp→us。
    // 刺激不在场时输出断言只会是空操作，必须先红。
    // 父标签须锚定**根节点位置**：base 的子节点也是 div，裸 `"tag": "div"` 在
    // 根标签没改的畸形注入里同样命中（docs/agents/review.md Q5）。
    const baseRaw = readFileSync(basePath, 'utf8');
    const newRaw = readFileSync(newPath, 'utf8');
    const stims = [
      ['base 子 class jp', baseRaw, '"iti__jp"'],
      ['new 子 class us', newRaw, '"iti__us"'],
      ['base 根标签 div', baseRaw, '"tree": {\n    "tag": "div"'],
      ['new 根标签 span', newRaw, '"tree": {\n    "tag": "span"'],
    ];
    for (const [label, src, token] of stims) {
      const s = containsToken(src, token);
      check(s.ok, 'S10 负例刺激在场：' + label, s.detail);
    }

    const run = spawnSync(process.execPath, [abs(FILES.diff), '--base', basePath, '--new', newPath], { encoding: 'utf8' });
    const out = String(run.stdout || '') + String(run.stderr || '');
    // 路径也钉住：只断言消息文本时，「递归但没推进 path」的变体会把子节点差异
    // 打在根路径上而仍然全绿（review #33 Q5）。根路径 / 与子路径 /0 各自成对。
    const parent = containsToken(out, '[major] /  tag div → span');
    const child = containsToken(out, '[major] /0  class ["iti__flag","iti__jp"] → ["iti__flag","iti__us"]');
    check(parent.ok, 'S10 输出含父标签变化 major（div → span）', parent.detail);
    check(child.ok, 'S10 标签不同后继续递归子树：输出含子节点 class 变化（jp → us）', child.detail);
    // 计全部 change 行（任一档位），不只 major：只数 major 时，到处冒 [minor] /
    // [patch] 的噪声实现蒙混过关（标签说的「无噪声」根本没被断言）。
    // 本 fixture 两侧只有这两处差异，正确实现恰好 2 行。
    // 覆盖边界：本 fixture 父节点两侧 class / attrs 相同，故「记完 tag 就只递归
    // 子树、跳过本节点其余维度」的变体在此仍是 2 行、本段挡不住——它确实继续
    // 递归了，不属 #33 修的提前 return；要区分需让父节点另有维度差异，超出本票。
    const changeLines = out.split('\n').filter((l) => /^\s+\[(major|minor|patch)\]\s/.test(l));
    eq(changeLines.length, 2, 'S10 该负例恰好两条变化（父标签 + 子 class；无漏报也无噪声）');
    eq(changeLines.filter((l) => /\[major\]/.test(l)).length, 2, 'S10 两条均为 major（分级未被降档）');
    check(/changes: 2\b/.test(out), 'S10 汇总行 changes: 2 与逐行一致');
    check(/tier: MAJOR/.test(out), 'S10 tier 仍为 MAJOR（多报变化不改变分级语义）');
    eq(run.status, 1, 'S10 major 退出码仍为 1（分级判定未变）');
  } catch (e) {
    failures.push('S10 结构 diff 负例失败: ' + ((e && e.message) || e));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// == S11 采集国别固定与采集条件入台账（issue #34 / spec #32 Q7/Q10/Q16）==
{
  const CAP_SRC = read(FILES.capture);
  const LOGIN_SRC = read('tests/scripts/12-login-capture.mjs');
  const DRIFT_SRC = read(FILES.drift);

  // (1) --country 取值口径：两字母 alpha-2，大小写归一，其余如实拒
  eq(normalizeCountry('JP'), 'jp', 'S11 --country 大小写归一（台账只留一种写法）');
  let rej = '';
  try { normalizeCountry('usa'); } catch (e) { rej = String(e.message); }
  check(containsToken(rej, '两字母').ok, 'S11 三字母国家码被拒（ISO 3166-1 alpha-2）', rej.slice(0, 90));
  let rejEmpty = '';
  try { normalizeCountry(''); } catch (e) { rejEmpty = String(e.message); }
  check(containsToken(rejEmpty, '--country 需两字母').ok, 'S11 空值同样被拒（不是静默回落默认）', rejEmpty.slice(0, 90));

  // (2) 拦截匹配器：站点真实请求必须命中（URL 取自 2026-10-27 抓的 homepage.js），
  //     对照负例证明拦截不越界（别的 host / ipapi 其它路径一律放行真请求）
  const LIVE_LOOKUP_URL = 'https://ipapi.co/json?token=9gJwtZv3zaQMcFetHDpEtPalSNBz1JL3gJI98vg4bxZBTwwWLZ';
  check(IPAPI_LOOKUP_URL_RE.test(LIVE_LOOKUP_URL), 'S11 站点真实 lookup URL（含 token 查询）命中拦截');
  check(IPAPI_LOOKUP_URL_RE.test('https://ipapi.co/json/'), 'S11 同端点带尾斜杠同样命中');
  check(!IPAPI_LOOKUP_URL_RE.test('https://example.invalid/json?token=x'), 'S11 别的 host 不命中（只钉 ipapi.co）');
  check(!IPAPI_LOOKUP_URL_RE.test('https://ipapi.co/countries/'), 'S11 ipapi 其它路径不命中（只钉 lookup 端点）');

  // (3) 接线行为：假 page 走真 installCountryRoute（门断言的就是工具跑的）
  const fired = [];
  const fakePage = {
    pattern: null, handler: null,
    route(re, handler) { this.pattern = re; this.handler = handler; return Promise.resolve(); },
  };
  const pin = await installCountryRoute(fakePage, 'jp');
  check(fakePage.pattern === IPAPI_LOOKUP_URL_RE, 'S11 路由按库里的匹配器注册（工具与门同一份定义）');
  eq(pin.country, 'jp', 'S11 固定结果回传（条目记的就是它，不是请求原文）');
  fakePage.handler({ fulfill: (o) => { fired.push(o); return Promise.resolve(); } });
  eq(pin.hits(), 1, 'S11 命中计数入台账（ipapi_stub_hits 的唯一来源）');
  eq(fired.length, 1, 'S11 命中即应答（不放过、不落真网络）');
  const stubBody = JSON.parse(fired[0].body);
  eq(stubBody.country_code, 'jp', 'S11 桩把 initialCountryLookup 解析成指定国家');
  eq(Object.keys(stubBody).join(','), 'country_code', 'S11 桩只给站点真正读取的字段（不替站点编造响应形状）');
  eq(fired[0].status, 200, 'S11 桩以 200 应答');
  check(/json/i.test(String((fired[0].headers || {})['content-type'])), 'S11 桩以 application/json 应答（页面 res.json() 走得通）');
  // 旋钮随运行变：换国家 → 换响应（钉死常量的实现过不了这条）
  const fired2 = [];
  const fakePage2 = { route(re, handler) { this.h = handler; return Promise.resolve(); } };
  const pin2 = await installCountryRoute(fakePage2, 'us');
  fakePage2.h({ fulfill: (o) => { fired2.push(o); return Promise.resolve(); } });
  eq(JSON.parse(fired2[0].body).country_code, 'us', 'S11 同一段接线换国家即换响应（--country 真生效）');
  // 固定值只在桩真的被请求之后才成立：hits=0 时把请求值写进台账，等于谎报采集条件
  eq(resolvedCountry('us', 1), 'us', 'S11 桩被请求过 → 固定值入台账');
  eq(resolvedCountry('us', 0), null, 'S11 桩未被请求 → 如实记 null（不做 lookup 的源不冒充「按 us 采」）');
  // 生产侧的「记了什么」也必须可断言，否则验收项「CAPTURE-MANIFEST 记录采集国别与
  // 浏览器 locale」只能靠读源码确认（删掉工具里的赋值，门仍是绿的）
  eq(JSON.stringify(captureConditionFields({ country: 'us', hits: 2, locale: 'en-US' })),
    JSON.stringify({ capture_country: 'us', browser_locale: 'en-US', ipapi_stub_hits: 2 }),
    'S11 三字段一次构造的形状（键名与值都锁住）');
  eq(captureConditionFields({ country: 'us', hits: 0, locale: null }).capture_country, null,
    'S11 未被请求时构造出 null（工具没有别的路径能写固定值）');
  check(containsToken(CAP_SRC, 'Object.assign(entry, captureConditionFields({').ok &&
    containsToken(CAP_SRC, 'hits: rendered.stubHits').ok && containsToken(CAP_SRC, 'locale: rendered.locale').ok,
    'S11 采集工具经这一份构造写采集条件（赋值与渲染现场同源，不是各自手抄）');

  // (4) 顺序：拦截先于导航（晚注册的那次 lookup 走真出口 IP = 假漂移成因）
  const ord = before(CAP_SRC, 'await installCountryRoute(page, country);', "await page.goto(url, { waitUntil");
  check(ord.ok, 'S11 路由拦截在 goto 之前注册', ord.detail);
  const ordCli = before(CAP_SRC, 'args.country = normalizeCountry(', 'mkdirSync(path.join(outDir, sub)');
  check(ordCli.ok, 'S11 国别校验先于首次写盘（拒了不留半成品 archive）', ordCli.detail);

  // (5) CLI 负例：非法 --country / --attach 组合都在任何副作用之前拒绝
  const tmpCli = mkdtempSync(join(tmpdir(), 'cch06-country-cli-'));
  try {
    const fresh = join(tmpCli, 'never-created');
    const badCountry = runTool(FILES.capture, ['--country', 'usa', '--archive', fresh]);
    eq(badCountry.code, 2, 'S11 非法 --country → 采集退出码 2');
    check(containsToken(badCountry.out, '--country 需两字母').ok, 'S11 非法 --country 的成因单列', badCountry.out.trim().slice(0, 90));
    const fresh2 = join(tmpCli, 'never-created-2');
    const attachMix = runTool(FILES.capture, ['--attach', '--id', 'iti-v29', '--country', 'jp', '--archive', fresh2]);
    eq(attachMix.code, 2, 'S11 --attach 配 --country → 退出码 2（成对拒绝）');
    check(containsToken(attachMix.out, '--country 与 --attach 互斥').ok,
      'S11 附着模式不固定国别，传了即拒（不产「固定了但没生效」的台账）', attachMix.out.trim().slice(0, 90));
    eq(existsSync(fresh), false, 'S11 非法 --country 未创建 archive（零副作用）');
    eq(existsSync(fresh2), false, 'S11 互斥组合未创建 archive（零副作用）');
    // 「传了旗标却没给值」不能被当成「没传」：那会静默按默认国别采并记进台账
    const fresh3 = join(tmpCli, 'never-created-3');
    const missingValue = runTool(FILES.capture, ['--archive', fresh3, '--country']);
    eq(missingValue.code, 2, 'S11 --country 缺操作数 → 退出码 2（不静默回落默认）');
    check(containsToken(missingValue.out, '--country 需两字母').ok,
      'S11 缺操作数仍按国别形态给成因（一条消息一个成因）', missingValue.out.trim().slice(0, 100));
    eq(existsSync(fresh3), false, 'S11 缺操作数未创建 archive（零副作用）');
    const attachMissingValue = runTool(FILES.capture, ['--attach', '--id', 'iti-v29', '--country', '--archive', fresh3]);
    eq(attachMissingValue.code, 2, 'S11 附着侧同样按「是否显式传了旗标」判定，不看值给没给');
    check(containsToken(attachMissingValue.out, '--country 与 --attach 互斥').ok,
      'S11 空值的 --country 配 --attach 仍被互斥拒绝', attachMissingValue.out.trim().slice(0, 120));
  } finally {
    rmSync(tmpCli, { recursive: true, force: true });
  }

  // (6) 不同国别 → 不同骨架（旋钮真的生效，不是同一棵树换个标签），
  //     且差异面正是归一化**不许**抹平的 placeholder / 国旗 class（spec #32 Q7）
  const tmp = mkdtempSync(join(tmpdir(), 'cch06-country-'));
  try {
    const mk = (name, iso2, dial, placeholder) => {
      const arch = join(tmp, name);
      writeCaptureFixture(arch, {
        conditions: { capture_country: iso2, browser_locale: 'en-US' },
        html: ITI_SHAPE_HTML(iso2, dial, placeholder),
      });
      const out = join(tmp, name + '.json');
      eq(deriveFromArchive(arch, out).code, 0, 'S11 ' + name + ' 骨架派生成功');
      return { arch, out, skel: JSON.parse(readFileSync(out, 'utf8')) };
    };
    const jp = mk('arch-jp', 'jp', '+81', '90-1234-5678');
    const us = mk('arch-us', 'us', '+1', '201-555-0123');
    for (const [label, src, token] of [
      ['jp 国旗 class', ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'), 'iti__flag iti__jp'],
      ['jp placeholder 形状', ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'), 'placeholder="90-1234-5678"'],
      ['us 国旗 class', ITI_SHAPE_HTML('us', '+1', '201-555-0123'), 'iti__flag iti__us'],
    ]) {
      const s = containsToken(src, token);
      check(s.ok, 'S11 反例刺激在场：' + label, s.detail);
    }
    eq(jp.skel.capture_country, 'jp', 'S11 jp 骨架记自己那次的采集国别');
    eq(us.skel.capture_country, 'us', 'S11 us 骨架记自己那次的采集国别');
    check(jp.skel.sha256 !== us.skel.sha256, 'S11 不同国别派生不同骨架（树哈希不同）',
      jp.skel.sha256.slice(0, 12) + '… vs ' + us.skel.sha256.slice(0, 12) + '…');
    const jpFlat = JSON.stringify(jp.skel.tree);
    const usFlat = JSON.stringify(us.skel.tree);
    check(containsToken(jpFlat, '"iti__jp"').ok, 'S11 国旗 class 留在骨架树里（未被归一化抹平）');
    check(containsToken(usFlat, '"iti__us"').ok, 'S11 换国家后 class 跟着换（同一规则下的真实形态差异）');
    check(containsToken(jpFlat, '"placeholder":"##-####-####"').ok,
      'S11 placeholder 形状令牌保留（jp 形态未被抹平）', jpFlat.slice(0, 200));
    check(containsToken(usFlat, '"placeholder":"###-###-####"').ok, 'S11 placeholder 形状令牌保留（us 形态）');

    // (7) 采集条件缺失 / 半登记 → 硬拒，且拒在写盘之前
    const archStale = join(tmp, 'arch-stale');
    writeCaptureFixture(archStale, { conditions: null, html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678') });
    const staleOut = join(tmp, 'stale.json');
    const stale = deriveFromArchive(archStale, staleOut);
    eq(stale.code, 1, 'S11 台账无采集条件（早于旋钮的 archive）→ 派生硬拒');
    check(containsToken(stale.out, '没有采集条件').ok, 'S11 硬拒点名成因并给出路（重捕）', stale.out.trim().slice(0, 120));
    eq(existsSync(staleOut), false, 'S11 硬拒不产出骨架文件（拒在任何写盘之前）');
    const archHalf = join(tmp, 'arch-half');
    writeCaptureFixture(archHalf, { conditions: { capture_country: 'jp' }, html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678') });
    const half = deriveFromArchive(archHalf, join(tmp, 'half.json'));
    eq(half.code, 1, 'S11 采集条件半登记同样硬拒（两键同生同灭）');
    check(containsToken(half.out, '半登记').ok, 'S11 半登记的消息与「缺失」区分（一条消息一个成因）', half.out.trim().slice(0, 120));

    // 三态的第三态：键在、值为 null（附着模式 / 桩未被请求）= 已记录「未固定」，
    // 与「键缺失 = 条件未知」不同，必须照常派生并把 null 抄进骨架 meta。
    const archUnpinned = join(tmp, 'arch-unpinned');
    writeCaptureFixture(archUnpinned, {
      conditions: { capture_country: null, browser_locale: 'zh-CN' },
      html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'),
    });
    const unpinnedOut = join(tmp, 'unpinned.json');
    eq(deriveFromArchive(archUnpinned, unpinnedOut).code, 0, 'S11 「已记录未固定」的台账照常派生（不误当条件未知）');
    const unpinned = JSON.parse(readFileSync(unpinnedOut, 'utf8'));
    eq(unpinned.capture_country, null, 'S11 骨架 meta 原样保留 null（未固定是记录，不是猜测）');
    eq(unpinned.browser_locale, 'zh-CN', 'S11 未固定时 locale 照记');

    // (8) 入库台账传播：capture 块随带采集条件；清单自我声明口径；跑完字节级还原
    //     （就地写 manifest.json 再还原的口径沿用 verify-ticket-12 T3(c)：净零副作用，
    //      06-manifest 没有 --out，只能在库内生成）
    const realManifest = abs(FILES.manifest);
    const backup = readFileSync(realManifest);
    try {
      eq(runTool(FILES.manifestGen, ['--archive', jp.arch]).code, 0, 'S11 06-manifest 对 fixture archive 实跑成功');
      const doc = JSON.parse(readFileSync(realManifest, 'utf8'));
      const ent = doc.entries.find((e) => e.id === 'iti-v29');
      eq(ent.capture.capture_country, 'jp', 'S11 采集国别入仓内台账 capture 块（git 可见的归因面）');
      eq(ent.capture.browser_locale, 'en-US', 'S11 浏览器 locale 入仓内台账 capture 块');
      eq(ent.capture.ipapi_stub_hits, 1, 'S11 证据字段随固定值一起入库（git 里的 capture_country 不是口头声明）');
      // ledger→report→ledger 复现（这条路径平时走不到：已提交台账还没有这两个键，
      // #35 重捕之后就靠它保稳）——采集条件与证据都必须原样带回，不得当场漂移
      eq(runTool(FILES.manifestGen, ['--from-ledger']).code, 0, 'S11 带采集条件的台账能被 --from-ledger 无漂移复现');
      const roundTrip = JSON.parse(readFileSync(realManifest, 'utf8')).entries.find((e) => e.id === 'iti-v29').capture;
      eq(roundTrip.capture_country, 'jp', 'S11 复现后 capture_country 未丢');
      eq(roundTrip.browser_locale, 'en-US', 'S11 复现后 browser_locale 未丢');
      eq(roundTrip.ipapi_stub_hits, 1, 'S11 复现后证据字段未丢');
      const committedIti = JSON.parse(backup.toString('utf8')).entries.find((e) => e.id === 'iti-v29');
      eq(ent.skeleton.sha256, committedIti.skeleton.sha256,
        'S11 已提交骨架文件字节未动（清单重生成仍指向同一指纹——基线重定是 #35 的活）');
      eq(ent.skeleton.capture_country, undefined,
        'S11 未重生成的骨架不带采集条件键（键缺失=早于本旋钮，与「未固定」两回事）');
      eq(ent.mirror.sha256, committedIti.mirror.sha256, 'S11 镜像页指纹未变');
      const decl = String((doc._meta.compliance || {}).captureConditions || '');
      check(containsToken(decl, 'capture_country').ok && containsToken(decl, 'browser_locale').ok,
        'S11 清单声明点名的就是那两个真实键名（声明与字段同源，不是一段随便的说明文字）', decl.slice(0, 80));
      const mgSrc = read(FILES.manifestGen);
      check(containsToken(mgSrc, "requireEvidenceForClaim(c, e.id, 'ledger')").ok &&
        containsToken(mgSrc, "requireEvidenceForClaim(c, s.id, 'archive')").ok,
        'S11 两处写盘前的证据核验各自声明所在层（出路文案随层而变，不靠显示文本相等猜）');
      check(containsToken(mgSrc, '...readCaptureConditions(skel, s.id)').ok,
        'S11 skeleton 块同样抄骨架自带的采集条件');
      check(containsToken(mgSrc, '...readCaptureConditions(c, e.id)').ok,
        'S11 --from-ledger 把采集条件原样带回重建的 cap 条目（否则台账再生成当场漂移）');
    } finally {
      writeFileSync(realManifest, backup);
      eq(readFileSync(realManifest).equals(backup), true, 'S11 manifest.json 字节级还原（净零副作用）');
    }

    // (9) 编排器透传：接线在运行采集之前；非法国别在首次写盘之前拒；报告分记「请求值」与「实况」
    const ordDrift = before(DRIFT_SRC, "capArgs.push('--country', args.country);", 'const r = run(capArgs');
    check(ordDrift.ok, 'S11 编排器把固定国别显式交给采集（先接线后运行）', ordDrift.detail);
    const neverOut = join(tmp, 'drift-never');
    const badDrift = runTool(FILES.drift, ['--archive', jp.arch, '--out', neverOut, '--country', 'xx1']);
    eq(badDrift.code, 2, 'S11 编排器非法 --country → 退出码 2');
    eq(existsSync(neverOut), false, 'S11 编排器非法 --country 不产报告目录（护栏先于写盘）');
    const driftOut = join(tmp, 'drift-out');
    const d = runTool(FILES.drift, ['--archive', jp.arch, '--out', driftOut, '--no-capture', '--country', 'gb', '--id', 'iti-v29']);
    eq(d.code, 0, 'S11 编排器 --no-capture + --country 跑通（漂移是 advisory，不阻断）', d.out.trim().slice(-160));
    const sum = JSON.parse(readFileSync(join(driftOut, 'drift-summary.json'), 'utf8'));
    eq(sum.capture_country_requested, 'gb', 'S11 报告记本次运行**请求**的固定国别');
    const row = sum.matrix.find((r) => r.id === 'iti-v29');
    eq(row.skeleton.capture_country, 'jp', 'S11 矩阵行记台账**实况**（与请求值分列，条件变了当场可见）');
    const md = readFileSync(join(driftOut, 'drift-report.md'), 'utf8');
    check(containsToken(md, '采集国别（本次运行请求）: `gb`').ok, 'S11 报告正文点名采集国别', md.split('\n').slice(0, 12).join(' | ').slice(0, 160));
    check(containsToken(md, 'country=jp').ok, 'S11 矩阵证据列含骨架实况');

    // (10) 生产侧接线（台账三键 + 附着模式显式「未固定」）：行为面在 S7/S11(6)，
    //      这里只锁「字段确实由工具写进条目」——不写就没人能记上条件
    check(containsToken(CAP_SRC, '[COUNTRY_FIELD]: null').ok && containsToken(CAP_SRC, '[LOCALE_FIELD]: null').ok &&
      containsToken(CAP_SRC, '[HITS_FIELD]: 0').ok, 'S11 采集条目先落三个采集条件键（缺值也落键，不是不写）');
    check(containsToken(LOGIN_SRC, '[COUNTRY_FIELD]: null').ok,
      'S11 附着条目显式记「未固定」（与「台账早于旋钮」两种语义不混）');
    // 声称固定却拿不出证据：country 非 null 而桩从未被请求（hits=0）→ 同样硬拒。
    // 这是「旧版工具直接把请求值落台账」或手工改坏的样子，放过去就会把下次归因带错。
    const archNoProof = join(tmp, 'arch-noproof');
    writeCaptureFixture(archNoProof, {
      conditions: { capture_country: 'jp', browser_locale: 'en-US' },
      hits: 0,
      html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'),
    });
    const noProofOut = join(tmp, 'noproof.json');
    const noProof = deriveFromArchive(archNoProof, noProofOut);
    eq(noProof.code, 1, 'S11 「声称固定但 hits=0」的台账硬拒（固定值必须有证据）');
    check(containsToken(noProof.out, '桩从未被请求过').ok, 'S11 无证据固定的消息点名成因', noProof.out.trim().slice(0, 120));
    check(containsToken(noProof.out, '在 CAPTURE-MANIFEST 条目 里声称固定').ok,
      'S11 骨架侧的拒绝声明数据住在 archive 层（出路是重捕；默认值不能是没人看的承重逻辑）', noProof.out.trim().slice(0, 140));
    eq(existsSync(noProofOut), false, 'S11 无证据固定不落骨架文件（拒在写盘之前）');
    const archNoHitsKey = join(tmp, 'arch-nohitskey');
    writeCaptureFixture(archNoHitsKey, {
      conditions: { capture_country: 'jp', browser_locale: 'en-US' },
      hits: null,
      html: ITI_SHAPE_HTML('jp', '+81', '90-1234-5678'),
    });
    const noHitsKeyOut = join(tmp, 'nohitskey.json');
    eq(deriveFromArchive(archNoHitsKey, noHitsKeyOut).code, 1,
      'S11 证据字段缺失同样硬拒（判不出就宁缺勿假）');
    eq(existsSync(noHitsKeyOut), false, 'S11 证据字段缺失同样不写盘');
    // 同一矛盾进仓内台账的路也被堵：06-manifest 写 capture 块前先验声称与证据一致。
    // 这一条必须自带备份/还原——它跑的是就地写 manifest.json 的生成器，万一不变量退化
    // 成「放行」，没有还原就会把 fixture 内容留在入库基线上（门自己先把语料写坏）。
    const ledgerBackup = readFileSync(abs(FILES.manifest));
    let badLedger = { code: null, out: '' };
    try {
      badLedger = runTool(FILES.manifestGen, ['--archive', archNoProof]);
    } finally {
      writeFileSync(abs(FILES.manifest), ledgerBackup);
    }
    eq(badLedger.code, 1, 'S11 无证据固定也拒写仓内台账（不是只在骨架侧拦）');
    check(containsToken(badLedger.out, '桩从未被请求过').ok, 'S11 台账侧拒绝同样点名成因', badLedger.out.trim().slice(0, 120));
    check(containsToken(badLedger.out, 'CAPTURE-MANIFEST 条目').ok,
      'S11 archive 侧的消息说清矛盾住在哪一层（出路是重捕，不是改账本）', badLedger.out.trim().slice(0, 140));
    eq(readFileSync(abs(FILES.manifest)).equals(ledgerBackup), true,
      'S11 台账侧拒绝发生在唯一一次写盘之前（清单字节未变）');
    // --from-ledger 侧：矛盾住在仓内台账时，出路不能是「手改成 null 抹证据」
    const lyingLedger = JSON.parse(ledgerBackup.toString('utf8'));
    lyingLedger.entries[0].capture = { capture_country: 'jp', browser_locale: 'en-US', ipapi_stub_hits: 0 };
    writeFileSync(abs(FILES.manifest), JSON.stringify(lyingLedger, null, 2) + '\n');
    let ledgerSide = { code: null, out: '' };
    try {
      ledgerSide = runTool(FILES.manifestGen, ['--from-ledger']);
    } finally {
      writeFileSync(abs(FILES.manifest), ledgerBackup);
    }
    eq(ledgerSide.code, 1, 'S11 --from-ledger 也拒矛盾台账（不让 assertLedgerStable 把它复现成既成事实）');
    check(containsToken(ledgerSide.out, '仓内台账 manifest.json').ok && containsToken(ledgerSide.out, '手改仓内台账').ok,
      'S11 台账侧的成因与出路各自单列（不误导人去手改 null）', ledgerSide.out.trim().slice(0, 150));
    eq(readFileSync(abs(FILES.manifest)).equals(ledgerBackup), true, 'S11 两个台账负例跑完清单字节还原');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // (11) 默认国别是承重常量：漂移 workflow 不传 --country，每周运行实际就按默认采
  eq(DEFAULT_COUNTRY, 'us', 'S11 默认国别 == us（spec #32 Q10 的字面对象；改这个值必须同时改这条）');
  check(containsToken(CAP_SRC, 'args.countryProvided ? args.countryRaw : DEFAULT_COUNTRY').ok,
    'S11 未传 --country 才回落默认（默认值取自库里的常量，不是就地写死 us）');
  check(containsToken(DRIFT_SRC, 'country: DEFAULT_COUNTRY').ok, 'S11 编排器默认与采集默认同源');
  const WF_DRIFT = read('.github/workflows/corpus-drift.yml');
  check(containsToken(WF_DRIFT, 'node tests/scripts/06-corpus-drift.mjs').ok && !/--country/.test(WF_DRIFT),
    'S11 漂移 workflow 不覆盖 --country：默认值即 CI 的采集条件（一条命令锁住这条依赖）');

  // (12) 反向锁「不采用 UA 或时区伪造」（验收项 3）：启动面只有 headless + 既有 UA
  check(containsToken(CAP_SRC, 'chromium.launch({ headless: HEADLESS })').ok,
    'S11 浏览器启动参数只有 headless（没有加时区/locale/geolocation 仿真）');
  check(containsToken(CAP_SRC, 'browser.newPage({ userAgent: UA })').ok,
    'S11 newPage 只带既有 UA 常量（沿用冒烟层口径，非本轮新造的伪装）');
  for (const banned of ['timezoneId', 'geolocation', 'bypassCSP', '--disable-blink-features', 'emulateMedia']) {
    check(!CAP_SRC.includes(banned), 'S11 采集工具不含伪装/反自动化开关：' + banned);
  }
}

console.log('-----------------------------');
console.log('verify-ticket-06: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
