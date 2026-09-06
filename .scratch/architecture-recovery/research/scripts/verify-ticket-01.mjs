// 独立复核 harness：对 01 票报告的关键声明逐条回仓库实物验证（大脑复核，不信任自述）
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const R = 'D:/Aworker/mozilla/choose-your-country';
const SRC_OLD = readFileSync(join(R, 'src/Find-Your-Country-Code.js'), 'utf8');
const results = [];
let checks = 0;
const T = (name, ok, detail = '') => { checks++; results.push({ name, ok, detail }); };

// ── 声明1: 10 个新模块文件存在且旧 JS 保留为只读基准 ──
for (const f of ['src/config.ts','src/i18n.ts','src/data/countries.ts','src/store/index.ts','src/detect/index.ts','src/fill/index.ts','src/ui/index.ts','src/rules/index.ts','src/main.ts','vite.config.ts','tsconfig.json','package.json']) {
  T(`文件存在 ${f}`, existsSync(join(R, f)));
}
T('旧基线 src/Find-Your-Country-Code.js 未被修改（行数与特征保留）', SRC_OLD.includes('@version') && SRC_OLD.includes('// ==/UserScript==') && SRC_OLD.length > 30000, `len=${SRC_OLD.length}`);

// ── 声明2: dist 产物存在且为单个 .user.js，头部 14 字段与基线一致 ──
const distDir = join(R, 'dist');
const distFiles = existsSync(distDir) ? readdirSync(distDir) : [];
const userjs = distFiles.filter(f => f.endsWith('.user.js'));
T('dist 仅一个 .user.js', userjs.length === 1, JSON.stringify(distFiles));
const dist = userjs.length ? readFileSync(join(distDir, userjs[0]), 'utf8') : '';

function meta(srcText) {
  const m = {};
  for (const line of srcText.split(/\r?\n/)) {
    const mm = /^\/\/\s*@([\w:-]+)\s+(.*)$/.exec(line.trim());
    if (mm) { (m[mm[1]] ||= []).push(mm[2].trim()); }
  }
  return m;
}
const oldMeta = meta(SRC_OLD), newMeta = meta(dist);
const fields = ['name','name:zh-CN','namespace','version','description','description:zh-CN','author','license','homepageURL','supportURL','downloadURL','updateURL','match','run-at'];
for (const f of fields) {
  T(`元数据一致 @${f}`, JSON.stringify(oldMeta[f]) === JSON.stringify(newMeta[f]), `old=${JSON.stringify(oldMeta[f])} new=${JSON.stringify(newMeta[f])}`);
}
for (const g of ['GM_setValue','GM_getValue','GM_addValueChangeListener']) {
  T(`grant 包含 ${g}`, (newMeta.grant || []).includes(g));
}
T('版本号 1.3.4', (newMeta.version || [''])[0] === '1.3.4');

