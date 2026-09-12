// ════════════════════════════════════════════════════════
// Site Rules 引擎（票 05）— 站点级规则：豁免域名 / 强制选择器 / 置信度分档覆盖
// 心智对标（[AM] atomcode-industry-models.md 核心结论5，三源独立同构）：
//   - 豁免域名   ≈ 1Password data-1p-ignore（用户显式干预 > 引擎启发；可挂全站忽略）
//   - 强制选择器 ≈ Bitwarden linked custom field（CSS 选择器强制锚定，评分前命中 → 高置信注入）
//   - 分档覆盖   ≈ KeePassXC Site Preferences（票 30 [A-004]：页面级显式规则类型 scope:'page'
//     调整整页注入档；普通 selector 规则只作用于命中元素，不再放大全页）
// 匹配时机（handoff delta）：规则匹配发生在检测入口之前 —— Detect.scan 最先查豁免
//   （豁免 = 完全跳过，不评分不注入不登记）；强制选择器在评分前命中。对脚本自身 UI
//   （#cch-root / .cch-wrapper / #cch-search）永不生效 —— Rules._own 前置拦截。
// 数据格式 v1 与 CRUD 函数边界：见 ../store/index.ts 头注（权威契约，报告同步）。
// ════════════════════════════════════════════════════════
import { SCORE_AUTO, SCORE_LOWKEY, OWN_ROOT_ID, RULE_FORCE_TIER, RULE_TIERS } from '../config';
import type { AnyEl, CchRules, CchStore, OverrideRule, OverrideRuleInput, RulesDoc, Tier } from '../types';

export function createRules(Store: CchStore): CchRules {
  const Rules = {
    // ── 内部：自身 UI 判定（与 Detect._own 同语义；规则引擎独立持有，避免 UI 依赖）──
    _own(el: AnyEl | null) {
      // 票 04 语义（07-fix 同步到 rules 层，04 报告 §1.3 附带修复 1 的遗漏面）：移除
      // closest('.cch-wrapper') 检查 —— wrapper 是脚本自建的包裹层，字段本身不是 UI；
      // 按包裹判定会把全部已挂图标字段挡在负反馈之外（brain-probe-07-fb 取证 confirmed：
      // 真实页面负反馈主路径 100% 失效）。own 判定收敛为自身 UI 容器/按钮，与 Detect._own 同语义：
      // #cch-root 内元素 / cch-btn 按钮 / cch-si 搜索框 / cch-search。
      if (!el || typeof el.closest !== 'function') return true;
      return !!el.closest('#' + OWN_ROOT_ID) ||
             el.id === 'cch-search' || el.id === 'cch-si' ||
             !!(el.classList && el.classList.contains && el.classList.contains('cch-btn'));
    },

    // ── 内部：CSS 选择器安全匹配（非法选择器静默不命中，不抛错污染检测主路径）──
    _safeMatches(el: AnyEl, selector: string) {
      try { return !!el.matches(selector); } catch { return false; }
    },

    // ════ 读（查）════

    // 全量规则（07 面板列表用）
    listRules(): RulesDoc { return Store.getSiteRules(); },

    // 豁免判定：URL/hostname → 域名豁免命中？
    isExempt(urlOrHost: string): boolean { return Store.isExempt(urlOrHost); },

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
    pageOverrides(): OverrideRule[] {
      try {
        if (typeof location !== 'undefined' && location && location.href) {
          return this.overridesFor(location.href);
        }
      } catch {}
      return [];
    },

    // URL/hostname → 命中的覆盖规则副本列表
    overridesFor(urlOrHost: string): OverrideRule[] {
      let host = '';
      try { host = Store._hostOf(urlOrHost); } catch { host = ''; }
      if (!host) return [];
      return Store.getSiteRules().overrides
        .filter(o => o.host === host)
        .map(o => ({ id: o.id, host: o.host, selector: o.selector, scope: o.scope === 'page' ? 'page' : 'element', action: { tier: o.action.tier }, note: o.note || '', updatedAt: o.updatedAt || 0 }));
    },

    // 评分前的强制选择器命中查询（Bitwarden linked field 语义）：
    // 返回命中的 tier（RULE_FORCE_TIER='auto'）或 null；自身 UI 永不命中。
    // 票 30 [A-004]：只消费元素级规则；显式页面规则（scope:'page'）不经元素匹配。
    forcedTier(el: AnyEl): Tier | null {
      if (this._own(el)) return null;
      const overrides = this.pageOverrides();
      for (const o of overrides) {
        if (o.scope === 'page') continue;
        if (this._safeMatches(el, o.selector)) return o.action.tier;
      }
      return null;
    },

    // 分档覆盖查询（票 30 [A-004] 语义收敛）：仅显式页面级规则（scope:'page'，页面级唯一合法
    // 形态）参与；普通 selector 规则只作用于命中元素（forcedTier），不再放大全页。
    // 页面档语义保留（KeePassXC Site Preferences 心智）：只覆盖 auto/lowkey 两档判定；
    // 'none' 走豁免（全页跳过），不在覆盖里重复表达。
    pageTierOverride(): Tier | null {
      for (const o of this.pageOverrides()) {
        if (o.scope !== 'page') continue;
        if (o.action.tier === 'auto' || o.action.tier === 'lowkey') return o.action.tier;
      }
      return null;
    },

    // ════ 写（增/改/删）════

    // 豁免开关（幂等；UI「全站禁用」入口 US10）
    setExempt(urlOrHost: string, on = true): boolean { return Store.setExempt(urlOrHost, on); },

    // 覆盖规则 upsert（幂等；传入 id 即改，不传即增）
    upsertOverride(rule: OverrideRuleInput): string | null { return Store.upsertOverride(rule); },

    // 删除覆盖规则
    removeOverride(id: string): boolean { return Store.removeOverride(id); },

    // 面板负反馈（spec US9）便捷入口：目标字段 + 当前页 → 记 'none' 覆盖规则
    // 自身 UI（面板/按钮/搜索框）不可登记 —— 规则引擎永不作用于脚本自身 UI。
    rememberNone(el: AnyEl): string | null {
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

  };
  return Rules;
}
