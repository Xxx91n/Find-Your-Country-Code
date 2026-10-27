// ══════════════════════════════════════════════════════════════════
// check-doc-refs.mjs — 代理阅读文档的路径引用完整性门（retro 2026-10-26）
//
// 失败模式：指针指向不存在的文件（悬空引用）。仓库此前人工清过一轮
// （commit 2cfe9bf「清掉 24 个文件里的悬空引用」），但没有任何门守着，
// 于是再次发生：并行分支把 AGENTS.md 的指针指向 docs/agents/review.md，
// 而该文件只存在于另一分支 —— 若不拦，main 上就是一条死指针。
//
// 只扫代理真正会读的文档（AGENTS.md / CONTRIBUTING.md / GLOSSARY.md /
// docs/agents/*.md）。取反引号内的仓库相对路径，逐条断言在树上存在。
// 判定口径：首段必须是仓库顶层已有条目（挡掉 `text/javascript`、裸文件名、
// `/skill-name` 这类非路径反引号）；通配符与含空白的一律跳过。
// 用法：node tests/scripts/check-doc-refs.mjs（CI: typecheck.yml）
// ══════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// 构建/运行产物：文档可以写，但全新检出（CI）上本就不存在
const GENERATED = ['dist/', 'playwright-report/', 'test-results/'];

// 有意的「已不存在」引用。新增条目必须写明原因，否则等于给死指针开后门。
const HISTORIC = new Map([
  ['GLOSSARY-MAP.md', 'domain.md 明确写「if it exists」：多上下文仓库才有'],
  ['src/Find-Your-Country-Code.js', 'CONTRIBUTING 冻结基准：票 22 已删除，文档指向 git 历史'],
  ['.scratch/', 'CONTRIBUTING：2026-10-24 已删除且不入版本控制'],
]);

function docFiles() {
  const files = ['AGENTS.md', 'CONTRIBUTING.md', 'GLOSSARY.md'];
  const agents = join(ROOT, 'docs', 'agents');
  if (existsSync(agents)) {
    for (const name of readdirSync(agents)) {
      if (name.endsWith('.md')) files.push('docs/agents/' + name);
    }
  }
  return files.filter(f => existsSync(join(ROOT, f)));
}

// 反引号内的仓库相对路径 → 规范化；非路径返回 null
function normalize(raw, topLevel) {
  const t = raw.trim();
  if (!t || t.startsWith('/') || t.startsWith('-') || t.startsWith('.') || t.includes('..')) return null;
  if (!/^[A-Za-z0-9_.@/-]+$/.test(t)) return null;        // 空白 / 通配 / 箭头 / 尖括号
  if (!t.includes('/')) return null;                       // 裸文件名、扩展名不是路径断言
  const first = t.split('/')[0] + (t.endsWith('/') ? '/' : '');
  if (!topLevel.has(t.split('/')[0])) return null;         // 首段不是仓库顶层条目 → 非路径
  return t;
}

const topLevel = new Set(readdirSync(ROOT).filter(n => !n.startsWith('.') || n === '.github'));
for (const extra of ['.github', 'dist', 'playwright-report', 'test-results']) topLevel.add(extra);

let checked = 0;
const missing = [];
for (const rel of docFiles()) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  for (const span of text.match(/`[^`\n]+`/g) || []) {
    const token = normalize(span.slice(1, -1), topLevel);
    if (!token) continue;
    if (GENERATED.some(p => token.startsWith(p))) continue;
    if (HISTORIC.has(token)) continue;
    checked++;
    const clean = token.replace(/[/:]$/, '');
    if (!existsSync(join(ROOT, clean))) missing.push(rel + ' → ' + token);
  }
}

if (missing.length) {
  console.error('FAIL 文档路径引用悬空（' + missing.length + '/' + checked + '）:');
  for (const m of missing) console.error('  - ' + m);
  process.exit(1);
}
console.log('PASS 文档路径引用完好（' + checked + ' 条，扫描 ' + docFiles().length + ' 个文档）');
