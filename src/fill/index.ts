import { t } from '../i18n';
export function createFill(UI) {
const Fill = {
  _dispatch(el) {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (setter && el.tagName === 'INPUT') setter.set.call(el, el.value);
    } catch {}
    ['input','change','blur'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  },

  fillIti(el, country) {
    const iso = country.iso.toLowerCase();

    try {
      const globalIti = window.intlTelInput || window.intlTelInputGlobals;
      if (globalIti && typeof globalIti.getInstance === 'function') {
        const inst = globalIti.getInstance(el);
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      if (el.iti && typeof el.iti.setCountry === 'function') { el.iti.setCountry(iso); return true; }
    } catch {}

    try {
      const id = el.dataset.intlTelInputId;
      if (id) {
        const globalIti = window.intlTelInput || window.intlTelInputGlobals;
        const inst = globalIti && globalIti.instances && globalIti.instances[id];
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      const $ = window.jQuery || window.$;
      if ($) {
        if (typeof $(el).intlTelInput === 'function') {
          try { $(el).intlTelInput('setCountry', iso); return true; } catch {}
          try { $(el).intlTelInput('setCountry', iso.toUpperCase()); return true; } catch {}
        }
        const inst = $(el).data('plugin_intlTelInput') || $(el).data('intlTelInput');
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      const wrapper = el.closest('.iti') || el.closest('.intl-tel-input');
      if (wrapper) {
        const btn = wrapper.querySelector('.iti__selected-country, .iti__flag-container, .selected-flag');
        if (btn) btn.click();
        const clickItem = () => {
          const item = wrapper.querySelector(
            `[data-country-code="${iso}"], [data-dial-code="${country.code.replace('+','')}"]`
          ) || document.querySelector(
            `.iti__country[data-country-code="${iso}"], .country[data-country-code="${iso}"]`
          );
          if (item) { item.click(); return true; }
          return false;
        };
        if (clickItem()) return true;
        setTimeout(() => { if (!clickItem()) { el.value = country.code; this._dispatch(el); } }, 120);
        return true;
      }
    } catch {}

    el.value = country.code;
    this._dispatch(el);
    return true;
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
    if (m) { el.value = m.value; this._dispatch(el); return true; }
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
    el.value = formatted + (rest ? ' ' + rest : '');
    this._dispatch(el);
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
