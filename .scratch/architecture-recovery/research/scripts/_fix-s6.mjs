// 大脑修正：S6 断言位置修正——panel-negative-feedback 的权威生成点在 rules 层（rememberNone），
// ui 层只调用 rememberNone 不写 note 字面量。把该断言从 ui 清单移到 rules 清单。
import fs from 'node:fs';
const P = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/verify-ticket-07.mjs';
let v = fs.readFileSync(P, 'utf8');

const oldUiList = `  for (const f of ['cch-fb', 'cch-rules-view', 'cch-rules-tg', 'cch-exempt-tg', 'cch-lowkey-tg',
    'lowkeyMode', '{ force: true }', 'detachAll', '_applyLowkeyMode', 'matchingOverrides',
    'rememberNone', 'panel-negative-feedback']) {
    ok(ui.includes(f), 'S6 ui/index.ts 含 ' + f);
  }`;
const newUiList = `  for (const f of ['cch-fb', 'cch-rules-view', 'cch-rules-tg', 'cch-exempt-tg', 'cch-lowkey-tg',
    'lowkeyMode', '{ force: true }', 'detachAll', '_applyLowkeyMode', 'matchingOverrides',
    'rememberNone']) {
    ok(ui.includes(f), 'S6 ui/index.ts 含 ' + f);
  }
  // note 字面量的权威生成点在 rules 层（Rules.rememberNone，05 票契约）；ui 仅消费 API
  const rulesSrc = readFileSync(join(ROOT, 'src', 'rules', 'index.ts'), 'utf8');
  ok(rulesSrc.includes('panel-negative-feedback'), 'S6 rules/index.ts 含 panel-negative-feedback（note 权威生成点）');`;

if (!v.includes(oldUiList)) { console.log('ANCHOR NOT FOUND — abort, no change'); process.exit(1); }
v = v.replace(oldUiList, newUiList);
fs.writeFileSync(P, v);
console.log('patched: S6 note-literal assertion moved from ui to rules layer');
