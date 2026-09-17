#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 06-skeleton.mjs — 形态语料「结构骨架」生成器（票 06 / A-030）
//
// 定位：**退化回路第 2 步「确定性结构 diff」的基线生产者**。
//   把某个形态区域（form region）的 DOM 归一化为**内容无关的结构树**并
//   落盘 `tests/corpus/forms/skeletons/<id>.json`：
//     · 只保留**结构**属性（tag / class / role / type / name / aria-* / data-*）；
//     · class 排序 + 去 CSS-in-JS 哈希类；id 丢弃（易变）；style/srcdoc/src 丢弃；
//     · 文本归一化为「形状令牌」（`#` 数字 / `a` 字母 / `+` 加号 …），
//       故内容替换与文案改动**不触发**结构 diff，而 `+86` ↔ `CN` 这类
//       **值域形态变化会触发**——这正是检测关心的差异面。
//
// 用法：
//   node tests/scripts/06-skeleton.mjs --id <id> [--from archive|mirror]
//        [--archive <dir>] [--root <selector>] [--out <file>]
//   --from archive（默认）：读仓库外 archive 的渲染后 DOM（真实页基线）
//   --from mirror          ：读仓库内镜像页（离线自检用）
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FORMS = path.join(REPO, 'tests', 'corpus', 'forms');

const DEFAULT_ARCHIVE =
  process.env.CCH_ARCHIVE_ROOT ||
  'D:/Aworker/mozilla/choose-your-country-evidence-archive';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// ── 归一化规则（唯一定义处） ──
const DROP_ATTR = new Set(['id', 'style', 'srcdoc', 'src', 'value', 'tabindex', 'for', 'href', 'title', 'class']);
const KEEP_ATTR = new Set(['role', 'type', 'name', 'aria-label', 'aria-autocomplete', 'aria-haspopup', 'placeholder', 'data-placeholder', 'required', 'readonly', 'disabled', 'multiple', 'contenteditable', 'inputmode', 'autocomplete']);
const DROP_CLASS = /^(css-|sc-|emotion-|jss\d|_)|^css-[a-z0-9]+$/i;

const textShape = (s) =>
  String(s)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[0-9]/g, '#')
    .replace(/[a-zA-Z]/g, 'a')
    .replace(/[^\sa#+\-().:/]/g, '·')
    .slice(0, 40);

const normClass = (v) =>
  String(v)
    .trim()
    .split(/\s+/)
    .filter((c) => c && !DROP_CLASS.test(c))
    .sort();

// ── 极简 HTML 解析（足以覆盖镜像页与已渲染 DOM 的表单区域） ──
function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let last = 0;
  let m;
  const pushText = (txt) => {
    if (!txt) return;
    const top = stack[stack.length - 1];
    top.text += txt;
  };
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[0].startsWith('<!--') || m[0].startsWith('<![') || m[0].startsWith('<!')) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const tag = m[2].toLowerCase();
    const attrs = parseAttrs(m[3] || '');
    const node = { tag, attrs, children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (tag === 'script' || tag === 'style') {
      const close = new RegExp('</' + tag + '\\s*>', 'i');
      const rest = html.slice(last);
      const cm = close.exec(rest);
      if (cm) { last = last + cm.index + cm[0].length; re.lastIndex = last; }
      stack[stack.length - 1].children.pop(); // script/style 不入骨架
      continue;
    }
    if (!m[4] && !VOID.has(tag)) stack.push(node);
  }
  return root;
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const name = m[1].toLowerCase();
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    attrs[name] = val;
  }
  return attrs;
}

// ── 极简选择器匹配（支持 tag / .class / #id / [attr] / [attr=val]，可组合） ──
function matches(node, selector) {
  if (!selector) return true;
  const parts = selector.trim().split(/\s+/);
  const sel = parts[parts.length - 1]; // 只支持简单选择器（无后代组合）
  const re = /([a-zA-Z][\w:-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:([~^$*|]?=)"?([^"\]]*)"?)?\]/g;
  let m;
  while ((m = re.exec(sel))) {
    if (m[1]) { if (node.tag !== m[1].toLowerCase()) return false; }
    else if (m[2]) { if (!(node.attrs.class || '').split(/\s+/).includes(m[2])) return false; }
    else if (m[3]) { if (node.attrs.id !== m[3]) return false; }
    else if (m[4]) {
      const a = m[4].toLowerCase();
      if (!(a in node.attrs)) return false;
      if (m[6] !== undefined && m[5] === '=' && node.attrs[a] !== m[6]) return false;
    }
  }
  return true;
}

function findFirst(node, selector) {
  for (const c of node.children) {
    if (matches(c, selector)) return c;
    const hit = findFirst(c, selector);
    if (hit) return hit;
  }
  return null;
}

