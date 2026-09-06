import { t } from '../i18n';
import { createItiAdapter } from '../iti-adapter';

// ════════════════════════════════════════════════════════
// 注入安全层（票 09）：单一注入函数 _inject —— INPUT/SELECT/TEXTAREA 统一
//   ① 值写入走原生 prototype value setter（bypass 框架在元素实例上安装的 value 拦截层，
//      React 16–18 inputValueTracking / Vue3 无劫持 / Angular accessor 均兼容）。
//      直接赋值会被 React tracker 去重吞掉 input 事件（react#11488 同心智）[AM 核心结论9]。
//   ② 事件序列固定 input → change → blur（RHF/Formik 校验链依赖该序列 [AM 核心结论9]），
//      bubbles + composed（跨 shadow root 可见，票 04 穿透场景的事件可达性依据）。
//   ③ checkbox/radio 不在本票（脚本不涉及该两类元素）。
// SELECT 原生 setter 缺口补齐 [MD §5-6]；TEXTAREA 分支当前无检测路径（detect 只产出
// select/input kind），此处按 spec「注入安全」节先行统一，供后续票复用。
// ════════════════════════════════════════════════════════
const VALUE_PROTO_BY_TAG = { INPUT: 'HTMLInputElement', SELECT: 'HTMLSelectElement', TEXTAREA: 'HTMLTextAreaElement' };

// ════════════════════════════════════════════════════════
// React 19 填充能力探测兜底（票 15）：受控组件实例被框架安装了 value 拦截层
// （own accessor）且带 _valueTracker 时，事件派发前走「强制 diff」兜底——把 tracker
// 快照回拨为填充前值，保证 React updateValueIfChanged 感知 lastValue≠nextValue
// （react#11488 同心智 [AM 核心结论9]）。探测只读；任何一步缺失或抛出即判不命中，
// 安全降级为既有路径（探测本身不引入新失败面）。React 19.2.8 npm 包
// react-dom-client.production.js 实读：_valueTracker / updateValueIfChanged 语义
// 与 16–18 逐字同构（observed，2026-09-06）。
// ════════════════════════════════════════════════════════
const _probe = {
  // 能力探测：实例级 value setter 补丁（own accessor）+ valueTracker 存在性，两者同时满足才命中
  hit(el) {
    try {
      const own = Object.getOwnPropertyDescriptor(el, 'value');
      if (!own || typeof own.get !== 'function' || typeof own.set !== 'function') return false;
      const tracker = el._valueTracker;
      if (!tracker || typeof tracker.getValue !== 'function' || typeof tracker.setValue !== 'function') return false;
      return true;
    } catch { return false; }
  },
  // 强制 diff：仅当 tracker 快照已等于填充值（updateValueIfChanged 将判「无变化」吞掉
  // 事件）时干预——回拨快照为填充前值使 diff 非空；填充前值与填充值相同（站点 JS 直接
  // 赋值但 React state 滞后的 react#11488 经典形态）则以哨兵保证 diff 非空。其余情形
  // （快照本就落后于填充值）原生 setter 路径已保证 diff，不动快照（最小干预）。
  forceDiff(el, prevValue, nextValue) {
    try {
      const tracker = el._valueTracker;
      if (!tracker || typeof tracker.getValue !== 'function' || typeof tracker.setValue !== 'function') return false;
      const next = String(nextValue);
      if (String(tracker.getValue()) !== next) return false;
      const prev = String(prevValue);
      tracker.setValue(prev === next ? next + '\u200b' : prev);
      return true;
    } catch { return false; }
  },
};


