import { createStore } from './store';
import { createDetect } from './detect';
import { createFill } from './fill';
import { createUI } from './ui';
import { createRules } from './rules';
import { t } from './i18n';
import { ISO2_MAP } from './data/countries';
import { IS_TOP_FRAME, FRAME_TAG, FRAME_OPEN_MSG, FRAME_FILL_MSG, FRAME_FEEDBACK_MSG } from './config';
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
// 票 12 帧治理：每帧各自检测与填充（行为同源）；面板宿主仅顶层渲染。
// 子帧图标点击 → postMessage 请求顶层代开面板；选中国家 → postMessage 回子帧执行 Fill.run。
// 跨帧存储一致性（收藏/站点规则）复用既有 GM 存储 + BroadcastChannel + GM_addValueChangeListener（不新造第二套）。
if (IS_TOP_FRAME) {
  // 顶层：监听子帧开面板请求，代开远程面板（合成居中锚点，无本地目标字段）
  window.addEventListener('message', e => {
    const m = e && e.data;
    if (!m || m.__cch !== FRAME_TAG || m.type !== FRAME_OPEN_MSG) return;
    if (e.source === window) return; // 忽略自身
    UI.open(null, null, null, { remoteSource: e.source });
  });
} else {
  // 子帧：监听顶层回传的填充/负反馈指令，对 _requestRemoteOpen 登记的 pending 字段执行
  window.addEventListener('message', e => {
    if (e.source !== window.top) return; // 只接受顶层指令
    const m = e && e.data;
    if (!m || m.__cch !== FRAME_TAG) return;
    if (m.type === FRAME_FILL_MSG) {
      const c = ISO2_MAP[(m.iso || '').toLowerCase()];
      if (c && UI._target) Fill.run(UI._target, UI._kind, c);
    } else if (m.type === FRAME_FEEDBACK_MSG) {
      if (UI._target) { try { UI._feedback(); } catch {} }
    }
  });
}
// 票 12：菜单命令为面板/图标不可达时的解禁入口——仅顶层注册（避免多帧菜单项重复刷屏）
if (IS_TOP_FRAME && typeof GM_registerMenuCommand === 'function') {
  try { GM_registerMenuCommand(t('ruleExemptRemoved'), () => { Rules.setExempt(location.href, false); }); } catch {}
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
