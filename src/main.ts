import { createStore } from './store';
import { createDetect } from './detect';
import { createFill } from './fill';
import { createUI } from './ui';
import { createRules } from './rules';
import { t } from './i18n';
// 票 03 [A-028]：诊断面（结构化事件流唯一事实来源；面板与机器可读输出两个 serializer）
import { createDiag } from './diag';
import { ISO2_MAP } from './data/countries';
import { IS_TOP_FRAME, SELF_ORIGIN, FRAME_TAG, FRAME_OPEN_MSG, FRAME_FILL_MSG, FRAME_FEEDBACK_MSG, DIAG_TRACE_PREF } from './config';
import type { CchDiag, CchFill, CchRules } from './types';
// GM_registerMenuCommand 为 userscript 宿主注入的全局（模块内 declare 供 tsc 局部清零）
// 票 02 [A-027]：第三参 options 承载 id —— id 原地更新语义（TM ≥5.0 / VM ≥2.15.9）
declare function GM_registerMenuCommand(title: string, fn: () => void, options?: { id?: string }): void;
(function () {
'use strict';
const Store = createStore();
Store.init();
const Rules = createRules(Store);
// 票 03 [A-028]：诊断面实例在装配点唯一创建（单一事实来源的物理保证）——
// 同一个实例注入 UI（读面：面板）与 Detect/Fill（写面：采集），两个 serializer 读同一份 records。
const deps: { Fill: CchFill | null; Rules: CchRules | null; Diag: CchDiag | null } = { Fill: null, Rules: null, Diag: null };
const UI = createUI(Store, deps);
const Diag = createDiag({
  // 门控读持久化偏好（默认 false = 零开销）；error/warn 与计数器恒开，不受此开关影响
  trace: (() => { try { return !!UI.prefs()[DIAG_TRACE_PREF]; } catch { return false; } })(),
  // env 惰性读取：仅在 snapshot() 时求值，不挂热路径
  env: () => ({ url: location.href, frame: IS_TOP_FRAME ? 'top' : 'child' }),
});
deps.Diag = Diag;
const Fill = createFill(UI, Diag);
deps.Fill = Fill;
const Detect = createDetect(UI, Rules, Diag);
deps.Rules = Rules;
// 票 03：机器可读输出（与面板同源；自动化/CI 的唯一读取口）
try { window.__cchDiag = () => Diag.snapshot(); } catch {}
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
  if (!UI._popup) return; const q = UI._popup.querySelector<HTMLInputElement>('#cch-si')?.value || ''; UI._render(q); }); Detect.scan(document.body); Detect.watch(); }
