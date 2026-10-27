#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-manifest.mjs — 形态语料「指纹与元数据清单」生成器（票 06 / A-030）
//
// 定位：**库内唯一权威清单**（`tests/corpus/forms/manifest.json`）。
//   原始快照**不入库**——库内只留：
//     · 镜像页 / 结构骨架的**文件 SHA-256**（入库文件的可验证指纹）；
//     · 原始快照的 **SHA-256 + 归档相对路径 + 字节数**（指向仓库外 archive）；
//     · 合规元数据（source_url / captured_at / mirror_of / license_note；
//       手工重构条目以 provenance（重构依据）替代 captured_at，无 capture 块）。
//   采集条件（issue #34 / spec #32 Q16）：capture 块随带 `capture_country`
//     （这次按哪个国家采）与 `browser_locale`（浏览器现场自报，只记录不固定），
//     skeleton 块同步骨架 meta。历史条目没有这两个键 → 键也不落，`--from-ledger`
//     复现旧条目时逐字节稳定（凭空补 null 会让台账自己报漂移）。
//
// 用法：node tests/scripts/06-manifest.mjs [--archive <dir>]
//   node tests/scripts/06-manifest.mjs --from-ledger
//     # 本机无 archive 时的确定性再生成：从已提交 manifest.json 重建 capture report
//     # （archiveRoot 原值保留），并断言旧条目再生成逐字段一致——漂移即拒绝写入
//     # （先归因再更新，禁止为修绿直接覆盖台账）
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readCaptureConditions } from './06-capture-country.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FORMS = path.join(REPO, 'tests', 'corpus', 'forms');

const DEFAULT_ARCHIVE =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const rel = (p) => path.relative(REPO, p).replace(/\\/g, '/');

