// ════════════════════════════════════════════════════════
// 多信号加权评分检测引擎（票 02）+ 可重评估扫描机制（票 04）
// 五层信号瀑布：L0 autocomplete/inputmode 标准信号 → L1 词表/label 加权（歧义词降权组）
//   → L2 锚→目标关联 → L3 select options 内容验证（值域整体分布）→ L4 排除词负分
// 输出 {score, tier, signals}；分级行动：auto=自动注入 / lowkey=低调注入 / none=不注入（可召唤）
// 扫描机制（票 04）：open shadowRoot 递归穿透（每 root 单独 querySelectorAll）+ 每 shadow root
//   单独 MutationObserver + 统一 350ms 防抖；元素判定 WeakSet 终态 → 属性指纹快照重评
//   （双向：误挂移除 / 漏挂补上）；SPA 路由 hook（pushState/replaceState/popstate）定向重扫
// 可见性闸门（票 13）：隐藏/不可达字段（display:none/零尺寸/opacity:0/clip 全裁剪/
//   content-visibility:hidden）只降注入档位为 none 并保留登记召唤（Bitwarden
//   dom-element-visibility / KeePassXC #2184 可见性教训）；L3 加码（票 13）：ISO2
//   全集成员测试 + 占位首项剔除计分；iti 容器唯一证据防线（票 13 检查点四 = 16-fix §5①）。
// 蓝图出处：research/industry-models.md §④ + M8 + atomcode-industry-models.md 核心结论1/2/3/10
// 误报标定：research/misdetection-root-causes.md §2 五类 + 25 例 harness（FP 全落 none 档）
// 站点规则接线（票 05）：规则匹配先于检测 —— scan 入口查豁免（=完全跳过）；
//   _process 评分前查强制选择器/页面级分档覆盖（Rules 引擎，见 ../rules；Rules 缺省时行为=无规则）
// ════════════════════════════════════════════════════════
import {
  L0_TOKEN_SCORE, L0_TEL_TOKENS, L0_TEL_HINT_SCORE, L0_INPUTMODE_TEL_SCORE,
  L1_STRONG_KW_SCORE, L1_COUNTRY_KW_SCORE, L1_PREFIX_KW_SCORE, L1_NPA_KW_SCORE,
  L1_LABEL_PHRASE_SCORE, L1_BARE_QU_SCORE, L1_LOCAL_FIXED_PENALTY, L1_COMPOUND_SCORE,
  L2_ANCHOR_TEL_SCORE, ARIA_COMBO_STRUCT_SCORE,
  L3_PLUS_DIAL_SCORE, L3_PLUS_PAREN_SCORE, L3_DIAL_CAP, L3_ISO_BONUS,
  L3_NUMERIC_MIN_RATE, L3_NUMERIC_PENALTY,
  L4_EXCLUDE_PENALTY,
  SCORE_AUTO, SCORE_LOWKEY, ITI_CONTAINER_SCORE, ITI_LOW_REGISTER_SCORE,
  RESCAN_DEBOUNCE_MS,
  OWN_ROOT_ID, WRAPPER_CLASS,
} from '../config';
import { COUNTRIES, ISO2_MAP } from '../data/countries';

// 真实拨号前缀集合（源自 COUNTRIES 国家数据；内容验证的值域基准 [MD §5-0② 整体分布判定]）
const DIAL_SET = new Set(COUNTRIES.map(c => c.code.slice(1)));

// ISO2 全集成员域（票 13 [issue 验收3]）：「值是否 ISO2」只看数据全集键集，不再做
// 「像 2 字母」形态学预筛 [SP US8；whatwg#8597 select 语义由选项内容裁决]
const ISO2_SET = new Set(Object.keys(ISO2_MAP));
// 占位首项词表（票 13 [issue 验收5]）：请选择类首项只可能是占位；命中词表且值域无
// 区号/ISO2 证据才剔除（+86/+86 类实义首项不受影响）
const PLACEHOLDER_TEXT_RE = /^(?:please\s+select|select\b|choose\b|pick\b|请选择|請選擇|选择|選擇|点击选择|[-—–…]+\s*$)/i;

// 占位首项判定：仅首项参审；文本命中占位词表且值不含区号/ISO2 证据 → 剔除出计分。
// 剔除仅作用于本统计（计分域），不影响填充匹配（fill 侧独立枚举 options）[handoff 13 检查点二]
function isPlaceholderOpt(o) {
  const v = String(o.value || '').trim();
  const t = String(o.text || '').trim();
  if (!t) return true; // 有值无文本的首项 = 纯占位
  if (!PLACEHOLDER_TEXT_RE.test(t)) return false;
  const bare = v.replace(/^\+/, '').replace(/^00/, '');
  if (DIAL_SET.has(bare) || ISO2_SET.has(v.toLowerCase())) return false;
  return true;
}

// ══ 票 18: ARIA combobox（伪 select）证据探测 [ADR-0005 / 17 票逐库取证 observed] ══
// 触发器三形态 DIV(MUI)/INPUT(antd/EP/react-select)/BUTTON(Radix)[role=combobox];
// aria-expanded 判属性存在性（EP closed 态为空串）；弹出层 4/5 库 portal 到 body ——
// 解引用必须沿 aria-controls/owns 的 id（触发器 root + ownerDocument），不得在触发器
// 子树内找列表。检测侧信号面独立实现（fill 侧交互辅助在 ../pseudo，跨模块 import
// 约束见 verify-ticket-01：fill/ui 不 import detect）。
function resolveAriaIds(el, idsStr) {
  const out = [];
  for (const id of String(idsStr || '').split(/\s+/).filter(Boolean)) {
    let n = null;
    try {
      const rn = el.getRootNode && el.getRootNode();
      if (rn && rn.getElementById) n = rn.getElementById(id);
      if (!n) {
        const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (doc && doc.getElementById) n = doc.getElementById(id);
      }
    } catch {}
    if (n) out.push(n);
  }
  return out;
}

