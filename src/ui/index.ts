import { t, getLocale, setLocale, LOCALE_MODES } from '../i18n';
import { OWN_ROOT_ID, WRAPPER_CLASS, UI_PREFS_KEY, LOWKEY_MODES, IS_TOP_FRAME, FRAME_TAG, FRAME_OPEN_MSG, FRAME_FILL_MSG, FRAME_FEEDBACK_MSG, SETTINGS_SECTION_LOCALE, SETTINGS_VIEW } from '../config';
// 票 03 [A-028]：诊断面常量（reason 闭集 + 判定点命名空间 + 门控开关持久键）
import { DIAG_REASON, DIAG_POINT_PREFIX, DIAG_TRACE_PREF } from '../config';
import { COUNTRIES, ISO2_MAP } from '../data/countries';
import type { AnyEl, AnyRoot, CchDiag, CchFill, CchRules, CchStore, CchUI, Country, DiagCheck, DiagLayer, DiagLevel, DiagRecord, DiagSnapshot, FillKind, OverrideRule, PanelView, PrefsDoc, Signal, Tier } from '../types';
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

// 票 03 [A-028]：四层判定的展示名与修复提示一律走静态 i18n 键映射——
// t() 的入参类型是编译期字面量联合，动态拼接（'diag'+layer）会静默丢类型保护。
const DIAG_LAYER_KEY: Record<DiagLayer, 'diagTool' | 'diagInject' | 'diagLogic' | 'diagWrite'> = {
  tool: 'diagTool', inject: 'diagInject', logic: 'diagLogic', write: 'diagWrite',
};

// 票 03 [A-028]：诊断面经 deps 注入（ui 不 import detect/fill，跨模块依赖约束不变）——
// main.ts 是唯一的装配点，面板与机器可读输出因此读同一份实例、同一份 records。
export function createUI(Store: CchStore, deps: { Fill: CchFill | null; Rules: CchRules | null; Diag?: CchDiag | null }): CchUI {
const UI = {
  _root: null as HTMLElement | null, _popup: null as HTMLElement | null,
  _target: null as AnyEl | null, _kind: null as FillKind | null,
  _toastTimer: undefined as number | undefined, _closeHandler: null as ((e: MouseEvent) => void) | null, _anchor: null as AnyEl | null,
  _remoteSource: null as Window | null,
  _viewportHandler: null as (() => void) | null, _rafPending: false,
  _lowFields: new Map<AnyEl, { kind: FillKind; score: number; signals: Signal[] }>(),
  _prefs: null as PrefsDoc | null, _view: 'list' as PanelView, _query: '',
  // 票 03 [A-028]：诊断视图的过滤态（会话内保持；与诊断数据本身解耦，不写回事实源）
  _diagLevel: 'all' as DiagLevel | 'all', _diagLayer: 'all' as DiagLayer | 'all',
  _menuRefresh: null as (() => void) | null, _flashTimer: undefined as number | undefined,

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
/* 面板挂 document.body，宿主页的裸 div 规则（如 entry-access fixture 的 div{margin:12px 0}）
   会按其盒模型污染面板：margin 把定位后的面板整体推离 _pos 算出的 top，居中/锚定都偏。
   面板自带 fixed 定位与显式坐标，margin 必须清零以与宿主页样式解耦。 */
margin:0;
animation:cchIn .12s ease;z-index:2147483647}
@keyframes cchIn{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
#cch-sw{padding:12px 12px 10px;border-bottom:1px solid rgba(15,23,42,.08);background:var(--cch-surface-strong)}
#cch-si{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(15,23,42,.12);
background:rgba(255,255,255,.88);color:var(--cch-text);border-radius:10px;font-size:13px;outline:none}
#cch-si:focus{border-color:rgba(15,118,110,.45);box-shadow:0 0 0 3px rgba(15,118,110,.12)}
.cch-body{display:flex;flex-direction:column;gap:8px;padding:8px 8px 10px;overflow:hidden;flex:1;min-height:0}
.cch-sec{border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.66);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
/* [票 02 A-026]：.cch-sec 自带 display:flex，会压过 UA 的 [hidden]{display:none}，
   使 hidden 属性对视图容器失效（设置/诊断视图与列表视图互相叠显）——补回显式规则。
   证据锚点：tests/settings-surface.spec.ts 验收1（修复前确定性红灯）。 */
.cch-sec[hidden]{display:none}
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
/* 票 37 [A-013]：移入字段右缘盒内（top:50%/right:6px，兄弟锚点式字段内悬浮）——
   旧 top:-12px/right:-12px 悬于 wrapper 盒外，祖先 overflow:hidden 即被裁掉；
   降广告特征（轻阴影/去高饱和，NN/g 横幅盲区）+ 提信息气味（静止态可感知灰度 .62）；
   与高置信角标的视觉分层保留（分层=档位语义），悬停恢复全权重。 */
.cch-btn-lowkey{top:50%;right:6px;transform:translateY(-50%) scale(.85);
opacity:.62;filter:saturate(.5);box-shadow:0 1px 3px rgba(2,8,23,.14)}
.cch-btn-lowkey:hover{opacity:1;transform:translateY(-50%) scale(1.06);filter:none;
box-shadow:0 6px 14px rgba(2,8,23,.2)}
#cch-summon{margin:6px 12px 0;padding:6px 10px;font-size:12px;color:#475569;
background:rgba(15,118,110,.06);border:1px dashed rgba(15,118,110,.35);
border-radius:8px;cursor:pointer;text-align:center}
#cch-summon:hover{background:rgba(15,118,110,.12);color:#0f766e}
#cch-sw{display:flex;gap:6px;align-items:center}
#cch-rules-tg{flex-shrink:0;width:30px;height:32px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:10px;cursor:pointer;font-size:14px;line-height:1;padding:0}
#cch-rules-tg:hover{color:#0f766e;border-color:rgba(15,118,110,.45)}
/* [票 03 A-028]：诊断入口常驻头部（与齿轮同构）——诊断视图内摘要条被隐藏，
   入口若寄居摘要条则该视图成为单向门。 */
