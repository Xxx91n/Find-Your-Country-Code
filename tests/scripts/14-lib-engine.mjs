// ══════════════════════════════════════════════════════════════════
// 14-lib-engine.mjs — 票 14 校准语料共享装载库
// 职责：装载五层评分引擎（src/config.ts + src/data/countries.ts + src/detect/index.ts，
// 函数束转换，零依赖零构建）+ 按 manifest 用例构建 mock DOM + 执行用例 + 汇总指标。
// mock DOM 接口面沿用 misdetect-repro-v2.mjs（已对引擎消费面验证过），支持
// configOverrides（阈值/权重标定用：正则替换 config.ts 常量后重新实例化，不写回源文件）。
// 用例执行口径：镜像 _process 分发——票 16 后 iti 容器并入评分（16-fix 同步镜像），
// ctx.iti 与其余用例同走 scoreElement(el, {anchorHasTel})，容器信号由引擎内 iti:container 加分；
// injected = tier ∈ {auto, lowkey}。
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..');
export const MANIFEST_PATH = join(ROOT, 'tests', 'corpus', 'manifest.json');

export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function toModuleBody(src) {
  return src
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

// 标定用：替换 config.ts 中 `export const NAME = VALUE;` 的 VALUE（仅内存副本，绝不写回）
function applyOverrides(configSrc, overrides) {
  let body = configSrc;
  for (const [name, value] of Object.entries(overrides || {})) {
    const re = new RegExp('export const ' + name + '\\s*=\\s*[^;\\n]+;');
    if (!re.test(body)) throw new Error('config override target not found: ' + name);
    body = body.replace(re, 'export const ' + name + ' = ' + JSON.stringify(value) + ';');
  }
  return body;
}

export const CALIBRATED_CONSTANTS = [
  'SCORE_AUTO', 'SCORE_LOWKEY',
  'L1_STRONG_KW_SCORE', 'L1_COUNTRY_KW_SCORE', 'L1_PREFIX_KW_SCORE', 'L1_NPA_KW_SCORE',
  'L1_LABEL_PHRASE_SCORE', 'L1_BARE_QU_SCORE', 'L1_LOCAL_FIXED_PENALTY', 'L1_COMPOUND_SCORE',
  'L2_ANCHOR_TEL_SCORE',
  'L3_PLUS_DIAL_SCORE', 'L3_PLUS_PAREN_SCORE', 'L3_DIAL_CAP', 'L3_ISO_BONUS',
  'L3_NUMERIC_PENALTY', 'L4_EXCLUDE_PENALTY',
];

// 当前 config.ts 常量值（用于标定报告的"现值"列与变体推导）
export function currentConfigValues() {
  const src = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
  const out = {};
  for (const name of CALIBRATED_CONSTANTS) {
    const m = new RegExp('export const ' + name + '\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*;').exec(src);
    if (!m) throw new Error('constant not found in src/config.ts: ' + name);
    out[name] = Number(m[1]);
  }
  return out;
}

// 票 32 前置修复：函数束装载器必须先剥离 TS 类型标注。
// cch-23（strict 全量类型修复，commit 188f9c1）给 src/*.ts 引入显式类型标注后，
// 裸 new Function(bundle) 直接 SyntaxError（Unexpected token ':'）——
// calibration-baseline 自该提交起在 main 上持续红（run 34618705653 等），
// A-006「CI 绿代表真实世界 coverage」的测量地基因此失效。
// 修法：用 node 标准库 module.stripTypeScriptTypes（Node >= 22.13）剥离类型，
// 不引入依赖、不改引擎语义；src/*.ts 无 enum/namespace/参数属性（已静态核查），mode:'strip' 足够。
function stripTypes(src) {
  if (typeof stripTypeScriptTypes !== 'function') {
    throw new Error('14-lib-engine 需要 Node >= 22.13（module.stripTypeScriptTypes）；CI 已钉 node-version 22');
  }
  return stripTypeScriptTypes(src, { mode: 'strip' });
}

// 实例化引擎；overrides 形如 { SCORE_AUTO: 60 }，仅影响内存实例
// ui 可选：注入自定义 UI 桩以断言 attach/rememberLow/detach 调用（票 29 档位上限验证用）；
// 缺省沿用空桩（既有调用方行为不变）。
export function bundleEngine(overrides, ui) {
  // stripTypes 以模块语法解析：顶层 return 不合法，故先剥类型再拼返回语句。
  const bundle = [
    toModuleBody(applyOverrides(readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8'), overrides)),
    toModuleBody(readFileSync(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8')),
    toModuleBody(readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8')),
  ].join('\n');
  const { createDetect, COUNTRIES } = new Function(stripTypes(bundle) + '\n;return { createDetect, COUNTRIES, ISO2_MAP };')();
  const Detect = createDetect(ui || { attach() {}, rememberLow() {}, summon() {} }, null);
  return { Detect, COUNTRIES };
}

// ── mock DOM（每用例独立 labelRegistry，杜绝 repro-v2 全局注册表的跨用例串扰） ──
class Opt {
  constructor(value, text) { this.value = value; this.text = text; }
  getAttribute() { return null; }
}
class El {
  constructor(tag, props = {}) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = props.attrs || {};
    this._id = props.id || '';
    this._class = props.className || '';
    this._name = props.name || '';
    this._placeholder = props.placeholder || '';
    this.options = (props.options || []).map(o => typeof o === 'string' ? new Opt(o, o) : new Opt(o.value, o.text));
    this.children = [];
    this.textContent = props.text || '';
    this.ancestors = [];
    this.parentElement = null;
    this.disabled = false;
    this.readOnly = false;
    this.ownerDocument = null; // buildElement 时注入
  }
  get id() { return this._id; }
  get className() { return this._class; }
  get name() { return this._name; }
  get dataset() {
    const d = {};
    for (const k of Object.keys(this.attrs)) {
      if (k.startsWith('data-')) d[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = this.attrs[k];
    }
    return d;
  }
  getAttribute(n) {
    if (n === 'name') return this._name || null;
    if (n === 'id') return this._id || null;
    if (n === 'class') return this._class || null;
    if (n === 'placeholder') return this._placeholder || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
  }
  closest(sel) {
    if (sel.startsWith('.')) { const c = sel.slice(1); return this.ancestors.find(a => String(a._class || '').split(/\s+/).includes(c)) || null; }
    if (sel.startsWith('#')) { const i = sel.slice(1); return this.ancestors.find(a => a._id === i) || null; }
    if (sel === 'form') return this.ancestors.find(a => a.tagName === 'FORM') || null;
    if (sel === 'label') return this.ancestors.find(a => a.tagName === 'LABEL') || null;
    return null;
  }
  // 票 29：受限后代查询（引擎消费面 = 'li' / '[role="option"]' / 'ul li' 三种），
  // 使自定义下拉的结构探测在语料上真实运行（mock 不另开分支，镜像真实 DOM 结构）。
  querySelectorAll(sel) {
    const want = String(sel).trim().replace(/^.*\s+/, '');
    const roleM = /^\[role="([\w-]+)"\]$/.exec(want);
    const out = [];
    const walk = (n) => {
      for (const c of n.children || []) {
        if (roleM ? c.getAttribute('role') === roleM[1] : c.tagName === want.toUpperCase()) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
}

// 按用例声明构建元素：labels 逐用例注册；ancestors 逐层 DIV 包裹
export function buildElement(caseDef) {
  const labelRegistry = [];
  for (const l of caseDef.labels || []) {
    if (l.for) labelRegistry.push({ for: l.for, text: l.text });
    if (l.id) labelRegistry.push({ id: l.id, text: l.text });
  }
  const docMock = {
    querySelector(sel) {
      const m = /^label\[for="(.*)"\]$/.exec(sel);
      if (m) { const l = labelRegistry.find(x => x.for === m[1]); return l ? { textContent: l.text } : null; }
      return null;
    },
    getElementById(id) { const l = labelRegistry.find(x => x.id === id); return l ? { textContent: l.text } : null; },
    querySelectorAll() { return []; },
  };
  const elDef = caseDef.el || {};
  const el = new El(elDef.tag || 'input', {
    id: elDef.id, name: elDef.name, className: elDef.className,
    placeholder: elDef.placeholder,
    // type 必须进 attrs：引擎的 input 类型闸门（hidden/email/… 永非区号字段）读 getAttribute('type')
    attrs: { ...(elDef.type ? { type: elDef.type } : {}), ...(elDef.attrs || {}) },
    options: elDef.options,
  });
  el.ownerDocument = docMock;
  // 票 29：非原生 select 的自定义下拉（div/span 触发器）在真实 DOM 中以 ul>li 承载选项，
  // 选项值走 data-value（手写下拉的通用承载约定）、选项文本走 textContent。
  // harness 镜像该子树，使结构探测在语料上跑真实路径（引擎无 mock 专用分支）。
  if (el.options && el.options.length && el.tagName !== 'SELECT') {
    const list = new El('ul', {});
    for (const o of el.options) list.children.push(new El('li', { attrs: { 'data-value': o.value }, text: o.text }));
    el.children.push(list);
  }
  const ancs = (elDef.ancestors || []).map(a => new El('DIV', { className: a.className || '' }));
  el.ancestors = ancs;
  el.parentElement = ancs[0] || null;
  return el;
}

// 执行单例：镜像 _process 的评分分发（规则引擎/存储不入 harness 职责面）
export function evaluateCase(caseDef, Detect) {
  const el = buildElement(caseDef);
  const ctx = caseDef.ctx || {};
  // 16-fix：_process 已无 iti 短路（容器信号在 scoreElement 内加分），镜像同步走评分通道
  const r = Detect.scoreElement(el, { anchorHasTel: ctx.anchorHasTel });
  return { score: r.score, tier: r.tier, injected: r.tier === 'auto' || r.tier === 'lowkey', signals: r.signals };
}

// 全语料评测（复用同一引擎实例；用例间仅 labelRegistry 隔离，元素每次重建）
export function runCorpus(manifest, Detect) {
  return manifest.cases.map(c => ({ id: c.id, ...evaluateCase(c, Detect) }));
}

export function metrics(results, manifest) {
  const byId = new Map(results.map(r => [r.id, r]));
  let TP = 0, FP = 0, TN = 0, FN = 0;
  const mismatches = [];
  for (const c of manifest.cases) {
    const r = byId.get(c.id);
    const pos = c.polarity === 'positive';
    if (pos && r.injected) TP++;
    else if (pos && !r.injected) FN++;
    else if (!pos && r.injected) FP++;
    else TN++;
    const ok = (c.expect === 'inject') === r.injected;
    if (!ok && !c.knownResidual) mismatches.push(c.id + '(expect=' + c.expect + ',got=' + (r.injected ? 'inject/' + r.tier : 'none') + ')');
  }
  const precision = (TP + FP) ? TP / (TP + FP) : null;
  const recall = (TP + FN) ? TP / (TP + FN) : null;
  const f1 = (precision !== null && recall !== null && (precision + recall) > 0)
    ? 2 * precision * recall / (precision + recall) : null;
  return { cases: manifest.cases.length, TP, FP, TN, FN, precision, recall, f1,
    accuracy: (TP + TN) / manifest.cases.length, mismatches };
}
