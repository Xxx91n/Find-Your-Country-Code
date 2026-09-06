// 大脑修正脚本：S4 场景隔离修正（删除本场景写入的规则而非 overrides[0]）
import fs from 'node:fs';
const P = 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/verify-ticket-07.mjs';
let v = fs.readFileSync(P, 'utf8');
const oldLine = "  ok(Rules.removeOverride(Rules.listRules().overrides[0].id) === true, 'S4 删除规则');";
const newLines = [
  "  // S4 预清理 S3 遗留规则（场景隔离），再写入本场景的 none，删除时精确按 selector",
  "  Rules.listRules().overrides.slice().forEach(r => Rules.removeOverride(r.id));",
  "  ok(!!Rules.rememberNone(sel), 'S4 写入负反馈规则');",
  "  const _s4hit = Rules.listRules().overrides.find(r => r.selector === '#cc-strong');",
  "  ok(Rules.removeOverride(_s4hit.id) === true, 'S4 删除规则（精确按 selector）');",
].join('\n');
if (!v.includes(oldLine)) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
v = v.replace(oldLine, newLines);
// 写回为修正后的正式门禁（大脑代跑后若全绿即采纳）
fs.writeFileSync(P, v);
console.log('patched verify-ticket-07.mjs in place (S4 scenario isolation fix)');
