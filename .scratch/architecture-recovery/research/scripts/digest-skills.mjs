import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'D:/Aworker/mozilla/choose-your-country';
const OUT = REPO + '/.scratch/architecture-recovery/research';
const SKILLS_DIR = OUT + '/skills';
mkdirSync(SKILLS_DIR, { recursive: true });

const named = [
  ['improve-codebase-architecture', 'C:/Users/Administrator/.agents/skills/grill/engineering/improve-codebase-architecture/SKILL.md'],
  ['ask-matt', 'C:/Users/Administrator/.agents/skills/grill/engineering/ask-matt/SKILL.md'],
  ['to-spec', 'C:/Users/Administrator/.agents/skills/grill/engineering/to-spec/SKILL.md'],
  ['to-tickets', 'C:/Users/Administrator/.agents/skills/grill/engineering/to-tickets/SKILL.md'],
  ['handoff', 'C:/Users/Administrator/.agents/skills/grill/productivity/handoff/SKILL.md'],
  ['but-gitbutler', 'C:/Users/Administrator/.agents/skills/gitbutler/SKILL.md'],
  ['atomcode-research-agents', 'C:/Users/Administrator/.agents/skills/atomcode-research/SKILL.md'],
  ['atomcode-research-codex', 'C:/Users/Administrator/.codex/skills/atomcode-research/SKILL.md'],
  ['ponytail', 'C:/Users/Administrator/.codex/plugins/cache/ponytail/ponytail/4.9.0/skills/ponytail/SKILL.md'],
];

const found = new Map();
const missing = [];
for (const [name, p] of named) {
  if (existsSync(p)) found.set(name, p);
  else missing.push([name, p]);
}

function scanTree(dir, depth) {
  if (!existsSync(dir) || depth < 0) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const sk = join(p, 'SKILL.md');
      if (existsSync(sk)) found.set(e.name, sk);
      scanTree(p, depth - 1);
    }
  }
}

scanTree('C:/Users/Administrator/.agents/skills/grill', 3);

// record other skill roots (names only, no copy)
const roots = {};
for (const d of ['C:/Users/Administrator/.agents/skills', 'C:/Users/Administrator/.codex/skills']) {
  if (existsSync(d)) {
    try { roots[d] = readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); }
    catch { roots[d] = 'unreadable'; }
  }
}

const index = [];
for (const [name, p] of [...found].sort((a, b) => a[0].localeCompare(b[0]))) {
  try {
    const src = readFileSync(p, 'utf8');
    const dst = join(SKILLS_DIR, name + '.md');
    writeFileSync(dst, src);
    const headings = src.split(/\r?\n/).filter(l => /^#{1,3} /.test(l)).slice(0, 50);
    index.push({ name, source: p, copy: dst, bytes: Buffer.byteLength(src), headings });
  } catch (err) {
    console.log('READ_FAIL: ' + name + ' ' + err.message);
  }
}

writeFileSync(join(OUT, 'skills-index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), missing, rootNames: roots, skills: index }, null, 2));

let digest = '# Skills 全量落盘索引（仅标题）\n\n> 生成时间: ' + new Date().toISOString() + '\n> 用途: 供大脑 Agent 与子代理按路径读取全文副本，避免会话内联爆炸\n\n';
for (const it of index) {
  digest += '## ' + it.name + ' (' + it.bytes + ' bytes)\n';
  digest += '- source: ' + it.source + '\n- copy: ' + it.copy + '\n';
  for (const h of it.headings) digest += '  - ' + h + '\n';
  digest += '\n';
}
writeFileSync(join(OUT, 'skills-digest.md'), digest);

console.log('COPIED=' + index.length);
if (missing.length) console.log('MISSING=' + missing.map(m => m[0]).join(','));
for (const it of index) console.log(it.name + '\t' + it.bytes + 'B\t' + it.headings.length + 'h');