export function createFill(UI) {
const Fill = {
  _itiAdapter: createItiAdapter(),

  // 唯一注入函数：原生 setter 赋值 + input→change→blur。所有 fill 路径（select/input/iti
  // 兜底）的赋值与事件派发都收敛到这里；fillSelect/fillInput/adapter 不再直接写 el.value。
  _inject(el, value, opts) {
    let applied = false;
    let prevValue = '';

    try { prevValue = String(el.value); } catch {}

    try {
      const view = (el.ownerDocument && el.ownerDocument.defaultView) ||
        (typeof window !== 'undefined' ? window : null);
      const protoName = VALUE_PROTO_BY_TAG[el.tagName];
      const desc = view && protoName && Object.getOwnPropertyDescriptor(view[protoName].prototype, 'value');
      if (desc && desc.set) {
        desc.set.call(el, value);
        // 票 13 共享区号消歧落点：select 值 setter 只会命中首个同值选项（+1 多国共享），
        // 消歧后的目标选项经 selectedIndex 校正落点，再派发事件序列
        if (el.tagName === 'SELECT' && opts && typeof opts.selectedIndex === 'number' &&
            el.options && el.options[opts.selectedIndex]) {
          el.selectedIndex = opts.selectedIndex;
        }
        applied = true;
      }
    } catch {}
    if (!applied) el.value = value; // 非常规宿主（mock/异构元素）兜底
    // 票 15：探测命中（React 受控跟踪形态）→ 派发前强制 diff；不命中或探测抛错 = 既有路径

    if (_probe.hit(el)) _probe.forceDiff(el, prevValue, value);
    ['input', 'change', 'blur'].forEach(type => {
      let ev;
      try { ev = new Event(type, { bubbles: true, composed: true }); }
      catch { try { ev = el.ownerDocument.createEvent('Event'); ev.initEvent(type, true, true); } catch { return; } }
      try { el.dispatchEvent(ev); } catch {}
    });
  },

  fillIti(el, country) {
    return this._itiAdapter.fill(el, country, (v) => this._inject(el, v));
  },

  fillSelect(el, country) {
    const opts   = Array.from(el.options);
    const digits = country.code.replace(/\D/g, '');
    const iso    = country.iso.toLowerCase();
    const enName = (country.countryEn || '').toLowerCase();
    const cnName = country.country || '';
    const valueMatch = (o) => {
      const v = (o.value || '').trim();
      return v === country.code || v === digits || v === '00' + digits || v.toLowerCase() === iso;
    };
    const nameInText = (o) => {
      const t = (o.text || '').trim();
      if (!t) return false;
      const tl = t.toLowerCase();
      return (!!enName && tl.includes(enName)) || (!!cnName && t.includes(cnName));
    };

    // 票 13 共享区号消歧 [issue 13 验收4]：+1/+44 等多国共享同一值，纯值匹配必撞首个
    // 命中（选 Canada 落到 United States）——「值命中 + 选项文本含国家名」双证据优先；
    // 裸值下拉（无文本证据，如仅 +86/+1/+44）退回旧行为首值命中。
    let m = opts.find(o => valueMatch(o) && nameInText(o));
    if (!m) m = opts.find(valueMatch);
    if (!m) m = opts.find(o =>
      (o.getAttribute('data-country-code') || '').toLowerCase() === iso ||
      (o.getAttribute('data-iso') || '').toLowerCase() === iso
    );
    if (!m) m = opts.find(o =>
      o.text.includes(country.code) ||
      o.text.toLowerCase().includes(enName) ||
      o.text.includes(cnName)
    );
    if (m) {
      // 消歧目标经 selectedIndex 传递（select 值 setter 只命中首个同值选项）
      const idx = opts.indexOf(m);
      this._inject(el, m.value, { selectedIndex: idx >= 0 ? idx : undefined });
      return true;
    }
    return false;
  },

  fillInput(el, country) {
    const ph  = (el.placeholder || '').trim();
    let fmt = 'plus';
    if (/^00\d/.test(ph))  fmt = 'double0';
    else if (/^\d/.test(ph)) fmt = 'digits';
    const digits    = country.code.replace(/\D/g, '');
    const formatted = fmt === 'double0' ? '00' + digits : fmt === 'digits' ? digits : country.code;
    const rest = (el.value || '').replace(/^(\+|00)?\d{1,4}\s*/, '').trim();
    this._inject(el, formatted + (rest ? ' ' + rest : ''));
    return true;
  },

  // ══ 票 18: 伪 select（ARIA combobox）填充 [ADR-0005 / 17 票取证 observed] ══
  // 两形态分发（issue 验收2）:
  //   select-only 型（DIV/BUTTON 触发器或 readonly input 触发器）→ 开面板 + 点击/键盘选值:
  //     驱动站点自身组件 UI（点击 option 由组件自己更新 state）——observed 5/5 库选值无
  //     原生 change/input 事件，事件监听/直接写 state 均不可行，唯一通路是组件自身交互。
  //   可编辑型（非 readonly INPUT 触发器，react-select 形态）→ 隐藏承值 input 原生 setter
  //     + input/change/blur 事件（复用 _inject 注入安全层）。
  // 值承载探测三级回退 [17 票 §1.5]: 隐藏 native input → 触发器可见文本 → 展开态
  // option[aria-selected]。antd/EP 无 DOM 承载（组件 state）→ 走 listbox 交互路径。
  // 承值探测只在结构容器内（form + 5 层祖先），不上溯到 document 全域——防 CSRF 等页级
  // 隐藏 input 被误当承值面。
  _carrier(el) {
    const scopes = [];
    try { if (el.form) scopes.push(el.form); } catch {}
    let p = el;
    for (let i = 0; i < 5 && p; i++) {
      try { p = p.parentElement || p.host || null; } catch { p = null; }
      if (p) scopes.push(p);
    }
    for (const sc of scopes) {
      if (!sc || !sc.querySelectorAll) continue;
      let list = [];
      try { list = Array.prototype.slice.call(sc.querySelectorAll('input[name], select[name]')); } catch {}
      for (const n of list) {
        if (n === el) continue;
        let hidden = false;
        try { hidden = n.getAttribute('aria-hidden') === 'true' || n.type === 'hidden'; } catch {}
        if (!hidden) continue;
        let v = '';
        try { v = String(n.value || ''); } catch {}
        // 承值语义护栏: 现值应为空或 ISO2 形态（2 字母），防误写 csrf/token 类隐藏域
        if (v === '' || /^[a-zA-Z]{2}$/.test(v.trim())) return n;
      }
    }
    return null;
  },

  _listboxOf(el) {
    const idStr = [el.getAttribute('aria-controls'), el.getAttribute('aria-owns')]
      .filter(Boolean).join(' ');
    if (!idStr) return null;
    for (const id of idStr.split(/\s+/).filter(Boolean)) {
      let n = null;
      try {
        const rn = el.getRootNode && el.getRootNode();
        if (rn && rn.getElementById) n = rn.getElementById(id);
        if (!n) {
          const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
          if (doc && doc.getElementById) n = doc.getElementById(id);
        }
      } catch {}
      if (n && n.getAttribute && n.getAttribute('role') === 'listbox') return n;
    }
    return null;
  },

  // option↔国家匹配: 值属性（data-value/value）+ 文本/aria-label 双面（antd observed:
  // 文本=ISO2、国名在 aria-label），全部大小写不敏感；国家名互证吃 EN/CN 双语
  _pseudoOptMatch(o, country) {
    let v = '', t = '', lab = '';
    try { v = String(o.getAttribute('data-value') || o.getAttribute('value') || '').trim(); } catch {}
    try { t = String(o.textContent || '').trim(); } catch {}
    try { lab = String(o.getAttribute('aria-label') || '').trim(); } catch {}
    const iso = country.iso.toLowerCase();
    const en = (country.countryEn || '').toLowerCase();
    const cn = country.country || '';
    const hay = (t + ' ' + lab).toLowerCase();
    return v.toLowerCase() === iso || t.toLowerCase() === iso || lab.toLowerCase() === iso ||
      (!!en && hay.includes(en)) || (!!cn && hay.includes(cn));
  },

  // 点击选值: listbox 未挂载（关闭态）先点触发器展开再找（单次，同步渲染库直接命中）
  _pseudoFillByListbox(el, country) {
    let find = () => {
      const lb = this._listboxOf(el);
      if (!lb || !lb.querySelectorAll) return null;
      let opts = [];
      try { opts = Array.prototype.slice.call(lb.querySelectorAll('[role="option"]')); } catch {}
      return opts.find(o => this._pseudoOptMatch(o, country)) || null;
    };
    let m = find();
    if (!m) {
      try { if (el.getAttribute('aria-expanded') !== 'true') el.click(); } catch {}
      m = find();
    }
    if (!m) return false;
    try { m.click(); } catch { return false; }
    return true;
  },

  // 键盘选值（select-only 备援）: focus → ArrowDown 展开 → 逐项导航到目标 → Enter。
  // 导航起点假设为首个 option（高亮复位形态）；起点不确定的库可能偏移，点击路径优先。
  _pseudoFillByKeys(el, country) {
    const fire = (key) => {
      try { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); } catch {}
    };
    try { if (el.focus) el.focus(); } catch {}
    let lb = this._listboxOf(el);
    try { if (!lb && el.getAttribute('aria-expanded') !== 'true') fire('ArrowDown'); } catch {}
    lb = this._listboxOf(el);
    if (!lb || !lb.querySelectorAll) return false;
    let opts = [];
    try { opts = Array.prototype.slice.call(lb.querySelectorAll('[role="option"]')); } catch {}
    const idx = opts.findIndex(o => this._pseudoOptMatch(o, country));
    if (idx < 0) return false;
    for (let i = 0; i <= idx; i++) fire('ArrowDown');
    fire('Enter');
    return true;
  },

  fillPseudo(el, country) {
    // 可编辑型: 非 readonly INPUT 触发器（react-select 形态）→ 隐藏承值 input 原生 setter
    const editable = el.tagName === 'INPUT' && el.getAttribute('readonly') === null;
    if (editable) {
      const carrier = this._carrier(el);
      if (carrier) { this._inject(carrier, country.iso, {}); return true; }
    }
    // select-only 型（及无承值可编辑型回退）: 开面板 + 点击/键盘选值
    if (this._pseudoFillByListbox(el, country)) return true;
    return this._pseudoFillByKeys(el, country);
  },

  run(el, kind, country) {
    let ok = false;
    if (kind === 'iti')         ok = this.fillIti(el, country);
    else if (kind === 'select') ok = this.fillSelect(el, country);
    else if (kind === 'pseudo') ok = this.fillPseudo(el, country);
    else                        ok = this.fillInput(el, country);
    if (ok) UI.toast(t('ok') + ': ' + country.flag + ' ' + country.code);
    else {
      try { navigator.clipboard.writeText(country.code); } catch {}
      UI.toast(t('copied') + ': ' + country.code);
    }
  },
};

// ════════════════════════════════════════════════════════

return Fill;
}
