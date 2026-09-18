#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// verify-ticket-39.mjs — 票 39（真实站点层启用，覆盖 A-016）验收门
// 断言面（node 直跑，无浏览器、无外网、无 npm 依赖）：
//   G1 白名单契约：schema 齐备 + 跳过条目强制 reason+ticket + 至少 1 个 live 目标
//      enabled:true 且 selector/reason/ticket 齐备（issue 验收项 1）
//   G2 CodePen 收编：编辑器页作为 live 目标入册，带嵌套 preview iframe 断言声明
//      （frame）+ 核对日期 reason + ticket 39（issue 验收项 2）
//   G3 harness 能力：live-smoke.mjs 具备嵌套帧求值 + pageerror 计数断言 + 有头启动
//      （含无 DISPLAY 回退告警）（issue 验收项 3）
//   G4 隔离（delta）：真实站点层不得污染密封 E2E——on: 块无 pull_request；live 目标 host
//      不得出现在密封面的**可发起引用位置**（G4e 引用位断言；溯源元数据位允许——D-012）
//      + G4h 禁止以删源换绿 + G4i 密封层门面须装运行时网络封锁（D-012 正向补偿）
//   G5 advisory 保留：smoke 步 continue-on-error + 触发面仅 schedule/workflow_dispatch
//   G6 CI 有头渲染：workflow 用 xvfb-run 提供虚拟显示
// 用法：node tests/scripts/verify-ticket-39.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

