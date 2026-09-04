// ════════════════════════════════════════════════════════
// Site Rules 引擎（票 05）— 站点级规则：豁免域名 / 强制选择器 / 置信度分档覆盖
// 心智对标（[AM] atomcode-industry-models.md 核心结论5，三源独立同构）：
//   - 豁免域名   ≈ 1Password data-1p-ignore（用户显式干预 > 引擎启发；可挂全站忽略）
//   - 强制选择器 ≈ Bitwarden linked custom field（CSS 选择器强制锚定，评分前命中 → 高置信注入）
//   - 分档覆盖   ≈ KeePassXC Site Preferences（按站点调整行为，不发明第三档语义）
// 匹配时机（handoff delta）：规则匹配发生在检测入口之前 —— Detect.scan 最先查豁免
//   （豁免 = 完全跳过，不评分不注入不登记）；强制选择器在评分前命中。对脚本自身 UI
//   （#cch-root / .cch-wrapper / #cch-search）永不生效 —— Rules._own 前置拦截。
// 数据格式 v1 与 CRUD 函数边界：见 ../store/index.ts 头注（权威契约，报告同步）。
// ════════════════════════════════════════════════════════
import { SCORE_AUTO, SCORE_LOWKEY, OWN_ROOT_ID, WRAPPER_CLASS, RULE_FORCE_TIER, RULE_TIERS } from '../config';

export function createRules(Store) {
  const Rules = {
    _subs: new Set(),

    // ── 内部：自身 UI 判定（与 Detect._own 同语义；规则引擎独立持有，避免 UI 依赖）──
    _own(el) {
      if (!el || typeof el.closest !== 'function') return true;
      return !!el.closest('#' + OWN_ROOT_ID) ||
             !!el.closest('.' + WRAPPER_CLASS) ||
             el.id === 'cch-search';
    },

    // ── 内部：CSS 选择器安全匹配（非法选择器静默不命中，不抛错污染检测主路径）──
    _safeMatches(el, selector) {
      try { return !!el.matches(selector); } catch { return false; }
    },

    // ════ 读（查）════

    // 全量规则（07 面板列表用）
    listRules() { return Store.getSiteRules(); },

    // 豁免判定：URL/hostname → 域名豁免命中？
    isExempt(urlOrHost) { return Store.isExempt(urlOrHost); },

    // 当前页豁免（检测入口最前置闸门调用）
    isPageExcluded() {
      try {
        if (typeof location !== 'undefined' && location && location.href) {
          return this.isExempt(location.href);
        }
      } catch {}
      return false;
    },

    // 当前页生效的覆盖规则（07 面板高亮当前站点规则用）
    pageOverrides() {
      try {
        if (typeof location !== 'undefined' && location && location.href) {
          return this.overridesFor(location.href);
        }
      } catch {}
      return [];
    },

    // URL/hostname → 命中的覆盖规则副本列表
    overridesFor(urlOrHost) {
      let host = '';
      try { host = Store._hostOf(urlOrHost); } catch { host = ''; }
      if (!host) return [];
      return Store.getSiteRules().overrides
        .filter(o => o.host === host)
        .map(o => ({ id: o.id, host: o.host, selector: o.selector, action: { tier: o.action.tier }, note: o.note || '', updatedAt: o.updatedAt || 0 }));
    },

    // 评分前的强制选择器命中查询（Bitwarden linked field 语义）：
    // 返回命中的 tier（RULE_FORCE_TIER='auto'）或 null；自身 UI 永不命中。
    forcedTier(el) {
      if (this._own(el)) return null;
      const overrides = this.pageOverrides();
      for (const o of overrides) {
        if (this._safeMatches(el, o.selector)) return o.action.tier;
      }
      return null;
    },

    // 分档覆盖查询：当前页规则声明的 tier（无规则/不适用 → null = 引擎评分定档）
    // 语义（KeePassXC Site Preferences 心智，全页级）：只覆盖 auto/lowkey 两档判定；
    // 'none' 走豁免（全页跳过），不在元素级覆盖里重复表达。
    pageTierOverride() {
      for (const o of this.pageOverrides()) {
        if (o.action.tier === 'auto' || o.action.tier === 'lowkey') return o.action.tier;
      }
      return null;
    },

    // ════ 写（增/改/删）════

    // 豁免开关（幂等；UI「全站禁用」入口 US10）
    setExempt(urlOrHost, on = true) { return Store.setExempt(urlOrHost, on); },

    // 覆盖规则 upsert（幂等；传入 id 即改，不传即增）
    upsertOverride(rule) { return Store.upsertOverride(rule); },

    // 删除覆盖规则
    removeOverride(id) { return Store.removeOverride(id); },

    // 面板负反馈（spec US9）便捷入口：目标字段 + 当前页 → 记 'none' 覆盖规则
    // 自身 UI（面板/按钮/搜索框）不可登记 —— 规则引擎永不作用于脚本自身 UI。
    rememberNone(el) {
      try {
        if (this._own(el)) return null;
        let host = '';
        if (typeof location !== 'undefined' && location && location.href) {
          host = Store._hostOf(location.href);
        }
        if (!host || !el || typeof el.tagName !== 'string') return null;
        let sel = '';
        const tag = el.tagName.toLowerCase();
        if (el.id) {
          sel = '#' + el.id;
        } else {
          let name = null;
          try { name = el.getAttribute('name'); } catch {}
          sel = name ? tag + '[name="' + name + '"]' : tag;
        }
        return Store.upsertOverride({
          host, selector: sel, action: { tier: 'none' }, note: 'panel-negative-feedback',
        });
      } catch { return null; }
    },

    // 订阅规则变更（远端 GM / 广播 / 本端写都会触发）
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      this._subs.add(fn);
      return () => this._subs.delete(fn);
    },
    _notifySubs() { this._subs.forEach(fn => { try { fn(); } catch {} }); },
  };
  return Rules;
}
