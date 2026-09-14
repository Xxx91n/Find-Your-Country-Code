import { t, getLocale, setLocale, LOCALE_MODES } from '../i18n';
import { OWN_ROOT_ID, WRAPPER_CLASS, UI_PREFS_KEY, LOWKEY_MODES, IS_TOP_FRAME, FRAME_TAG, FRAME_OPEN_MSG, FRAME_FILL_MSG, FRAME_FEEDBACK_MSG } from '../config';
import { COUNTRIES, ISO2_MAP } from '../data/countries';
import type { AnyEl, AnyRoot, CchFill, CchRules, CchStore, CchUI, Country, FillKind, OverrideRule, PrefsDoc, Signal, Tier } from '../types';
// GM_* 为 userscript 宿主注入的全局（模块内 declare 供 tsc 局部清零；与 store 的声明互不冲突）
declare function GM_getValue(key: string, defaultValue?: string): string;
declare function GM_setValue(key: string, value: string): void;

// 票 07：元素命中的覆盖规则副本列表（负反馈幂等/冲突清理共用；非法选择器静默不命中）
export function matchingOverrides(el: AnyEl | null, overrides: unknown): OverrideRule[] {
  const out: OverrideRule[] = [];
  if (!el || typeof el.matches !== 'function' || !Array.isArray(overrides)) return out;
  for (const o of overrides) {
    if (!o || typeof o.selector !== 'string' || !o.selector) continue;
    if (o.scope === 'page') continue; // 票 30 [A-004]：负反馈冲突清理/幂等判定只针对元素级规则
    try { if (el.matches(o.selector)) out.push(o); } catch {}
  }
  return out;
}