// 从已提交台账重建 capture report（--from-ledger）：只读 manifest.json 内的
// 指纹与元数据，保 archiveRoot 原值；返回形状与 CAPTURE-MANIFEST 同构。
function ledgerToCaptureReport() {
  const cur = JSON.parse(readFileSync(path.join(FORMS, 'manifest.json'), 'utf8'));
  const strip = (p) => String(p).replace(/^corpus-forms\//, '');
  const captured = cur.entries.filter((e) => e.capture);
  return {
    capturedAt: (cur.entries.find((e) => e.captured_at) || {}).captured_at || null,
    archiveRoot: captured.length ? captured[0].capture.archive_root : null,
    archiveDir: 'corpus-forms',
    userAgent: 'ledger-round-trip',
    entries: captured.map((e) => {
      const c = e.capture;
      return {
        id: e.id,
        source_url: e.source_url,
        family: e.family,
        // 采集条件原样带回（键缺失就不落键）：--from-ledger 复现历史条目时
        // 既不能凭空补 null，也不能把新条目的条件丢掉（issue #34）。
        ...readCaptureConditions(c, e.id),
        http_status: c.http_status,
        raw: c.raw ? { file: strip(c.raw.path), bytes: c.raw.bytes, sha256: c.raw.sha256 } : null,
        dom: c.dom ? { file: strip(c.dom.path), bytes: c.dom.bytes, sha256: c.dom.sha256 } : null,
        frames: (c.frames || []).map((f) => ({ file: strip(f.path), bytes: f.bytes, sha256: f.sha256, url: f.url })),
        shot: c.shot ? { file: strip(c.shot.path) } : null,
        ok: c.ok,
      };
    }),
  };
}

// 旧条目再生成一致性（--from-ledger 的写入前置）：逐条 deep-equal + id 集守恒，
// 任一漂移即整体拒绝——台账是权威账本，更新必须先归因。
// 旧条目在再生成后消失 = 破坏性删除（sources.json 删了 id 或生成逻辑漏条），
// 必须与字段漂移同等拒绝，否则删除会静默落盘。
function assertLedgerStable(cur, out) {
  const byId = new Map(cur.entries.map((e) => [e.id, e]));
  const outIds = new Set(out.entries.map((e) => e.id));
  const drifts = cur.entries.filter((e) => !outIds.has(e.id)).map((e) => e.id);
  for (const e of out.entries) {
    const old = byId.get(e.id);
    if (old && JSON.stringify(old) !== JSON.stringify(e)) drifts.push(e.id);
  }
  if (drifts.length) {
    throw new Error(
      '--from-ledger 台账漂移（旧条目再生成不一致 / 消失）：' + drifts.join(', ') +
      ' —— 先核对差异来源（抓取环境 / 归一化 / 手工改动），归因后才允许更新，禁止直接覆盖'
    );
  }
}

const DEFAULT_LICENSE =
  '形态复刻（非原文转载）：仅保留公开表单形态，已去品牌 / 去追踪 / 内容替换，不含真实 PII；' +
  '原始快照出仓归档，不入 git。';

function main() {
  const argv = process.argv.slice(2);
  const ai = argv.indexOf('--archive');
  const fromLedger = argv.includes('--from-ledger');
  const archiveRoot = path.resolve(ai >= 0 ? argv[ai + 1] : DEFAULT_ARCHIVE);
  const archiveDir = path.join(archiveRoot, 'corpus-forms');
  const capPath = path.join(archiveDir, 'CAPTURE-MANIFEST.json');
  let cap;
  let cur = null;
  if (fromLedger) {
    cur = JSON.parse(readFileSync(path.join(FORMS, 'manifest.json'), 'utf8'));
    cap = ledgerToCaptureReport();
  } else {
    if (!existsSync(capPath)) {
      throw new Error('缺少抓取清单，先跑 06-capture-forms.mjs → ' + capPath +
        '（本机无 archive 时用 --from-ledger 从已提交台账再生成）');
    }
    cap = JSON.parse(readFileSync(capPath, 'utf8'));
  }
  const capById = new Map(cap.entries.map((e) => [e.id, e]));

  const sources = JSON.parse(readFileSync(path.join(FORMS, 'sources.json'), 'utf8')).sources;

  const entries = sources.map((s) => {
    // 手工重构镜像（issue #13 / spec #9 Q9）：页面已不可访问、无法再重现——
    // 无捕获时点（captured_at 不落）、无抓取记录（capture 块不落），
    // 以 provenance（重构依据，即「附 reason」惯例）替代；骨架 source=reconstructed。
    const isReconstructed = s.adoption === 'reconstructed';
    if (isReconstructed && !String(s.provenance || '').trim()) {
      throw new Error('reconstructed 条目必须附 provenance（重构依据）——' + s.id + ' 的 sources.json 条目缺失');
    }
    const c = capById.get(s.id);
    if (isReconstructed && c) {
      throw new Error(
        'reconstructed 条目不得有抓取记录（' + s.id + ' 出现在 CAPTURE-MANIFEST）——' +
        '页面不可重现与抓取成功互斥，属标记矛盾：先核对 adoption 再入库'
      );
    }
    const mirrorName = s.mirror_file || s.id + '.html';
    const mirrorPath = path.join(FORMS, 'mirrors', mirrorName);
    const skelPath = path.join(FORMS, 'skeletons', s.id + '.json');

    const e = {
      id: s.id,
      family: s.family,
      adoption: s.adoption,
      source_url: s.url,
      ...(isReconstructed ? { provenance: s.provenance } : { captured_at: cap.capturedAt }),
      mirror_of: s.id,
      license_note: s.license_note || DEFAULT_LICENSE,
      form_selector: s.form_selector,
      shape_notes: s.notes || null,
    };

    // ① 镜像页（入库）
    if (existsSync(mirrorPath)) {
      e.mirror = { file: rel(mirrorPath), bytes: statSync(mirrorPath).size, sha256: sha256File(mirrorPath) };
    }
    if (s.child_mirror_file) {
      const cp = path.join(FORMS, 'mirrors', s.child_mirror_file);
      if (existsSync(cp)) e.child_mirror = { file: rel(cp), bytes: statSync(cp).size, sha256: sha256File(cp) };
    }

    // ② 结构骨架（入库）
    if (existsSync(skelPath)) {
      const skel = JSON.parse(readFileSync(skelPath, 'utf8'));
      e.skeleton = {
        file: rel(skelPath),
        bytes: statSync(skelPath).size,
        sha256: sha256File(skelPath),
        tree_sha256: skel.sha256,
        node_count: skel.node_count,
        root_selector: skel.root_selector,
        skeleton_version: skel.skeleton_version,
        derived_from: skel.source,
        source_file: skel.source_file,
        ...readCaptureConditions(skel, s.id),
      };
    }

    // ③ 原始快照（**仓库外**：只登记指纹与归档相对路径）
    if (c) {
      e.capture = {
        ...readCaptureConditions(c, s.id),
        http_status: c.http_status,
        archive_root: cap.archiveRoot,
        archive_dir: cap.archiveDir || 'corpus-forms',
        raw: c.raw ? { path: 'corpus-forms/' + c.raw.file, bytes: c.raw.bytes, sha256: c.raw.sha256 } : null,
        dom: c.dom ? { path: 'corpus-forms/' + c.dom.file, bytes: c.dom.bytes, sha256: c.dom.sha256 } : null,
        frames: (c.frames || []).map((f) => ({ path: 'corpus-forms/' + f.file, bytes: f.bytes, sha256: f.sha256, url: f.url })),
        shot: c.shot ? { path: 'corpus-forms/' + c.shot.file } : null,
      };
      e.capture.ok = !!c.ok;
    }
    return e;
  });

  const out = {
    _meta: {
      name: '形态语料（form corpus）指纹与元数据清单',
      ticket: '06-form-corpus',
      covers: 'A-030',
      generated_by: 'tests/scripts/06-manifest.mjs',
      generated_at: new Date().toISOString(),
      role: '**库内唯一权威清单**。原始快照不入库；库内只留指纹与元数据。',
      layers: {
        mirror: '① 镜像页（入 git，测试主力）：去品牌 / 去追踪 / 内容替换，断言确定性最高',
        skeleton: '② 结构骨架（入 git，长期结构断言基线）：内容无关的归一化结构树',
        raw: '③ 原始快照（**仓库外 archive**）：raw HTML + 渲染后 DOM + 截图；库内只留 SHA-256 与元数据',
      },
      compliance: {
        publicPagesOnly: '只采公开页；不登录、不提交表单、不抓取 PII',
        brandStripped: '剥离品牌内容（产品名 / logo / 文案）与追踪（分析 / 外链）',
        provenance: '每条标 source_url + captured_at + mirror_of + license_note；reconstructed 条目（手工重构镜像，GLOSSARY）以 provenance（重构依据）替代 captured_at——页面不可重现，无捕获时点，且不参与结构比对（无可信基线）',
        noPii: '不含真实 PII',
        rawNotInGit: '原始快照（含品牌内容与版权）一律出仓归档，不入 git',
        captureConditions: '采集条件入台账（issue #34）：capture 块记 capture_country（06-capture-forms --country 固定的初始国家，默认 us）+ browser_locale（浏览器自报 locale，只记录不固定）；skeleton 块同步骨架 meta。清单再生成对历史条目**不补 null**（补了台账当场漂移）；而 --from archive 的骨架派生对缺这两个键的台账硬拒（早于本旋钮 → 重捕）。ipapi.co 之外的源固定不生效，逐条 ipapi_stub_hits=0 如实记。',
      },
      degradationLoop: {
        step1_recapture: 'tests/scripts/06-capture-forms.mjs（重捕 → 仓库外 archive）',
        step2_skeleton: 'tests/scripts/06-skeleton.mjs（派生内容无关结构树）',
        step3_structuralDiff: 'tests/scripts/06-structural-diff.mjs（确定性结构 diff + 分级 bump 判定）',
        step4_replaySelfCheck: 'npm run e2e（回放：owned 镜像页 L0–L4 断言）',
        discipline: '**绝不为修绿而盲目更新快照**——diff 非空即须先归因（站点改版 / 抓取环境 / 归一化缺陷），再决定 bump 与镜像页更新',
      },
      naming: '「形态语料」与既有「校准语料」（tests/corpus/manifest.json）在语义轴上正交：一个管表单形态，一个管阈值标定',
    },
    entries,
  };

  const outPath = path.join(FORMS, 'manifest.json');
  if (fromLedger) assertLedgerStable(cur, out);
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log('manifest: ' + entries.length + ' entries → ' + rel(outPath) +
    '  (source: ' + (fromLedger ? 'ledger round-trip' : 'archive') + ')');
  for (const e of entries) {
    console.log('  ' + e.id + '  mirror=' + (e.mirror ? 'Y' : '-') + '  skeleton=' + (e.skeleton ? e.skeleton.node_count + 'n' : '-') +
      '  raw=' + (e.capture && e.capture.raw ? e.capture.raw.bytes + 'B' : '-') +
      '  dom=' + (e.capture && e.capture.dom ? e.capture.dom.bytes + 'B' : '-') +
      '  frames=' + (e.capture ? e.capture.frames.length : 0));
  }
}

try { main(); } catch (e) { console.error('manifest failed: ' + ((e && e.message) || e)); process.exit(1); }
