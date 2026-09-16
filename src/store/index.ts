// ════════════════════════════════════════════════════════
// Store（票 01 建骨架 / 票 05 扩展）：GM 持久化（收藏 + 站点规则）+ 跨标签页同步
// 同步机制（沿用 02 报告验证过的三通道）：BroadcastChannel 同源 + GM_addValueChangeListener
//   远端 + subscribe 通知本页订阅者。规则键独立（cch_site_rules_v1），与收藏键解耦。
// ── 站点规则数据格式 v1（票 07 UI 的接口契约；权威文档见报告）──
// GM_setValue('cch_site_rules_v1', JSON.stringify(doc))：
//   doc = {
//     version: 1,
//     exempt:   string[],            // 豁免域名列表（小写 hostname，点边界子域匹配）
//     overrides: [{                  // 覆盖规则（元素级：强制选择器 / 负反馈记忆；页面级分档覆盖须 scope:'page' [票 30]）
//       id: string,                  // 'r' + base36 时间 + 随机段（稳定主键）
//       host: string,                // 规则绑定的 hostname（小写）
// //       selector: string,            // CSS 选择器（文档级 querySelectorAll 匹配）
//       scope?: 'element' | 'page',    // 作用域（票 30 [A-004]，缺省 'element'，v1 文档无字段向后兼容）：
//                                  //   'element' = 只作用于 selector 命中元素；
//                                  //   'page' = 页面级分档覆盖显式规则类型（全页 auto/lowkey 档重映射；
//                                  //   selector 为展示占位、约定 '*'，不参与元素级匹配）
//       action: { tier },            // tier ∈ 'auto' | 'lowkey' | 'none'
//       note: string,                // 来源备注（07 面板展示；'panel-negative-feedback' = 负反馈记忆）
//       createdAt: number, updatedAt: number   // epoch ms
//     }],
//     global: null | { thresholds: { auto?: number, lowkey?: number } }  // 置信度分档覆盖（可选，
//                                  // 本期无面板 CRUD，格式预留；缺省回退 config.ts 全局阈值）
//   }
// ════════════════════════════════════════════════════════
import { RULES_KEY, RULES_BROADCAST, RULE_TIERS, RULES_MAX_OVERRIDES, SELF_ORIGIN } from '../config';
import type { CchStore, Country, OverrideRule, OverrideRuleInput, RuleScope, RulesDoc } from '../types';

// GM_* 为 userscript 宿主注入的全局（vite 构建无类型门禁；此处仅声明供 tsc 局部清零）
declare function GM_getValue(key: string, defaultValue?: string): string;
declare function GM_setValue(key: string, value: string): void;
declare function GM_addValueChangeListener(
  key: string,
  fn: (key: string, oldValue: string, newValue: string, remote: boolean) => void,
): number;

interface FavsDoc { favs: Country[] }

function isOverrideRule(o: unknown): o is OverrideRule {
  if (!o || typeof o !== 'object') return false;
  const v = o as Partial<OverrideRule>;
  return typeof v.id === 'string' && !!v.id &&
    typeof v.host === 'string' && !!v.host &&
    typeof v.selector === 'string' && !!v.selector.trim() &&
    !!v.action && typeof v.action === 'object' &&
    RULE_TIERS.includes(v.action.tier);
}

