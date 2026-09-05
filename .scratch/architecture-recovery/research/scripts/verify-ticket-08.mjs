// 票08落盘完整性验证：BOM / 行数 / 关键片段存在 / 围栏配对 / 行尾统计
import fs from 'node:fs';

const root = 'D:/Aworker/mozilla/choose-your-country';
const files = {
  'CONTEXT.md': ['## 检测', '**区号字段**', '**主号锚**', '**置信度**', '**分级行动**', '**站点规则**', '_Avoid_'],
  'docs/adr/0001-scoring-engine-replaces-boolean-detection.md': ['多信号加权评分', '被否决路线', 'SCORE_AUTO=70'],
  'docs/adr/0002-vite-plugin-monkey-modularization.md': ['vite-plugin-monkey', '被否决路线', '单 userscript'],
  'docs/adr/0003-site-rules-engine.md': ['cch_site_rules_v1', '被否决路线', '豁免域名'],
  'docs/adr/0004-pseudo-select-recognition-deferred.md': ['C6', 'out-of-scope', '被否决路线'],
  'README.md': ['多信号加权评分', 'tel-country-code', 'find-your-country-code.user.js', '手动召唤', '## 功能特性'],
  'README_EN.md': ['Multi-signal weighted scoring', 'tel-country-code', 'Manual install', '## Features'],
  'greasyfork/GREADME.md': ['多信号加权评分', '手动召唤', '## 功能特性'],
  'greasyfork/GREADME_EN.md': ['Multi-signal weighted scoring', 'summoned', '## Features'],
  '.gitignore': ['docs/*', '!docs/adr/'],
};

let fail = 0;
for (const [f, frags] of Object.entries(files)) {
  const p = `${root}/${f}`;
  if (!fs.existsSync(p)) { console.log(`FAIL ${f}: MISSING`); fail++; continue; }
  const buf = fs.readFileSync(p);
  const bom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  const text = buf.toString('utf8');
  const missing = frags.filter(fr => !text.includes(fr));
  const fenceOpen = (text.match(/^```/gm) || []).length;
  const crlf = (text.match(/\r\n/g) || []).length;
  const lines = text.split('\n').length;
  const problems = [];
  if (bom) problems.push('BOM-PRESENT');
  if (missing.length) problems.push('MISSING:' + missing.join('|'));
  if (fenceOpen % 2) problems.push('FENCE-UNBALANCED');
  if (problems.length) { fail++; console.log(`FAIL ${f}: ${problems.join(' ; ')} (crlfLines=${crlf}/${lines})`); }
  else console.log(`PASS ${f} (lines=${lines}, crlfLines=${crlf}/${lines})`);
}
console.log(fail === 0 ? '\nALL-PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
