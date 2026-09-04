// ════════════════════════════════════════════════════════
// 多信号加权评分检测引擎（票 02）+ 可重评估扫描机制（票 04）
// 五层信号瀑布：L0 autocomplete/inputmode 标准信号 → L1 词表/label 加权（歧义词降权组）
//   → L2 锚→目标关联 → L3 select options 内容验证（值域整体分布）→ L4 排除词负分
// 输出 {score, tier, signals}；分级行动：auto=自动注入 / lowkey=低调注入 / none=不注入（可召唤）
// 扫描机制（票 04）：open shadowRoot 递归穿透（每 root 单独 querySelectorAll）+ 每 shadow root
//   单独 MutationObserver + 统一 350ms 防抖；元素判定 WeakSet 终态 → 属性指纹快照重评
//   （双向：误挂移除 / 漏挂补上）；SPA 路由 hook（pushState/replaceState/popstate）定向重扫
// 蓝图出处：research/industry-models.md §④ + M8 + atomcode-industry-models.md 核心结论1/2/3/10
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
  RESCAN_DEBOUNCE_MS,
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

// 票 04：observer 配置与指纹属性面（两者对齐 —— 指纹读什么，observer 就监听什么）
const OBSERVED_ATTRS = ['name', 'id', 'class', 'type', 'placeholder', 'aria-label',
  'data-name', 'title', 'autocomplete', 'inputmode', 'disabled', 'readonly'];
const MO_OPTS = { childList: true, subtree: true, attributes: true, attributeFilter: OBSERVED_ATTRS };
// 候选选择器组（顺序：select → iti 容器 → input 组合；与 v1.3.4 迁移基线一致）
const SCAN_SELECTORS = [
  'select',
  '.iti input',
  '.intl-tel-input input',
  'input[type="tel"],input[type="text"],input:not([type]),input[type="number"]',
];

export function createDetect(UI) {
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

    // ══ 票 04：扫描机制 ══

    scan(root) {
      root = root || document.body;
      if (!root) return;
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
        el.getAttribute('inputmode'), el.disabled ? 'd' : '', el.readOnly ? 'r' : '',
        this._isIti(el) ? 'iti' : '', this._label(el) || ''];
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
      const wrapEl = el.closest ? el.closest('.' + WRAPPER_CLASS) : null;
      const fp = this._fingerprint(el);
      const st = this._state.get(el);

      // 指纹未变：跳过重评（等价旧 _done 短路）；已 attached 但 wrapper 被站点剥离 → 用缓存自愈补挂
      if (st && st.fp === fp) {
        if (st.attached && st.kind && !wrapEl) {
          UI.attach(el, st.kind, st.tier, st.score, st.signals);
        }
        return;
      }

      // 新元素或指纹变化 → 全量重评（_isIti 结果亦入指纹，插件初始化晚于首扫也能补挂）
      let kind = null, res;
      if (el.disabled || el.readOnly) {
        // 禁用/只读：视同 none 档撤图标；重新启用时属性变化会再触发补挂
        res = { score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:disabled', pts: 0 }] };
      } else if (this._isIti(el)) {
        res = { score: L0_TOKEN_SCORE, tier: 'auto', signals: [] };
        kind = 'iti'; // iti 字段走适配层填充（Fill.run 三策略分发），不可回落 input 策略
      } else {
        res = this.scoreElement(el);
      }
      kind = kind || (el.tagName === 'SELECT' ? 'select' : (el.tagName === 'INPUT' ? 'input' : null));
      const rec = { fp, kind, tier: res.tier, score: res.score, signals: res.signals, attached: false };
      this._state.set(el, rec);

      if (!kind) return;

      if (res.tier === 'none') {
        if (wrapEl) UI.detach(el); // 误挂移除
        if (res.score >= 25) UI.rememberLow(el, kind, res.score, res.signals);
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
