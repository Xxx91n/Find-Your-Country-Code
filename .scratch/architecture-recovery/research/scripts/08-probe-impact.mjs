// 08-probe-impact.mjs — 预判：新增 textDial（选项文本裸 +NN 令牌）会命中哪些现有语料用例
import { loadManifest, bundleEngine } from '../../../../tests/scripts/14-lib-engine.mjs';
const { COUNTRIES } = bundleEngine();
const DIAL = new Set(COUNTRIES.map(c => c.code.slice(1)));
const m = loadManifest();
let hits = 0;
for (const c of m.cases) {
  const el = c.el || {};
  if ((el.tag === 'select' || el.tag) !== 'select') continue;
  const opts = el.options || [];
  const fired = [];
  for (let i = 0; i < opts.length; i++) {
    const o = typeof opts[i] === 'string' ? { value: opts[i], text: opts[i] } : opts[i];
    if (i === 0 && !(o.value || '').trim()) continue;
    const v = String(o.value || '').trim();
    const t = String(o.text || '').trim();
    const valueIsDial = DIAL.has(v.replace(/^\+/, '').replace(/^00/, ''));
    if (valueIsDial) continue;
    const tm = t.match(/(?:^|[^(\d])\+(\d{1,4})(?!\d)/);
    if (tm && DIAL.has(tm[1])) fired.push(v + '|"' + t + '"->' + tm[1]);
  }
  if (fired.length) { hits++; console.log(c.id + ' [' + c.polarity + '/' + c.expect + '] textDial=' + fired.length + '  ' + fired.slice(0, 3).join('  ')); }
}
console.log('\n受影响 select 用例数 = ' + hits + ' / ' + m.cases.filter(c => (c.el || {}).tag === 'select').length);
