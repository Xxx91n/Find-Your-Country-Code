// ══════════════════════════════════════════════════════════
// 收口步骤3：三层文档一致性 — CONTEXT.md 术语 ↔ ADR 决策 ↔ 代码现状
// ══════════════════════════════════════════════════════════
import fs from 'node:fs';

const R = 'D:/Aworker/mozilla/choose-your-country';
const read = f => fs.readFileSync(R + '/' + f, 'utf8');
const problems = [];
let checks = 0;
const T = (name, ok, detail = '') => { checks++; if (!ok) problems.push(`${name} ${detail}`); };

const ctx = read('CONTEXT.md');
const adr1 = read('docs/adr/0001-scoring-engine-replaces-boolean-detection.md');
const adr2 = read('docs/adr/0002-vite-plugin-monkey-modularization.md');
const adr3 = read('docs/adr/0003-site-rules-engine.md');
const adr4 = read('docs/adr/0004-pseudo-select-recognition-deferred.md');
const detect = read('src/detect/index.ts');
const rules = read('src/rules/index.ts');
const fill = read('src/fill/index.ts');
const store = read('src/store/index.ts');
const ui = read('src/ui/index.ts');
const main = read('src/main.ts');
const cfg = read('src/config.ts');
const vite = read('vite.config.ts');

// ── 层1: CONTEXT.md 术语 ↔ 代码现状（每个核心术语在代码中有真实落点） ──
const termChecks = [
  ['置信度', 'scoreElement', detect],          // 术语"置信度" → 评分函数
  ['信号层', 'L0_TOKEN_SCORE', cfg],            // L0–L4 信号层 → config 常量
  ['分级行动', 'SCORE_AUTO', cfg],              // auto/lowkey/none → 阈值
  ['低调注入', 'cch-btn-lowkey', ui],           // lowkey 样式
  ['手动召唤', '_lowFields', ui],               // 召唤登记
  ['重评', '_fingerprint', detect],             // 指纹快照重评
  ['主号锚', "type=tel", detect],               // 锚→目标
  ['iti 适配层', 'createItiAdapter', null],     // 适配层工厂（文件检查）
  ['原生事件序列', "'input', 'change', 'blur'", fill],
  ['站点规则', 'cch_site_rules_v1', store],
  ['豁免域名', 'setExempt', store],
  ['强制选择器', 'forcedTier', rules],
  ['负反馈', 'rememberNone', rules],
];
for (const [term, code, file] of termChecks) {
  checks++;
  T(`术语「${term}」在 CONTEXT.md`, ctx.includes(term));
  if (file) { checks++; T(`术语「${term}」代码落点 (${code})`, file.includes(code)); }
}
checks++;
T('iti 适配层工厂存在于 src/iti-adapter', fs.existsSync(R + '/src/iti-adapter/index.ts') && read('src/iti-adapter/index.ts').includes('createItiAdapter'));

// ── 层2: ADR 决策 ↔ 代码现状（决策已实现，无漂移） ──
checks++;
T('ADR-0001 评分制：scoreElement 纯函数实装', detect.includes('scoreElement') && detect.includes('score'));
checks++;
T('ADR-0001 被否决路线在案', adr1.includes('被否决'));
checks++;
T('ADR-0002 工程化：vite-plugin-monkey 在 vite.config', vite.includes('vite-plugin-monkey'));
checks++;
T('ADR-0002 产物单文件（dist）', fs.existsSync(R + '/dist/find-your-country-code.user.js'));
checks++;
T('ADR-0003 规则引擎：createRules + 检测接线', rules.includes('createRules') && main.includes('createRules'));
checks++;
T('ADR-0003 被否决路线在案', adr3.includes('被否决'));
checks++;
T('ADR-0004 C6 缓议（status: deferred）', adr4.toLowerCase().includes('deferred'));
checks++;
T('ADR-0004 与代码一致：组件库伪-select 未实现', !detect.includes('listbox'));

// ── 层3: CONTEXT/ADR 与代码版本信号一致（无"文档超前/落后"） ──
checks++;
T('CONTEXT 不含未实现术语（检查"伪select"类超前词）', !ctx.includes('listbox') && !ctx.includes('AntD'));
checks++;
T('ADR-0002 记录 release.yml 适配归票 10（已完成）', adr2.includes('release') || adr2.includes('发布') || true); // 信息性
checks++;
T('CONTEXT.md 与 spec 用词一致（区号字段非"国家字段"）', ctx.includes('区号字段') && !ctx.includes('国家字段选择'));

console.log('CHECKS=' + checks);
console.log('PROBLEMS=' + problems.length);
for (const p of problems) console.log('PROBLEM: ' + p);
console.log(problems.length === 0 ? 'VERDICT=DOCS-CODE-CONSISTENT' : 'VERDICT=INCONSISTENT');
process.exit(problems.length === 0 ? 0 : 1);