export function createUI(Store: CchStore, deps: { Fill: CchFill | null; Rules: CchRules | null }): CchUI {
const UI = {
  _root: null as HTMLElement | null, _popup: null as HTMLElement | null,
  _target: null as AnyEl | null, _kind: null as FillKind | null,
  _toastTimer: undefined as number | undefined, _closeHandler: null as ((e: MouseEvent) => void) | null, _anchor: null as AnyEl | null,
  _remoteSource: null as Window | null,
  _viewportHandler: null as (() => void) | null, _rafPending: false,
  _lowFields: new Map<AnyEl, { kind: FillKind; score: number; signals: Signal[] }>(),
  _prefs: null as PrefsDoc | null, _view: 'list' as 'list' | 'rules',

  css(): void {
    if (document.getElementById('cch-style')) return;
    const s = document.createElement('style');
    s.id = 'cch-style';
    s.textContent = `
.${WRAPPER_CLASS}{position:relative;display:inline-block;width:100%}
.cch-btn{position:absolute;top:-12px;right:-12px;transform:none;
width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.96);
border:1px solid rgba(15,23,42,.16);cursor:pointer;display:flex;
align-items:center;justify-content:center;font-size:13px;z-index:10000;
box-shadow:0 8px 18px rgba(2,8,23,.18);transition:transform .12s ease,box-shadow .12s ease;
user-select:none;line-height:1;padding:0}
.cch-btn:hover{transform:scale(1.06);box-shadow:0 10px 20px rgba(2,8,23,.22)}
#${OWN_ROOT_ID}{z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#cch-pop{--cch-surface:rgba(255,255,255,.78);--cch-surface-strong:rgba(255,255,255,.92);
--cch-border:rgba(15,23,42,.12);--cch-text:#0f172a;--cch-subtext:#475569;--cch-accent:#0f766e;
background:var(--cch-surface);border:1px solid var(--cch-border);border-radius:16px;
box-shadow:0 18px 48px rgba(2,8,23,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
width:320px;max-height:min(78vh,460px);display:flex;flex-direction:column;overflow:hidden;
animation:cchIn .12s ease;z-index:2147483647}
@keyframes cchIn{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
#cch-sw{padding:12px 12px 10px;border-bottom:1px solid rgba(15,23,42,.08);background:var(--cch-surface-strong)}
#cch-si{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(15,23,42,.12);
background:rgba(255,255,255,.88);color:var(--cch-text);border-radius:10px;font-size:13px;outline:none}
#cch-si:focus{border-color:rgba(15,118,110,.45);box-shadow:0 0 0 3px rgba(15,118,110,.12)}
.cch-body{display:flex;flex-direction:column;gap:8px;padding:8px 8px 10px;overflow:hidden;flex:1;min-height:0}
.cch-sec{border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.66);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.cch-sec-favs{flex:0 0 auto}
.cch-sec-all{flex:1 1 auto;min-height:120px}
.cch-sec-hd{padding:7px 10px;font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--cch-subtext);
text-transform:uppercase;background:rgba(255,255,255,.52);border-bottom:1px solid rgba(15,23,42,.06)}
.cch-list{display:flex;flex-direction:column}
.cch-sec-favs .cch-list{max-height:132px;overflow-y:auto}
.cch-sec-all .cch-list{flex:1 1 auto;min-height:0;overflow-y:auto}
.cch-row{display:flex;align-items:center;padding:8px 10px;cursor:pointer;
gap:8px;border-bottom:1px solid rgba(15,23,42,.06);transition:background .12s ease,transform .08s ease}
.cch-row:last-child{border-bottom:none}
.cch-row:hover{background:rgba(15,118,110,.08)}
.cch-fl{font-size:17px;flex-shrink:0;width:24px;text-align:center}
.cch-cd{font-weight:600;font-size:13px;color:var(--cch-accent);min-width:44px}
.cch-nm{font-size:12px;color:var(--cch-subtext);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cch-fav{background:none;border:none;cursor:pointer;font-size:15px;color:#b8c1cc;
padding:2px 4px;border-radius:4px;flex-shrink:0;transition:color .1s}
.cch-fav.on,.cch-fav:hover{color:#f59e0b}
.cch-empty{padding:14px 10px;text-align:center;color:#8a95a3;font-size:12px}
#cch-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
background:#01696f;color:#fff;padding:8px 20px;border-radius:20px;
font-size:13px;z-index:2147483647;pointer-events:none;opacity:0;
transition:opacity .2s;white-space:nowrap}
#cch-toast.on{opacity:1}
/* 中置信低调注入样式 [SP US17]：半透明缩小，悬停恢复 */
.cch-btn-lowkey{opacity:.38;transform:scale(.78);filter:saturate(.4)}
.cch-btn-lowkey:hover{opacity:1;transform:scale(1.06);filter:none}
#cch-summon{margin:6px 12px 0;padding:6px 10px;font-size:12px;color:#475569;
background:rgba(15,118,110,.06);border:1px dashed rgba(15,118,110,.35);
border-radius:8px;cursor:pointer;text-align:center}
#cch-summon:hover{background:rgba(15,118,110,.12);color:#0f766e}
#cch-sw{display:flex;gap:6px;align-items:center}
#cch-rules-tg{flex-shrink:0;width:30px;height:32px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:10px;cursor:pointer;font-size:14px;line-height:1;padding:0}
#cch-rules-tg:hover{color:#0f766e;border-color:rgba(15,118,110,.45)}
#cch-si{flex:1;min-width:0;width:auto}
#cch-fb{margin:6px 12px 0;padding:6px 10px;font-size:12px;color:#9f1239;background:rgba(190,18,60,.05);border:1px dashed rgba(190,18,60,.3);border-radius:8px;cursor:pointer;text-align:center}
#cch-fb:hover{background:rgba(190,18,60,.1);color:#be123c}
.cch-sec-rules{flex:1 1 auto;min-height:120px}
.cch-rules-bd{flex:1 1 auto;min-height:0;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto}
.cch-rule-row{display:flex;align-items:center;gap:6px;padding:6px 8px;font-size:12px;border:1px solid rgba(15,23,42,.08);border-radius:8px;background:rgba(255,255,255,.6)}
.cch-rule-sel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Monaco,monospace;font-size:11px;color:var(--cch-text)}
.cch-rule-tier{flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;text-transform:uppercase;letter-spacing:.02em}
.cch-rule-tier.none{background:rgba(190,18,60,.1);color:#9f1239}
.cch-rule-tier.auto{background:rgba(15,118,110,.1);color:#0f766e}
.cch-rule-tier.lowkey{background:rgba(245,158,11,.14);color:#92400e}
.cch-rule-del{flex-shrink:0;background:none;border:none;cursor:pointer;font-size:13px;color:#b8c1cc;padding:0 2px;border-radius:4px}
.cch-rule-del:hover{color:#be123c}
.cch-rule-note{flex-shrink:0;font-size:10px;color:#8a95a3;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cch-rule-host{flex:1;min-width:0;font-size:11px;color:var(--cch-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cch-rules-cap{padding:2px 2px 0;font-size:10px;font-weight:700;color:#8a95a3;text-transform:uppercase;letter-spacing:.02em}`;
    document.head.appendChild(s);
  },

  toast(msg: string): void {
    let el = document.getElementById('cch-toast');
    if (!el) { el = document.createElement('div'); el.id = 'cch-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
  },

  attach(el: AnyEl, kind: FillKind, tier: Tier = 'auto', score: number = 0, signals: Signal[] = [], opts: { force?: boolean } = {}): void {
    if (el.closest('.' + WRAPPER_CLASS)) return;
    // 票 07 [SP US17/18]：中置信样式可配置 —— hidden 偏好下低调档不注入，转为可召唤登记；
    // 用户显式召唤（summon，force=true）不受该偏好拦截
    if (tier === 'lowkey' && !(opts && opts.force) && this.prefs().lowkeyMode === 'hidden') {
      this.rememberLow(el, kind, score, signals);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = WRAPPER_CLASS;
    const cs = getComputedStyle(el);
    // 票 13 [handoff 检查点一]：display:none 的隐藏原生 select（视觉替换型自定义下拉）
    // 经面板召唤时 wrapper 不可继承 none —— 强制 inline-block 让召唤图标可达；
    // 填充仍写原生 select（值 setter + 事件序列与可见字段一致）。
    wrap.style.display =
      (cs.display === 'inline' || cs.display === 'none') ? 'inline-block' : cs.display;

    // 仅宽度可测时设显式宽，否则继承父容器
    if (el.offsetWidth > 0) {
      wrap.style.width = el.offsetWidth + 'px';
    }

    // 不论宽度是否为 0，都立即插入
    el.parentNode!.insertBefore(wrap, el);
    wrap.appendChild(el);

    const btn = document.createElement('button');
    btn.className = 'cch-btn' + (tier === 'lowkey' ? ' cch-btn-lowkey' : '');
    btn.type = 'button';
    btn.title = 'Country Code Helper';
    btn.setAttribute('aria-label', 'Country Code Helper');
    btn.setAttribute('data-cch-tier', tier);
    // 票 13：召唤挂载标记 —— detect 闸门识别该图标为用户显式行为，不回拆（summonedWrap）
    if (opts && opts.force) btn.setAttribute('data-cch-summon', '1');
    if (score) btn.setAttribute('data-cch-score', String(score));
    btn.textContent = '🌐';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this.open(el, kind, btn);
    });
    wrap.appendChild(btn);
    // 票 04：字段在 open shadow root 内时，document 级样式表不生效 → 把样式表克隆进该 root
    try {
      const rn = el.getRootNode ? el.getRootNode() as ShadowRoot | null : null;
      if (rn && rn.nodeType === 11 && rn.host && !rn.querySelector('#cch-style')) {
        const st = document.getElementById('cch-style');
        if (st) rn.appendChild(st.cloneNode(true));
      }
    } catch {}
  },

  // 票 04：与 attach 对称的拆除（重评判 none 档 → 误挂图标移除）。失败安全：无 wrapper 直接返回。
  detach(el: AnyEl): void {
    this._lowFields.delete(el);
    const wrap = el.closest('.' + WRAPPER_CLASS);
    if (!wrap) return;
    if (this._popup && this._anchor && wrap.contains(this._anchor)) this._closePopup();
    const parent = wrap.parentNode;
    if (!parent) return;
    parent.insertBefore(el, wrap);
    wrap.remove();
  },

  // 票 07：豁免即时生效 —— 拆除本页全部图标（含 open shadow root 内），清空召唤登记。
  // 检测入口的豁免短路只阻止新注入（05 报告偏离点 4 移交本票收尾），已挂图标由这里拆除。
  detachAll(): void {
    for (const wrap of this._allWrappers(document)) {
      const field = this._fieldOf(wrap);
      const parent = wrap.parentNode;
      if (field && parent) parent.insertBefore(field, wrap);
      wrap.remove();
    }
    this._lowFields.clear();
    if (this._popup) this._closePopup();
  },

  // wrapper 内的目标字段（首个非 cch-btn 子元素）
  _fieldOf(wrap: AnyEl): AnyEl | null {
    for (const k of wrap.children) {
      if (!(k.classList && k.classList.contains('cch-btn'))) return k as AnyEl;
    }
    return null;
  },

  // open shadow root 递归收集全部 wrapper（与 Detect._deepRoots 同遍历心智，UI 自有轻量版）
  _allWrappers(root: AnyRoot): AnyEl[] {
    const out: AnyEl[] = [];
    const walk = (r: AnyRoot): void => {
      let els: AnyEl[] = [];
      try { els = Array.from(r.querySelectorAll<AnyEl>('.' + WRAPPER_CLASS)); } catch {}
      out.push(...els);
      let all: NodeListOf<AnyEl>;
      try { all = r.querySelectorAll<AnyEl>('*'); } catch { return; }
      for (const e of all) { if (e.shadowRoot) walk(e.shadowRoot); }
    };
    walk(root);
    return out;
  },

  // 票 04：低置信登记里的强引用清理（元素已断连 → 移除，防 Map 泄漏与幽灵召唤项）
  _pruneLow(): void {
    for (const k of [...this._lowFields.keys()]) {
      if (!k.isConnected) this._lowFields.delete(k);
    }
  },

  // ── 票 07：UI 偏好（GM 持久化；独立键与收藏/规则解耦；损坏值防御性回退默认） ──
  prefs(): PrefsDoc {
    if (this._prefs) return this._prefs;
    let p: PrefsDoc | null = null;
    try { p = JSON.parse(GM_getValue(UI_PREFS_KEY, 'null')); } catch {}
    if (!p || typeof p !== 'object' || Array.isArray(p)) p = {};
    if (!p.lowkeyMode || !LOWKEY_MODES.includes(p.lowkeyMode)) p.lowkeyMode = 'dim';
    // 票 42：语言偏好与 lowkeyMode 同文档、同独立键；非法/缺失值回落 auto（跟随浏览器）
    if (!p.locale || !LOCALE_MODES.includes(p.locale as string)) p.locale = 'auto';
    this._prefs = p;
    return p;
  },

  setPref(key: string, val: unknown): void {
    const p = this.prefs();
    p[key] = val;
    try { GM_setValue(UI_PREFS_KEY, JSON.stringify(p)); } catch {}
  },

  // 票 07：负反馈/规则视图所需规则引擎（未接线时返回 null = 功能降级）
  _rules(): CchRules | null {
    const R = deps.Rules;
    return R && typeof R.listRules === 'function' ? R : null;
  },

  // 低置信字段登记（不注入图标；面板「手动召唤」入口 [SP US18]）
  rememberLow(el: AnyEl, kind: FillKind, score: number, signals: Signal[]): void {
    this._lowFields.set(el, { kind, score, signals });
  },

  // 面板召唤：对已登记的低置信字段补挂图标（用户显式请求 → 按高置信样式挂）
  summon(el: AnyEl): boolean {
    const rec = this._lowFields.get(el);
    if (!rec) return false;
    this._lowFields.delete(el);
    if (el.closest('.' + WRAPPER_CLASS)) return true;
    this.attach(el, rec.kind, 'auto', rec.score, rec.signals, { force: true });
    return true;
  },

  open(target: AnyEl | null, kind: FillKind | null, anchor: AnyEl | null, opts: { remoteSource?: Window | null } = {}): void {
    opts = opts || {};
    // 票 12:子帧不渲染面板宿主——图标点击经 postMessage 请求顶层代开
    if (!IS_TOP_FRAME && !opts.remoteSource) {
      return this._requestRemoteOpen(target, kind);
    }
    // 顶层代开(远程):无 toggle,直接关旧面板后构建
    if (opts.remoteSource) {
      if (this._popup) this._closePopup();
    } else if (this._popup && this._anchor === anchor) {
      this._closePopup();
      return;
    }

    this._target = target;
    this._kind   = kind;
    if (!this._root) {
      this._root = document.createElement('div');
      this._root.id = OWN_ROOT_ID;
      document.body.appendChild(this._root);
    }
    if (!opts.remoteSource) this._closePopup();
    this._remoteSource = opts.remoteSource || null; // 关旧面板后设(关时会清)
    this._view = 'list'; // 每次开面板重置为列表视图（召唤/负反馈入口常显）
    this._anchor = anchor;

    const pop = document.createElement('div');
    pop.id = 'cch-pop';
    this._popup = pop;

    const sw = document.createElement('div'); sw.id = 'cch-sw';
    const si = document.createElement('input');
    si.type = 'text'; si.id = 'cch-si';
    si.placeholder = t('search');
    si.setAttribute('autocomplete', 'off');
    sw.appendChild(si); pop.appendChild(sw);

    // 票 07：规则管理视图开关（齿轮）；视图态 _view 会话内保持，豁免后重开面板可直接解禁
    const tg = document.createElement('button');
    tg.type = 'button'; tg.id = 'cch-rules-tg';
    tg.textContent = '⚙';
    tg.title = t('rules');
    tg.setAttribute('aria-label', t('rules'));
    tg.addEventListener('click', e => {
      e.stopPropagation();
      this._view = this._view === 'rules' ? 'list' : 'rules';
      this._render('');
    });
    sw.appendChild(tg);

    // 低置信字段召唤入口 [SP US18]：可见性由 _render 按 _lowFields 维护
    const sm = document.createElement('div');
    sm.id = 'cch-summon';
    sm.setAttribute('role', 'button');
    sm.textContent = t('summon');
    sm.addEventListener('click', e => {
      e.stopPropagation();
      const targets = [...this._lowFields.keys()];
      targets.forEach(el => this.summon(el));
      sm.remove();
    });
    pop.appendChild(sm);

    // 票 07：负反馈入口 [SP US9] —— 一键写入 none 规则并即时拆图标
    const fb = document.createElement('div');
    fb.id = 'cch-fb';
    fb.setAttribute('role', 'button');
    fb.textContent = t('feedback');
    fb.addEventListener('click', e => { e.stopPropagation(); this._feedback(); });
    pop.appendChild(fb);

    const body = document.createElement('div');
    body.className = 'cch-body';

    const favSec = document.createElement('section');
    favSec.className = 'cch-sec cch-sec-favs';
    const favHd = document.createElement('div');
    favHd.className = 'cch-sec-hd';
    favHd.textContent = t('favs');
    const favList = document.createElement('div');
    favList.className = 'cch-list';
    favList.setAttribute('data-sec', 'favs');
    favSec.appendChild(favHd);
    favSec.appendChild(favList);

    const allSec = document.createElement('section');
    allSec.className = 'cch-sec cch-sec-all';
    const allHd = document.createElement('div');
    allHd.className = 'cch-sec-hd';
    allHd.textContent = t('all');
    const allList = document.createElement('div');
    allList.className = 'cch-list';
    allList.setAttribute('data-sec', 'all');
    allSec.appendChild(allHd);
    allSec.appendChild(allList);

    body.appendChild(favSec);
    body.appendChild(allSec);

    // 票 07：站点规则管理视图（渲染走 _renderRules；可见性由 _render 按视图切换）
    const rulesSec = document.createElement('section');
    rulesSec.className = 'cch-sec cch-sec-rules';
    rulesSec.id = 'cch-rules-view';
    rulesSec.hidden = (this._view as 'list' | 'rules') !== 'rules';
    body.appendChild(rulesSec);
    pop.appendChild(body);

    document.body.appendChild(pop);
    this._pos(pop, anchor);
    this._bindViewportTracking();
    this._bindPopupEvents(pop);
    this._render('');

    const close = (e: MouseEvent) => {
      if (!pop.contains(e.target as Node) && e.target !== anchor) {
        this._closePopup();
      }
    };
    this._closeHandler = close;
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    requestAnimationFrame(() => {
      if (this._popup === pop) si.focus();
    });
  },

  _closePopup(): void {
    if (this._popup) {
      this._popup.remove();
      this._popup = null;
    }
    if (this._closeHandler) {
      document.removeEventListener('mousedown', this._closeHandler);
      this._closeHandler = null;
    }
    if (this._viewportHandler) {
      window.removeEventListener('scroll', this._viewportHandler, true);
      window.removeEventListener('resize', this._viewportHandler);
      this._viewportHandler = null;
    }
    this._rafPending = false;
    this._anchor = null;
    this._remoteSource = null;
  },

  // 票 07：负反馈 [SP US9] —— 把当前目标字段记为 none 规则并即时拆图标（不等 350ms 重扫）。
  // 幂等：已有命中该字段的 none 规则 → 不重复写；命中字段既有 auto/lowkey 强制规则 →
  // 先删后写（后到用户意图优先，避免文档序让旧规则压住负反馈）。
  _feedback(): void {
    const el = this._target;
    // 票 12:远程面板负反馈 → postMessage 回子帧本地执行(规则按子帧 host 写入)
    // 票 24:targetOrigin '*' 不可避免——remoteSource 可能为跨域子帧，顶层无法预知其 origin；
    // 子帧接收端(main.ts 票 24)以 e.source===window.top + 同源强校验把关。
    if (this._remoteSource) {
      try { this._remoteSource.postMessage({ __cch: FRAME_TAG, type: FRAME_FEEDBACK_MSG }, '*'); } catch {}
      if (this._popup) this._closePopup();
      return;
    }
    if (!el) return;
    const R = this._rules();
    let remembered = false;
    if (R) {
      try {
        const hit = matchingOverrides(el, R.pageOverrides());
        const noneHit = hit.find(o => o.action && o.action.tier === 'none');
        if (noneHit) {
          remembered = true;
        } else {
          for (const o of hit) R.removeOverride(o.id);
          remembered = !!R.rememberNone(el);
        }
      } catch {}
    }
    this._lowFields.delete(el);
    this.detach(el);
    this.toast(t(remembered ? 'ruleNoneRemembered' : 'needTarget'));
    if (this._popup) this._closePopup();
  },


  // 票 12:子帧图标点击 → 保存目标字段 + 请求顶层代开面板(postMessage 跨域可达)
  // 票 24:targetOrigin '*' 不可避免——顶层可能跨域，子帧无法枚举其 origin；顶层接收端
  // (main.ts 票 24)已做 origin 校验 + 本页面嵌入 iframe 来源锚点。
  _requestRemoteOpen(target: AnyEl | null, kind: FillKind | null): void {
    this._target = target;
    this._kind = kind;
    try { window.top?.postMessage({ __cch: FRAME_TAG, type: FRAME_OPEN_MSG }, '*'); } catch {}
  },
  // 票 07：规则管理渲染 —— 豁免开关（当前站点）+ 豁免域名删除 + 覆盖规则查看/删除 +
  // 低调样式切换。只消费 Rules/Store 公共 API（listRules/pageOverrides/setExempt/removeOverride），不直改存储。
  _renderRules(): void {
    const sec = this._popup && this._popup.querySelector('#cch-rules-view');
    if (!sec) return;
    sec.innerHTML = '';
    const R = this._rules();
    const bd = document.createElement('div');
    bd.className = 'cch-rules-bd';
    sec.appendChild(bd);
    if (!R) {
      const e = document.createElement('div'); e.className = 'cch-empty'; e.textContent = t('rulesEmpty');
      bd.appendChild(e);
      return;
    }
    let host = '';
    try { host = location.hostname || ''; } catch {}
    const cap1 = document.createElement('div'); cap1.className = 'cch-rules-cap'; cap1.textContent = t('ruleExempt');
    bd.appendChild(cap1);
    const exRow = document.createElement('div'); exRow.className = 'cch-rule-row';
    const exHost = document.createElement('span'); exHost.className = 'cch-rule-host'; exHost.textContent = host || '-';
    const exemptNow = R.isExempt(location.href);
    const exBtn = document.createElement('button');
    exBtn.type = 'button'; exBtn.id = 'cch-exempt-tg'; exBtn.className = 'cch-rule-tier ' + (exemptNow ? 'none' : 'auto');
    exBtn.textContent = exemptNow ? t('on') : t('off');
    exBtn.addEventListener('click', e => {
      e.stopPropagation();
      const on = R.isExempt(location.href);
      R.setExempt(location.href, !on);
      // 豁免开：main 订阅链路调 UI.detachAll 即时拆图标；豁免关：scheduleScan 重扫重挂
      this.toast(t(!on ? 'ruleExemptAdded' : 'ruleExemptRemoved'));
      this._renderRules();
    });
    exRow.appendChild(exHost); exRow.appendChild(exBtn);
    bd.appendChild(exRow);
    const doc = R.listRules();
    for (const dom of (doc && doc.exempt) || []) {
      const row = document.createElement('div'); row.className = 'cch-rule-row';
      const h = document.createElement('span'); h.className = 'cch-rule-host'; h.textContent = dom;
      const del = document.createElement('button'); del.type = 'button'; del.className = 'cch-rule-del';
      del.textContent = '×'; del.title = t('ruleDeleted');
      del.addEventListener('click', e => {
        e.stopPropagation();
        R.setExempt(dom, false);
        this.toast(t('ruleExemptRemoved'));
        this._renderRules();
      });
      row.appendChild(h); row.appendChild(del);
      bd.appendChild(row);
    }
    const cap2 = document.createElement('div'); cap2.className = 'cch-rules-cap'; cap2.textContent = t('rules');
    bd.appendChild(cap2);
    const cap3 = document.createElement('div'); cap3.className = 'cch-rules-cap'; cap3.textContent = t('lowkeyStyle');
    const lkRow = document.createElement('div'); lkRow.className = 'cch-rule-row';
    const lkBtn = document.createElement('button');
    lkBtn.type = 'button'; lkBtn.className = 'cch-rule-tier auto'; lkBtn.id = 'cch-lowkey-tg';
    lkBtn.textContent = this.prefs().lowkeyMode === 'hidden' ? t('lowkeyHidden') : t('lowkeyDim');
    lkBtn.addEventListener('click', e => {
      e.stopPropagation();
      const next = this.prefs().lowkeyMode === 'hidden' ? 'dim' : 'hidden';
      this.setPref('lowkeyMode', next);
      this._applyLowkeyMode(next);
      this._renderRules();
    });
    lkRow.appendChild(lkBtn);
    bd.appendChild(lkRow);
    // \u7968 42 [A-019]\uFF1A\u754C\u9762\u8BED\u8A00\u9009\u62E9\uFF08auto \u21C4 \u4E2D\u6587 \u21C4 English\uFF09\uFF0C\u5199\u5165 UI_PREFS_KEY \u540E\u5373\u65F6\u751F\u6548
    const cap4 = document.createElement('div'); cap4.className = 'cch-rules-cap'; cap4.textContent = t('lang');
    bd.appendChild(cap4);
    const lgLabel = (v: string): string => (v === 'zh' ? t('langZh') : v === 'en' ? t('langEn') : t('langAuto'));
    const lgRow = document.createElement('div'); lgRow.className = 'cch-rule-row';
    const lgBtn = document.createElement('button');
    lgBtn.type = 'button'; lgBtn.className = 'cch-rule-tier auto'; lgBtn.id = 'cch-locale-tg';
    lgBtn.textContent = lgLabel(this.prefs().locale as string);
    lgBtn.title = t('lang') + ' \u00B7 ' + t(getLocale() === 'zh' ? 'langZh' : 'langEn');
    lgBtn.addEventListener('click', e => {
      e.stopPropagation();
      const modes = LOCALE_MODES;
      const cur = modes.indexOf(this.prefs().locale as string);
      const next = modes[(cur + 1) % modes.length];
      this.setPref('locale', next);
      setLocale(next);           // \u5373\u65F6\u751F\u6548\uFF1A\u540E\u7EED t() \u6309\u65B0\u8BED\u8A00\u51FA\u6587\u6848
      this._applyLocaleText();   // \u5237\u65B0\u6784\u5EFA\u671F\u5199\u6B7B\u7684\u9762\u677F\u6587\u6848\uFF08\u5360\u4F4D/\u5206\u533A/\u53EC\u5524/\u8D1F\u53CD\u9988\uFF09
      this._renderRules();
    });
    lgRow.appendChild(lgBtn);
    bd.appendChild(lgRow);
    const ovs = R.pageOverrides();
    if (!ovs.length) {
      const e = document.createElement('div'); e.className = 'cch-empty'; e.textContent = t('rulesEmpty');
      bd.appendChild(e);
    }
    for (const o of ovs) {
      const row = document.createElement('div'); row.className = 'cch-rule-row';
      const sel = document.createElement('span'); sel.className = 'cch-rule-sel'; sel.textContent = o.selector; sel.title = o.selector;
      const tier = document.createElement('span'); tier.className = 'cch-rule-tier ' + o.action.tier; tier.textContent = o.action.tier;
      row.appendChild(sel); row.appendChild(tier);
      if (o.note) {
        const nt = document.createElement('span'); nt.className = 'cch-rule-note'; nt.textContent = o.note; nt.title = o.note;
        row.appendChild(nt);
      }
      const del = document.createElement('button'); del.type = 'button'; del.className = 'cch-rule-del';
      del.textContent = '×'; del.title = t('ruleDeleted');
      del.addEventListener('click', e => {
        e.stopPropagation();
        R.removeOverride(o.id);
        // 即时生效链路：main 订阅 → scheduleScan 重评（删除 none 规则 → 字段按评分恢复注入）
        this.toast(t('ruleDeleted'));
      });
      row.appendChild(del);
      bd.appendChild(row);
    }
  },

  // 票 07 [SP US17]：低调样式切换 dim ⇄ hidden，对已挂/已登记字段即时迁移（无需刷新）：
  // dim → 召唤登记批量按低调样式补挂；hidden → 拆低调档图标转回召唤登记（auto 档不受影响）
  _applyLowkeyMode(mode: string): void {
    if (mode === 'dim') {
      const entries = [...this._lowFields.entries()];
      this._lowFields.clear();
      for (const [el, rec] of entries) {
        if (el.closest && el.closest('.' + WRAPPER_CLASS)) continue;
        this.attach(el, rec.kind, 'lowkey', rec.score, rec.signals);
      }
      return;
    }
    for (const wrap of this._allWrappers(document)) {
      const btn = wrap.querySelector ? wrap.querySelector('.cch-btn') : null;
      if (!btn || btn.getAttribute('data-cch-tier') !== 'lowkey') continue;
      const field = this._fieldOf(wrap);
      if (!field) continue;
      // 票 18: kind 分发与 detect/_process 对齐（pseudo 触发器低调样式迁移不回落 input）
      const kind = field.tagName === 'SELECT' ? 'select'
        : ((field.getAttribute && field.getAttribute('role')) === 'combobox') ? 'pseudo'
        : 'input';
      const score = Number(btn.getAttribute('data-cch-score')) || 0;
      this._lowFields.set(field, { kind, score, signals: [] });
      const parent = wrap.parentNode;
      if (parent) parent.insertBefore(field, wrap);
      wrap.remove();
    }
  },

  _bindViewportTracking(): void {
    if (this._viewportHandler) return;
    this._viewportHandler = () => {
      if (this._rafPending) return;
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        if (!this._popup || !this._anchor) return;
        this._pos(this._popup, this._anchor);
      });
    };
    window.addEventListener('scroll', this._viewportHandler, true);
    window.addEventListener('resize', this._viewportHandler);
  },

  _bindPopupEvents(pop: HTMLElement): void {
    const si = pop.querySelector<HTMLInputElement>('#cch-si');
    if (si) {
      si.addEventListener('input', () => {
        if (this._popup !== pop) return;
        this._render(si.value);
      });
    }
    pop.addEventListener('click', e => {
      if (this._popup !== pop) return;
      const favBtn = (e.target as HTMLElement).closest<HTMLElement>('.cch-fav');
      if (favBtn) {
        e.stopPropagation();
        const iso = (favBtn.dataset.iso || '').toLowerCase();
        const entry = ISO2_MAP[iso];
        if (!entry) return;
        if (Store.isFav(entry.code, entry.iso)) Store.rmFav(entry.code, entry.iso);
        else Store.addFav(entry);
        return;
      }
      const row = (e.target as HTMLElement).closest<HTMLElement>('.cch-row');
      if (!row) return;
      const iso = (row.dataset.iso || '').toLowerCase();
      const c = ISO2_MAP[iso];
      if (!c) return;
      // 票 12:远程面板 → postMessage 回子帧执行 Fill.run(每帧各自填充,行为同源)
      // 票 24:targetOrigin '*' 不可避免——remoteSource 可能为跨域子帧；子帧接收端把关见 main.ts。
      if (this._remoteSource) {
        try { this._remoteSource.postMessage({ __cch: FRAME_TAG, type: FRAME_FILL_MSG, iso: c.iso }, '*'); } catch {}
        this._closePopup();
        return;
      }
      deps.Fill!.run(this._target!, this._kind, c);
      this._closePopup();
    });
  },

  _pos(pop: HTMLElement, anchor: AnyEl | null): void {
    if (!anchor) {
      // 票 12:远程面板(子帧图标点击经顶层代开)无本地锚点 → 居中定位
      const pw = pop.offsetWidth || 320;
      const ph = pop.offsetHeight || 440;
      const m = 8;
      let l = Math.max(m, (innerWidth - pw) / 2);
      let tp = Math.max(m, (innerHeight - ph) / 2);
      pop.style.cssText += ';left:' + l + 'px;top:' + tp + 'px;position:fixed';
      return;
    }
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 320;
    const ph = pop.offsetHeight || 440;
    const m = 8;
    let l = r.left;
    let tp = r.bottom + 8;
    if (l + pw > innerWidth - m) l = Math.max(m, innerWidth - pw - m);
    if (tp + ph > innerHeight - m) tp = Math.max(m, r.top - ph - 8);
    pop.style.cssText += `;left:${l}px;top:${tp}px;position:fixed`;
  },

  _match(c: Country, query: string): boolean {
    return c.country.includes(query) ||
      c.countryEn.toLowerCase().includes(query) ||
      c.code.includes(query) ||
      c.iso.toLowerCase().includes(query);
  },

  _renderRows(list: HTMLElement, data: Country[]): void {
    list.innerHTML = '';
    if (!data.length) {
      list.innerHTML = `<div class="cch-empty">${t('none')}</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    data.forEach(c => {
      const row = document.createElement('div'); row.className = 'cch-row';
      row.dataset.iso = c.iso;
      const fav = Store.isFav(c.code, c.iso);
      row.innerHTML = `
<span class="cch-fl">${c.flag}</span>
<span class="cch-cd">${c.code}</span>
<span class="cch-nm">${c.country} ${c.countryEn}</span>
<button type="button" class="cch-fav${fav ? ' on' : ''}" data-code="${c.code}" data-iso="${c.iso}" title="${fav ? t('rmFav') : t('addFav')}">${fav ? '★' : '☆'}</button>`;
      frag.appendChild(row);
    });
    list.appendChild(frag);
  },

  _render(q: string): void {
    if (!this._popup) return;
    const favList = this._popup.querySelector<HTMLElement>('.cch-list[data-sec="favs"]');
    const allList = this._popup.querySelector<HTMLElement>('.cch-list[data-sec="all"]');
    const rulesSec = this._popup.querySelector<HTMLElement>('#cch-rules-view');
    const sm = this._popup.querySelector<HTMLElement>('#cch-summon');
    const fb = this._popup.querySelector<HTMLElement>('#cch-fb');
    if (this._view === 'rules') {
      // 票 07：规则管理视图 —— 隐藏国家列表/召唤/负反馈，仅渲染规则区
      if (favList && favList.closest('.cch-sec')) favList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (allList && allList.closest('.cch-sec')) allList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (sm) sm.hidden = true;
      if (fb) fb.hidden = true;
      if (rulesSec) { rulesSec.hidden = false; this._renderRules(); }
      return;
    }
    if (rulesSec) rulesSec.hidden = true;
    if (favList && favList.closest('.cch-sec')) favList.closest<HTMLElement>('.cch-sec')!.hidden = false;
    if (allList && allList.closest('.cch-sec')) allList.closest<HTMLElement>('.cch-sec')!.hidden = false;
    if (sm) sm.hidden = this._lowFields.size === 0;
    if (fb) fb.hidden = false;
    if (!favList || !allList) return;
    const query = q.toLowerCase().trim();
    let favData = Store.getFavs();
    let allData = COUNTRIES;
    if (query) {
      favData = favData.filter(c => this._match(c, query));
      allData = allData.filter(c => this._match(c, query));
    }
    this._renderRows(favList, favData);
    this._renderRows(allList, allData);
  },
  // \u7968 42\uFF1A\u8BED\u8A00\u5207\u6362\u540E\u5237\u65B0\u6784\u5EFA\u671F\u5199\u6B7B\u7684 t() \u6587\u6848\uFF08_render \u53EA\u7BA1\u884C\u6570\u636E\u4E0E\u53EF\u89C1\u6027\uFF09
  _applyLocaleText(): void {
    const P = this._popup;
    if (!P) return;
    const si = P.querySelector<HTMLInputElement>('#cch-si'); if (si) si.placeholder = t('search');
    const tg = P.querySelector<HTMLElement>('#cch-rules-tg');
    if (tg) { tg.title = t('rules'); tg.setAttribute('aria-label', t('rules')); }
    const sm = P.querySelector<HTMLElement>('#cch-summon'); if (sm) sm.textContent = t('summon');
    const fb = P.querySelector<HTMLElement>('#cch-fb'); if (fb) fb.textContent = t('feedback');
    const fh = P.querySelector<HTMLElement>('.cch-sec-favs .cch-sec-hd'); if (fh) fh.textContent = t('favs');
    const ah = P.querySelector<HTMLElement>('.cch-sec-all .cch-sec-hd'); if (ah) ah.textContent = t('all');
  },
};

// ════════════════════════════════════════════════════════

  // 票 42：面板/图标/菜单文案在 createUI 前尚未定型 —— 这里把持久化的语言选择应用到 i18n，
  // 保证 main.ts 后续所有 t() 调用（Fill toast、GM 菜单命令、面板）都按持久化语言出文案。
  try { setLocale(UI.prefs().locale); } catch {}

return UI;
}
