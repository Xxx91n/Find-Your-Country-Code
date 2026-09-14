#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// 38-gf-alignment-check.mjs — 票 38（A-011）「GF 上线版本对齐」只读校验
//
// 只读约定（票 38 delta）：全程 HTTP GET，绝不 POST/PUT 任何写 GreasyFork 的
// 请求。GF 无写入 API，上线依赖站内一次性的「Sync from external URL」拉取，
// 该开启动作面向真实用户，须由维护者人工执行并确认。
//
// 校验项：
//   A1 拉取 GF 线上 .meta.js，解析 @version —— 即用户更新检查实际看到的版本
//   A2 与 package.json（唯一真源）比对，输出对齐 / 漂移结论
//   A3 校验 GF 同步源（GitHub releases/latest 产物链）可达 —— 只读 GET
//
// 频率：≤ 1 次/天（GF 更新检查硬规则），由 gf-alignment-check.yml 的每日 cron
//       与手动 workflow_dispatch 提供，绝不在每次 push 触发。
//
// 退出码：默认 0（advisory，漂移以 ::warning:: 呈报）；
//         --strict 下漂移 exit 1（::error::），供 GF 同步开通后再收紧。
// 用法：node tests/scripts/38-gf-alignment-check.mjs [--strict]
// ══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ADR-0006 决策 1：脚本以自身位置上溯 2 级锚定仓库根
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');

const GF_META_URL =
  'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js';
const SYNC_SOURCE_URL =
  'https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest/download/find-your-country-code.user.js';
const TIMEOUT_MS = 20000;

const strict = process.argv.includes('--strict');
const pkgVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

function metaValue(src, key) {
  const m = src.match(new RegExp('^//\\s*@' + key + '\\s+(\\S+)\\s*$', 'm'));
  return m ? m[1].trim() : null;
}

async function getText(url, method) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: ac.signal,
      headers: { 'user-agent': 'cch-38-gf-alignment-check (read-only)' } });
    return { ok: res.ok, status: res.status, body: method === 'GET' ? await res.text() : '' };
  } finally {
    clearTimeout(timer);
  }
}

console.log('== 票 38 / A-011 GreasyFork 上线版本对齐（只读）==');
console.log('package.json（唯一真源）: ' + pkgVersion);
console.log('GF 线上 meta:            ' + GF_META_URL);
console.log('GF 同步源（GitHub）:     ' + SYNC_SOURCE_URL);
console.log('mode: ' + (strict ? 'strict（漂移即红）' : 'advisory（漂移仅告警）'));
console.log('');

let drift = false;
let unreachable = false;

// ── A1/A2：GF 线上版本 vs 真源 ────────────────────────────────────────
try {
  const meta = await getText(GF_META_URL, 'GET');
  if (!meta.ok) {
    unreachable = true;
    console.log('::warning::GF meta.js 不可达（HTTP ' + meta.status + '）——无法判定上线版本');
  } else {
    const gfVersion = metaValue(meta.body, 'version');
    if (!gfVersion) {
      unreachable = true;
      console.log('::warning::GF meta.js 未解析到 @version');
    } else {
      console.log('GF 线上 @version:         ' + gfVersion);
      if (gfVersion === pkgVersion) {
        console.log('ALIGNED: GreasyFork 线上版本与 package.json 一致');
      } else {
        drift = true;
        const msg = 'GF 线上 ' + gfVersion + ' ≠ package.json ' + pkgVersion +
          ' —— 用户更新检查仍会看到旧版本（A-011 送达断点）。修复：在 GF 脚本页开启 ' +
          'Sync from external URL 指向 ' + SYNC_SOURCE_URL + '（人工一次性，须维护者确认）';
        console.log((strict ? '::error::' : '::warning::') + msg);
        console.log('DRIFT: ' + gfVersion + ' -> ' + pkgVersion);
      }
    }
  }
} catch (err) {
  unreachable = true;
  console.log('::warning::GF meta.js 请求失败: ' + (err && err.message ? err.message : String(err)));
}

// ── A3：同步源可达性 ──────────────────────────────────────────────────
try {
  const src = await getText(SYNC_SOURCE_URL, 'GET');
  const srcVersion = src.ok ? metaValue(src.body, 'version') : null;
  console.log('同步源 HTTP ' + src.status + (srcVersion ? '，产物 @version=' + srcVersion : ''));
  if (!src.ok) {
    unreachable = true;
    console.log('::warning::GF 同步源不可达（HTTP ' + src.status + '）');
  } else if (srcVersion && srcVersion !== pkgVersion) {
    drift = true;
    const msg = 'GitHub releases/latest 产物 ' + srcVersion + ' ≠ package.json ' + pkgVersion;
    console.log((strict ? '::error::' : '::warning::') + msg);
  } else if (src.ok) {
    console.log('REACHABLE: 同步源可拉取，且返回最新版本产物');
  }
} catch (err) {
  unreachable = true;
  console.log('::warning::同步源请求失败: ' + (err && err.message ? err.message : String(err)));
}

console.log('');
if (strict && drift) {
  console.log('RESULT: FAIL（strict 模式，存在版本漂移）');
  process.exit(1);
}
if (unreachable) {
  console.log('RESULT: INCONCLUSIVE（网络不可达，非版本判定失败）');
  process.exit(0);
}
console.log('RESULT: OK' + (drift ? '（advisory：存在漂移，已告警）' : '（对齐）'));
