#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-manifest.mjs — 形态语料「指纹与元数据清单」生成器（票 06 / A-030）
//
// 定位：**库内唯一权威清单**（`tests/corpus/forms/manifest.json`）。
//   原始快照**不入库**——库内只留：
//     · 镜像页 / 结构骨架的**文件 SHA-256**（入库文件的可验证指纹）；
//     · 原始快照的 **SHA-256 + 归档相对路径 + 字节数**（指向仓库外 archive）；
//     · 合规元数据（source_url / captured_at / mirror_of / license_note）。
//
// 用法：node tests/scripts/06-manifest.mjs [--archive <dir>]
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FORMS = path.join(REPO, 'tests', 'corpus', 'forms');

const DEFAULT_ARCHIVE =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const rel = (p) => path.relative(REPO, p).replace(/\\/g, '/');

const DEFAULT_LICENSE =
  '形态复刻（非原文转载）：仅保留公开表单形态，已去品牌 / 去追踪 / 内容替换，不含真实 PII；' +
  '原始快照出仓归档，不入 git。';

function main() {
  const argv = process.argv.slice(2);
  const ai = argv.indexOf('--archive');
  const archiveRoot = path.resolve(ai >= 0 ? argv[ai + 1] : DEFAULT_ARCHIVE);
  const archiveDir = path.join(archiveRoot, 'corpus-forms');
  const capPath = path.join(archiveDir, 'CAPTURE-MANIFEST.json');
  if (!existsSync(capPath)) throw new Error('缺少抓取清单，先跑 06-capture-forms.mjs → ' + capPath);
  const cap = JSON.parse(readFileSync(capPath, 'utf8'));
  const capById = new Map(cap.entries.map((e) => [e.id, e]));

  const sources = JSON.parse(readFileSync(path.join(FORMS, 'sources.json'), 'utf8')).sources;

  const entries = sources.map((s) => {
    const c = capById.get(s.id);
    const mirrorName = s.mirror_file || s.id + '.html';
    const mirrorPath = path.join(FORMS, 'mirrors', mirrorName);
    const skelPath = path.join(FORMS, 'skeletons', s.id + '.json');

    const e = {
      id: s.id,
      family: s.family,
      adoption: s.adoption,
      source_url: s.url,
      captured_at: cap.capturedAt,
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
      };
    }

    // ③ 原始快照（**仓库外**：只登记指纹与归档相对路径）
    if (c) {
      e.capture = {
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
        provenance: '每条标 source_url + captured_at + mirror_of + license_note',
        noPii: '不含真实 PII',
        rawNotInGit: '原始快照（含品牌内容与版权）一律出仓归档，不入 git',
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
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log('manifest: ' + entries.length + ' entries → ' + rel(outPath));
  for (const e of entries) {
    console.log('  ' + e.id + '  mirror=' + (e.mirror ? 'Y' : '-') + '  skeleton=' + (e.skeleton ? e.skeleton.node_count + 'n' : '-') +
      '  raw=' + (e.capture && e.capture.raw ? e.capture.raw.bytes + 'B' : '-') +
      '  dom=' + (e.capture && e.capture.dom ? e.capture.dom.bytes + 'B' : '-') +
      '  frames=' + (e.capture ? e.capture.frames.length : 0));
  }
}

try { main(); } catch (e) { console.error('manifest failed: ' + ((e && e.message) || e)); process.exit(1); }
