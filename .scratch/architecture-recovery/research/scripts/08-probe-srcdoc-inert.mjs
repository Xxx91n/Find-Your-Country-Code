// 08-probe-srcdoc-inert.mjs — 归因取证：票 10 srcdoc fixture 字段形态对本票新增规则的暴露面
import { bundleEngine, evaluateCase } from '../../../../tests/scripts/14-lib-engine.mjs';
const { Detect } = bundleEngine();
const srcdocField = { el: { tag: 'select', id: 'srcc-cc', name: 'countryCode', options: [
  { value: '', text: '\u9009\u62e9\u2026' }, { value: '+86', text: '+86' }, { value: '+81', text: '+81' },
  { value: '+44', text: '+44' }, { value: '+1', text: '+1' }, { value: '+49', text: '+49' },
  { value: '+33', text: '+33' }, { value: '+61', text: '+61' }, { value: '+7', text: '+7' } ] }, labels: [], ctx: {} };
const r = evaluateCase(srcdocField, Detect);
console.log('score=' + r.score + ' tier=' + r.tier + ' injected=' + r.injected);
console.log('signals=' + (r.signals || []).map(s => s.name + '(' + s.pts + ')').join(' | '));
console.log('hasTextDialSignal=' + !!(r.signals || []).find(s => s.name === 'opts:+NN-text'));
console.log('hasPlusDialSignal=' + !!(r.signals || []).find(s => s.name === 'opts:plus-dial'));
console.log('hasAriaHiddenGate=' + !!(r.signals || []).find(s => s.name === 'gate:aria-hidden'));
