import { createStore } from './store';
import { createDetect } from './detect';
import { createFill } from './fill';
import { createUI } from './ui';
import { createRules } from './rules';
import { t } from './i18n';
// GM_registerMenuCommand 为 userscript 宿主注入的全局（模块内 declare 供 tsc 局部清零）
declare function GM_registerMenuCommand(title: string, fn: () => void): void;
(function () {
'use strict';
const Store = createStore();
Store.init();
const Rules = createRules(Store);
const deps = { Fill: null, Rules: null };
const UI = createUI(Store, deps);
const Fill = createFill(UI);
deps.Fill = Fill;
const Detect = createDetect(UI, Rules);
deps.Rules = Rules;
// 票 04：观测总装收口到 Detect.watch()——顶层 body observer + 每 shadow root observer
// （scan 穿透时自动挂）+ SPA 路由 hook（pushState/replaceState/popstate），统一 350ms 防抖
// 票 07：订阅收口 —— 规则文档变更（负反馈/规则管理/跨标签页同步）→ 防抖重扫 + 豁免即时拆图标；
// 收藏变更不触发重扫（规则快照比对拦截），仅重渲染打开中的面板
let lastRules = '';
try { lastRules = JSON.stringify(Store.getSiteRules()); } catch {}
function init() { Store.init(); UI.css(); Store.subscribe(() => {
  try {
    const snap = JSON.stringify(Store.getSiteRules());
    if (snap !== lastRules) {
      lastRules = snap;
      if (Rules.isPageExcluded() && typeof UI.detachAll === 'function') UI.detachAll();
      if (typeof Detect.scheduleScan === 'function') Detect.scheduleScan();
    }
  } catch {}
  if (!UI._popup) return; const q = UI._popup.querySelector('#cch-si')?.value || ''; UI._render(q); }); Detect.scan(document.body); Detect.watch(); }
// 票 07：豁免恢复 hatch —— 全站禁用后图标与面板均不可达，脚本管理器菜单提供解禁入口
// （对标 1Password 扩展菜单的全站忽略恢复路径；GM_registerMenuCommand 缺省时静默降级）
if (typeof GM_registerMenuCommand === 'function') {
  try { GM_registerMenuCommand(t('ruleExemptRemoved'), () => { Rules.setExempt(location.href, false); }); } catch {}
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