// 选项内容验证沿用 L3 口径（值域整体分布判定）：值证据 = data-value/value 属性；文本证据 =
// textContent 与 aria-label 双面（antd observed: 文本=ISO2、国名在 aria-label）。ISO2 判定同
// L3：数据全集成员测试（ISO2_SET）+ 国家名互证；数字枚举/括号区号同口径；分值全部复用
// L3 既有常量（检查点二：不为新控件类型开新误报后门）。
function pseudoNameHit(iso, text) {
  const c = ISO2_MAP[iso];
  if (!c || !text) return false;
  const t = String(text).toLowerCase();
  const en = c.countryEn.toLowerCase();
  const first = en.split(' ')[0];
  if (first.length >= 4 && t.indexOf(first) >= 0) return true;
  if (t.indexOf(en) >= 0) return true;
  if (c.country && t.indexOf(c.country) >= 0) return true;
  return false;
}

function pseudoOptionStats(opts) {
  let plusDial = 0, parenDial = 0, isoName = 0, numeric = 0;
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    const val = String((o.getAttribute && (o.getAttribute('data-value') || o.getAttribute('value'))) || '').trim();
    const txt = String(o.textContent || '').trim();
    const lab = String((o.getAttribute && o.getAttribute('aria-label')) || '').trim();
    const cands = [val, txt, lab].filter(Boolean);
    if (cands.some(s => DIAL_SET.has(s.replace(/^\+/, '').replace(/^00/, '')))) plusDial++;
    const pm = (txt + ' ' + lab).match(/\(\+(\d{1,4})\)/);
    if (pm && DIAL_SET.has(pm[1])) parenDial++;
    let iso = '';
    let nameText = '';
    if (val && ISO2_SET.has(val.toLowerCase())) { iso = val.toLowerCase(); nameText = txt + ' ' + lab; }
    else if (txt && ISO2_SET.has(txt.toLowerCase())) { iso = txt.toLowerCase(); nameText = lab || txt; }
    if (iso && pseudoNameHit(iso, nameText)) isoName++;
    if (/^\d{1,4}$/.test(val || txt)) numeric++;
  }
  return { total: opts.length, plusDial, parenDial, isoName, numeric };
}

function comboboxEvidence(el) {
  if (!el.getAttribute || el.getAttribute('role') !== 'combobox') return null;
  if (el.getAttribute('aria-expanded') === null) return null;
  const idStr = [el.getAttribute('aria-controls'), el.getAttribute('aria-owns')].filter(Boolean).join(' ');
  if (!idStr) return null;
  let listbox = null;
  for (const n of resolveAriaIds(el, idStr)) {
    if (n.getAttribute && n.getAttribute('role') === 'listbox') { listbox = n; break; }
  }
  let stats = null;
  if (listbox && listbox.querySelectorAll) {
    let opts = [];
    try { opts = Array.prototype.slice.call(listbox.querySelectorAll('[role="option"]')); } catch {}
    if (opts.length) stats = pseudoOptionStats(opts);
  }
  // 否决组 [17 票策略 §2]: 搜索型 typeahead —— aria-autocomplete=list|both 且选项内容与
  // 国家数据零命中（区号/ISO2/括号区号全空）→ 站内搜索补全，整体判 none 不登记。
  const ac = String(el.getAttribute('aria-autocomplete') || '').toLowerCase();
  let veto = '';
  if ((ac === 'list' || ac === 'both') && stats && stats.total >= 2 &&
      stats.plusDial === 0 && stats.parenDial === 0 && stats.isoName === 0) veto = 'search-typeahead';
  return { listbox, stats, veto };
}

