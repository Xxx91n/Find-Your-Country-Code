import { bundleEngine } from '../../../../tests/scripts/14-lib-engine.mjs';
const { COUNTRIES } = bundleEngine();
const codes = COUNTRIES.map(c => c.code);
console.log('COUNTRIES size = ' + COUNTRIES.length);
for (const d of ['+86', '+1', '+44', '+81', '+49', '+247', '+290', '+354']) {
  console.log('  dial ' + d + ' in codes? ' + codes.includes(d));
}
console.log('keys = ' + JSON.stringify(Object.keys(COUNTRIES[0])));
console.log('sample = ' + JSON.stringify(COUNTRIES.slice(0, 2)));
const hit = COUNTRIES.filter(c => JSON.stringify(c).includes('Ascension') || JSON.stringify(c).includes('247'));
console.log('Ascension/247 entries = ' + JSON.stringify(hit));
