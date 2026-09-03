import { SELECT_KW, SELECT_EXCLUDE_KW, INPUT_KW, LABEL_PHRASES, OWN_ROOT_ID, WRAPPER_CLASS } from '../config';
import { ISO2_MAP } from '../data/countries';
export function createDetect(UI) {
const Detect = {
  _done: new WeakSet(),

  _own(el) {
    return !!el.closest('#' + OWN_ROOT_ID) ||
           !!el.closest('.' + WRAPPER_CLASS) ||
           el.id === 'cch-search';
  },

  _kw(str, list) {
    if (!str) return false;
    const s = str.toLowerCase().replace(/[-_\s]/g, '');
    return list.some(k => s.includes(k.replace(/[-_\s]/g, '')));
  },

  _label(el) {
    if (el.id) {
      const l = document.querySelector('label[for="' + el.id + '"]');
      if (l) return l.textContent;
    }
    const lp = el.closest('label');
    if (lp) return lp.textContent;
    const lid = el.getAttribute('aria-labelledby');
    if (lid) { const l = document.getElementById(lid); if (l) return l.textContent; }
    return '';
  },

  _isIti(el) {
    if (el.tagName !== 'INPUT') return false;
    if (el.closest('.iti') || el.closest('.intl-tel-input')) return true;
    if (el.dataset && el.dataset.intlTelInputId) return true;
    if (typeof window.jQuery !== 'undefined') {
      try {
        const pluginData = window.jQuery(el).data('plugin_intlTelInput') ||
                           window.jQuery(el).data('intlTelInput');
        if (pluginData) return true;
      } catch {}
    }
    return false;
  },

  _isSelect(el) {
    if (el.tagName !== 'SELECT') return false;
    const opts = Array.from(el.options).filter(o => (o.value || '').trim());
    if (opts.length < 2) return false;

    const attrStr = [el.name, el.id, el.className,
      el.getAttribute('data-name'), el.getAttribute('aria-label'), el.title]
      .filter(Boolean).join(' ');

    const lbl = this._label(el).toLowerCase();
    const parentHint = el.parentElement
      ? `${el.parentElement.className || ''} ${(el.parentElement.getAttribute('aria-label') || '')}`
      : '';
    const detectHint = `${attrStr} ${lbl} ${parentHint}`.toLowerCase();
    if (this._kw(detectHint, SELECT_EXCLUDE_KW)) return false;

    const hasLabelPhrase = LABEL_PHRASES.some(p => lbl.includes(p));

    const hasAttrKw = this._kw(attrStr, SELECT_KW) ||
      this._kw(this._label(el), SELECT_KW) ||
      (el.parentElement && this._kw(
        el.parentElement.className + ' ' + (el.parentElement.getAttribute('aria-label') || ''),
        SELECT_KW
      ));

    const hitCode = opts.filter(o => {
      const v = (o.value || '').trim();
      const txt = (o.text || '').trim();
      return /^\+\d{1,4}$/.test(v) || /^00\d{1,4}$/.test(v) || /^\d{1,4}$/.test(v) || /\(\+\d{1,4}\)/.test(txt);
    });
    const hitIso = opts.filter(o => {
      const v = (o.value || '').trim().toLowerCase();
      return /^[a-z]{2}$/.test(v) && !!ISO2_MAP[v];
    });
    const hitPlusLike = opts.filter(o => {
      const v = (o.value || '').trim();
      const txt = (o.text || '').trim();
      return /^\+\d{1,4}$/.test(v) || /^00\d{1,4}$/.test(v) || /\(\+\d{1,4}\)/.test(txt);
    });

    if (hasAttrKw || hasLabelPhrase) {
      return hitCode.length >= 2 || hitIso.length >= 2;
    }

    if (hitPlusLike.length >= 2 && hitPlusLike.length / opts.length >= 0.4) return true;

    const allText = opts.map(o => (o.text || '').toLowerCase()).join(' ');
    if ((hitCode.length >= 2 || hitIso.length >= 2) && /(china|japan|united states|usa|america|germany|france|india|canada|australia|united kingdom|uk)/.test(allText)) {
      return true;
    }

    return false;
  },

  _isInput(el) {
    if (el.tagName !== 'INPUT') return false;
    if (this._isIti(el)) return false;
    const type = (el.type || 'text').toLowerCase();
    if (!['text','tel',''].includes(type)) return false;

    const attrStr = [el.name, el.id, el.className,
      el.getAttribute('placeholder'), el.getAttribute('aria-label'),
      el.getAttribute('data-name'), el.title].filter(Boolean).join(' ');
    if (this._kw(attrStr, INPUT_KW)) return true;

    // FIX v3.3.3: label 含"呼叫代码"等短语即命中
    const lbl = this._label(el).toLowerCase();
    if (LABEL_PHRASES.some(p => lbl.includes(p))) return true;

    return false;
  },

  scan(root) {
    root = root || document.body;
    root.querySelectorAll('select').forEach(el => this._process(el));
    ['.iti input', '.intl-tel-input input'].forEach(sel => {
      root.querySelectorAll(sel).forEach(el => this._process(el));
    });
    root.querySelectorAll('input[type="tel"],input[type="text"],input:not([type])').forEach(el => this._process(el));
  },

  _process(el) {
    if (this._done.has(el)) return;
    if (this._own(el)) return;
    if (el.disabled || el.readOnly) return;

    let kind = null;
    if (this._isIti(el))         kind = 'iti';
    else if (this._isSelect(el)) kind = 'select';
    else if (this._isInput(el))  kind = 'input';

    if (kind) {
      this._done.add(el);
      UI.attach(el, kind);
    }
  },
};

// ════════════════════════════════════════════════════════

return Detect;
}