// 拉丁词匹配：camelCase 拆分 → token 等值；≥6 字符词允许 joined/token 子串。
// 3-4 字符短词（idd/npa/lang）只做等值匹配 —— F6「hidden→idd」子串撞库的根因即无长度护栏 [MD §2⑤]。
function matchLatin(text, kw) {
  const k = String(kw).toLowerCase();
  if (!k) return false;
  const camel = String(text || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  if (!camel) return false;
  const joined = camel.replace(/[^a-z0-9]+/g, '');
  if (joined === k) return true;
  if (k.length >= 6 && joined.includes(k)) return true;
  const toks = camel.split(/[^a-z0-9]+/).filter(Boolean);
  return toks.some(t => t === k || (k.length >= 6 && t.includes(k)));
}
function matchAny(text, list) { return list.some(k => matchLatin(text, k)); }

// ── L1 词表（显式分组，权重见 config.ts；组间互斥取最高档） ──
const KW_STRONG = ['countrycode', 'dialcode', 'dialingcode', 'callingcode', 'phonecode',
  'intlcode', 'mobilecode', 'areacode', 'telcode', 'countryphone', 'phoneprefix', 'idd'];
const KW_COUNTRY = ['country'];
const KW_PREFIX = ['prefix'];
const KW_NPA = ['npa', 'trunk'];
const KW_EXCLUDE = ['locale', 'language', 'lang', 'translate', 'translation', 'i18n',
  'province', 'state', 'city', 'region', 'county', 'district', 'prefecture', 'locality'];
// label 短语（CJK 用原文包含；EN 交给 matchLatin）
const LABEL_PHRASES_STRONG = ['country code', 'dial code', 'calling code', 'phone code',
  '国家区号', '国际区号', '电话区号', '呼叫代码'];
const LABEL_COMPOUND = ['国家/地区区号', '国家地区区号', '手机区号'];
const LABEL_EXCLUDE = ['语言', '语种', '本地化', '翻译', '省份', '城市', '区县', '县区', '行政区'];

// ── L3 选项分布统计（一次性扫描；value 与 text 双证据口径；票 13：占位首项剔除 + ISO2 全集域） ──
function optStats(el) {
  // 宿主 DOM/单测 mock 均为鸭子类型（仓库无类型门禁，vite 构建为准）
  const raw = el.options || [];
  const opts = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i];
    if ((o.value || '').trim()) opts.push(o);
  }
  let plusDial = 0, parenDial = 0, isoName = 0, numeric = 0, placeholder = 0;
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    // 票 13 [issue 验收5]：占位首项（请选择类）剔除出计分 —— 不进 total、不进任何分布
    // 计数；剔除仅作用于本统计，不影响填充匹配（fill 侧独立枚举 options）[handoff 检查点二]
    if (i === 0 && isPlaceholderOpt(o)) { placeholder++; continue; }
    const v = (o.value || '').trim();
    const t = (o.text || '').trim();
    const bare = v.replace(/^\+/, '').replace(/^00/, '');
    if (DIAL_SET.has(bare)) plusDial++;
    else if (/^\d{1,4}$/.test(v)) numeric++;
    if (/\(\+\d{1,4}\)/.test(t) && DIAL_SET.has((t.match(/\(\+(\d{1,4})\)/) || [])[1] || '')) parenDial++;
    // 票 13 [issue 验收3]：ISO2 成员测试以数据全集为域（ISO2_SET），替换「像 2 字母」
    // 形态学预筛；文本↔国家名互证保留（假两字母不撞库 [MD §4]）
    const vi = v.toLowerCase();
    if (ISO2_SET.has(vi) && t.length > 2 && /^[A-Za-z\s.'-]+$/.test(t)) {
      const en = ISO2_MAP[vi].countryEn.toLowerCase();
      if (t.toLowerCase().includes(en.split(' ')[0]) || en.includes(t.toLowerCase())) isoName++;
    }
  }
  // total = 有效选项数（占位首项剔除后）；规模门槛与各分布占比均以有效计数为分母
  const total = opts.length - placeholder;
  return { total, plusDial, parenDial, isoName, numeric };
}

// 票 04：observer 配置与指纹属性面（两者对齐 —— 指纹读什么，observer 就监听什么）
const OBSERVED_ATTRS = ['name', 'id', 'class', 'type', 'placeholder', 'aria-label',
  'data-name', 'title', 'autocomplete', 'inputmode', 'disabled', 'readonly',
  'role', 'aria-expanded', 'aria-controls', 'aria-owns'];
const MO_OPTS = { childList: true, subtree: true, attributes: true, attributeFilter: OBSERVED_ATTRS };
// 候选选择器组（顺序：select → iti 容器 → input 组合；与 v1.3.4 迁移基线一致）
const SCAN_SELECTORS = [
  'select',
  '.iti input',
  '.intl-tel-input input',
  'input[type="tel"],input[type="text"],input:not([type]),input[type="number"]',
  // 票 18: 伪 select 触发器三形态 DIV/INPUT/BUTTON[role=combobox]（MUI/antd/EP/react-select/Radix observed）
  '[role="combobox"]',
];

