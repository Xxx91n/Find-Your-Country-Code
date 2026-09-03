// ════════════════════════════════════════════════════════
// iti 适配层：intl-tel-input 版本独立适配（v16–v29）
//
// 动作顺序（issue 03 delta，三层不可颠倒，依据 atomcode 矩阵结论 6/7/8）：
//   层1) setNumber 优先 —— 官方推荐路径，号码自带区号自动同步国家
//   层2) 方法名双名探测 —— 新名 setSelectedCountry（v26–v29）→ 旧名 setCountry（v16–v25）
//   层3) DOM 点击双代类名兜底 —— v29 系 .iti__selected-country / v16 系
//        .iti__flag-container > .selected-flag
// 实例获取链（spec「iti 适配层」节）：
//   getInstance 稳锚（v16–v29 从未断代）→ el.iti → dataset.intlTelInputId + instances 表
//   → jQuery data → jQuery 插件方法 → DOM 兜底 → 裸赋值
// ════════════════════════════════════════════════════════

export function createItiAdapter() {
  const Adapter = {
    _global() {
      return window.intlTelInput || window.intlTelInputGlobals || null;
    },

    _isFn(obj, name) {
      return !!obj && typeof obj[name] === 'function';
    },

    // ── 实例获取链（能力探测）──────────────────────────────
    _instance(el) {
      // ① getInstance 稳锚（v16.1.0 起一直存在）
      try {
        const g = this._global();
        if (g && this._isFn(g, 'getInstance')) {
          const inst = g.getInstance(el);
          if (inst) return inst;
        }
      } catch {}

      // ② 实例属性 el.iti（旧版绑定在元素上）
      try {
        if (el.iti) return el.iti;
      } catch {}

      // ③ dataset.intlTelInputId → 全局 instances 表
      try {
        const id = el.dataset && el.dataset.intlTelInputId;
        if (id) {
          const g = this._global();
          const inst = g && g.instances && g.instances[id];
          if (inst) return inst;
        }
      } catch {}

      // ④ jQuery data（.data('plugin_intlTelInput') / .data('intlTelInput')）
      try {
        const $ = window.jQuery || window.$;
        if ($) {
          const inst = $(el).data('plugin_intlTelInput') || $(el).data('intlTelInput');
          if (inst) return inst;
        }
      } catch {}

      return null;
    },

    // ── 层1：setNumber 优先（官方推荐路径，号码自带区号自动同步国家）──
    _fillByNumber(inst, el, country) {
      if (!this._isFn(inst, 'setNumber')) return false;
      try {
        const rest = (el.value || '').trim().replace(/^(?:\+|00)\d{1,4}\s*/, '').trim();
        inst.setNumber(rest ? country.code + ' ' + rest : country.code);
        return true;
      } catch {
        return false;
      }
    },

    // ── 层2：方法名双名探测（先新名 setSelectedCountry，未命中再旧名 setCountry）──
    _fillByCountry(inst, iso) {
      if (this._isFn(inst, 'setSelectedCountry')) {
        try {
          inst.setSelectedCountry(iso);
          return true;
        } catch {}
      }
      if (this._isFn(inst, 'setCountry')) {
        try {
          inst.setCountry(iso);
          return true;
        } catch {}
      }
      return false;
    },

    // ── 层3：DOM 点击双代类名兜底 ────────────────────────────
    _fillByDom(el, country, dispatch) {
      const iso = country.iso.toLowerCase();
      const wrapper = el.closest('.iti') || el.closest('.intl-tel-input');
      if (!wrapper) return false;

      const btn = wrapper.querySelector(
        '.iti__selected-country, .selected-flag, .iti__flag-container'
      );
      if (btn) btn.click();

      const clickItem = () => {
        const item = wrapper.querySelector(
          '[data-country-code="' + iso + '"], [data-dial-code="' + country.code.replace('+', '') + '"]'
        ) || document.querySelector(
          '.iti__country[data-country-code="' + iso + '"], .country[data-country-code="' + iso + '"]'
        );
        if (item) {
          item.click();
          return true;
        }
        return false;
      };

      if (clickItem()) return true;
      setTimeout(() => {
        if (!clickItem()) {
          el.value = country.code;
          dispatch();
        }
      }, 120);
      return true;
    },

    fill(el, country, dispatch) {
      const iso = country.iso.toLowerCase();
      const inst = this._instance(el);

      if (inst) {
        if (this._fillByNumber(inst, el, country)) return true;
        if (this._fillByCountry(inst, iso)) return true;
      }

      // jQuery 插件方法路径（实例未拿到的辅助能力面）
      try {
        const $ = window.jQuery || window.$;
        if ($ && typeof $(el).intlTelInput === 'function') {
          try {
            $(el).intlTelInput('setNumber', country.code);
            return true;
          } catch {}
          try {
            $(el).intlTelInput('setCountry', iso);
            return true;
          } catch {}
          try {
            $(el).intlTelInput('setCountry', iso.toUpperCase());
            return true;
          } catch {}
        }
      } catch {}

      // 层3：DOM 双代类名兜底
      if (this._fillByDom(el, country, dispatch)) return true;

      // 最终兜底：裸赋值 + 事件
      el.value = country.code;
      dispatch();
      return true;
    },
  };

  return Adapter;
}
