// ════════════════════════════════════════════════════════
// Store（票 01 建骨架 / 票 05 扩展）：GM 持久化（收藏 + 站点规则）+ 跨标签页同步
// 同步机制（沿用 02 报告验证过的三通道）：BroadcastChannel 同源 + GM_addValueChangeListener
//   远端 + subscribe 通知本页订阅者。规则键独立（cch_site_rules_v1），与收藏键解耦。
// ── 站点规则数据格式 v1（票 07 UI 的接口契约；权威文档见报告）──
// GM_setValue('cch_site_rules_v1', JSON.stringify(doc))：
//   doc = {
//     version: 1,
//     exempt:   string[],            // 豁免域名列表（小写 hostname，点边界子域匹配）
//     overrides: [{                  // 元素级覆盖规则（强制选择器 / 分档覆盖 / 负反馈记忆）
//       id: string,                  // 'r' + base36 时间 + 随机段（稳定主键）
//       host: string,                // 规则绑定的 hostname（小写）
//       selector: string,            // CSS 选择器（文档级 querySelectorAll 匹配）
//       action: { tier },            // tier ∈ 'auto' | 'lowkey' | 'none'
//       note: string,                // 来源备注（07 面板展示；'panel-negative-feedback' = 负反馈记忆）
//       createdAt: number, updatedAt: number   // epoch ms
//     }],
//     global: null | { thresholds: { auto?: number, lowkey?: number } }  // 置信度分档覆盖（可选，
//                                  // 本期无面板 CRUD，格式预留；缺省回退 config.ts 全局阈值）
//   }
// ════════════════════════════════════════════════════════
import { RULES_KEY, RULES_BROADCAST, RULE_TIERS, RULES_MAX_OVERRIDES } from '../config';

// GM_* 为 userscript 宿主注入的全局（vite 构建无类型门禁；此处仅声明供 tsc 局部清零）
declare function GM_getValue(key: string, defaultValue?: string): string;
declare function GM_setValue(key: string, value: string): void;
declare function GM_addValueChangeListener(
  key: string,
  fn: (key: string, oldValue: string, newValue: string, remote: boolean) => void,
): number;