export function createStore(): CchStore {
const Store = {
  _k: 'cch_v33',
  _c: null as FavsDoc | null,
  _bc: null as BroadcastChannel | null,
  _gmListener: null as number | null,
  _rulesCache: null as RulesDoc | null,
  _rulesBC: null as BroadcastChannel | null,
  _rulesListener: null as number | null,
  _subs: new Set<() => void>(),
  _notifyQueued: false,
  _sid: Math.random().toString(36).slice(2),
  init(): void {
    if (!this._bc && typeof BroadcastChannel !== 'undefined') {
      try {
        this._bc = new BroadcastChannel('cch-favs-sync-v1');
        this._bc.addEventListener('message', e => {
          // 票 24 安全加固：只信任同源广播（BroadcastChannel 按 origin 天然隔离，此为纵深防御校验）
          // 票 10 [A-034]：操作数由 location.origin 改为 SELF_ORIGIN —— srcdoc 帧内 location.origin
          // 为字符串 "null"，而广播消息的 e.origin 为发送方真实 origin（实测 srcdoc 帧收到
          // e.origin=父级 origin）⇒ 以 location.origin 比对必然误判并丢弃同源同步；普通文档下恒等。
          if (e.origin !== SELF_ORIGIN) return;
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
          // 票 24 安全加固：只信任同源广播（BroadcastChannel 按 origin 天然隔离，此为纵深防御校验）
          // 票 10 [A-034]：操作数由 location.origin 改为 SELF_ORIGIN —— srcdoc 帧内 location.origin
          // 为字符串 "null"，而广播消息的 e.origin 为发送方真实 origin（实测 srcdoc 帧收到
          // e.origin=父级 origin）⇒ 以 location.origin 比对必然误判并丢弃同源同步；普通文档下恒等。
          if (e.origin !== SELF_ORIGIN) return;
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
  _notify(): void {
    if (this._notifyQueued) return;
    this._notifyQueued = true;
    setTimeout(() => {
      this._notifyQueued = false;
      this._subs.forEach(fn => {
        try { fn(); } catch {}
      });
    }, 0);
  },
  subscribe(fn: () => void): () => void {
    if (typeof fn !== 'function') return () => {};
    this._subs.add(fn);
    return () => { this._subs.delete(fn); };
  },
  _broadcastFavs(favs: Country[]): void {
    if (!this._bc) return;
    try {
      this._bc.postMessage({ type: 'favs-sync', sid: this._sid, favs });
    } catch {}
  },
  _broadcastRules(): void {
    if (!this._rulesBC) return;
    try {
      this._rulesBC.postMessage({ type: RULES_BROADCAST, sid: this._sid, rules: this._rulesCache });
    } catch {}
  },
  _load(): FavsDoc {
    if (this._c) return this._c;
    let d: FavsDoc;
    try { d = JSON.parse(GM_getValue(this._k, '{}')); } catch { d = {} as FavsDoc; }
    if (!Array.isArray(d.favs)) d.favs = [];
    this._c = d;
    return d;
  },
  _save(d: FavsDoc, silent?: boolean): void {
    this._c = d;
    GM_setValue(this._k, JSON.stringify(d));
    if (!silent) this._broadcastFavs(d.favs);
  },
  isFav(code: string, iso: string): boolean { return this._load().favs.some(f => f.code === code && f.iso === iso); },
  addFav(c: Country): void {
    const d = this._load();
    if (!this.isFav(c.code, c.iso)) {
      d.favs.push(c);
      this._save(d);
      this._notify();
    }
  },
  rmFav(code: string, iso: string): void {
    const d = this._load();
    d.favs = d.favs.filter(f => !(f.code === code && f.iso === iso));
    this._save(d);
    this._notify();
  },
  getFavs(): Country[] { return this._load().favs; },

  // ════════════════════════════════════════════════════════
  // 站点规则（票 05）——持久化原语 + CRUD 函数边界（票 07 UI 只依赖这些入口）
  // ════════════════════════════════════════════════════════

  // 域名归一：字符串（URL / 裸域名）/ 位置对象（location）→ 小写 hostname（去端口/路径/末点）
  _hostOf(input: string | { hostname?: string } | null | undefined): string {
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
  _normRulesDoc(r: unknown): RulesDoc | null {

    if (!r || typeof r !== 'object' || Array.isArray(r) || (r as { version?: unknown }).version !== 1) return null;
    const d = r as RulesDoc;
    if (!Array.isArray(d.exempt)) d.exempt = [];
    d.exempt = d.exempt.filter(h => typeof h === 'string' && h.trim()).map(h => h.trim().toLowerCase());
    if (!Array.isArray(d.overrides)) d.overrides = [];
    d.overrides = d.overrides.filter(isOverrideRule).slice(0, RULES_MAX_OVERRIDES);
    if (d.global !== null && (typeof d.global !== 'object' || Array.isArray(d.global))) d.global = null;
    return d;
  },

  // 查（R）：全量副本（外部改副本不影响存储）
  getSiteRules(): RulesDoc {
    if (!this._rulesCache) {
      let r: RulesDoc | null = null;
      try { r = JSON.parse(GM_getValue(RULES_KEY, 'null')); } catch {}
      if (!this._normRulesDoc(r)) r = { version: 1, exempt: [], overrides: [], global: null };
      this._rulesCache = r;
    }
    return JSON.parse(JSON.stringify(this._rulesCache));
  },
  // 查：豁免判定（host 归一 + 点边界子域匹配：example.com 覆盖 www.example.com）
  isExempt(input: string): boolean {
    const host = this._hostOf(input);
    if (!host) return false;
    return this.getSiteRules().exempt.some(k => host === k || host.endsWith('.' + k));
  },
  // 增/改（U）：豁免域名开关（幂等）
  setExempt(input: string, on: boolean): boolean {
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
  upsertOverride(rule: OverrideRuleInput): string | null {
    const r = this.getSiteRules();
    const host = this._hostOf(rule && rule.host);
    const sel = rule && typeof rule.selector === 'string' ? rule.selector.trim() : '';
    const tier = rule && rule.action && rule.action.tier;
    if (!host || !sel || !tier || !RULE_TIERS.includes(tier)) return null;
    // 票 30 [A-004]：scope 显式归一——仅 'page' 生效，其余（含旧文档缺字段）一律 'element'
    const scope: RuleScope = rule && rule.scope === 'page' ? 'page' : 'element';
    const note = typeof rule.note === 'string' ? rule.note : '';
    if (rule.id && typeof rule.id === 'string') {
      const o = r.overrides.find(x => x.id === rule.id);
      if (o) {
        o.host = host; o.selector = sel; o.scope = scope; o.action = { tier }; o.note = note; o.updatedAt = Date.now();
        this._writeRules(r);
        return o.id;
      }
    }
    const o = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      host, selector: sel, scope, action: { tier }, note,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    r.overrides.push(o);
    this._writeRules(r);
    return o.id;
  },
  // 删（D）
  removeOverride(id: string): boolean {
    const r = this.getSiteRules();
    const i = r.overrides.findIndex(o => o.id === id);
    if (i < 0) return false;
    r.overrides.splice(i, 1);
    this._writeRules(r);
    return true;
  },
  // 写路径（内部）：缓存 + GM 持久化 + 本页通知 + 跨标签页广播
  _writeRules(r: RulesDoc): void {
    this._rulesCache = r;
    try { GM_setValue(RULES_KEY, JSON.stringify(r)); } catch {}
    this._broadcastRules();
    this._notify();
  },
};

// ════════════════════════════════════════════════════════

return Store;
}
