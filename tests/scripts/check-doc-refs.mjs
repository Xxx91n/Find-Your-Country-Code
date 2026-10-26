// ══════════════════════════════════════════════════════════════════
// check-doc-refs.mjs — 代理阅读文档的路径引用完整性门（retro 2026-10-26）
//
// 失败模式：指针指向不存在的文件（悬空引用）。仓库此前人工清过一轮
// （commit 2cfe9bf「清掉 24 个文件里的悬空引用」），但没有任何门守着，
// 于是再次发生：并行分支把 AGENTS.md 的指针指向 docs/agents/review.md，
// 而该文件只存在于另一分支 —— 若不拦，main 上就是一条死指针。
//
// 只扫代理真正会读的文档（AGENTS.md / CONTRIBUTING.md / GLOSSARY.md /
// docs/agents/*.md）。取反引号内的仓库相对路径（含 '/' 或带已知扩展名），
// 逐条断言在树上存在；通配符、URL、命令、标识符自然排除。
// 用法：node tests/scripts/check-doc-refs.mjs（CI: typecheck.yml）
// ══════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// 显式声明为「按条件存在」的引用（文档本身已写明 if it exists / 尚未创建）
const OPTIONAL = new Set([
  'GLOSSARY-MAP.md',
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

// 反引号内的仓库相对路径：不含空白与通配符，含 '/' 或以已知扩展名结尾
const KNOWN_EXT = /\.(md|mjs|js|ts|json|ya?ml)$/i;
function isPathToken(t) {
  if (!/^[A-Za-z0-9_.@/-]+$/.test(t)) return false;   // 空白/通配/箭头/尖括号一律排除
  if (t.startsWith('-') || t.includes('..')) return false;
  return t.includes('/') || KNOWN_EXT.test(t);
}

let checked = 0;
const missing = [];
for (const rel of docFiles()) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  const spans = text.match(/`[^`\n]+`/g) || [];
  for (const span of spans) {
    const token = span.slice(1, -1).trim();
    if (!isPathToken(token)) continue;
    const clean = token.replace(/[/:]$/, '').replace(/^\.\//, '');
    if (OPTIONAL.has(clean)) { checked++; continue; }
    checked++;
    if (!existsSync(join(ROOT, clean))) missing.push(rel + ' → ' + token);
  }
}

if (missing.length) {
  console.error('FAIL 文档路径引用悬空（' + missing.length + '/' + checked + '）:');
  for (const m of missing) console.error('  - ' + m);
  process.exit(1);
}
console.log('PASS 文档路径引用完好（' + checked + ' 条，扫描 ' + docFiles().length + ' 个文档）');