export function createStore() {
const Store = {
  _k: 'cch_v33',
  _c: null,
  _bc: null,
  _gmListener: null,
  _rulesCache: null,
  _rulesBC: null,
  _rulesListener: null,
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
    // ── 站点规则同步（票 05）：独立键 + 独立通道，写路径广播、读路径远端落缓存 ──
    if (!this._rulesBC && typeof BroadcastChannel !== 'undefined') {
      try {
        this._rulesBC = new BroadcastChannel(RULES_BROADCAST);
        this._rulesBC.addEventListener('message', e => {
          const msg = e && e.data;
          if (!msg || msg.sid === this._sid || msg.type !== RULES_BROADCAST) return;
          if (!this._normRulesDoc(msg.rules)) return;
          this._rulesCache = msg.rules;
          try { GM_setValue(RULES_KEY, JSON.stringify(msg.rules)); } catch {}
          this._notify();
        });
      } catch {}
    }
    if (!this._rulesListener && typeof GM_addValueChangeListener === 'function') {
      try {
        this._rulesListener = GM_addValueChangeListener(RULES_KEY, (_k, _o, n, remote) => {
          if (!remote) return;
          try {
            const parsed = JSON.parse(n || 'null');
            if (!this._normRulesDoc(parsed)) return;
            this._rulesCache = parsed;
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
  _broadcastRules() {
    if (!this._rulesBC) return;
    try {
      this._rulesBC.postMessage({ type: RULES_BROADCAST, sid: this._sid, rules: this._rulesCache });
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

  // ════════════════════════════════════════════════════════
  // 站点规则（票 05）——持久化原语 + CRUD 函数边界（票 07 UI 只依赖这些入口）
  // ════════════════════════════════════════════════════════

  // 域名归一：字符串（URL / 裸域名）/ 位置对象（location）→ 小写 hostname（去端口/路径/末点）
  _hostOf(input) {
    try {
      let host = '';
      if (input && typeof input === 'object') {
        host = String(input.hostname || '').toLowerCase();
      } else {
        let s = String(input == null ? '' : input).trim().toLowerCase();
        if (!s) return '';
        if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'https://' + s;
        host = new URL(s).hostname || '';
      }
      return host.replace(/\.$/, '');
    } catch { return ''; }
  },

  // 防御性规范化（远端/GM 值可能被外部写坏；格式契约见文件头注）
  _normRulesDoc(r) {
    if (!r || typeof r !== 'object' || Array.isArray(r) || r.version !== 1) return null;
    if (!Array.isArray(r.exempt)) r.exempt = [];
    r.exempt = r.exempt.filter(h => typeof h === 'string' && h.trim()).map(h => h.trim().toLowerCase());
    if (!Array.isArray(r.overrides)) r.overrides = [];
    r.overrides = r.overrides.filter(o => o && typeof o === 'object' &&
      typeof o.id === 'string' && o.id &&
      typeof o.host === 'string' && o.host &&
      typeof o.selector === 'string' && o.selector.trim() &&
      o.action && typeof o.action === 'object' && RULE_TIERS.includes(o.action.tier))
      .slice(0, RULES_MAX_OVERRIDES);
    if (r.global !== null && (typeof r.global !== 'object' || Array.isArray(r.global))) r.global = null;
    return r;
  },

  // 查（R）：全量副本（外部改副本不影响存储）
  getSiteRules() {
    if (!this._rulesCache) {
      let r = null;
      try { r = JSON.parse(GM_getValue(RULES_KEY, 'null')); } catch {}
      if (!this._normRulesDoc(r)) r = { version: 1, exempt: [], overrides: [], global: null };
      this._rulesCache = r;
    }
    return JSON.parse(JSON.stringify(this._rulesCache));
  },
  // 查：豁免判定（host 归一 + 点边界子域匹配：example.com 覆盖 www.example.com）
  isExempt(input) {
    const host = this._hostOf(input);
    if (!host) return false;
    return this.getSiteRules().exempt.some(k => host === k || host.endsWith('.' + k));
  },
  // 增/改（U）：豁免域名开关（幂等）
  setExempt(input, on) {
    const host = this._hostOf(input);
    if (!host) return false;
    const r = this.getSiteRules();
    const i = r.exempt.indexOf(host);
    if (on && i < 0) r.exempt.push(host);
    if (!on && i >= 0) r.exempt.splice(i, 1);
    this._writeRules(r);
    return true;
  },
  // 增/改（U）：元素级覆盖规则（幂等按 id；新规则生成 id/timestamps）
  upsertOverride(rule) {
    const r = this.getSiteRules();
    const host = this._hostOf(rule && rule.host);
    const sel = rule && typeof rule.selector === 'string' ? rule.selector.trim() : '';
    const tier = rule && rule.action && rule.action.tier;
    if (!host || !sel || !RULE_TIERS.includes(tier)) return null;
    const note = typeof rule.note === 'string' ? rule.note : '';
    if (rule.id && typeof rule.id === 'string') {
      const o = r.overrides.find(x => x.id === rule.id);
      if (o) {
        o.host = host; o.selector = sel; o.action = { tier }; o.note = note; o.updatedAt = Date.now();
        this._writeRules(r);
        return o.id;
      }
    }
    const o = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      host, selector: sel, action: { tier }, note,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    r.overrides.push(o);
    this._writeRules(r);
    return o.id;
  },
  // 删（D）
  removeOverride(id) {
    const r = this.getSiteRules();
    const i = r.overrides.findIndex(o => o.id === id);
    if (i < 0) return false;
    r.overrides.splice(i, 1);
    this._writeRules(r);
    return true;
  },
  // 写路径（内部）：缓存 + GM 持久化 + 本页通知 + 跨标签页广播
  _writeRules(r) {
    this._rulesCache = r;
    try { GM_setValue(RULES_KEY, JSON.stringify(r)); } catch {}
    this._broadcastRules();
    this._notify();
  },
};

// ════════════════════════════════════════════════════════

return Store;
}
