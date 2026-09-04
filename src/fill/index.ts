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

export function createFill(UI) {
const Fill = {
  _itiAdapter: createItiAdapter(),

  // 唯一注入函数：原生 setter 赋值 + input→change→blur。所有 fill 路径（select/input/iti
  // 兜底）的赋值与事件派发都收敛到这里；fillSelect/fillInput/adapter 不再直接写 el.value。
  _inject(el, value) {
    let applied = false;
    try {
      const view = (el.ownerDocument && el.ownerDocument.defaultView) ||
        (typeof window !== 'undefined' ? window : null);
      const protoName = VALUE_PROTO_BY_TAG[el.tagName];
      const desc = view && protoName && Object.getOwnPropertyDescriptor(view[protoName].prototype, 'value');
      if (desc && desc.set) { desc.set.call(el, value); applied = true; }
    } catch {}
    if (!applied) el.value = value; // 非常规宿主（mock/异构元素）兜底
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

    let m = opts.find(o => {
      const v = o.value.trim();
      return v === country.code || v === digits || v === '00' + digits || v.toLowerCase() === iso;
    });
    if (!m) m = opts.find(o =>
      (o.getAttribute('data-country-code') || '').toLowerCase() === iso ||
      (o.getAttribute('data-iso') || '').toLowerCase() === iso
    );
    if (!m) m = opts.find(o =>
      o.text.includes(country.code) ||
      o.text.toLowerCase().includes(country.countryEn.toLowerCase()) ||
      o.text.includes(country.country)
    );
    if (m) { this._inject(el, m.value); return true; }
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

  run(el, kind, country) {
    let ok = false;
    if (kind === 'iti')         ok = this.fillIti(el, country);
    else if (kind === 'select') ok = this.fillSelect(el, country);
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