#cch-diag-tg{flex-shrink:0;height:32px;padding:0 9px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:10px;cursor:pointer;font-size:11px;line-height:1}
#cch-diag-tg:hover{color:#0f766e;border-color:rgba(15,118,110,.45)}
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
.cch-rules-cap{padding:2px 2px 0;font-size:10px;font-weight:700;color:#8a95a3;text-transform:uppercase;letter-spacing:.02em}
/* 票 02 [A-026]：设置深链定位高亮 —— 脉冲后衰减（不持续抢注意力，D-011） */
.cch-flash{animation:cchFlash 1.5s ease-out}
@keyframes cchFlash{0%{background:rgba(15,118,110,.24)}55%{background:rgba(15,118,110,.14)}100%{background:transparent}}
/* 票 02 [A-027]：界面语言三选一显式控件（自动 / 中文 / English 并列可见） */
.cch-locale-seg{display:flex;gap:4px;flex:1;min-width:0}
.cch-locale-opt{flex:1 1 0;min-width:0;padding:4px 6px;font-size:11px;line-height:1.25;border:1px solid rgba(15,23,42,.12);border-radius:8px;background:rgba(255,255,255,.88);color:#475569;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cch-locale-opt:hover{border-color:rgba(15,118,110,.45);color:#0f766e}
.cch-locale-opt.on{background:rgba(15,118,110,.1);border-color:rgba(15,118,110,.45);color:#0f766e;font-weight:700}
/* 票 03 [A-028]：诊断面 —— 既有界面摘要条 + 独立诊断视图（决策链时间线/层矩阵/过滤器/导出） */
#cch-diag-sum{display:flex;align-items:center;gap:6px;margin:6px 12px 0;padding:6px 8px;font-size:11px;color:var(--cch-subtext);background:rgba(15,23,42,.03);border:1px solid rgba(15,23,42,.08);border-radius:8px}
.cch-diag-sumtxt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Monaco,monospace;font-size:10px}
#cch-diag-tg{flex-shrink:0;padding:3px 8px;font-size:11px;border:1px solid rgba(15,118,110,.35);background:rgba(15,118,110,.08);color:#0f766e;border-radius:7px;cursor:pointer}
#cch-diag-tg:hover{background:rgba(15,118,110,.16)}
.cch-sec-diag{flex:1 1 auto;min-height:120px}
/* [票 03 A-028]：摘要条为 ID 选择器 + display:flex，会压过 UA 的 [hidden]{display:none}——
   与票 02 对 .cch-sec 的同类修复同构：诊断/设置视图下摘要条必须真正隐藏，不得叠显。 */
#cch-diag-sum[hidden]{display:none}
.cch-diag-bd{flex:1 1 auto;min-height:0;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto}
.cch-diag-hd{display:flex;align-items:center;gap:6px}
.cch-diag-chip{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.02em}
.cch-diag-chip.pass{background:rgba(15,118,110,.12);color:#0f766e}
.cch-diag-chip.fail{background:rgba(190,18,60,.12);color:#9f1239}
.cch-diag-chip.unknown{background:rgba(100,116,139,.14);color:#475569}
.cch-diag-tgl{flex:1;padding:3px 8px;font-size:11px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:7px;cursor:pointer}
.cch-diag-tgl.on{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.1);color:#0f766e;font-weight:700}
.cch-diag-cnt{font-family:ui-monospace,SFMono-Regular,Monaco,monospace;font-size:10px;color:var(--cch-subtext);line-height:1.45;word-break:break-word}
.cch-diag-flt{display:flex;flex-wrap:wrap;gap:4px}
.cch-diag-f{padding:2px 7px;font-size:10px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:6px;cursor:pointer}
.cch-diag-f.on{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.1);color:#0f766e;font-weight:700}
.cch-diag-row{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;padding:4px 6px;border-bottom:1px solid rgba(15,23,42,.06);font-size:10px;font-family:ui-monospace,SFMono-Regular,Monaco,monospace}
.cch-diag-row:last-child{border-bottom:none}
.cch-diag-seq{flex-shrink:0;color:#8a95a3;min-width:26px;text-align:right}
.cch-diag-lv{flex-shrink:0;font-weight:700;text-transform:uppercase}
.cch-diag-lv.error{color:#9f1239}
.cch-diag-lv.warn{color:#92400e}
.cch-diag-lv.info{color:#0f766e}
.cch-diag-lv.trace{color:#64748b}
.cch-diag-ly{flex-shrink:0;color:#475569}
.cch-diag-pt{flex-shrink:0;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px}
.cch-diag-rn{flex:1;min-width:0;color:var(--cch-subtext);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cch-diag-dt{flex-basis:100%;color:#8a95a3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cch-diag-exp{width:100%;padding:5px 8px;font-size:11px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.88);color:var(--cch-subtext);border-radius:8px;cursor:pointer}
.cch-diag-exp:hover{border-color:rgba(15,118,110,.45);color:#0f766e}`;
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
    btn.title = t('iconLabel');
    btn.setAttribute('aria-label', t('iconLabel'));
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
    // 票 03 [A-028]：召唤 = 注入层的用户显式事件（计数器恒开）
    const D = this._diag();
    if (D) D.counter('summoned');
    if (el.closest('.' + WRAPPER_CLASS)) return true;
    this.attach(el, rec.kind, 'auto', rec.score, rec.signals, { force: true });
    return true;
  },

  open(target: AnyEl | null, kind: FillKind | null, anchor: AnyEl | null, opts: { remoteSource?: Window | null; view?: PanelView } = {}): void {
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
    // 票 03 [A-028]：默认列表视图；诊断入口（opts.view='diag'）直接落到独立诊断视图
    this._view = opts.view || 'list';
    this._anchor = anchor;

    const pop = document.createElement('div');
    pop.id = 'cch-pop';
    this._popup = pop;

    const sw = document.createElement('div'); sw.id = 'cch-sw';
    const si = document.createElement('input');
    si.type = 'text'; si.id = 'cch-si';
    si.placeholder = t('search');
    si.setAttribute('data-i18n-placeholder', 'search');
    si.setAttribute('autocomplete', 'off');
    sw.appendChild(si); pop.appendChild(sw);

    // 票 07：规则管理视图开关（齿轮）；视图态 _view 会话内保持，豁免后重开面板可直接解禁
    const tg = document.createElement('button');
    tg.type = 'button'; tg.id = 'cch-rules-tg';
    tg.textContent = '⚙';
    tg.title = t('rules');
    tg.setAttribute('data-i18n-title', 'rules');
    tg.setAttribute('data-i18n-aria-label', 'rules');
    tg.setAttribute('aria-label', t('rules'));
    tg.addEventListener('click', e => {
      e.stopPropagation();
      this._view = this._view === 'rules' ? 'list' : 'rules';
      this._render('');
    });
    sw.appendChild(tg);

    // 票 03 [A-028]：诊断面入口——头部常驻按钮，与齿轮同构（视图态 _view 会话内保持）。
    // 必须常驻头部：诊断视图内摘要条被隐藏，入口若寄居摘要条则诊断视图成为单向门。
    const dg = document.createElement('button');
    dg.type = 'button'; dg.id = 'cch-diag-tg';
    dg.setAttribute('data-i18n', 'diagOpen');
    dg.textContent = t('diagOpen');
    dg.addEventListener('click', e => {
      e.stopPropagation();
      this._view = this._view === 'diag' ? 'list' : 'diag';
      this._render('');
    });
    sw.appendChild(dg);

    // 低置信字段召唤入口 [SP US18]：可见性由 _render 按 _lowFields 维护
    const sm = document.createElement('div');
    sm.id = 'cch-summon';
    sm.setAttribute('role', 'button');
    sm.setAttribute('data-i18n', 'summon');
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
    fb.setAttribute('data-i18n', 'feedback');
    fb.textContent = t('feedback');
    fb.addEventListener('click', e => { e.stopPropagation(); this._feedback(); });
    pop.appendChild(fb);

    // ══ 票 03 [A-028]：既有界面上的诊断入口与摘要 ══
    // 分层（S-02）：独立诊断视图负责全链路时间线；既有界面只给「整体健康度 + 计数器一行
    // + 打开完整诊断」。摘要与时间线同源（同一份 snapshot()），不各自采集。
    const sumBar = document.createElement('div');
    sumBar.id = 'cch-diag-sum';
    sumBar.setAttribute('role', 'status');
    const sumTxt = document.createElement('span');
    sumTxt.className = 'cch-diag-sumtxt';
    // 入口按钮已上移面板头部（#cch-diag-tg）；摘要条只承载「整体健康度 + 计数器一行」
    sumBar.appendChild(sumTxt);
    pop.appendChild(sumBar);

    const body = document.createElement('div');
    body.className = 'cch-body';

    const favSec = document.createElement('section');
    favSec.className = 'cch-sec cch-sec-favs';
    const favHd = document.createElement('div');
    favHd.className = 'cch-sec-hd';
    favHd.setAttribute('data-i18n', 'favs');
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
    allHd.setAttribute('data-i18n', 'all');
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
    rulesSec.setAttribute('data-cch-view', SETTINGS_VIEW); // 票 02 [A-026]：设置所在视图的稳定标识符
    rulesSec.hidden = this._view !== 'rules';
    body.appendChild(rulesSec);

    // 票 03 [A-028]：独立诊断视图容器（内容由 _renderDiag 从事实源渲染；此处只建宿主）
    const diagSec = document.createElement('section');
    diagSec.className = 'cch-sec cch-sec-diag';
    diagSec.id = 'cch-diag-view';
    diagSec.hidden = true;
    body.appendChild(diagSec);
    pop.appendChild(body);

    document.body.appendChild(pop);
    this._pos(pop, anchor);
    this._bindViewportTracking();
    this._bindPopupEvents(pop);
    this._render('');

    // 居中路径（anchor===null）的垂直居中基于 offsetHeight，而上面这次 _pos 发生在
    // _render 之前——此时列表还是空的，offsetHeight 明显偏小；_render 同步填充行数据后
    // 面板继续长高，中心随 Δh/2 下移，判定因此对时序/内容敏感（R-3 红灯）。
    // 在内容定型后按最终高度重算一次；仅作用于居中路径，锚定路径语义不变。
    if (!anchor) this._pos(pop, anchor);

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
    clearTimeout(this._flashTimer);
  },

  // 票 02 [A-026]：设置一级入口 —— 打开面板并显式切到设置所在视图（不能只开面板）。
  // 已开面板原地复用：只切视图 + 定位，不重建面板（不重复入栈、不清返回栈，D-011）。
  openSettings(): void {
    if (this._popup) {
      this._view = 'rules';
      this._render(this._query);
      this._revealSection(SETTINGS_SECTION_LOCALE);
      return;
    }
    this.open(null, null, null);
    this._view = 'rules';
    this._render('');
    this._revealSection(SETTINGS_SECTION_LOCALE);
  },

  // 票 02 [A-026/A-027]：深链定位 —— 把目标行滚入可见区（只滚面板内滚动容器，不牽连宿主页面）
  // + 高亮脉冲后衰减。目标以稳定标识符 data-cch-section 定位，不绑内部实现名或易变排序位置。
  _revealSection(slug: string): void {
    const P = this._popup;
    if (!P) return;
    const row = P.querySelector<HTMLElement>('[data-cch-section="' + slug + '"]');
    if (!row) return;
    // 只滚最近的滚动容器：scrollIntoView 会连带滚动宿主页面，属越界副作用
    const scroller = row.closest('.cch-rules-bd') as HTMLElement | null;
    if (scroller) {
      const rb = row.getBoundingClientRect();
      const sb = scroller.getBoundingClientRect();
      scroller.scrollTop += (rb.top - sb.top) - (sb.height - rb.height) / 2;
    }
    row.classList.remove('cch-flash');
    void row.offsetWidth; // 强制重排以重启脉冲（连续两次调用「设置」不吞掉第二次高亮）
    row.classList.add('cch-flash');
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { row.classList.remove('cch-flash'); }, 1500);
    // 焦点交给目标行（D-011）；排在 open() 的 si.focus() 之后，避免被抢回搜索框
    requestAnimationFrame(() => { try { row.focus({ preventScroll: true }); } catch {} });
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
    // 票 37 [A-012]：GM 菜单入口打开时无目标字段——负反馈点击明示而非静默
    // 票 03 [A-028]：GM 菜单入口打开面板时无目标字段 —— 逻辑层失效的可验证原因
    // （此前仅 toast，诊断面无痕迹；现既 toast 又留判定记录）
    if (!el) {
      const D0 = this._diag();
      if (D0) D0.warn(DIAG_POINT_PREFIX.LOGIC + 'no-target', DIAG_REASON.LOGIC_NO_TARGET, null);
      this.toast(t('needTarget'));
      return;
    }
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
    // 票 02 [A-027]：界面语言三选一显式控件（自动（跟随浏览器）/ 中文 / English 并列可见），
    // 替代原循环按钮；深链目标以稳定标识符 data-cch-section 标注（不绑内部实现名或易变排序位置）。
    const cap4 = document.createElement('div'); cap4.className = 'cch-rules-cap'; cap4.textContent = t('lang');
    bd.appendChild(cap4);
    const lgLabel = (v: string): string => (v === 'zh' ? t('langZh') : v === 'en' ? t('langEn') : t('langAuto'));
    const lgRow = document.createElement('div'); lgRow.className = 'cch-rule-row';
    lgRow.id = 'cch-locale-row';
    lgRow.setAttribute('data-cch-section', SETTINGS_SECTION_LOCALE);
    lgRow.tabIndex = -1; // 深链定位后可 focus（不参与 Tab 序列，D-011）
    lgRow.title = t('lang') + ' \u00B7 ' + t(getLocale() === 'zh' ? 'langZh' : 'langEn');
    const seg = document.createElement('div');
    seg.className = 'cch-locale-seg';
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', t('lang'));
    const curLocale = this.prefs().locale as string;
    for (const mode of LOCALE_MODES) {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'cch-locale-opt' + (mode === curLocale ? ' on' : '');
      opt.setAttribute('data-locale', mode);
      opt.setAttribute('aria-pressed', mode === curLocale ? 'true' : 'false');
      opt.textContent = lgLabel(mode);
      opt.addEventListener('click', e => {
        e.stopPropagation();
        if (this.prefs().locale !== mode) this._setLocale(mode);
      });
      seg.appendChild(opt);
    }
    lgRow.appendChild(seg);
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
      // 票 37 [A-012]：GM 全局入口开面板时无目标字段——提示先点字段，面板保持打开
      if (!this._target) { this.toast(t('needTarget')); return; }
      deps.Fill!.run(this._target, this._kind, c);
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
    // 票 37 R1：lowkey 图标已移入字段右缘盒内（top:50%;right:6px）。面板若仍按图标左缘对齐，
    // 会随图标一起向左多伸约 18px，压住相邻字段的图标（票 18 pseudo-select 在 CI 字体度量下
    // 被 #cch-pop/#cch-sw 子树拦截 57 次，本地仅余 ~11px 余量故未复现）。
    // 盒内图标改按字段右缘锚定，恢复与盒外锚点等价的横向间距；盒外图标（auto 档）路径不变。
    const wrap = anchor.closest('.' + WRAPPER_CLASS) as AnyEl | null;
    if (wrap) {
      const wr = wrap.getBoundingClientRect();
      if (r.right <= wr.right + 1) l = wr.right + m;
    }
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
      // 防御性说明（仅注释，不改渲染路径）：本处 innerHTML 的插值全为可信静态常量——
      // c.flag / c.code / c.country / c.countryEn / c.iso 出自 src/data/countries.ts 内置
      // 静态数据表，fav 为 Store.isFav 返回的布尔值，t('rmFav') / t('addFav') 出自本地
      // i18n 词典；均非页面/用户可控输入，不构成 XSS 向量。
      row.innerHTML = `
<span class="cch-fl">${c.flag}</span>
<span class="cch-cd">${c.code}</span>
<span class="cch-nm">${c.country} ${c.countryEn}</span>
<button type="button" class="cch-fav${fav ? ' on' : ''}" data-code="${c.code}" data-iso="${c.iso}" title="${fav ? t('rmFav') : t('addFav')}">${fav ? '★' : '☆'}</button>`;
      frag.appendChild(row);
    });
    list.appendChild(frag);
  },

  // ══ 票 03 [A-028]：诊断面读面 ══
  // ui 不 import detect/fill（跨模块依赖约束），诊断实例由 main.ts 经 deps 注入；
  // 装配点唯一 —— 面板与机器可读输出读同一份实例、同一份 records。
  _diag(): CchDiag | null { return deps.Diag || null; },
  // 过滤器：级别 + 层两个正交维度；只作用于面板展示，不改事实源
  _diagFilter(r: DiagRecord): boolean {
    if (this._diagLevel !== 'all' && r.level !== this._diagLevel) return false;
    if (this._diagLayer !== 'all' && r.layer !== this._diagLayer) return false;
    return true;
  },
  // 既有界面摘要（列表视图常显）：整体健康度 + 计数器一行 + 截断标记。
  // 与完整视图同源（同一份 snapshot()）—— 摘要不得自成一套采集。
  _renderDiagSummary(): void {
    const bar = this._popup && this._popup.querySelector<HTMLElement>('#cch-diag-sum');
    if (!bar) return;
    const D = this._diag();
    if (!D) { bar.hidden = true; return; }
    const txt = bar.querySelector<HTMLElement>('.cch-diag-sumtxt');
    if (!txt) return;
    let snap: DiagSnapshot | null = null;
    try { snap = D.snapshot(); } catch {}
    if (!snap) return;
    const cs = snap.counters;
    txt.textContent = t(snap.health === 'pass' ? 'diagPass' : snap.health === 'fail' ? 'diagFail' : 'diagUnknown')
      + ' · scans ' + cs.scans + ' · inj ' + cs.injected + ' · reg ' + cs.registered
      + ' · fills ' + cs.filled + '/' + cs.fills + ' · err ' + cs.errors
      + (snap.truncated ? ' · ' + t('diagTruncated') : '');
  },
  // 独立诊断视图（S-02）：决策链时间线 + 四层检查矩阵 + 过滤器 + 导出。
  // 面板与机器可读输出同源（D-012）：本函数只读 records() / snapshot() / checks() 三个出口。
  // 面板不持有任何独立状态 —— 双写漂移（面板 ok / JSON fail）在架构上不可能发生。
  _renderDiag(): void {
    const sec = this._popup && this._popup.querySelector<HTMLElement>('#cch-diag-view');
    if (!sec) return;
    sec.textContent = '';
    const D = this._diag();
    if (!D) {
      const e0 = document.createElement('div');
      e0.className = 'cch-empty';
      e0.textContent = t('diagEmpty');
      sec.appendChild(e0);
      return;
    }
    let recs: DiagRecord[] = [];
    let snap: DiagSnapshot | null = null;
    let chk: DiagCheck[] = [];
    try { recs = D.records(); snap = D.snapshot(); chk = D.checks(); } catch {}
    const bd = document.createElement('div');
    bd.className = 'cch-diag-bd';

    // ① 整体健康度 + 全链路 trace 门控开关（error/warn/计数器恒开，仅 trace 可关）
    const hd = document.createElement('div');
    hd.className = 'cch-diag-hd';
    const hv = snap ? snap.health : 'unknown';
    const chip = document.createElement('span');
    chip.className = 'cch-diag-chip ' + hv;
    chip.textContent = t(hv === 'pass' ? 'diagPass' : hv === 'fail' ? 'diagFail' : 'diagUnknown');
    const tgl = document.createElement('button');
    tgl.type = 'button'; tgl.id = 'cch-diag-trace-tg';
    tgl.className = 'cch-diag-tgl' + (D.traceOn() ? ' on' : '');
    tgl.textContent = t('diagTrace');
    tgl.addEventListener('click', e => {
      e.stopPropagation();
      const on = !D.traceOn();
      D.setTrace(on);
      // 门控持久化到 UI 偏好（UI_PREFS_KEY，GM 存储）——与 DIAG_TRACE_PREF 的文档契约一致；
      // 不用 localStorage（页面作用域，与偏好文档分家）
      this.setPref(DIAG_TRACE_PREF, on);
      this._renderDiag();
    });
    hd.appendChild(chip);
    hd.appendChild(tgl);
    bd.appendChild(hd);

    // ② 四层检查矩阵（与机器可读输出同享 checks() 定义：层 id + 状态 + 原因 + 修复提示）
    const lc = document.createElement('div');
    lc.className = 'cch-rules-cap';
    lc.textContent = t('diagLayers');
    bd.appendChild(lc);
    const lm = document.createElement('div');
    lm.id = 'cch-diag-layers';
    chk.forEach(c => {
      const row = document.createElement('div');
      row.className = 'cch-rule-row';
      const nm = document.createElement('span');
      nm.className = 'cch-rule-host';
      nm.textContent = t(DIAG_LAYER_KEY[c.layer]);
      const st = document.createElement('span');
      st.className = 'cch-rule-tier ' + (c.status === 'pass' ? 'auto' : c.status === 'fail' ? 'none' : 'lowkey');
      st.textContent = t(c.status === 'pass' ? 'diagPass' : c.status === 'fail' ? 'diagFail' : 'diagUnknown');
      const rs = document.createElement('span');
      rs.className = 'cch-rule-note';
      rs.textContent = c.reason || '-';
      row.appendChild(nm);
      row.appendChild(st);
      row.appendChild(rs);
      if (c.fix) {
        const fx = document.createElement('span');
        fx.className = 'cch-rule-note';
        fx.textContent = t(c.fix);
        row.appendChild(fx);
      }
      lm.appendChild(row);
    });
    bd.appendChild(lm);

    // ③ 计数器（恒开通道的可读投影）
    if (snap) {
      const cs = snap.counters;
      const cc = document.createElement('div');
      cc.className = 'cch-diag-cnt';
      cc.textContent = t('diagCounters') + ': scans ' + cs.scans + ' · cand ' + cs.candidates + ' · scored ' + cs.scored
        + ' · inj ' + cs.injected + ' · reg ' + cs.registered + ' · fills ' + cs.filled + '/' + cs.fills
        + ' · err ' + cs.errors + ' · warn ' + cs.warns + ' · drop ' + cs.dropped;
      bd.appendChild(cc);
    }

    // ④ 过滤器（级别 + 层）
    const fl = document.createElement('div');
    fl.className = 'cch-diag-flt';
    const mkF = (grp: string, val: string, label: string, on: boolean): HTMLElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cch-diag-f' + (on ? ' on' : '');
      b.setAttribute('data-filter', grp + ':' + val);
      b.textContent = label;
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (grp === 'level') this._diagLevel = val as DiagLevel | 'all';
        else this._diagLayer = val as DiagLayer | 'all';
        this._renderDiag();
      });
      return b;
    };
    const lvAll: string[] = ['all', 'error', 'warn', 'info', 'trace'];
    for (let i = 0; i < lvAll.length; i++) {
      fl.appendChild(mkF('level', lvAll[i], lvAll[i] === 'all' ? t('diagAll') : lvAll[i], this._diagLevel === lvAll[i]));
    }
    const lyAll: string[] = ['all', 'tool', 'inject', 'logic', 'write'];
    for (let i = 0; i < lyAll.length; i++) {
      fl.appendChild(mkF('layer', lyAll[i], lyAll[i] === 'all' ? t('diagAll') : lyAll[i], this._diagLayer === lyAll[i]));
    }
    bd.appendChild(fl);

    // ⑤ 决策链时间线（倒序：最新在上；行字段全部来自记录，不硬编码）
    const tc = document.createElement('div');
    tc.className = 'cch-rules-cap';
    tc.textContent = t('diagTimeline');
    bd.appendChild(tc);
    const list = document.createElement('div');
    list.id = 'cch-diag-list';
    const shown = recs.filter(r => this._diagFilter(r));
    if (!shown.length) {
      const e1 = document.createElement('div');
      e1.className = 'cch-empty';
      e1.textContent = t('diagEmpty');
      list.appendChild(e1);
    }
    for (let i = shown.length - 1; i >= 0; i--) {
      const r = shown[i];
      const row = document.createElement('div');
      row.className = 'cch-diag-row ' + r.level;
      const sq = document.createElement('span');
      sq.className = 'cch-diag-seq';
      sq.textContent = String(r.seq);
      const lv = document.createElement('span');
      lv.className = 'cch-diag-lv ' + r.level;
      lv.textContent = r.level;
      const ly = document.createElement('span');
      ly.className = 'cch-diag-ly';
      ly.textContent = r.layer;
      const pt = document.createElement('span');
      pt.className = 'cch-diag-pt';
      pt.textContent = r.point;
      const rn = document.createElement('span');
      rn.className = 'cch-diag-rn';
      rn.textContent = r.reason + (r.verified ? '' : ' (' + t('diagUnknown') + ')');
      row.appendChild(sq);
      row.appendChild(lv);
      row.appendChild(ly);
      row.appendChild(pt);
      row.appendChild(rn);
      if (r.detail) {
        const dt = document.createElement('span');
        dt.className = 'cch-diag-dt';
        dt.textContent = JSON.stringify(r.detail);
        row.appendChild(dt);
      }
      list.appendChild(row);
    }
    bd.appendChild(list);

    // ⑥ 导出（人读文本投影，与 snapshot 同源）与清空
    const ex = document.createElement('button');
    ex.type = 'button'; ex.id = 'cch-diag-export';
    ex.className = 'cch-diag-exp';
    ex.textContent = t('diagExport');
    ex.addEventListener('click', e => {
      e.stopPropagation();
      const txt = D.text();
      try { if (navigator.clipboard) navigator.clipboard.writeText(txt); } catch {}
      this.toast(t('diagExported'));
    });
    bd.appendChild(ex);
    const cl = document.createElement('button');
    cl.type = 'button';
    cl.className = 'cch-diag-exp';
    cl.textContent = t('diagClear');
    cl.addEventListener('click', e => {
      e.stopPropagation();
      D.clear();
      this._renderDiag();
    });
    bd.appendChild(cl);
    sec.appendChild(bd);
  },

  _render(q: string): void {
    this._query = q;
    if (!this._popup) return;
    const favList = this._popup.querySelector<HTMLElement>('.cch-list[data-sec="favs"]');
    const allList = this._popup.querySelector<HTMLElement>('.cch-list[data-sec="all"]');
    const rulesSec = this._popup.querySelector<HTMLElement>('#cch-rules-view');
    const sm = this._popup.querySelector<HTMLElement>('#cch-summon');
    const fb = this._popup.querySelector<HTMLElement>('#cch-fb');
    // 票 03 [A-028]：诊断宿主（摘要条在列表视图常显；完整视图单独切换）
    const diagSec = this._popup.querySelector<HTMLElement>('#cch-diag-view');
    const sumBar = this._popup.querySelector<HTMLElement>('#cch-diag-sum');
    // 票 02 [A-027]：行数据始终重渲染 —— 语言切换后收藏行 title / 空态文案不得残留旧语言
    // （旧实现只在列表视图渲染行，停在设置视图时切换语言即漏刷）
    if (favList && allList) {
      const query = q.toLowerCase().trim();
      let favData = Store.getFavs();
      let allData = COUNTRIES;
      if (query) {
        favData = favData.filter(c => this._match(c, query));
        allData = allData.filter(c => this._match(c, query));
      }
      this._renderRows(favList, favData);
      this._renderRows(allList, allData);
    }
    this._i18n();
    if (this._view === 'rules') {
      // 票 07：规则/设置视图 —— 隐藏国家列表/召唤/负反馈，仅渲染规则区
      if (favList && favList.closest('.cch-sec')) favList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (allList && allList.closest('.cch-sec')) allList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (sm) sm.hidden = true;
      if (fb) fb.hidden = true;
      if (sumBar) sumBar.hidden = true;
      if (diagSec) diagSec.hidden = true;
      if (rulesSec) { rulesSec.hidden = false; this._renderRules(); }
      return;
    }
    if (this._view === 'diag') {
      // 票 03 [A-028]：独立诊断视图 —— 隐藏列表/召唤/负反馈/规则/摘要条，仅渲染诊断区。
      // 与设置视图同构（同一套视图切换纪律），不新造导航模型。
      if (favList && favList.closest('.cch-sec')) favList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (allList && allList.closest('.cch-sec')) allList.closest<HTMLElement>('.cch-sec')!.hidden = true;
      if (sm) sm.hidden = true;
      if (fb) fb.hidden = true;
      if (rulesSec) rulesSec.hidden = true;
      if (sumBar) sumBar.hidden = true;
      if (diagSec) { diagSec.hidden = false; this._renderDiag(); }
      return;
    }
    if (rulesSec) rulesSec.hidden = true;
    if (diagSec) diagSec.hidden = true;
    if (favList && favList.closest('.cch-sec')) favList.closest<HTMLElement>('.cch-sec')!.hidden = false;
    if (allList && allList.closest('.cch-sec')) allList.closest<HTMLElement>('.cch-sec')!.hidden = false;
    if (sm) sm.hidden = this._lowFields.size === 0;
    if (fb) fb.hidden = false;
    if (sumBar) { sumBar.hidden = false; this._renderDiagSummary(); }
  },
  // 票 02 [A-027]：字典化全量重渲染 —— 面板 chrome 文案由 [data-i18n*] 标记统一刷新，
  // 替代原 _applyLocaleText() 手工逐项重写（漏刷收藏行 title / 空态文案的根因）。
  _i18n(): void {
    const P = this._popup;
    if (!P) return;
    const tr = (k: string | null): string => (k ? (t as unknown as (x: string) => string)(k) : '');
    P.querySelectorAll<HTMLElement>('[data-i18n]').forEach(n => { n.textContent = tr(n.getAttribute('data-i18n')); });
    P.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(n => { n.placeholder = tr(n.getAttribute('data-i18n-placeholder')); });
    P.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(n => { n.title = tr(n.getAttribute('data-i18n-title')); });
    P.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach(n => { n.setAttribute('aria-label', tr(n.getAttribute('data-i18n-aria-label'))); });
  },
  // 票 02 [A-027]：图标 title/aria-label 本地化（此前硬编码英文，从未随语言切换）
  _refreshIconLabels(): void {
    const label = t('iconLabel');
    for (const wrap of this._allWrappers(document)) {
      const btn = wrap.querySelector ? wrap.querySelector<HTMLElement>('.cch-btn') : null;
      if (!btn) continue;
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }
  },
  // 票 02 [A-027]：语言切换 → 持久化 + i18n 生效 + 全量重渲染（面板 chrome / 行数据 / 图标 / 菜单标签）
  _setLocale(v: string): void {
    this.setPref('locale', v);
    setLocale(v);
    this._refreshIconLabels();
    if (typeof this._menuRefresh === 'function') { try { this._menuRefresh(); } catch {} }
    this._render(this._query);
  },
};

// ════════════════════════════════════════════════════════

  // 票 42：面板/图标/菜单文案在 createUI 前尚未定型 —— 这里把持久化的语言选择应用到 i18n，
  // 保证 main.ts 后续所有 t() 调用（Fill toast、GM 菜单命令、面板）都按持久化语言出文案。
  try { setLocale(UI.prefs().locale); } catch {}

return UI;
}
