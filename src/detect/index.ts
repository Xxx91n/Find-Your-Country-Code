// ════════════════════════════════════════════════════════
// 多信号加权评分检测引擎（票 02 核心）
// 五层信号瀑布：L0 autocomplete/inputmode 标准信号 → L1 词表/label 加权（歧义词降权组）
//   → L2 锚→目标关联 → L3 select options 内容验证（值域整体分布）→ L4 排除词负分
// 输出 {score, tier, signals}；分级行动：auto=自动注入 / lowkey=低调注入 / none=不注入（可召唤）
// 蓝图出处：research/industry-models.md §④ + atomcode-industry-models.md 核心结论1/2/3
// 误报标定：research/misdetection-root-causes.md §2 五类 + 25 例 harness（FP 全落 none 档）
// ════════════════════════════════════════════════════════
import {
  L0_TOKEN_SCORE, L0_TEL_TOKENS, L0_TEL_HINT_SCORE, L0_INPUTMODE_TEL_SCORE,
  L1_STRONG_KW_SCORE, L1_COUNTRY_KW_SCORE, L1_PREFIX_KW_SCORE, L1_NPA_KW_SCORE,
  L1_LABEL_PHRASE_SCORE, L1_BARE_QU_SCORE, L1_LOCAL_FIXED_PENALTY, L1_COMPOUND_SCORE,
  L2_ANCHOR_TEL_SCORE,
  L3_PLUS_DIAL_SCORE, L3_PLUS_PAREN_SCORE, L3_DIAL_CAP, L3_ISO_BONUS,
  L3_NUMERIC_MIN_RATE, L3_NUMERIC_PENALTY,
  L4_EXCLUDE_PENALTY,
  SCORE_AUTO, SCORE_LOWKEY,
  OWN_ROOT_ID, WRAPPER_CLASS,
} from '../config';
import { COUNTRIES, ISO2_MAP } from '../data/countries';

// 真实拨号前缀集合（源自 COUNTRIES 国家数据；内容验证的值域基准 [MD §5-0② 整体分布判定]）
const DIAL_SET = new Set(COUNTRIES.map(c => c.code.slice(1)));

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

// ── L3 选项分布统计（一次性扫描；value 与 text 双证据口径） ──
function optStats(el) {
  // 宿主 DOM/单测 mock 均为鸭子类型（仓库无类型门禁，vite 构建为准）
  const raw = el.options || [];
  const opts = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i];
    if ((o.value || '').trim()) opts.push(o);
  }
  let plusDial = 0, parenDial = 0, isoName = 0, numeric = 0;
  for (const o of opts) {
    const v = (o.value || '').trim();
    const t = (o.text || '').trim();
    const bare = v.replace(/^\+/, '').replace(/^00/, '');
    if (DIAL_SET.has(bare)) plusDial++;
    else if (/^\d{1,4}$/.test(v)) numeric++;
    if (/\(\+\d{1,4}\)/.test(t) && DIAL_SET.has((t.match(/\(\+(\d{1,4})\)/) || [])[1] || '')) parenDial++;
    const vi = v.toLowerCase();
    if (/^[a-z]{2}$/.test(vi) && ISO2_MAP[vi] && t.length > 2 &&
        /^[A-Za-z\s.'-]+$/.test(t)) {
      const en = ISO2_MAP[vi].countryEn.toLowerCase();
      if (t.toLowerCase().includes(en.split(' ')[0]) || en.includes(t.toLowerCase())) isoName++;
    }
  }
  return { total: opts.length, plusDial, parenDial, isoName, numeric };
}

export function createDetect(UI) {
  const Detect = {
    _done: new WeakSet(),

    _own(el) {
      return !!el.closest('#' + OWN_ROOT_ID) ||
             !!el.closest('.' + WRAPPER_CLASS) ||
             el.id === 'cch-search';
    },

    _label(el) {
      if (el.id) {
        const l = (el.ownerDocument || document).querySelector('label[for="' + el.id + '"]');
        if (l) return l.textContent;
      }
      const lp = el.closest('label');
      if (lp) return lp.textContent;
      const lid = el.getAttribute('aria-labelledby');
      if (lid) {
        // N2 修复：aria-labelledby 多 id 空格分隔逐一解析（旧实现 getElementById('lb1 lb2') 永远 null）
        for (const p of lid.split(/\s+/).filter(Boolean)) {
          const l = (el.ownerDocument || document).getElementById(p);
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
      // INPUT 类型闸门：hidden/email/search/url/date 等永非区号字段（N6 [MD §3-N6]；email/type=tel 同页共存常见）
      if (tag === 'INPUT') {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        if (['hidden', 'email', 'search', 'url', 'password', 'date', 'color', 'range', 'file', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image'].includes(t)) {
          return { score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:input-type:' + t, pts: 0 }] };
        }
      }
      const type = (el.getAttribute('type') || (tag === 'INPUT' ? 'text' : '')).toLowerCase();
      let score = 0;

      // ── L0 语义标准层 ──
      const ac = (el.getAttribute('autocomplete') || '').toLowerCase().trim();
      const acTok = ac.split(/\s+/).filter(Boolean);
      if (ac && !acTok.includes('off')) {
        const strong = acTok.find(t => L0_TEL_TOKENS.includes(t));
        if (strong) score += add('L0', 'autocomplete:' + strong, L0_TOKEN_SCORE);
        else if (acTok.some(t => t === 'tel' || t.includes('tel'))) {
          score += add('L0', 'autocomplete:tel-hint', L0_TEL_HINT_SCORE);
        }
      }
      if ((el.getAttribute('inputmode') || '').toLowerCase() === 'tel') {
        score += add('L0', 'inputmode=tel', L0_INPUTMODE_TEL_SCORE);
      }
      if (tag === 'INPUT' && type === 'tel') score += add('L0', 'type=tel', L0_TEL_HINT_SCORE);

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
        } else if (st.numeric / st.total >= L3_NUMERIC_MIN_RATE) {
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

      return { score, tier, signals: sig };
    },

    tierOf(score) {
      if (score >= SCORE_AUTO) return 'auto';
      if (score >= SCORE_LOWKEY) return 'lowkey';
      return 'none';
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

    scan(root) {
      root = root || document.body;
      this._collect(root, 'select').forEach(el => this._process(el));
      ['.iti input', '.intl-tel-input input'].forEach(sel => {
        this._collect(root, sel).forEach(el => this._process(el));
      });
      this._collect(root, 'input[type="tel"],input[type="text"],input:not([type]),input[type="number"]')
        .forEach(el => this._process(el));
    },

    // 测试缝：collect 与 scan 分离 —— shadow 穿透（票 04）只替换 _collect
    _collect(root, sel) {
      return Array.from(root.querySelectorAll(sel));
    },

    _process(el) {
      if (this._done.has(el)) return;
      if (this._own(el)) return;
      if (el.disabled || el.readOnly) return;

      let kind = null, res = null;
      if (this._isIti(el)) {
        kind = 'iti';
        res = { score: L0_TOKEN_SCORE, tier: 'auto', signals: [] };
      } else {
        res = this.scoreElement(el);
        kind = el.tagName === 'SELECT' ? 'select' : (el.tagName === 'INPUT' ? 'input' : null);
      }
      if (!kind) return;
      if (res.tier === 'none') {
        // 低置信/国家语义字段：不注入，登记为可召唤（score≥25 才登记，纯负分排除字段不打扰）
        if (res.score >= 25) UI.rememberLow(el, kind, res.score, res.signals);
        return;
      }
      this._done.add(el);
      UI.attach(el, kind, res.tier, res.score, res.signals);
    },
  };

  return Detect;
}