// 票 12 帧治理：每帧各自检测与填充（行为同源）；面板宿主仅顶层渲染。
// 子帧图标点击 → postMessage 请求顶层代开面板；选中国家 → postMessage 回子帧执行 Fill.run。
// 跨帧存储一致性（收藏/站点规则）复用既有 GM 存储 + BroadcastChannel + GM_addValueChangeListener（不新造第二套）。
// 票 24 安全加固：入站 origin 校验辅助——跨域子帧回退锚点。跨域下无法读子帧 origin 预期值，
// 但引用比较合法：要求发送方是本页面嵌的 iframe/frame 窗口，挡掉弹窗/无关 window 伪造消息。
// 票 40：帧枚举改双相递归——(1) 浏览上下文树 window.length/索引访问在跨域 Window 白名单内，
// 覆盖任意深度任意 origin 的孙帧；(2) Chromium 实测 shadowRoot 内 iframe 不进 window.length，
// 须 DOM 遍历穿透 open shadowRoot 收集 iframe/frame 比 contentWindow，同源帧文档继续递归。
// 盲区（closed shadowRoot、跨域祖先下游的 shadow 帧）枚举不到即校验失败走降级提示，不放宽。
function isEmbeddedFrame(source: MessageEventSource | null): boolean {
  if (!source) return false;
  const seenW = new Set<Window>();
  const seenRoot = new Set<Node>();
  const stackW: Window[] = [window];
  const stackRoot: Node[] = [document];
  let budget = 512; // 自嵌套页面防御：枚举上限，超限按校验失败处理（降级提示，不放宽）
  while (budget-- > 0 && (stackW.length || stackRoot.length)) {
    const w = stackW.pop();
    if (w && !seenW.has(w)) {
      seenW.add(w);
      let n = 0;
      try { n = w.length; } catch { n = 0; }
      for (let i = 0; i < n; i++) {
        let f: Window | null = null;
        try { f = (w as unknown as Window[])[i] || null; } catch { f = null; }
        if (!f) continue;
        if (f === (source as Window)) return true;
        stackW.push(f);
        try { if (f.document) stackRoot.push(f.document); } catch {} // 跨域帧 document 不可读，跳过
      }
    }
    const r = stackRoot.pop();
    if (r && !seenRoot.has(r)) {
      seenRoot.add(r);
      try {
        const tw = document.createTreeWalker(r, NodeFilter.SHOW_ELEMENT);
        let el = tw.nextNode() as Element | null;
        while (el && budget-- > 0) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) stackRoot.push(sr); // open shadowRoot 穿透；closed 不可达即盲区
          if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
            const cw = (el as HTMLIFrameElement).contentWindow;
            if (cw && cw === (source as Window)) return true;
            try { if (cw && cw.document) stackRoot.push(cw.document); } catch {}
          }
          el = tw.nextNode() as Element | null;
        }
      } catch {}
    }
  }
  return false;
}
// 顶层与本帧是否同源（跨域时读 top.location.href 抛 SecurityError）
function isTopFrameSameOrigin(): boolean {
  try { return !!window.top && window.top !== window.self && typeof window.top.location.href === 'string'; }
  catch { return false; }
}
if (IS_TOP_FRAME) {
  // 顶层：监听子帧开面板请求，代开远程面板（合成居中锚点，无本地目标字段）
  window.addEventListener('message', e => {
    const m = e && e.data;
    if (!m || m.__cch !== FRAME_TAG || m.type !== FRAME_OPEN_MSG) return;
    if (e.source === window) return; // 忽略自身
    // 票 24：入站 origin 校验——同源子帧强制 e.origin === 本帧文档 origin；跨域子帧（票 12 全帧治理，
    // targetOrigin '*' 不可避免）退化为「本页面嵌入 iframe」来源锚点。
    // 票 40：校验失败降级为「用户可见提示」而非静默 return——校验条件不放宽（票 24 语义不变）。
    // 票 10 [A-034]：操作数由 location.origin 改为 SELF_ORIGIN（window.origin）—— srcdoc 帧的
    // location.origin 为字符串 "null" 会造成误判；普通文档下两者恒等 ⇒ 校验未放宽（注见 config.ts）。
    // 文案就地双语：i18n 表为并行票 42 改动面，避免同文件同 hunk 依赖（收口时可收编进 MSG）。
    if (e.origin !== SELF_ORIGIN && !isEmbeddedFrame(e.source)) {
      UI.toast((navigator.language || 'zh').toLowerCase().startsWith('zh')
        ? '嵌套帧来源无法验证，已拦截打开'
        : 'Embedded frame could not be verified — panel not opened');
      return;
    }
    UI.open(null, null, null, { remoteSource: e.source as Window | null });
  });
} else {
  // 子帧：监听顶层回传的填充/负反馈指令，对 _requestRemoteOpen 登记的 pending 字段执行
  window.addEventListener('message', e => {
    if (e.source !== window.top) return; // 只接受顶层指令
    // 票 24：顶层同源时强制 e.origin === 本帧文档 origin；顶层跨域（票 12 fixture 场景）与本帧 origin
    // 天然不同，无法同源比对，保留 e.source === window.top 唯一锚点（'*' 回发不可避免，见 ui/index.ts 注释）。
    // 票 10 [A-034]：操作数由 location.origin 改为 SELF_ORIGIN —— srcdoc 帧（about:srcdoc）内
    // location.origin 恒为字符串 "null"，而顶层回发消息的 e.origin 为真实继承 origin ⇒ 判真且不等
    // ⇒ 顶层 FRAME_FILL_MSG 被静默丢弃（本票根因）。改用 window.origin 后两者相等，校验语义不变。
    if (isTopFrameSameOrigin() && e.origin !== SELF_ORIGIN) return;
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
// 票 37 [A-012]：第二条菜单命令「打开面板」——与字段分数无关的全局入口
// （anchor=null 复用既有居中路径 ui/index.ts _pos 的 !anchor 分支；仅顶层注册，
// 与 Tampermonkey 跨帧同名合并行为兼容——面板宿主本就只在顶层渲染）
// 票 02 [A-026]：第三条菜单命令「设置」——零置信度入口，打开面板并显式切到设置所在视图。
// 票 02 [A-027]：改用 GM_registerMenuCommand(name, fn, { id }) 的 id 原地更新语义，使语言切换后
// 标签无需重载即跟随（Tampermonkey ≥5.0 / Violentmonkey ≥2.15.9 支持 options.id；Greasemonkey
// 无 options 对象，降级为标签不更新——功能可达性不受影响）。稳定字符串 id 优于数字返回值：
// 跨 frame / 跨会话一致。refreshMenu 由 UI._menuRefresh 在语言切换时重入（同批 id → 原地更新，不新增条目）。
let refreshMenu: () => void = () => {};
if (IS_TOP_FRAME && typeof GM_registerMenuCommand === 'function') {
  refreshMenu = (): void => {
    try { GM_registerMenuCommand(t('ruleExemptRemoved'), () => { Rules.setExempt(location.href, false); }, { id: 'cch-menu-restore' }); } catch {}
    try { GM_registerMenuCommand(t('openPanel'), () => { UI.open(null, null, null); }, { id: 'cch-menu-panel' }); } catch {}
    try { GM_registerMenuCommand(t('settings'), () => { UI.openSettings(); }, { id: 'cch-menu-settings' }); } catch {}
    // 票 03 [A-028]：诊断面入口收敛为单一 GM 菜单项（不逐功能设项）——直接落到独立诊断视图。
    try { GM_registerMenuCommand(t('diagnostics'), () => { UI.open(null, null, null, { view: 'diag' }); }, { id: 'cch-menu-diag' }); } catch {}
  };
  refreshMenu();
}
UI._menuRefresh = refreshMenu;
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