const manifestPath = join(ROOT, 'tests', 'live', 'site-manifest.json');
const manifestSrc = readFileSync(manifestPath, 'utf8');
let manifest = null;
let parseErr = null;
try { manifest = JSON.parse(manifestSrc); } catch (e) { parseErr = String(e.message); }
check('G1a site-manifest.json 可解析', !!manifest && !parseErr, parseErr || '');
if (!manifest) { console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
const targets = Array.isArray(manifest.targets) ? manifest.targets : [];

// ══ G1：白名单契约 ══
const REQUIRED = ['id', 'kind', 'expect', 'enabled', 'reason', 'ticket'];
const schemaBad = [];
const ids = new Set();
for (const t of targets) {
  for (const f of REQUIRED) {
    if (t[f] === undefined || t[f] === null || t[f] === '') schemaBad.push((t.id || '?') + '.' + f);
  }
  if (ids.has(t.id)) schemaBad.push('dup:' + t.id);
  ids.add(t.id);
  if (!['mirror', 'live'].includes(t.kind)) schemaBad.push(t.id + '.kind=' + t.kind);
  if (!['injected', 'observe'].includes(t.expect)) schemaBad.push(t.id + '.expect=' + t.expect);
  if (t.kind === 'mirror' && !t.page) schemaBad.push(t.id + '.page 缺失');
  if (t.kind === 'live' && !t.url) schemaBad.push(t.id + '.url 缺失');
  if (t.frame !== undefined && (typeof t.frame !== 'string' || !t.frame)) schemaBad.push(t.id + '.frame 非法');
}
check('G1b 所有目标 schema 齐备', schemaBad.length === 0, schemaBad.join(','));

const skippedTargets = targets.filter(t => !t.enabled);
const skipBad = skippedTargets.filter(t => !t.reason || !t.ticket).map(t => t.id);
check('G1c 跳过条目强制携带非空 reason + ticket', skipBad.length === 0, skipBad.join(','));
check('G1d 存在跳过条目（白名单非空，可审计）', skippedTargets.length > 0, 'skipped=' + skippedTargets.length);

const enabledLive = targets.filter(t => t.kind === 'live' && t.enabled === true);
check('G1e 至少 1 个 live 目标 enabled:true', enabledLive.length >= 1, 'enabledLive=' + enabledLive.length);
const withSelector = enabledLive.filter(t => typeof t.selector === 'string' && t.selector.length > 0 && t.reason && t.ticket);
check('G1f 至少 1 个 enabled live 目标 selector/reason/ticket 齐备', withSelector.length >= 1,
  'withSelector=' + withSelector.map(t => t.id).join(','));
const greenLive = enabledLive.filter(t => t.expect === 'injected');
check('G1g 至少 1 个 enabled live 目标为断言型（expect=injected，可报绿）', greenLive.length >= 1,
  'injected=' + greenLive.map(t => t.id).join(','));

// ══ G2：CodePen 收编（编辑器页 + 嵌套 preview iframe 断言）══
const cpEditor = targets.find(t => t.kind === 'live' && typeof t.url === 'string' && /codepen\.io\/pen\//.test(t.url));
check('G2a CodePen 编辑器页已收编为 live 目标', !!cpEditor, 'url 未命中 codepen.io/pen/');
if (cpEditor) {
  check('G2b 编辑器页目标声明嵌套帧（frame 非空）', typeof cpEditor.frame === 'string' && cpEditor.frame.length > 0, String(cpEditor.frame));
  check('G2c 编辑器页目标 reason 含核对日期', /\d{4}-\d{2}-\d{2}/.test(cpEditor.reason || ''), (cpEditor.reason || '').slice(0, 40));
  check('G2d 编辑器页目标 ticket=39', String(cpEditor.ticket) === '39', String(cpEditor.ticket));
  check('G2e 编辑器页目标 enabled:true', cpEditor.enabled === true);
}
const cpPen = targets.find(t => t.kind === 'live' && typeof t.url === 'string' && /cdpn\.io\//.test(t.url));
check('G2f CodePen Pen 渲染域已入册（回归复现页的可持续断言目标）', !!cpPen, '');
if (cpPen) {
  check('G2g Pen 渲染页为断言型且嵌套帧声明齐备', cpPen.expect === 'injected' && cpPen.enabled === true && typeof cpPen.frame === 'string' && cpPen.frame.length > 0,
    'expect=' + cpPen.expect + ' frame=' + cpPen.frame);
}

// ══ G3：harness 能力（嵌套帧 + 未捕获异常 + 有头启动）══
const smokeSrc = readFileSync(join(ROOT, 'tests', 'live', 'live-smoke.mjs'), 'utf8');
check('G3a 声明 frame 并在匹配子帧内求值（waitForChildFrame + frame 字段）',
  /waitForChildFrame\s*\(/.test(smokeSrc) && /t\.frame/.test(smokeSrc), '');
check('G3b 未捕获异常断言（pageerror 计数，injected 目标要求为 0）',
  /pageerror/.test(smokeSrc) && /pageErrors\.length\s*>\s*0/.test(smokeSrc), '');
check('G3c 有头启动 + 无 DISPLAY 回退（headless: HEADLESS）',
  /chromium\.launch\(\{\s*headless:\s*HEADLESS\s*\}\)/.test(smokeSrc) && /NO_DISPLAY_LINUX/.test(smokeSrc), '');
check('G3d 不采用 UA 伪造与反自动化指纹开关',
  !/AutomationControlled/.test(smokeSrc) && !/userAgent\s*:/.test(smokeSrc), '');
check('G3e 挑战检测仅用于诊断（不阻断控制流：无“挑战则提前 return fail”式分支）',
  /diagnoseChallenge\s*\(/.test(smokeSrc) && !/waitForChallenge/.test(smokeSrc), '');

// ══ G4：隔离（真实站点层不得污染密封 E2E）══
const wfSrc = readFileSync(join(ROOT, '.github', 'workflows', 'real-site-smoke.yml'), 'utf8');
// 提取 on: 块（顶层键起至下一个非缩进顶层键）
const lines = wfSrc.split('\n');
let onStart = -1, onEnd = lines.length;
for (let i = 0; i < lines.length; i++) { if (/^on:\s*$/.test(lines[i])) { onStart = i; break; } }
if (onStart >= 0) { for (let i = onStart + 1; i < lines.length; i++) { if (/^[A-Za-z_]/.test(lines[i])) { onEnd = i; break; } } }
const onBlock = onStart >= 0 ? lines.slice(onStart + 1, onEnd).join('\n') : '';
check('G4a real-site-smoke.yml 存在 on: 块', onStart >= 0, '');
check('G4b 真实站点层不进 pull_request 触发面', onStart >= 0 && !/pull_request/.test(onBlock), 'on-block 含 pull_request');
check('G4c 触发面仅 schedule + workflow_dispatch', /schedule:/.test(onBlock) && /workflow_dispatch:/.test(onBlock), '');

const liveHosts = [...new Set(targets.filter(t => t.kind === 'live' && typeof t.url === 'string')
  .map(t => { try { return new URL(t.url).hostname; } catch { return null; } }).filter(Boolean))];
check('G4d live 目标 host 可解析', liveHosts.length >= 1, liveHosts.join(','));

const WALK_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
function walk(dir, out) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (WALK_SKIP.has(e.name)) continue;
    const fp = join(dir, e.name);
    if (e.isDirectory()) walk(fp, out); else out.push(fp);
  }
  return out;
}
const sealedRoots = [join(ROOT, 'tests', 'fixtures'), join(ROOT, 'tests', 'corpus'), join(ROOT, 'tests', 'helpers'), join(ROOT, 'tests', 'vendor')];
const sealedFiles = [];
for (const r of sealedRoots) for (const f of walk(r, [])) if (/\.(ts|js|mjs|json|html|css)$/.test(f)) sealedFiles.push(f);
for (const f of readdirSync(join(ROOT, 'tests'))) {
  if (/\.spec\.ts$/.test(f) || f === 'server.mjs') sealedFiles.push(join(ROOT, 'tests', f));
}
sealedFiles.push(join(ROOT, 'playwright.config.ts'));
// 引用位口径（与 verify-ticket-06 S3 同轴）：只有「可发起真实请求的位置」才算污染。
// 溯源元数据（source_url / mirror_of / license_note / captured_at 与采集源登记 url）是
// 票 06 合规口径**要求**留痕的内容，不属引用位。
// 依据：CONTEXT.md「密封 E2E」= 供给边界（不触真实站点与外网），非「字符串不得出现」；
// D-012（2026-09-18 用户拍板「完整采纳」）：精化到引用位断言 + 运行时封锁正向补偿。
const stripComments = (s, isHtml) => {
  let out = isHtml ? s.replace(/<!--[\s\S]*?-->/g, '') : s;
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  return out.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
};
// 单一捕获组：引用位前缀 + URL
const REF_URL = /(?:(?:src|href)\s*=\s*["']?|url\(\s*["']?|\b(?:fetch|import|goto|route)\s*\(\s*["'`]|new\s+URL\s*\(\s*["'`])(https?:\/\/[^\s"'`)<]+)/gi;
const rawHits = [];
const refHits = [];
for (const f of sealedFiles) {
  let c = ''; try { c = readFileSync(f, 'utf8'); } catch { continue; }
  const rel = relative(ROOT, f);
  for (const h of liveHosts) { if (c.includes(h)) rawHits.push(rel + ' ~ ' + h); }
  const code = stripComments(c, /\.html?$/i.test(f));
  REF_URL.lastIndex = 0;
  let m;
  while ((m = REF_URL.exec(code)) !== null) {
    const url = m[1];
    for (const h of liveHosts) { if (url.includes(h)) refHits.push(rel + ' ~ ' + h + ' @ ' + url.slice(0, 60)); }
  }
}
check('G4e live 目标 host 不出现在密封面的可发起引用位置（src=/href=/url()/fetch/import/goto/route/new URL）',
  refHits.length === 0, refHits.slice(0, 5).join(' | '));
check('G4h 语料溯源元数据位保留 live host 来源登记（禁止以删源换绿；见 D-004 / 票 06 S3）',
  rawHits.length >= 1, 'raw=' + rawHits.length);
const helperSrc = readFileSync(join(ROOT, 'tests', 'helpers', 'userscript.ts'), 'utf8');
check('G4i 密封层门面安装运行时网络封锁（非本地 origin 一律 abort + 记录）',
  /page\.route\(/.test(helperSrc) && /route\.abort\(\)/.test(helperSrc) &&
  /blockedRequests/.test(helperSrc) && /LOCAL_HOSTS/.test(helperSrc), '');
check('G4f 密封 E2E 供给面仍为本地（playwright.config baseURL 指向 127.0.0.1）',
  /127\.0\.0\.1/.test(readFileSync(join(ROOT, 'playwright.config.ts'), 'utf8')), '');

// ══ G5：advisory 保留 ══
check('G5a smoke 步 continue-on-error: true（advisory 不阻断）', /continue-on-error:\s*true/.test(wfSrc), '');
check('G5b _meta 登记 advisoryRule/challengeRule/frameRule/launchRule',
  ['advisoryRule', 'challengeRule', 'frameRule', 'launchRule'].every(k => typeof manifest._meta?.[k] === 'string' && manifest._meta[k].length > 0), '');

// ══ G6：CI 有头渲染（xvfb）══
check('G6a workflow 以 xvfb-run 运行冒烟（有头浏览器虚拟显示）', /xvfb-run/.test(wfSrc), '');

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('failures:\n - ' + failures.join('\n - ')); process.exit(1); }