// ── 归一化 ──
// 文本「形状类别」：把内容替换与文案改动从结构 diff 中剔除，只留检测关心的值域形态
// （dial = `+86`/`+247` 形态；name = 纯字母国名；num = 纯数字；mixed = 其它）。
const textKind = (t) => {
  if (!t) return null;
  if (/^\+?#+$/.test(t)) return 'dial';
  if (/^a+( a+)*$/.test(t)) return 'name';
  if (/^#+$/.test(t)) return 'num';
  return 'mixed';
};

// 重复兄弟折叠：≥3 个同签名兄弟收敛为「1 个代表 + repeat:N」——选项列表（国家/区号）
// 由 N 行噪声变为 1 行结构语义；**列表条数变化仍触发 diff**（结构变更），
// 单项文案/国名替换不触发（内容变更）。
function collapse(children) {
  const groups = new Map();
  for (const c of children) {
    const s = JSON.stringify({ tag: c.tag, class: c.class || null, attrs: c.attrs || null, text_kind: textKind(c.text || '') });
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(c);
  }
  const out = [];
  for (const arr of groups.values()) {
    if (arr.length >= 3) {
      const rep = {};
      for (const k of ['tag', 'class', 'attrs', 'children']) if (arr[0][k] !== undefined) rep[k] = arr[0][k];
      rep.repeat = arr.length;
      out.push(rep);
    } else out.push(...arr);
  }
  return out;
}

function normalize(node) {
  const attrs = {};
  for (const [k, v] of Object.entries(node.attrs)) {
    if (DROP_ATTR.has(k)) continue;
    if (!KEEP_ATTR.has(k) && !k.startsWith('data-') && !k.startsWith('aria-')) continue;
    if (k === 'aria-expanded' || k === 'aria-selected') continue; // 状态位，非结构
    // aria 引用类（指向 id）：只保留「存在性」，值本身易变（`iti-0__…` 的序号）
    if (k === 'aria-controls' || k === 'aria-owns' || k === 'aria-labelledby' || k === 'aria-describedby') {
      attrs[k] = 'ref';
      continue;
    }
    attrs[k] = textShape(v);
  }
  const cls = normClass(node.attrs.class || '');
  const out = { tag: node.tag };
  if (cls.length) out.class = cls;
  const keys = Object.keys(attrs).sort();
  if (keys.length) {
    out.attrs = {};
    for (const k of keys) out.attrs[k] = attrs[k];
  }
  const txt = textShape(node.text);
  if (txt) out.text = txt;
  const kids = collapse(node.children.map(normalize).filter(Boolean));
  if (kids.length) out.children = kids;
  return out;
}

function countNodes(n) { return 1 + (n.children || []).reduce((a, c) => a + countNodes(c), 0); }

function canonical(n) { return JSON.stringify(n); }

function sha256(s) { return createHash('sha256').update(s, 'utf8').digest('hex'); }

function parseArgs(argv) {
  const o = { id: null, from: 'archive', archive: DEFAULT_ARCHIVE, root: null, out: null, frame: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') o.id = argv[++i];
    else if (a === '--from') o.from = argv[++i];
    else if (a === '--archive') o.archive = argv[++i];
    else if (a === '--root') o.root = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--frame') o.frame = argv[++i];
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = JSON.parse(readFileSync(path.join(FORMS, 'sources.json'), 'utf8')).sources;
  const src = sources.find((s) => s.id === args.id);
  if (!src) throw new Error('unknown id: ' + args.id);

  const selector = args.root || src.skeleton_root || src.form_selector;
  const frameIdx = args.frame != null ? args.frame : (src.skeleton_frame != null ? src.skeleton_frame : null);
  const domName = frameIdx != null ? src.id + '.frame' + frameIdx + '.html' : src.id + '.html';
  const htmlPath = args.from === 'mirror'
    ? path.join(FORMS, 'mirrors', (src.mirror_file || src.id + '.html'))
    : path.join(path.resolve(args.archive), 'corpus-forms', 'dom', domName);

  const html = readFileSync(htmlPath, 'utf8');
  const dom = parseHtml(html);
  const region = selector ? findFirst(dom, selector) : dom;
  if (!region) throw new Error('form region not found for selector "' + selector + '" in ' + htmlPath);

  const tree = normalize(region);
  const nodeCount = countNodes(tree);
  const hash = sha256(canonical(tree));

  const out = {
    id: src.id,
    skeleton_version: 1,
    source: args.from,
    source_file: path.relative(REPO, htmlPath).replace(/\\/g, '/'),
    source_url: src.url,
    root_selector: selector,
    node_count: nodeCount,
    sha256: hash,
    tree,
  };

  const outPath = args.out || path.join(FORMS, 'skeletons', src.id + '.json');
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(out.id + ': nodes=' + nodeCount + ' sha256=' + hash.slice(0, 16) + '… → ' + path.relative(REPO, outPath).replace(/\\/g, '/'));
}

try { main(); } catch (e) { console.error('skeleton failed: ' + ((e && e.message) || e)); process.exit(1); }
