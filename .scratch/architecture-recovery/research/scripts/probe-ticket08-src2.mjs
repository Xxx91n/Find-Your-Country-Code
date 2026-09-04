// 票08事实核对2：store 规则 schema 头注释 + UI 面板功能面 + rules API
import fs from 'node:fs';
const root = 'D:/Aworker/mozilla/choose-your-country';

const store = fs.readFileSync(`${root}/src/store/index.ts`, 'utf8');
console.log('===== store/index.ts first 60 lines (schema doc) =====');
console.log(store.split(/\r?\n/).slice(0, 60).join('\n'));

const rules = fs.readFileSync(`${root}/src/rules/index.ts`, 'utf8');
console.log('\n===== rules/index.ts exports =====');
for (const line of rules.split(/\r?\n/)) {
  if (/^export|^\s{0,2}(function|const)\s|^return\s*\{/.test(line)) console.log(line.trim().slice(0, 140));
}
console.log('\n===== rules/index.ts return block (tail 25 lines) =====');
console.log(rules.split(/\r?\n/).slice(-28).join('\n'));

const ui = fs.readFileSync(`${root}/src/ui/index.ts`, 'utf8');
console.log('\n===== ui/index.ts feature probes =====');
const probes = ['negative', 'feedback', 'exempt', 'rule', '召唤', '手动', '设置', '低调', 'lowkey', 'auto', 'toast', 'cch-site', '豁免'];
const lines = ui.split(/\r?\n/);
const hits = new Set();
lines.forEach((l, i) => {
  for (const p of probes) {
    if (l.includes(p)) { hits.add(`${i + 1}: ${l.trim().slice(0, 150)}`); break; }
  }
});
console.log([...hits].slice(0, 40).join('\n') || '(no probe hits)');
console.log('\nUI total lines:', lines.length);