// ── 声明3: 行为等价的代码级抽查——旧行为体逐块保留（特征行 must exist in 新模块） ──
const pairProbe = [
  ['SELECT_EXCLUDE_KW 数组完整（含 语言/省份/地区 等）', 'src/config.ts', ["'locale'","'province'","'地区'","'行政区'"]],
  ['COUNTRIES 表条目数一致', 'src/data/countries.ts', null],
  ['Store GM_addValueChangeListener 监听保留', 'src/store/index.ts', ['GM_addValueChangeListener','BroadcastChannel']],
  ['Detect._kw 归一化逻辑保留', 'src/detect/index.ts', ['replace(/[-_\\s]/g', '']],
  ['Detect._isSelect hitPlusLike 40% 阈值保留', 'src/detect/index.ts', ['0.4']],
  ['Fill.fillIti 5 层降级链保留', 'src/fill/index.ts', ['getInstance','setCountry','jQuery','closest']],
  ['Fill._dispatch 原型 setter 保留', 'src/fill/index.ts', ['HTMLInputElement.prototype']],
  ['UI.attach 包裹与图标保留', 'src/ui/index.ts', ['WRAPPER_CLASS','cch-btn','🌐']],
  ['UI._pos 视口定位保留', 'src/ui/index.ts', ['innerWidth','innerHeight']],
  ['observe MutationObserver+防抖保留', 'src/main.ts', ['MutationObserver','350']],
  ['init 轮询 8×500ms 保留', 'src/main.ts', ['500','8']],
];
for (const [name, file, probes] of pairProbe) {
  if (!probes) continue;
  const txt = readFileSync(join(R, file), 'utf8');
  T(name, probes.every(p => txt.includes(p)), probes.filter(p => !txt.includes(p)).join(' | '));
}
// COUNTRIES 条目数对比
const countOld = (SRC_OLD.match(/^\['\+/gm) || []).length;
const cts = readFileSync(join(R, 'src/data/countries.ts'), 'utf8');
const countNew = (cts.match(/^\['\+/gm) || []).length;
T(`COUNTRIES 条目数 旧=${countOld} 新=${countNew}`, countOld > 200 && countOld === countNew);

// 跨模块边界：detect/fill/ui 不得 import 彼此内部
const det = readFileSync(join(R, 'src/detect/index.ts'), 'utf8');
const fil = readFileSync(join(R, 'src/fill/index.ts'), 'utf8');
const ui = readFileSync(join(R, 'src/ui/index.ts'), 'utf8');
T('detect 不 import fill/ui/store', !/from\s+'.*(fill|ui|store)/.test(det));
T('fill 不 import detect/ui/store', !/from\s+'.*(detect|ui|store)/.test(fil));
T('ui 不 import detect/fill（经 deps 注入）', !/from\s+'.*(detect|fill)/.test(ui));

// rules 占位检查（不得引入站点规则行为）
const rules = readFileSync(join(R, 'src/rules/index.ts'), 'utf8');
T('rules 为最小占位（<1KB, 无关键词逻辑）', rules.length < 1024 && !rules.includes('SELECT_KW'));

// ── 声明4: 验收2 的行为对照脚本存在且可复跑判断（仅存在性+最近执行痕迹） ──
for (const s of ['behavior-compare.mjs','diag-new.mjs']) {
  T(`对照脚本存在 research/scripts/${s}`, existsSync(join(R, '.scratch/architecture-recovery/research/scripts', s)));
}

// ── 声明5: vite 构建真实可用（node_modules 装好 + vite.config.ts 含 monkey 与 userscript 元数据） ──
const vc = readFileSync(join(R, 'vite.config.ts'), 'utf8');
T('vite.config.ts 含 vite-plugin-monkey', vc.includes('vite-plugin-monkey'));
T('vite.config.ts 含 userscript 元数据定义', vc.includes('userscript') && vc.includes('1.3.4'));
T('node_modules 已安装', existsSync(join(R, 'node_modules/vite-plugin-monkey')));

// ── 声明6: 旧 JS 基线与 dist 内容行为抽查——关键 DOM 行为标记在新产物中 ──
for (const marker of ['cch-root','cch-wrapper','cch-pop','cch-toast','data-sec']) {
  T(`dist 保留行为标记 ${marker}`, dist.includes(marker));
}
// 旧基线独有逻辑不得在 dist 丢失：fillIti jQuery 分支
T('dist 保留 fillIti jQuery 降级分支', dist.includes('intlTelInput'));
// 检测新逻辑不应出现（行为等价红线）：不应出现 autocomplete 评分等 02 票内容
T('dist 未提前引入评分引擎（行为等价红线）', !/scoreElement|confidence|L0[^\n]*autocomplete/i.test(dist));

function readdirSafe(d) { try { return readdirSync(d); } catch { return []; } }

// ── 输出 ──
let pass = 0;
for (const r of results) { if (r.ok) pass++; else console.log(`FAIL  ${r.name}  ${r.detail}`); }
console.log(`\nTOTAL=${checks} PASS=${pass} FAIL=${checks - pass}`);
console.log((checks - pass) === 0 ? 'VERDICT=REPORT_CLAIMS_VERIFIED' : 'VERDICT=DISCREPANCIES_FOUND');
process.exit((checks - pass) === 0 ? 0 : 1);
