// ══════════════════════════════════════════════════════════════════
// 08-probe-shapes.mjs — 票 08（阶段 B）取证探针
// 职责：用既有 mock harness（tests/scripts/14-lib-engine.mjs）实测 A-031 三形态
//      与 A-032 两子形态在当前引擎下的 score / tier / injected / signals。
// 语料先行纪律：本探针只取证，不改引擎、不改语料。
// 用法：node .scratch/architecture-recovery/research/scripts/08-probe-shapes.mjs
// ══════════════════════════════════════════════════════════════════
import { bundleEngine, evaluateCase, loadManifest, runCorpus, metrics } from '../../../../tests/scripts/14-lib-engine.mjs';

const CASES = [
  {
    id: 'P1-iti-search-box',
    note: 'iti v29 内部搜索框（.iti 容器内，type=search + role=combobox + aria-autocomplete=list）——A-031 形态①，负例（不得注入）',
    el: {
      tag: 'input', type: 'search', className: 'iti__search-input',
      attrs: { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'iti-0__country-listbox', 'aria-autocomplete': 'list', placeholder: 'Search' },
      options: [
        { value: '', text: 'China +86' }, { value: '', text: 'United States +1' },
        { value: '', text: 'Canada +1' }, { value: '', text: 'United Kingdom +44' },
        { value: '', text: 'Japan +81' }, { value: '', text: 'Germany +49' },
        { value: '', text: 'Ascension Island +247' },
      ],
      ancestors: [{ className: 'iti' }],
    },
  },
  {
    id: 'P2-iti-tel-sibling',
    note: '同页 iti 容器内的真实 tel 输入（正例对照：必须仍 auto）',
    el: {
      tag: 'input', type: 'tel', id: 'phone', className: 'iti__tel-input', placeholder: '90-1234-5678',
      attrs: { autocomplete: 'tel', inputmode: 'tel', 'aria-label': 'Phone number' },
      ancestors: [{ className: 'iti' }],
    },
    ctx: { anchorHasTel: true },
  },
  {
    id: 'P3-iso2-lang-select',
    note: '值恰为 ISO2 的语言下拉（#opt_uiTranslations，形如 sq|Albanian (sq)）——A-031 形态②，伪区号陷阱',
    el: {
      tag: 'select', id: 'opt_uiTranslations', className: 'locale-select',
      attrs: { 'aria-label': 'Interface language' },
      options: [
        { value: 'en', text: 'English (en)' }, { value: 'zh', text: 'Chinese (zh)' },
        { value: 'sq', text: 'Albanian (sq)' }, { value: 'fr', text: 'French (fr)' },
        { value: 'de', text: 'German (de)' }, { value: 'it', text: 'Italian (it)' },
        { value: 'es', text: 'Spanish (es)' }, { value: 'ja', text: 'Japanese (ja)' },
      ],
    },
  },
  {
    id: 'P4-iso2-lang-select-bare-text',
    note: '同上但选项文本不含括号（Albanian）——探测文本↔国名互证是否误命中',
    el: {
      tag: 'select', id: 'opt_uiTranslations', className: 'locale-select',
      attrs: { 'aria-label': 'Interface language' },
      options: [
        { value: 'sq', text: 'Albanian' }, { value: 'fr', text: 'French' },
        { value: 'de', text: 'German' }, { value: 'it', text: 'Italian' },
        { value: 'es', text: 'Spanish' }, { value: 'ja', text: 'Japanese' },
      ],
    },
  },
  {
    id: 'P5-noparen-dial-select',
    note: '无括号区号文本（value=ISO2，text="Ascension Island +247"）——A-031 形态③',
    el: {
      tag: 'select', name: 'country_code', className: 'country-select',
      attrs: { 'aria-label': 'Country' },
      options: [
        { value: 'CN', text: 'China +86' }, { value: 'US', text: 'United States +1' },
        { value: 'GB', text: 'United Kingdom +44' }, { value: 'JP', text: 'Japan +81' },
        { value: 'DE', text: 'Germany +49' }, { value: 'AC', text: 'Ascension Island +247' },
      ],
    },
  },
  {
    id: 'P6-noparen-dial-select-parens-ctrl',
    note: '同 P5 但文本用括号 (+247)——现状基线对照（应得 dial 证据）',
    el: {
      tag: 'select', name: 'country_code', className: 'country-select',
      attrs: { 'aria-label': 'Country' },
      options: [
        { value: 'CN', text: 'China (+86)' }, { value: 'US', text: 'United States (+1)' },
        { value: 'GB', text: 'United Kingdom (+44)' }, { value: 'JP', text: 'Japan (+81)' },
        { value: 'DE', text: 'Germany (+49)' }, { value: 'AC', text: 'Ascension Island (+247)' },
      ],
    },
  },
  {
    id: 'P7-select2-mock-as-is',
    note: 'N7 现状声明（select2-hidden-accessible，mock 无隐藏样式 → 可见）',
    el: { tag: 'select', name: 'country_code', className: 'select2-hidden-accessible', options: ['+86', '+1', '+44'] },
  },
  {
    id: 'P8-select2-real-mechanism',
    note: 'Select2 实测机理：aria-hidden=true（+width:1px/clip）——mock 只能表达 aria-hidden 属性面',
    el: {
      tag: 'select', name: 'country_code', className: 'select2-hidden-accessible',
      attrs: { 'aria-hidden': 'true', tabindex: '-1' },
      options: ['+86', '+1', '+44'],
    },
  },
  {
    id: 'P9-chosen-mock',
    note: 'Chosen 实测机理：display:none（mock 无法表达 → fail-open 视为可见；此行的意义就是暴露该局限）',
    el: {
      tag: 'select', name: 'country_code', className: 'chosen-select',
      attrs: { 'data-placeholder': 'Choose a Country...', 'aria-label': 'Country' },
      options: [{ value: '', text: '' }, { value: '+86', text: '+86' }, { value: '+1', text: '+1' }, { value: '+44', text: '+44' }],
    },
  },
];

const { Detect } = bundleEngine();
console.log('=== A-031 / A-032 形态实测（mock harness，引擎 @ 当前工作树） ===');
const rows = [];
for (const c of CASES) {
  const r = evaluateCase(c, Detect);
  const gates = (r.signals || []).filter(s => /gate|veto/.test(s.name)).map(s => s.name + '(' + s.pts + ')');
  rows.push({ id: c.id, score: r.score, tier: r.tier, injected: r.injected, gates: gates.join(' ') || '-', note: c.note });
}
for (const r of rows) {
  console.log('\n[' + r.id + ']  score=' + r.score + '  tier=' + r.tier + '  injected=' + r.injected);
  console.log('   gates: ' + r.gates);
  console.log('   ' + r.note);
}

const m = loadManifest();
const res = runCorpus(m, Detect);
const met = metrics(res, m);
console.log('\n=== 全语料基线（' + met.cases + ' 例） ===');
console.log('TP=' + met.TP + ' FP=' + met.FP + ' TN=' + met.TN + ' FN=' + met.FN +
  '  precision=' + met.precision + ' recall=' + met.recall + ' accuracy=' + met.accuracy);
console.log('mismatches: ' + (met.mismatches.length ? met.mismatches.join(', ') : 'none'));
