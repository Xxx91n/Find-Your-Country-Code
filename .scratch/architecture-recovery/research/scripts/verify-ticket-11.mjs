// 票11 检查点:CONTEXT.md「文内路径逐一 fs 存在性检查」(WORKFLOW §2.6 node 防嵌套)
// 方法:提取全文反引号内形如仓库相对路径的 token(含 / 且以 .md 结尾),逐一 existsSync(仓库根)。
// 自证护栏(§5 教训:验收工具先自证):断言本票引用的 6 份证据文件全部被提取到,
// 防止正则漏提取造成「0 检查全过」的假绿;另机检章/五术语/_Avoid_ 就位。
// 修复(review-mmv2-wave1 §2-1):EOL 检查改 blob 口径(git cat-file -p HEAD:CONTEXT.md)——
// autocrlf 宿主会把工作树物化成 CRLF,工作树 EOL 断言恒红;blob 是入库事实,BOM 检查保留工作树口径。
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const text = readFileSync(path.join(root, 'CONTEXT.md'), 'utf8');
let fail = 0;

// 1) 路径提取 + 存在性
const tokens = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const paths = [...new Set(tokens.filter((t) => t.includes('/') && t.endsWith('.md') && !t.startsWith('http') && !t.includes(' ')))];
const required = [
  '.scratch/architecture-recovery/research/industry-models.md',
  '.scratch/architecture-recovery/research/atomcode-mental-model-v2.md',
  '.scratch/architecture-recovery/research/misdetection-root-causes.md',
  '.scratch/mental-model-v2/report.md',
  'docs/adr/0001-scoring-engine-replaces-boolean-detection.md',
  'docs/adr/0004-pseudo-select-recognition-deferred.md',
];
const notExtracted = required.filter((p) => !paths.includes(p));
if (notExtracted.length) { console.log('EXTRACT-MISS(自证失败,正则漏提取): ' + notExtracted.join(', ')); fail++; }
const missing = paths.filter((p) => !existsSync(path.join(root, p)));
if (missing.length) { console.log('PATH-MISS(文内路径不存在): ' + missing.join(', ')); fail++; }
else console.log(`PATH-OK: ${paths.length} 个文内路径全部存在 -> ${paths.join(' | ')}`);

// 2) 新章与五术语就位
const presence = [
  ['对照章', /^## 行业心智模型对照$/m],
  ['骨架三支柱小节', /^### 检测骨架三支柱（行业三方交集）$/m],
  ['工程支柱小节', /^### 工程支柱三件（本周期采纳）$/m],
  ['对标结论小节', /^### 对标结论$/m],
  ['术语 帧治理', /\*\*帧治理\*\*：/],
  ['术语 可见性闸门', /\*\*可见性闸门\*\*：/],
  ['术语 ARIA 语义层', /\*\*ARIA 语义层\*\*：/],
  ['术语 校准语料', /\*\*校准语料\*\*：/],
  ['术语 伪 select', /\*\*伪 select（组件库下拉）\*\*：/],
];
const absent = presence.filter(([, re]) => !re.test(text)).map(([n]) => n);
if (absent.length) { console.log('PRESENCE-MISS: ' + absent.join(', ')); fail++; }
else console.log('PRESENCE-OK: 对照章(3 小节)与五个新术语全部就位');

// 3) 每条新术语带 _Avoid_(术语头之后最近的一个 _Avoid_ 必须存在)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const t of ['帧治理', '可见性闸门', 'ARIA 语义层', '校准语料', '伪 select（组件库下拉）']) {
  const re = new RegExp(`\\*\\*${esc(t)}\\*\\*：[\\s\\S]*?_Avoid_: `);
  if (!re.test(text)) { console.log('AVOID-MISS: ' + t); fail++; }
}
if (!fail) console.log('AVOID-OK: 五条新术语均含 _Avoid_ 项');

// 4) 编码/EOL 卫生(BOM 看工作树;EOL 看 blob 口径,经 git cat-file -p 原样读出,不受 autocrlf smudge 影响)
if (text.charCodeAt(0) === 0xfeff) { console.log('BOM-FAIL: CONTEXT.md 带 BOM'); fail++; }
try {
  const blob = execSync('git cat-file -p HEAD:CONTEXT.md', { cwd: root, encoding: 'utf8' });
  if (blob.includes('\r\n')) { console.log('EOL-FAIL: HEAD:CONTEXT.md blob 含 CRLF'); fail++; }
  else console.log('EOL-OK: HEAD:CONTEXT.md blob 为 LF(工作树 CRLF 属 autocrlf 物化,不入库)');
} catch {
  console.log('EOL-FAIL: git cat-file -p HEAD:CONTEXT.md 读取失败'); fail++;
}

console.log(fail ? `RESULT: FAIL(${fail})` : 'RESULT: PASS');
process.exit(fail ? 1 : 0);
