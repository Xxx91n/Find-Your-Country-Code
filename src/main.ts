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
function observe() { let tid = null; new MutationObserver(() => { clearTimeout(tid); tid = setTimeout(() => Detect.scan(document.body), 350); }).observe(document.body, { childList: true, subtree: true }); }
function init() { Store.init(); UI.css(); Store.subscribe(() => { if (!UI._popup) return; const q = UI._popup.querySelector('#cch-si')?.value || ''; UI._render(q); }); Detect.scan(document.body); let n = 0; const poll = setInterval(() => { Detect.scan(document.body); if (++n >= 8) clearInterval(poll); }, 500); observe(); }
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
