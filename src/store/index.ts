export function createStore() {
const Store = {
  _k: 'cch_v33',
  _c: null,
  _bc: null,
  _gmListener: null,
  _subs: new Set(),
  _notifyQueued: false,
  _sid: Math.random().toString(36).slice(2),
  init() {
    if (!this._bc && typeof BroadcastChannel !== 'undefined') {
      try {
        this._bc = new BroadcastChannel('cch-favs-sync-v1');
        this._bc.addEventListener('message', e => {
          const msg = e && e.data;
          if (!msg || msg.sid === this._sid || msg.type !== 'favs-sync') return;
          if (!Array.isArray(msg.favs)) return;
          const d = this._load();
          d.favs = msg.favs;
          this._save(d, true);
          this._notify();
        });
      } catch {}
    }
    if (!this._gmListener && typeof GM_addValueChangeListener === 'function') {
      try {
        this._gmListener = GM_addValueChangeListener(this._k, (_k, _o, n, remote) => {
          if (!remote) return;
          try {
            const parsed = JSON.parse(n || '{}');
            if (!Array.isArray(parsed.favs)) parsed.favs = [];
            this._c = parsed;
            this._notify();
          } catch {}
        });
      } catch {}
    }
  },
  _notify() {
    if (this._notifyQueued) return;
    this._notifyQueued = true;
    setTimeout(() => {
      this._notifyQueued = false;
      this._subs.forEach(fn => {
        try { fn(); } catch {}
      });
    }, 0);
  },
  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  },
  _broadcastFavs(favs) {
    if (!this._bc) return;
    try {
      this._bc.postMessage({ type: 'favs-sync', sid: this._sid, favs });
    } catch {}
  },
  _load() {
    if (this._c) return this._c;
    try { this._c = JSON.parse(GM_getValue(this._k, '{}')); } catch { this._c = {}; }
    if (!Array.isArray(this._c.favs)) this._c.favs = [];
    return this._c;
  },
  _save(d, silent) {
    this._c = d;
    GM_setValue(this._k, JSON.stringify(d));
    if (!silent) this._broadcastFavs(d.favs);
  },
  isFav(code, iso) { return this._load().favs.some(f => f.code === code && f.iso === iso); },
  addFav(c) {
    const d = this._load();
    if (!this.isFav(c.code, c.iso)) {
      d.favs.push(c);
      this._save(d);
      this._notify();
    }
  },
  rmFav(code, iso) {
    const d = this._load();
    d.favs = d.favs.filter(f => !(f.code === code && f.iso === iso));
    this._save(d);
    this._notify();
  },
  getFavs() { return this._load().favs; },
};

// ════════════════════════════════════════════════════════

return Store;
}