export function createDetect(UI, Rules) {
  const Detect = {
    // 票 04：WeakSet 终态 → 属性指纹快照。fp 只判"变没变"；attach 真值以 DOM 实况为准
    // （el.closest('.cch-wrapper')），state.attached 仅供跳过路径的自愈补挂。
    _state: new WeakMap(),
    // 票 04：per-shadow-root observer 登记（host 断连时 prune，防 MutationObserver 强引用泄漏）
    _shadowWatchers: new Map(),
    _scanTimer: null,
    _watched: false,

    _own(el) {
      // 票 04：移除 closest('.cch-wrapper') 检查 —— 旧实现依赖 _done 先短路，指纹重评下该检查
      // 会把已挂图标字段永久挡在重评之外。own 判定收敛为自身 UI 容器/按钮。
      return !!el.closest('#' + OWN_ROOT_ID) ||
             el.id === 'cch-search' || el.id === 'cch-si' ||
             !!(el.classList && el.classList.contains && el.classList.contains('cch-btn'));
    },

    _label(el) {
      // 票 04：getRootNode() 覆盖 shadow 内 label[for]（ShadowRoot/Document 均有 querySelector/getElementById）
      const rootNode = (el.getRootNode && el.getRootNode()) || el.ownerDocument || document;
      if (el.id) {
        const l = rootNode.querySelector('label[for="' + el.id + '"]');
        if (l) return l.textContent;
      }
      const lp = el.closest('label');
      if (lp) return lp.textContent;
      const lid = el.getAttribute('aria-labelledby');
      if (lid) {
        // N2 修复：aria-labelledby 多 id 空格分隔逐一解析（旧实现 getElementById('lb1 lb2') 永远 null）
        for (const p of lid.split(/\s+/).filter(Boolean)) {
          const l = rootNode.getElementById ? rootNode.getElementById(p) : null;
          if (l) return l.textContent;
        }
      }
      return '';
    },

    // ══ 评分核心：纯函数（元素 + 可选锚上下文 → 分数/分档/信号明细；不触碰 UI/存储） ══
    scoreElement(el, ctx) {
      ctx = ctx || {};
      const sig = [];
      const add = (layer, name, pts) => { sig.push({ layer, name, pts }); return pts; };
      const tag = el.tagName;
      // 票 18: aria-hidden input（MUI/react-select 隐藏承值 native input 形态 [票 17 observed]）
      // 不在可访问树内、非交互目标 —— 硬排除（防承值 input 凭 name 之类混入登记召唤面）
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true' && el.getAttribute('role') !== 'combobox') {
        return { score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:aria-hidden', pts: 0 }] };
      }
      // INPUT 类型闸门：hidden/email/search/url/date 等永非区号字段（N6 [MD §3-N6]；email/type=tel 同页共存常见）
      if (tag === 'INPUT') {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        // 票 18: antd 触发器形态 type=search + readonly + role=combobox（observed）—— 豁免
        // search 类型闸门进 ARIA combobox 层；闸门后仍有否决组 + 档位 cap，非误报后门
        const comboTrigger = (el.getAttribute('role') || '').toLowerCase() === 'combobox';
        if (['hidden', 'email', 'search', 'url', 'password', 'date', 'color', 'range', 'file', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image'].includes(t) &&
            !(comboTrigger && t === 'search' && el.getAttribute('readonly') !== null)) {
          return { score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:input-type:' + t, pts: 0 }] };
        }
      }
      const type = (el.getAttribute('type') || (tag === 'INPUT' ? 'text' : '')).toLowerCase();
      let score = 0;
      let pseudoHit = false;

      // ── L0 语义标准层 ──
      const ac = (el.getAttribute('autocomplete') || '').toLowerCase().trim();
      const acTok = ac.split(/\s+/).filter(Boolean);
      let strong = null, acTelHint = false, imTel = false;
      if (ac && !acTok.includes('off')) {
        strong = acTok.find(t => L0_TEL_TOKENS.includes(t));
        if (strong) score += add('L0', 'autocomplete:' + strong, L0_TOKEN_SCORE);
        else if (acTok.some(t => t === 'tel' || t.includes('tel'))) {
          acTelHint = true;
          score += add('L0', 'autocomplete:tel-hint', L0_TEL_HINT_SCORE);
        }
      }
      if ((el.getAttribute('inputmode') || '').toLowerCase() === 'tel') {
        imTel = true;
        score += add('L0', 'inputmode=tel', L0_INPUTMODE_TEL_SCORE);
      }
      if (tag === 'INPUT' && type === 'tel') score += add('L0', 'type=tel', L0_TEL_HINT_SCORE);

      // ── iti 容器证据登记（票 16 并入评分；票 13 检查点四：结算移至 L1 之后，
      //    容器唯一证据需最低佐证，见下方 iti:container 结算块）──
      const itiContainer = tag === 'INPUT' && this._isIti(el);

      // ── 语料：自身属性（name/id/class/placeholder/aria-label/data-name/title）+ label ──
      // 父级容器类名不参与（F7 country-form 污染路径移除 [MD §2④]）
      const attrStr = [el.getAttribute('name'), el.id, el.className,
        el.getAttribute('placeholder'), el.getAttribute('aria-label'),
        el.getAttribute('data-name'), el.getAttribute('title')]
        .filter(Boolean).join(' ');
      const label = (this._label(el) || '').toLowerCase();

      // ── L1 结构文本层（歧义词降权组而非常规词表；组间互斥取最高档） ──
      const compoundHit = LABEL_COMPOUND.some(p => label.includes(p));
      if (compoundHit) score += add('L1', 'label:compound', L1_COMPOUND_SCORE);
      const phraseHit = LABEL_PHRASES_STRONG.find(p => label.includes(p));
      if (phraseHit) score += add('L1', 'label:phrase:' + phraseHit, L1_LABEL_PHRASE_SCORE);
      if (label.includes('区号') && !compoundHit && !phraseHit &&
          !label.includes('国家') && !label.includes('国际') && !label.includes('电话')) {
        score += add('L1', 'label:bare-区号', L1_BARE_QU_SCORE);
      }
      if (/(固话|本地|local)/.test(label)) {
        score += add('L1', 'label:local-fixed', L1_LOCAL_FIXED_PENALTY);
      }
      let kw = null;
      if (matchAny(attrStr, KW_STRONG)) kw = 'strong';
      else if (matchAny(attrStr, KW_COUNTRY)) kw = 'country';
      else if (matchAny(attrStr, KW_PREFIX)) kw = 'prefix';
      else if (matchAny(attrStr, KW_NPA)) kw = 'npa';
      if (kw === 'strong')       score += add('L1', 'kw:strong', L1_STRONG_KW_SCORE);
      else if (kw === 'country') score += add('L1', 'kw:country', L1_COUNTRY_KW_SCORE);
      else if (kw === 'prefix')  score += add('L1', 'kw:prefix', L1_PREFIX_KW_SCORE);
      else if (kw === 'npa')     score += add('L1', 'kw:npa', L1_NPA_KW_SCORE);

      // ── iti 容器信号结算（票 16 并入评分；票 13 检查点四防线 [16-fix §5①]）──
      // 容器分（60）单独即越过 lowkey 阈（35），.iti 容器内无关 input（如国家下拉搜索框）
      // 仅凭容器证据即误注入（CI 实测 mm2-neg-itires 60/lowkey）——要求最低佐证
      // （type=tel / autocomplete tel 系 / inputmode=tel / 任一正向 L1 信号）才保留容器分；
      // 佐证缺失 → 容器分不入账，0 分信号留痕。真 iti 字段标准形态 type=tel 不受影响
      // （60+10=70 auto，E2E cch-test-page2 场景 C 口径不变）。
      if (itiContainer) {
        const l1Positive = sig.some(s => s.layer === 'L1' && s.pts > 0);
        if (type === 'tel' || strong || acTelHint || imTel || l1Positive) {
          score += add('L0', 'iti:container', ITI_CONTAINER_SCORE);
        } else {
          sig.push({ layer: 'L0', name: 'iti:container-unattested', pts: 0 });
        }
      }

      // ── L3 内容验证层（select 专属；值域整体分布，非单值判定 [MD §5-0②]） ──
      let st = null;
      if (tag === 'SELECT') {
        st = optStats(el);
        // 规模门槛 [IM P4-3；对齐旧行为 opts<2 硬排除，Case10]
        if (st.total < 2) {
          sig.push({ layer: 'L3', name: 'gate:options<2', pts: 0 });
          return { score: 0, tier: 'none', signals: sig };
        }
        if (st.plusDial > 0) {
          score += add('L3', 'opts:plus-dial', Math.min(st.plusDial * L3_PLUS_DIAL_SCORE, L3_DIAL_CAP));
          if (st.parenDial > 0) {
            score += add('L3', 'opts:(+NN)-text', Math.min(st.parenDial * L3_PLUS_PAREN_SCORE, L3_DIAL_CAP));
          }
        }
        // 票 16：数字占比罚分独立叠加（不再与区号加分互斥短路）——混入高占比数字枚举的
        // 下拉两条证据同时入账，交由总分与分档裁决 [issue 16 验收2]
        if (st.numeric / st.total >= L3_NUMERIC_MIN_RATE) {
          score += add('L3', 'opts:numeric-enum', L3_NUMERIC_PENALTY);
        }
        const isoRate = st.isoName / st.total;
        if (isoRate >= 0.5) score += add('L3', 'opts:country-identity', L3_ISO_BONUS);
        // 关键词↔内容同向锁定：区号专名 kw 但内容完全无区号证据且纯数字枚举 → 撤销 kw 分 [MD §2⑤ 布尔短路根因]
        if (kw === 'strong' && st.plusDial === 0 && st.isoName === 0 &&
            st.numeric / st.total >= L3_NUMERIC_MIN_RATE) {
          score -= L1_STRONG_KW_SCORE;
          sig.push({ layer: 'L3', name: 'lock:revoke-strong-kw', pts: -L1_STRONG_KW_SCORE });
        }
      }

      // ── ARIA combobox 语义层（票 18 [ADR-0005]；信号源: 17 票逐库取证 + 探测策略 §2）──
      // 组合结构信号（相当于 L2 关联层）+ L3 口径内容验证复用 + 搜索型否决组。
      // 档位上限「登记 + 手动召唤」在 _process 结算；两形态（可编辑型 INPUT / select-only
      // DIV|BUTTON）同层识别，填充形态在 fill 侧按触发器与承值探测分发。
      if (tag !== 'SELECT') {
        const combo = comboboxEvidence(el);
        if (combo) {
          if (combo.veto) {
            sig.push({ layer: 'L2', name: 'pseudo:veto:' + combo.veto, pts: 0 });
            return { score: 0, tier: 'none', signals: sig };
          }
          pseudoHit = true;
          score += add('L2', 'pseudo:combobox', ARIA_COMBO_STRUCT_SCORE);
          const st2 = combo.stats;
          if (st2) {
            if (st2.total < 2) {
              sig.push({ layer: 'L3', name: 'pseudo:gate:options<2', pts: 0 });
            } else {
              if (st2.plusDial > 0) score += add('L3', 'pseudo:opts:plus-dial', Math.min(st2.plusDial * L3_PLUS_DIAL_SCORE, L3_DIAL_CAP));
              if (st2.plusDial > 0 && st2.parenDial > 0) score += add('L3', 'pseudo:opts:(+NN)-text', Math.min(st2.parenDial * L3_PLUS_PAREN_SCORE, L3_DIAL_CAP));
              if (st2.numeric / st2.total >= L3_NUMERIC_MIN_RATE) score += add('L3', 'pseudo:opts:numeric-enum', L3_NUMERIC_PENALTY);
              if (st2.isoName / st2.total >= 0.5) score += add('L3', 'pseudo:opts:country-identity', L3_ISO_BONUS);
            }
          }
        }
      }

      // ── L4 排除层（负分制；拉丁词边界匹配、CJK 短语包含；复合短语白名单优先 [MD §5-0①]） ──
      if (!compoundHit) {
        const cjkExcl = LABEL_EXCLUDE.find(p => label.includes(p));
        if (cjkExcl) score += add('L4', 'exclude:' + cjkExcl, L4_EXCLUDE_PENALTY);
        else if (matchAny(attrStr, KW_EXCLUDE)) score += add('L4', 'exclude:latin', L4_EXCLUDE_PENALTY);
      }

      // ── L2 锚→目标关联：同 form（或全文档兜底）存在另一 input[type=tel] 主号锚 [IM P3] ──
      let anchorHasTel;
      if (ctx.anchorHasTel !== undefined) {
        anchorHasTel = ctx.anchorHasTel;
      } else {
        const scope = el.closest('form') || el.ownerDocument || document;
        anchorHasTel = false;
        if (scope.querySelectorAll) {
          const tels = scope.querySelectorAll('input[type="tel"]');
          for (const t of tels) { if (t !== el) { anchorHasTel = true; break; } }
        }
      }
      if (anchorHasTel) score += add('L2', 'anchor:tel', L2_ANCHOR_TEL_SCORE);

      // ── 分档 ──
      let tier;
      if (score >= SCORE_AUTO) tier = 'auto';
      else if (score >= SCORE_LOWKEY) tier = 'lowkey';
      else tier = 'none';

      // 国家选择器语义分层 [SP US7]：ISO 主导（无任何区号内容证据、无 strong kw）且未达高置信 →
      // 不自动注入（国家选择≠区号选择 [MD §2④]）；低置信档不适用，仅保留可召唤语义
      if (st && st.isoName / st.total >= 0.5 && st.plusDial === 0 && st.parenDial === 0 &&
          kw !== 'strong' && tier !== 'auto') {
        tier = 'none';
        sig.push({ layer: 'L2', name: 'country-semantic:suppress', pts: 0 });
      }

      return { score, tier, signals: sig, pseudo: pseudoHit };
    },

    tierOf(score) {
      if (score >= SCORE_AUTO) return 'auto';
      if (score >= SCORE_LOWKEY) return 'lowkey';
      return 'none';
    },

    // ══ 票 13：可见性闸门判定（[AM 结论4] Bitwarden dom-element-visibility /
    // KeePassXC #2184 教训同构）══
    // 只负责「元素当前是否不可见」；注入档位降级在 _process（闸门只改注入档位，
    // 不改检测登记 [handoff 13 检查点一]）。判定面 = 无歧义不可渲染态的保守集合：
    // display:none / visibility:hidden|collapse / opacity<0.01 / content-visibility:hidden /
    // clip:rect(0,0,0,0) / clip-path 全裁剪形态（inset(0)|inset(50%)|inset(100%)|circle(0)|
    // rect(0)）/ 零尺寸（宽高同为 0）。遮挡（overlay 遮盖）的 elementFromPoint 探测在
    // shadow DOM 与动态浮层下误杀率高（Bitwarden 亦未采用），以零尺寸 + 全裁剪形态
    // 近似覆盖 sr-only/视觉替换型隐藏，显式遮挡探测登记为未做项（报告偏离点）。
    // fail-open：无法测量（无 getComputedStyle/无布局信息的 mock 宿主）一律视为可见 ——
    // 宁可漏闸不可误杀（检查点一「不误杀隐藏承值 select」优先）。
    _hiddenByStyle(el) {
      try {
        const view = (el.ownerDocument && el.ownerDocument.defaultView) ||
          (typeof window !== 'undefined' ? window : null);
        if (view && typeof view.getComputedStyle === 'function') {
          const cs = view.getComputedStyle(el);
          if (cs) {
            if (cs.display === 'none') return true;
            if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return true;
            if (parseFloat(cs.opacity || '1') < 0.01) return true;
            if (cs.contentVisibility === 'hidden') return true;
            const clip = String(cs.clip || '').replace(/\s+/g, '');
            if (/^rect\(0(?:px)?,0(?:px)?,0(?:px)?,0(?:px)?\)$/.test(clip)) return true;
            const cp = String(cs.clipPath || '').replace(/\s+/g, '');
            if (cp !== 'none' &&
                /^(?:inset\(0(?:px)?\)|inset\(50%\)|inset\(100%\)|circle\(0|rect\(0)/.test(cp)) return true;
          }
        }
        if (typeof el.getBoundingClientRect === 'function') {
          const r = el.getBoundingClientRect();
          if (r && r.width === 0 && r.height === 0) return true;
        }
      } catch { return false; }
      return false;
    },

    _isIti(el) {
      if (el.tagName !== 'INPUT') return false;
      if (el.closest('.iti') || el.closest('.intl-tel-input')) return true;
      if (el.dataset && el.dataset.intlTelInputId) return true;
      if (typeof window !== 'undefined') {
        try {
          // 无 DOM lib 类型声明；window 上的 jQuery 属鸭子类型（@ts-expect-error 仅此一处）
          // @ts-expect-error userscript 宿主注入的全局，无类型声明
          const jq = window.jQuery;
          const pluginData = jq && (jq(el).data('plugin_intlTelInput') || jq(el).data('intlTelInput'));
          if (pluginData) return true;
        } catch {}
      }
      return false;
    },

    // ══ 票 04：扫描机制 ══

    scan(root) {
      root = root || document.body;
      if (!root) return;
      // 票 05：豁免域名 = 完全跳过检测（[AM 结论5] 1Password data-1p-ignore 心智：
      // 用户显式干预压过一切启发式；不评分/不注入/不登记召唤）
      if (Rules && typeof Rules.isPageExcluded === 'function' && Rules.isPageExcluded()) {
        if (typeof UI._pruneLow === 'function') UI._pruneLow();
        return;
      }
      const t0 = Date.now();
      this._pruneWatchers();
      const roots = this._deepRoots(root);
      for (const sel of SCAN_SELECTORS) {
        this._collect(roots, sel).forEach(el => this._process(el));
      }
      if (typeof UI._pruneLow === 'function') UI._pruneLow();
      const ms = Date.now() - t0;
      // 可选性能探针（票 04 基线）：页面不设置 __cchPerfHook 即零开销
      if (typeof window !== 'undefined' && typeof window.__cchPerfHook === 'function') {
        try { window.__cchPerfHook(ms); } catch {}
      }
    },

    // open shadowRoot 递归穿透：BFS 收集 [根, ...全部 open shadowRoot]，逐个挂 per-root observer
    _deepRoots(root) {
      const roots = [root];
      const seen = new Set(roots); // 防御性去重：正常 DOM 无环，病态结构下幂等
      const queue = [root];
      while (queue.length) {
        const cur = queue.shift();
        let els;
        try { els = cur.querySelectorAll('*'); } catch { continue; }
        for (let i = 0; i < els.length; i++) {
          const sr = els[i].shadowRoot; // 仅 open root 可读；closed 属性为 null（spec Out of Scope [AM 结论10]）
          if (sr && !seen.has(sr)) {
            seen.add(sr);
            roots.push(sr);
            queue.push(sr);
            this._observeShadow(sr);
          }
        }
      }
      return roots;
    },

    // 测试缝：collect 与 scan 分离（票 02 预留，票 04 替换实现为跨根集合查询）
    _collect(roots, sel) {
      const list = Array.isArray(roots) ? roots : [roots];
      const out = [];
      for (const r of list) {
        try { out.push(...r.querySelectorAll(sel)); } catch {}
      }
      return out;
    },

    _observeShadow(root) {
      // node 单测环境无 MutationObserver；同一 root 只挂一个
      if (typeof MutationObserver !== 'function' || this._shadowWatchers.has(root)) return;
      const mo = new MutationObserver(() => this.scheduleScan());
      try { mo.observe(root, MO_OPTS); } catch { return; }
      this._shadowWatchers.set(root, { mo, host: root.host || null });
    },

    // 泄漏防护：host 已断连的 shadow root → disconnect（observer 对被观察节点持强引用）
    _pruneWatchers() {
      for (const [root, rec] of this._shadowWatchers) {
        if (!root.host || !root.host.isConnected) {
          rec.mo.disconnect();
          this._shadowWatchers.delete(root);
        }
      }
    },

    // 统一防抖入口：顶层/shadow mutation、路由 hook 全部汇入；350ms 窗口后全量重扫
    scheduleScan() {
      clearTimeout(this._scanTimer);
      this._scanTimer = setTimeout(() => this.scan(document.body), RESCAN_DEBOUNCE_MS);
    },

    // 票 04：观测总装（替代旧 main.ts 内联 observe + 8×500ms 轮询）
    watch() {
      if (this._watched || typeof MutationObserver !== 'function') return;
      this._watched = true;
      new MutationObserver(() => this.scheduleScan()).observe(document.body, MO_OPTS);
      this._deepRoots(document.body); // 预挂 watch 时已存在的 shadow root observer
      // SPA 路由 hook：pushState/replaceState 包装（保 this/透参/返回值）+ popstate 监听
      if (typeof history !== 'undefined') {
        const self = this;
        ['pushState', 'replaceState'].forEach(name => {
          const orig = history[name];
          if (typeof orig !== 'function') return;
          history[name] = function () {
            const r = orig.apply(this, arguments);
            self.scheduleScan();
            return r;
          };
        });
      }
      window.addEventListener('popstate', () => this.scheduleScan());
    },

    // 票 04：属性指纹快照 —— 评分引擎实际读取的信号面（不含 value/位置/尺寸：
    // 输入过程不改判"是否区号字段"，避免打字触发无谓重评）
    _fingerprint(el) {
      const parts = [el.tagName, el.getAttribute('name'), el.id, el.getAttribute('class'),
        el.getAttribute('type'), el.getAttribute('placeholder'), el.getAttribute('aria-label'),
        el.getAttribute('data-name'), el.getAttribute('title'), el.getAttribute('autocomplete'),
        el.getAttribute('inputmode'),
        // 票 18: ARIA combobox 信号面入指纹 —— 面板开合（expanded/controls 翻转）触发重评，
        // 展开态 option 内容证据可入账（关闭态 MUI 悬空 id 静态证据口径 [17 票]）
        el.getAttribute('role'), el.getAttribute('aria-expanded'),
        el.getAttribute('aria-controls'), el.getAttribute('aria-owns'),
        el.disabled ? 'd' : '', el.readOnly ? 'r' : '',
        this._isIti(el) ? 'iti' : '', this._label(el) || '',
      // 票 13：可见性判定入指纹 —— 显隐翻转（路由切换/样式类变更）即触发重评
      this._hiddenByStyle(el) ? 'v0' : 'v1'];
      if (el.tagName === 'SELECT' && el.options) {
        for (let i = 0; i < el.options.length; i++) {
          const o = el.options[i];
          parts.push((o.value || '') + '=' + (o.text || ''));
        }
      }
      return parts.join('|');
    },

    _process(el) {
      if (this._own(el)) return;
      // 票 05：规则介入先于评分（[AM 结论5] Bitwarden linked field 强制锚定 +
      // KeePassXC Site Preferences 分档心智）。自身 UI 已被 _own 拦截，规则永不作用。
      let pageTier = null;
      if (Rules && typeof Rules.forcedTier === 'function') {
        let forced = null;
        try { forced = Rules.forcedTier(el); } catch {}
        try { pageTier = Rules.pageTierOverride(); } catch {}
        const wrapElR = el.closest ? el.closest('.' + WRAPPER_CLASS) : null;
        if (forced) {
          // 强制选择器命中：按规则档注入/移除，不评分；指纹含规则档，档位变化自动重评
          const kind = el.tagName === 'SELECT' ? 'select'
            : ((el.getAttribute('role') || '') === 'combobox') ? 'pseudo'
            : (el.tagName === 'INPUT' ? 'input' : null);
          if (!kind) return;
          const fp = this._fingerprint(el) + '|rule:' + forced;
          const st = this._state.get(el);
          if (st && st.fp === fp) {
            if (st.attached && !wrapElR) UI.attach(el, kind, forced, 0, []);
            return;
          }
          const rec = { fp, kind, tier: forced, score: 0, signals: [{ layer: 'R', name: 'rule:forced', pts: 0 }], attached: false };
          this._state.set(el, rec);
          if (forced === 'none') {
            if (wrapElR) UI.detach(el);
            return;
          }
          if (wrapElR) {
            const btn = wrapElR.querySelector ? wrapElR.querySelector('.cch-btn') : null;
            const prevTier = btn && btn.getAttribute('data-cch-tier');
            if (prevTier && prevTier !== forced) { UI.detach(el); UI.attach(el, kind, forced, 0, []); }
            rec.attached = true;
            return;
          }
          UI.attach(el, kind, forced, 0, []);
          rec.attached = true;
          return;
        }
        if (pageTier === 'none') {
          // 页面级 none 覆盖：等同引擎判 none（撤图标；不登记召唤）
          if (wrapElR) UI.detach(el);
          return;
        }
      }
      const wrapEl = el.closest ? el.closest('.' + WRAPPER_CLASS) : null;
      const fp = this._fingerprint(el);
      const st = this._state.get(el);
      // 票 13：用户显式召唤标记（UI.attach force 路径写入 data-cch-summon）——
      // 召唤图标是用户显式行为，可见性闸门不回拆
      const summonedWrap = !!(wrapEl && wrapEl.querySelector &&
        wrapEl.querySelector('.cch-btn[data-cch-summon="1"]'));

      // 指纹未变：跳过重评（等价旧 _done 短路）；已 attached 但 wrapper 被站点剥离 → 用缓存自愈补挂
      if (st && st.fp === fp) {
        if (st.attached && st.kind && !wrapEl) {
          UI.attach(el, st.kind, st.tier, st.score, st.signals);
        }
        return;
      }

      // 新元素或指纹变化 → 全量重评（_isIti 结果亦入指纹，插件初始化晚于首扫也能补挂）
      let kind = null, res;
      // 票 18: combobox 触发器 readonly 是 select-only 形态的常态（antd/EP observed）——
      // readonly 不再判死，disabled 照旧；非 combobox 的 readonly 语义不变
      if (el.disabled || (el.readOnly && (el.getAttribute('role') || '') !== 'combobox')) {
        // 禁用/只读：视同 none 档撤图标；重新启用时属性变化会再触发补挂
        res = { score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:disabled', pts: 0 }] };
      } else {
        // 票 16：iti 容器信号已并入 scoreElement（US10 取消评分外无条件 100 分短路）
        res = this.scoreElement(el);
        // 票 05：页面级分档覆盖（auto/lowkey 双向重映射）——页面档即「本页注入档位下限」：
        // auto 覆盖把 lowkey/none 全部提升注入（用户显式规则自担误报风险，对标
        // KeePassXC Site Preferences 用户干预压过启发式）；lowkey 覆盖同理；
        // none 覆盖已在上方短路（撤图标不登记）。
        if (Rules && (pageTier === 'auto' || pageTier === 'lowkey') && res.tier !== pageTier) {
          res = { score: res.score, tier: pageTier, pseudo: res.pseudo,
            signals: (res.signals || []).concat([{ layer: 'R', name: 'rule:tier-override', pts: 0 }]) };
        }
        // ── 票 13 可见性闸门（注入档位最终裁决）[AM 结论4 / SP US4]：只降注入档位，
        // 不动评分与检测登记 —— 隐藏字段走下方 none 分支按分登记（≥ITI_LOW_REGISTER_SCORE
        // 即进面板召唤），评分信号原样保留（gate:visibility-hidden 0 分留痕）。
        // forced/pageTier 规则是用户显式干预，已在上方生效；召唤图标（data-cch-summon）
        // 是用户显式行为，不被闸门回拆（summonedWrap 检查）。
        if (!summonedWrap && res.tier !== 'none' && this._hiddenByStyle(el)) {
          res = { score: res.score, tier: 'none', pseudo: res.pseudo,
            signals: (res.signals || []).concat([{ layer: 'VIS', name: 'gate:visibility-hidden', pts: 0 }]) };
        }
        // ── 票 18 [ADR-0005]: 伪 select 档位上限 =「登记 + 手动召唤」——不自动注入图标、
        // 不自动填充。分数与信号原样保留（≥25 走 rememberLow 登记召唤面），档位强制 none
        // + 0 分留痕；用户显式规则覆盖已在上方生效，不受此限。
        if (res.pseudo && res.tier !== 'none') {
          res = { score: res.score, tier: 'none', pseudo: true,
            signals: (res.signals || []).concat([{ layer: 'L2', name: 'gate:adr-0005-register-only', pts: 0 }]) };
        }
      }
      // kind 分发（票 04 教训：先枚举下游消费方 UI.attach / UI.rememberLow / Fill.run 三策略）：
      // iti 字段仍走适配层填充，不可回落 input 策略
      kind = kind || (res.pseudo ? 'pseudo'
        : el.tagName === 'SELECT' ? 'select'
        : (el.tagName === 'INPUT' ? (this._isIti(el) ? 'iti' : 'input') : null));
      const rec = { fp, kind, tier: res.tier, score: res.score, signals: res.signals, attached: false };
      this._state.set(el, rec);

      if (!kind) return;

      if (res.tier === 'none') {
        if (wrapEl && !summonedWrap) UI.detach(el); // 误挂移除（用户召唤图标除外 [票 13]）
        if (res.score >= ITI_LOW_REGISTER_SCORE) UI.rememberLow(el, kind, res.score, res.signals);
        return;
      }
      // auto / lowkey
      if (wrapEl) {
        const btn = wrapEl.querySelector ? wrapEl.querySelector('.cch-btn') : null;
        const prevTier = btn && btn.getAttribute('data-cch-tier');
        if (prevTier && prevTier !== res.tier) {
          UI.detach(el); // 档位变化：拆了重挂，样式与 data-cch-tier 同步
          UI.attach(el, kind, res.tier, res.score, res.signals);
        }
        rec.attached = true;
        return;
      }
      UI.attach(el, kind, res.tier, res.score, res.signals); // 漏挂补上
      rec.attached = true;
    },
  };

  return Detect;
}
