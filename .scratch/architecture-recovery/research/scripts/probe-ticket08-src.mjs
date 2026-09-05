// 票08事实核对：从 src 关键模块提取行为面事实（紧凑输出）
import fs from 'node:fs';

const root = 'D:/Aworker/mozilla/choose-your-country';
const read = (p) => fs.readFileSync(p, 'utf8');

// 1. config.ts: 常量名 + 阈值 + 档位
const config = read(`${root}/src/config.ts`);
console.log('===== src/config.ts (' + config.split('\n').length + ' lines) =====');
for (const line of config.split(/\r?\n/)) {
  if (/^\s*(export\s+)?(const|type|interface|function)\s+[A-Z_a-z]/.test(line) || /TIER|THRESH/i.test(line)) {
    console.log(line.slice(0, 160));
  }
}

// 2. detect/index.ts: 导出面 + tier 语义
const detect = read(`${root}/src/detect/index.ts`);
console.log('\n===== src/detect/index.ts exports/tier refs =====');
for (const line of detect.split(/\r?\n/)) {
  if (/^export|tier\s*[:=]|'auto'|'lowkey'|'none'|"auto"|"lowkey"|"none"/.test(line)) {
    console.log(line.trim().slice(0, 160));
  }
}

// 3. store/index.ts: 键名 + 规则 API 面
const store = read(`${root}/src/store/index.ts`);
console.log('\n===== src/store/index.ts keys/api =====');
for (const line of store.split(/\r?\n/)) {
  if (/cch_|^export (function|const|type|interface)|SiteRule/.test(line)) {
    console.log(line.trim().slice(0, 160));
  }
}

// 4. vite.config.ts 头部 40 行（monkey 元数据）
const vite = read(`${root}/vite.config.ts`);
console.log('\n===== vite.config.ts (first 55 lines) =====');
console.log(vite.split(/\r?\n/).slice(0, 55).join('\n'));

// 5. main.ts 模块接线
const main = read(`${root}/src/main.ts`);
console.log('\n===== src/main.ts (' + main.split('\n').length + ' lines, full) =====');
console.log(main);
