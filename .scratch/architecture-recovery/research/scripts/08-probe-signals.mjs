// 08-probe-signals.mjs — 票 08 取证：逐信号分解（P5/P6/P7/P8/P9 + 形态②忠实属性）
import { bundleEngine, evaluateCase } from '../../../../tests/scripts/14-lib-engine.mjs';
const { Detect } = bundleEngine();
const CASES = [
  { id: 'S1-iso2-lang-real-attrs', note: '形态②忠实属性：id=opt_uiTranslations（仅此），无 locale class',
    el: { tag: 'select', id: 'opt_uiTranslations', options: [
      { value: 'en', text: 'English (en)' }, { value: 'zh', text: 'Chinese (zh)' },
      { value: 'sq', text: 'Albanian (sq)' }, { value: 'fr', text: 'French (fr)' },
      { value: 'de', text: 'German (de)' }, { value: 'ja', text: 'Japanese (ja)' } ] } },
  { id: 'S2-noparen-dial', note: '形态③无括号（P5）',
    el: { tag: 'select', name: 'country_code', className: 'country-select', attrs: { 'aria-label': 'Country' }, options: [
      { value: 'CN', text: 'China +86' }, { value: 'US', text: 'United States +1' },
      { value: 'GB', text: 'United Kingdom +44' }, { value: 'JP', text: 'Japan +81' },
      { value: 'DE', text: 'Germany +49' }, { value: 'AC', text: 'Ascension Island +247' } ] } },
  { id: 'S3-paren-dial', note: '形态③括号对照（P6）',
    el: { tag: 'select', name: 'country_code', className: 'country-select', attrs: { 'aria-label': 'Country' }, options: [
      { value: 'CN', text: 'China (+86)' }, { value: 'US', text: 'United States (+1)' },
      { value: 'GB', text: 'United Kingdom (+44)' }, { value: 'JP', text: 'Japan (+81)' },
      { value: 'DE', text: 'Germany (+49)' }, { value: 'AC', text: 'Ascension Island (+247)' } ] } },
  { id: 'S4-n7-as-declared', note: 'N7 现状',
    el: { tag: 'select', name: 'country_code', className: 'select2-hidden-accessible', options: ['+86', '+1', '+44'] } },
  { id: 'S5-select2-aria-hidden', note: 'Select2 实测机理',
    el: { tag: 'select', name: 'country_code', className: 'select2-hidden-accessible', attrs: { 'aria-hidden': 'true', tabindex: '-1' }, options: ['+86', '+1', '+44'] } },
  { id: 'S6-chosen-display-none-mock', note: 'Chosen 形态（mock 无样式面）',
    el: { tag: 'select', name: 'country_code', className: 'chosen-select', attrs: { 'aria-label': 'Country' }, options: [
      { value: '', text: '' }, { value: '+86', text: '+86' }, { value: '+1', text: '+1' }, { value: '+44', text: '+44' } ] } },
];
for (const c of CASES) {
  const r = evaluateCase(c, Detect);
  console.log('\n=== ' + c.id + ' | score=' + r.score + ' tier=' + r.tier + ' injected=' + r.injected + ' ===');
  console.log('   ' + c.note);
  for (const s of (r.signals || [])) console.log('   ' + s.layer + '  ' + s.name + '  ' + s.pts);
}
