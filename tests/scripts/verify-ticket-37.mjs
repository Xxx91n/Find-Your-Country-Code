#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-37.mjs — 票 37（入口可达性，覆盖 A-012/A-013）验收门
// 断言面（node 直跑，无浏览器、无 npm 依赖）：
//   G1 GM 菜单第二命令：main.ts 顶层帧注册「打开面板」→ UI.open(null,null,null)，
//      注册块仍在 IS_TOP_FRAME 门内（面板仅顶层渲染语义不变）
//   G2 居中路径保留：_pos 的 !anchor 分支与居中算式逐字在（既有路径不改）
//   G3 i18n 双语键：openPanel 在 zh/en 同时登记（运行时 t() 双语言求值）
//   G4 lowkey 盒内定位：.cch-btn-lowkey 块 top:50% + right≥0 且无负向 top/right；
//      静止态 opacity<1、:hover 恢复 opacity:1 且 transform 保 translateY；
//      无 animation/@keyframes、无 saturate(>1)（横幅盲区反模式禁令）
//   G5 空目标守卫：_feedback 与行点击两处接 needTarget toast（GM 入口无目标字段）
//   G6 判定面不变：config.ts SCORE_AUTO=70/SCORE_LOWKEY=35 逐字 + detect 分档链逐字
// 装载：与 verify-31 同心智——module.stripTypeScriptTypes（Node>=22.13）。
// 用法：node tests/scripts/verify-ticket-37.mjs
// ══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
if (typeof stripTypeScriptTypes !== 'function') {
  console.error('verify-ticket-37 需要 Node >= 22.13（module.stripTypeScriptTypes）');
  process.exit(2);
}

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function toModuleBody(file) {
  return readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

const mainSrc = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf8');
const uiSrc = readFileSync(join(ROOT, 'src', 'ui', 'index.ts'), 'utf8');
const cfgSrc = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const detSrc = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');

// ══ G1：GM 菜单第二命令（顶层帧门内）══
const menuBlock = mainSrc.match(/if \(IS_TOP_FRAME && typeof GM_registerMenuCommand === 'function'\) \{[\s\S]*?\n\}/);
check('G1a IS_TOP_FRAME 门内菜单注册块存在', !!menuBlock);
const menuCalls = menuBlock ? (menuBlock[0].match(/GM_registerMenuCommand\(/g) || []).length : 0;
check('G1b 顶层帧注册四条菜单命令（票 37 打开面板 + 票 02 恢复/设置 + 票 03 诊断）', menuCalls === 4, 'calls=' + menuCalls);
check('G1c 打开面板命令直达 UI.open(null,null,null)',
  /GM_registerMenuCommand\(\s*t\('openPanel'\)\s*,\s*\(\)\s*=>\s*\{\s*UI\.open\(null,\s*null,\s*null\)/.test(mainSrc));

// ══ G2：anchor=null 居中路径逐字保留 ══
check('G2a _pos 保留 !anchor 居中分支',
  /if \(!anchor\) \{[\s\S]*?Math\.max\(m, \(innerWidth - pw\) \/ 2\)/.test(uiSrc));
check('G2b 居中分支写 position:fixed',
  /if \(!anchor\) \{[\s\S]*?position:fixed/.test(uiSrc));

// ══ G3：i18n 双语键运行时求值（同 verify-31 装载法）══
const i18nBody = toModuleBody(join(ROOT, 'src', 'i18n.ts')).replace(/navigator\.language/g, '__navLanguage');
function tOf(lang) {
  const bundle = 'const __navLanguage = ' + JSON.stringify(lang) + ';\n' + i18nBody;
  return new Function(stripTypeScriptTypes(bundle, { mode: 'strip' }) + '\n;return { t };')().t;
}
const tz = tOf('zh-CN'), te = tOf('en-US');
check('G3a zh openPanel 已登记且非键名回退', tz('openPanel') !== 'openPanel' && tz('openPanel').length > 0, tz('openPanel'));
check('G3b en openPanel 已登记且非键名回退', te('openPanel') !== 'openPanel' && te('openPanel').length > 0, te('openPanel'));

// ══ G4：lowkey 盒内定位 + 横幅盲区禁令 ══
const lowkeyM = uiSrc.match(/\.cch-btn-lowkey\{([^}]*)\}/);
check('G4a .cch-btn-lowkey 规则存在', !!lowkeyM);
const lb = lowkeyM ? lowkeyM[1] : '';
check('G4b 盒内垂直居中 top:50%', /top:\s*50%/.test(lb));
const rightM = lb.match(/right:\s*(-?[\d.]+)px/);
check('G4c right 非负（字段右缘盒内）', !!rightM && parseFloat(rightM[1]) >= 0, rightM && rightM[0]);
check('G4d 无负向 top/right（盒外定位已移除）', !/top:\s*-/.test(lb) && !/right:\s*-/.test(lb));
const opM = lb.match(/opacity:\s*([\d.]+)/);
check('G4e 静止态 opacity<1（与 auto 分层保留）', !!opM && parseFloat(opM[1]) < 1, opM && opM[0]);
const satM = lb.match(/saturate\(([\d.]+)\)/);
check('G4f 无动画且无高饱和滤镜', !/animation|@keyframes/.test(lb) && !(satM && parseFloat(satM[1]) > 1),
  'sat=' + (satM && satM[1]));
const hoverM = uiSrc.match(/\.cch-btn-lowkey:hover\{([^}]*)\}/);
check('G4g hover 恢复全权重（opacity:1 + translateY 保持）',
  !!hoverM && /opacity:\s*1/.test(hoverM[1]) && /translateY\(-50%\)/.test(hoverM[1]));

// ══ G5：空目标守卫（GM 入口 _target=null 语义）══
check('G5a 负反馈空目标 → needTarget toast',
  /if \(!el\) \{[\s\S]{0,240}?this\.toast\(t\('needTarget'\)\);\s*return;/.test(uiSrc));
// 票 03 [A-028]：同一守卫必须同时落已验证因果的诊断记录（不得静默）
check('G5a2 空目标同落诊断记录（票 03 LOGIC_NO_TARGET）',
  /if \(!el\) \{[\s\S]{0,240}?LOGIC_NO_TARGET[\s\S]{0,160}?this\.toast\(t\('needTarget'\)\)/.test(uiSrc));
check('G5b 行点击空目标 → needTarget toast',
  /if \(!this\._target\) \{ this\.toast\(t\('needTarget'\)\); return; \}/.test(uiSrc));

// ══ G6：评分/档位判定面零改动 ══
check('G6a SCORE_AUTO=70 逐字保留', /export const SCORE_AUTO = 70;/.test(cfgSrc));
check('G6b SCORE_LOWKEY=35 逐字保留', /export const SCORE_LOWKEY = 35;/.test(cfgSrc));
check('G6c detect 分档 if 链逐字保留',
  /if \(score >= SCORE_AUTO\) tier = 'auto';[\s\S]*?else if \(score >= SCORE_LOWKEY\) tier = 'lowkey';/.test(detSrc));
check('G6d 低置信登记线 25 未动', /ITI_LOW_REGISTER_SCORE = 25/.test(cfgSrc));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('failures:\n - ' + failures.join('\n - ')); process.exit(1); }
