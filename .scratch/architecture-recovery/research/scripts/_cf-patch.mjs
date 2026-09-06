// 大脑反事实 v2：按行号精确替换（CRLF 安全）
import fs from 'node:fs';
const P = 'D:/Aworker/mozilla/choose-your-country/src/rules/index.ts';
fs.copyFileSync(P, 'D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/_rules-backup.ts');
let s = fs.readFileSync(P, 'utf8');
const oldBlock = "      return !!el.closest('#' + OWN_ROOT_ID) ||\r\n             !!el.closest('.' + WRAPPER_CLASS) ||\r\n             el.id === 'cch-search';";
const oldBlockLF = "      return !!el.closest('#' + OWN_ROOT_ID) ||\n             !!el.closest('.' + WRAPPER_CLASS) ||\n             el.id === 'cch-search';";
const newBlock = "      return !!el.closest('#' + OWN_ROOT_ID) ||\n             (el.classList && el.classList.contains && el.classList.contains('cch-btn')) ||\n             el.id === 'cch-search' || el.id === 'cch-si';";
if (s.includes(oldBlock)) s = s.replace(oldBlock, newBlock);
else if (s.includes(oldBlockLF)) s = s.replace(oldBlockLF, newBlock);
else { console.log('ANCHOR NOT FOUND — abort'); process.exit(1); }
fs.writeFileSync(P, s);
console.log('patched (counterfactual v2)');
