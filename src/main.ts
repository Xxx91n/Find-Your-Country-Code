import { createStore } from './store';
import { createDetect } from './detect';
import { createFill } from './fill';
import { createUI } from './ui';
import { createRules } from './rules';
(function () {
'use strict';
const Store = createStore();
const Rules = createRules();
void Rules;
const deps = { Fill: null };
const UI = createUI(Store, deps);
const Fill = createFill(UI);
deps.Fill = Fill;
const Detect = createDetect(UI);
// 票 04：观测总装收口到 Detect.watch()——顶层 body observer + 每 shadow root observer
// （scan 穿透时自动挂）+ SPA 路由 hook（pushState/replaceState/popstate），统一 350ms 防抖
function init() { Store.init(); UI.css(); Store.subscribe(() => { if (!UI._popup) return; const q = UI._popup.querySelector('#cch-si')?.value || ''; UI._render(q); }); Detect.scan(document.body); Detect.watch(); }
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
