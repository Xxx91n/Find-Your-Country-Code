// 大脑 rg 级抽查：04/05/09 三票关键源码标记（引号安全的独立脚本）
import fs from 'node:fs';
const R = 'D:/Aworker/mozilla/choose-your-country';
const read = f => fs.readFileSync(R + '/' + f, 'utf8');

const det = read('src/detect/index.ts');
console.log('=== detect(04): 穿透/指纹/防抖/路由 ===');
['_deepRoots', '_fingerprint', 'scheduleScan', '_pruneWatchers', 'pushState', 'popstate', '_observeShadow'].forEach(k =>
  console.log('  ' + k + ': ' + (det.includes(k) ? 'YES' : 'NO')));
console.log('  旧 _done 残留: ' + (det.includes('_done') ? 'YES(需查)' : 'NO'));

const fil = read('src/fill/index.ts');
console.log('=== fill(09): 统一注入 ===');
['_inject', 'HTMLSelectElement', 'HTMLTextAreaElement', "'input', 'change', 'blur'"].forEach(k =>
  console.log('  ' + JSON.stringify(k) + ': ' + (fil.includes(k) ? 'YES' : 'NO')));
console.log('  旧 _dispatch 残留: ' + (fil.includes('_dispatch') ? 'YES(需查)' : 'NO'));
// 直接赋值计数（报告称 fill 恰 1 处、adapter 0 处）
const filAssign = (fil.match(/\.value\s*=\s*(?!==)/g) || []).length;
console.log('  fill 内 .value= 直接赋值次数: ' + filAssign);

const ad = read('src/iti-adapter/index.ts');
const adAssign = (ad.match(/\.value\s*=\s*(?!==)/g) || []).length;
console.log('  iti-adapter 内 .value= 直接赋值次数: ' + adAssign + '（报告声明 0，兜底改走 dispatch 回调）');

const store = read('src/store/index.ts');
console.log('=== store(05): 规则持久化 ===');
['cch_site_rules_v1', 'getSiteRules', 'upsertOverride', 'removeOverride', 'setExempt', 'isExempt'].forEach(k =>
  console.log('  ' + k + ': ' + (store.includes(k) ? 'YES' : 'NO')));

const rules = read('src/rules/index.ts');
console.log('=== rules(05): 检测接线 API ===');
['forcedTier', 'pageTierOverride', 'rememberNone', 'isPageExcluded'].forEach(k =>
  console.log('  ' + k + ': ' + (rules.includes(k) ? 'YES' : 'NO')));

const main = read('src/main.ts');
console.log('=== main(04/05): 装配 ===');
console.log('  createRules 注入: ' + (main.includes('createRules') ? 'YES' : 'NO'));
console.log('  createDetect(UI, Rules): ' + (main.includes('createDetect') ? 'YES' : 'NO'));
console.log('  旧 8x500ms 轮询残留(setInterval): ' + (main.includes('setInterval') ? 'YES(需查)' : 'NO'));
