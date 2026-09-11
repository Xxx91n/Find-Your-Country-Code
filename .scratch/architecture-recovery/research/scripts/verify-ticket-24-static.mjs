// verify-ticket-24-static.mjs — 票 24 安全加固静态验收门（返工轮次）
// 用法: node .scratch/architecture-recovery/research/scripts/verify-ticket-24-static.mjs
// 断言口径对齐首脑复核（review-wave1-cycle3.md）的 node -e 取证方式：
//   AC1 postMessage 入站 origin 校验存在（主.ts 双分支）+ ui 三处 '*' 出站注释
//   AC2 BroadcastChannel 双监听 e.origin 校验
//   AC3 SCAN_SELECTORS Set 去重（迭代走 Set 集合）
// 注：行为级回归（跨帧通信无退化）不在此门，由 CI e2e.yml run 承担（只认 CI）。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

let pass = 0, fail = 0;
const T = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name); ok ? pass++ : fail++; };

const ui = read('src/ui/index.ts');
const main = read('src/main.ts');
const store = read('src/store/index.ts');
const detect = read('src/detect/index.ts');

// AC1a: ui 3 处出站 postMessage('*') 全部带票24注释（注释行紧邻发送行，覆盖 3 处发送）
const sends = [...ui.matchAll(/\.postMessage\(\{[^}]*\}, '\*'\)/g)].length;
const notes = [...ui.matchAll(/票 24:targetOrigin '\*' 不可避免/g)].length;
T(`AC1a ui 出站 '*' 发送=${sends} 注释=${notes}（期望 3/3）`, sends === 3 && notes === 3);

// AC1b: main.ts 顶层入站校验（同源强校验 || 嵌入 iframe 锚点）
T('AC1b main 顶层 e.origin!==location.origin && !isEmbeddedFrame(e.source)',
  /if \(e\.origin !== location\.origin && !isEmbeddedFrame\(e\.source\)\) return;/.test(main));
// AC1c: main.ts 子帧入站校验（顶层同源时强制 origin）
T('AC1c main 子帧 isTopFrameSameOrigin() && e.origin!==location.origin',
  /if \(isTopFrameSameOrigin\(\) && e\.origin !== location\.origin\) return;/.test(main));
// AC1d: 辅助函数定义存在
T('AC1d isEmbeddedFrame + isTopFrameSameOrigin 定义',
  /function isEmbeddedFrame\(source: MessageEventSource \| null\)/.test(main) &&
  /function isTopFrameSameOrigin\(\)/.test(main));

// AC2: store 两处 BroadcastChannel 监听 origin 校验
const bcGuards = [...store.matchAll(/if \(e\.origin !== location\.origin\) return;/g)].length;
const bcListeners = [...store.matchAll(/_bc\.addEventListener\('message'|_rulesBC\.addEventListener\('message'/g)].length;
T(`AC2 store BC 监听=${bcListeners} origin 守卫=${bcGuards}（期望 2/2）`, bcListeners === 2 && bcGuards === 2);

// AC3: detect Set 去重且迭代走 Set 集合（不再直接迭代数组）
T('AC3a SCAN_SELECTOR_SET = new Set(SCAN_SELECTORS)',
  /const SCAN_SELECTOR_SET = new Set\(SCAN_SELECTORS\);/.test(detect));
T('AC3b for..of SCAN_SELECTOR_SET（scan 循环）',
  /for \(const sel of SCAN_SELECTOR_SET\)/.test(detect) &&
  !/for \(const sel of SCAN_SELECTORS\)/.test(detect));

console.log(`\n== ticket-24 static gate: ${pass} PASS, ${fail} FAIL ==`);
process.exit(fail ? 1 : 0);
