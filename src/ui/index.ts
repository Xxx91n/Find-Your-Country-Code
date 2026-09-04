import { t } from '../i18n';
import { OWN_ROOT_ID, WRAPPER_CLASS } from '../config';
import { COUNTRIES, ISO2_MAP } from '../data/countries';
export function createUI(Store, deps) {
const UI = {
  _root: null, _popup: null, _target: null, _kind: null,
  _toastTimer: null, _closeHandler: null, _anchor: null,
  _viewportHandler: null, _rafPending: false,
  _lowFields: new Map(),

  css() {
    if (document.getElementById('cch-style')) return;
    const s = document.createElement('style');
    s.id = 'cch-style';
    s.textContent = `
.${WRAPPER_CLASS}{position:relative;display:inline-block;width:100%}
.cch-btn{position:absolute;top:-12px;right:-12px;transform:none;
width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.96);
border:1px solid rgba(15,23,42,.16);cursor:pointer;display:flex;
align-items:center;justify-content:center;font-size:13px;z-index:10000;
box-shadow:0 8px 18px rgba(2,8,23,.18);transition:transform .12s ease,box-shadow .12s ease;
user-select:none;line-height:1;padding:0}
.cch-btn:hover{transform:scale(1.06);box-shadow:0 10px 20px rgba(2,8,23,.22)}
#${OWN_ROOT_ID}{z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#cch-pop{--cch-surface:rgba(255,255,255,.78);--cch-surface-strong:rgba(255,255,255,.92);
--cch-border:rgba(15,23,42,.12);--cch-text:#0f172a;--cch-subtext:#475569;--cch-accent:#0f766e;
background:var(--cch-surface);border:1px solid var(--cch-border);border-radius:16px;
box-shadow:0 18px 48px rgba(2,8,23,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
width:320px;max-height:min(78vh,460px);display:flex;flex-direction:column;overflow:hidden;
animation:cchIn .12s ease;z-index:2147483647}
@keyframes cchIn{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
#cch-sw{padding:12px 12px 10px;border-bottom:1px solid rgba(15,23,42,.08);background:var(--cch-surface-strong)}
#cch-si{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(15,23,42,.12);
background:rgba(255,255,255,.88);color:var(--cch-text);border-radius:10px;font-size:13px;outline:none}
#cch-si:focus{border-color:rgba(15,118,110,.45);box-shadow:0 0 0 3px rgba(15,118,110,.12)}
.cch-body{display:flex;flex-direction:column;gap:8px;padding:8px 8px 10px;overflow:hidden;flex:1;min-height:0}
.cch-sec{border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.66);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.cch-sec-favs{flex:0 0 auto}
.cch-sec-all{flex:1 1 auto;min-height:120px}
.cch-sec-hd{padding:7px 10px;font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--cch-subtext);
text-transform:uppercase;background:rgba(255,255,255,.52);border-bottom:1px solid rgba(15,23,42,.06)}
.cch-list{display:flex;flex-direction:column}
.cch-sec-favs .cch-list{max-height:132px;overflow-y:auto}
.cch-sec-all .cch-list{flex:1 1 auto;min-height:0;overflow-y:auto}
.cch-row{display:flex;align-items:center;padding:8px 10px;cursor:pointer;
gap:8px;border-bottom:1px solid rgba(15,23,42,.06);transition:background .12s ease,transform .08s ease}
.cch-row:last-child{border-bottom:none}
.cch-row:hover{background:rgba(15,118,110,.08)}
.cch-fl{font-size:17px;flex-shrink:0;width:24px;text-align:center}
.cch-cd{font-weight:600;font-size:13px;color:var(--cch-accent);min-width:44px}
.cch-nm{font-size:12px;color:var(--cch-subtext);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cch-fav{background:none;border:none;cursor:pointer;font-size:15px;color:#b8c1cc;
padding:2px 4px;border-radius:4px;flex-shrink:0;transition:color .1s}
.cch-fav.on,.cch-fav:hover{color:#f59e0b}
.cch-empty{padding:14px 10px;text-align:center;color:#8a95a3;font-size:12px}
#cch-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
background:#01696f;color:#fff;padding:8px 20px;border-radius:20px;
font-size:13px;z-index:2147483647;pointer-events:none;opacity:0;
transition:opacity .2s;white-space:nowrap}
#cch-toast.on{opacity:1}
/* 中置信低调注入样式 [SP US17]：半透明缩小，悬停恢复 */
.cch-btn-lowkey{opacity:.38;transform:scale(.78);filter:saturate(.4)}
.cch-btn-lowkey:hover{opacity:1;transform:scale(1.06);filter:none}
#cch-summon{margin:6px 12px 0;padding:6px 10px;font-size:12px;color:#475569;
background:rgba(15,118,110,.06);border:1px dashed rgba(15,118,110,.35);
border-radius:8px;cursor:pointer;text-align:center}
#cch-summon:hover{background:rgba(15,118,110,.12);color:#0f766e}`;
    document.head.appendChild(s);
  },

  toast(msg) {
    let el = document.getElementById('cch-toast');
    if (!el) { el = document.createElement('div'); el.id = 'cch-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
  },

  attach(el, kind, tier = 'auto', score = 0, signals = []) {
    if (el.closest('.' + WRAPPER_CLASS)) return;

    const wrap = document.createElement('div');
    wrap.className = WRAPPER_CLASS;
    const cs = getComputedStyle(el);
    wrap.style.display = cs.display === 'inline' ? 'inline-block' : cs.display;

    // 仅宽度可测时设显式宽，否则继承父容器
    if (el.offsetWidth > 0) {
      wrap.style.width = el.offsetWidth + 'px';
    }

    // 不论宽度是否为 0，都立即插入
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    const btn = document.createElement('button');
    btn.className = 'cch-btn' + (tier === 'lowkey' ? ' cch-btn-lowkey' : '');
    btn.type = 'button';
    btn.title = 'Country Code Helper';
    btn.setAttribute('aria-label', 'Country Code Helper');
    btn.setAttribute('data-cch-tier', tier);
    if (score) btn.setAttribute('data-cch-score', String(score));
    btn.textContent = '🌐';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this.open(el, kind, btn);
    });
    wrap.appendChild(btn);
  },

  // 低置信字段登记（不注入图标；面板「手动召唤」入口 [SP US18]）
  rememberLow(el, kind, score, signals) {
    this._lowFields.set(el, { kind, score, signals });
  },

  // 面板召唤：对已登记的低置信字段补挂图标（用户显式请求 → 按高置信样式挂）
  summon(el) {
    const rec = this._lowFields.get(el);
    if (!rec) return false;
    this._lowFields.delete(el);
    if (el.closest('.' + WRAPPER_CLASS)) return true;
    this.attach(el, rec.kind, 'auto', rec.score, rec.signals);
    return true;
  },

  open(target, kind, anchor) {
    if (this._popup && this._anchor === anchor) {
      this._closePopup();
      return;
    }

    this._target = target;
    this._kind   = kind;
    if (!this._root) {
      this._root = document.createElement('div');
      this._root.id = OWN_ROOT_ID;
      document.body.appendChild(this._root);
    }
    this._closePopup();
    this._anchor = anchor;

    const pop = document.createElement('div');
    pop.id = 'cch-pop';
    this._popup = pop;

    const sw = document.createElement('div'); sw.id = 'cch-sw';
    const si = document.createElement('input');
    si.type = 'text'; si.id = 'cch-si';
    si.placeholder = t('search');
    si.setAttribute('autocomplete', 'off');
    sw.appendChild(si); pop.appendChild(sw);

    // 低置信字段召唤入口 [SP US18]：面板打开时若有登记字段则显示
    if (this._lowFields.size > 0) {
      const sm = document.createElement('div');
      sm.id = 'cch-summon';
      sm.setAttribute('role', 'button');
      sm.textContent = t('summon');
      sm.addEventListener('click', e => {
        e.stopPropagation();
        const targets = [...this._lowFields.keys()];
        targets.forEach(el => this.summon(el));
        sm.remove();
      });
      pop.appendChild(sm);
    }

    const body = document.createElement('div');
    body.className = 'cch-body';

    const favSec = document.createElement('section');
    favSec.className = 'cch-sec cch-sec-favs';
    const favHd = document.createElement('div');
    favHd.className = 'cch-sec-hd';
    favHd.textContent = t('favs');
    const favList = document.createElement('div');
    favList.className = 'cch-list';
    favList.setAttribute('data-sec', 'favs');
    favSec.appendChild(favHd);
    favSec.appendChild(favList);

    const allSec = document.createElement('section');
    allSec.className = 'cch-sec cch-sec-all';
    const allHd = document.createElement('div');
    allHd.className = 'cch-sec-hd';
    allHd.textContent = t('all');
    const allList = document.createElement('div');
    allList.className = 'cch-list';
    allList.setAttribute('data-sec', 'all');
    allSec.appendChild(allHd);
    allSec.appendChild(allList);

    body.appendChild(favSec);
    body.appendChild(allSec);
    pop.appendChild(body);

    document.body.appendChild(pop);
    this._pos(pop, anchor);
    this._bindViewportTracking();
    this._bindPopupEvents(pop);
    this._render('');

    const close = e => {
      if (!pop.contains(e.target) && e.target !== anchor) {
        this._closePopup();
      }
    };
    this._closeHandler = close;
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    requestAnimationFrame(() => {
      if (this._popup === pop) si.focus();
    });
  },

  _closePopup() {
    if (this._popup) {
      this._popup.remove();
      this._popup = null;
    }
    if (this._closeHandler) {
      document.removeEventListener('mousedown', this._closeHandler);
      this._closeHandler = null;
    }
    if (this._viewportHandler) {
      window.removeEventListener('scroll', this._viewportHandler, true);
      window.removeEventListener('resize', this._viewportHandler);
      this._viewportHandler = null;
    }
    this._rafPending = false;
    this._anchor = null;
  },

  _bindViewportTracking() {
    if (this._viewportHandler) return;
    this._viewportHandler = () => {
      if (this._rafPending) return;
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        if (!this._popup || !this._anchor) return;
        this._pos(this._popup, this._anchor);
      });
    };
    window.addEventListener('scroll', this._viewportHandler, true);
    window.addEventListener('resize', this._viewportHandler);
  },

  _bindPopupEvents(pop) {
    const si = pop.querySelector('#cch-si');
    if (si) {
      si.addEventListener('input', () => {
        if (this._popup !== pop) return;
        this._render(si.value);
      });
    }
    pop.addEventListener('click', e => {
      if (this._popup !== pop) return;
      const favBtn = e.target.closest('.cch-fav');
      if (favBtn) {
        e.stopPropagation();
        const iso = (favBtn.dataset.iso || '').toLowerCase();
        const entry = ISO2_MAP[iso];
        if (!entry) return;
        if (Store.isFav(entry.code, entry.iso)) Store.rmFav(entry.code, entry.iso);
        else Store.addFav(entry);
        return;
      }
      const row = e.target.closest('.cch-row');
      if (!row) return;
      const iso = (row.dataset.iso || '').toLowerCase();
      const c = ISO2_MAP[iso];
      if (!c) return;
      deps.Fill.run(this._target, this._kind, c);
      this._closePopup();
    });
  },

  _pos(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 320;
    const ph = pop.offsetHeight || 440;
    const m = 8;
    let l = r.left;
    let tp = r.bottom + 8;
    if (l + pw > innerWidth - m) l = Math.max(m, innerWidth - pw - m);
    if (tp + ph > innerHeight - m) tp = Math.max(m, r.top - ph - 8);
    pop.style.cssText += `;left:${l}px;top:${tp}px;position:fixed`;
  },

  _match(c, query) {
    return c.country.includes(query) ||
      c.countryEn.toLowerCase().includes(query) ||
      c.code.includes(query) ||
      c.iso.toLowerCase().includes(query);
  },

  _renderRows(list, data) {
    list.innerHTML = '';
    if (!data.length) {
      list.innerHTML = `<div class="cch-empty">${t('none')}</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    data.forEach(c => {
      const row = document.createElement('div'); row.className = 'cch-row';
      row.dataset.iso = c.iso;
      const fav = Store.isFav(c.code, c.iso);
      row.innerHTML = `
<span class="cch-fl">${c.flag}</span>
<span class="cch-cd">${c.code}</span>
<span class="cch-nm">${c.country} ${c.countryEn}</span>
<button type="button" class="cch-fav${fav ? ' on' : ''}" data-code="${c.code}" data-iso="${c.iso}" title="${fav ? t('rmFav') : t('addFav')}">${fav ? '★' : '☆'}</button>`;
      frag.appendChild(row);
    });
    list.appendChild(frag);
  },

  _render(q) {
    if (!this._popup) return;
    const favList = this._popup.querySelector('.cch-list[data-sec="favs"]');
    const allList = this._popup.querySelector('.cch-list[data-sec="all"]');
    if (!favList || !allList) return;
    const query = q.toLowerCase().trim();
    let favData = Store.getFavs();
    let allData = COUNTRIES;
    if (query) {
      favData = favData.filter(c => this._match(c, query));
      allData = allData.filter(c => this._match(c, query));
    }
    this._renderRows(favList, favData);
    this._renderRows(allList, allData);
  },
};

// ════════════════════════════════════════════════════════

return UI;
}
