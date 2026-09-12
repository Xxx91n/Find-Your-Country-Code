// ════════════════════════════════════════════════════════
// 共享类型层（票 23 — TS strict 化配套，types-only 零运行时产物）
// 领域类型：Tier / FillKind / Country / Signal / ScoreResult / RulesDoc；
// 模块边界：CchStore / CchRules / CchUI / CchFill / ItiAdapter（工厂函数契约）；
// 宿主边界：AnyEl（引擎鸭子类型元素——需同时支持真实 DOM 与 node 单测 mock，
// 已知 DOM 成员与动态成员（value/options/_valueTracker/iti 插件实例等）都经
// 索引签名放行，探测代码自带运行时守卫 + try/catch）；AnyRoot（扫描穿透根容器）；
// iti 插件跨版本探测面 ItiApi / ItiInstance（v16–v29）；userscript 宿主 window
// 全局经 declare global 声明（GM_* 仍保留在使用模块内局部 declare，不在此收敛）。
// ════════════════════════════════════════════════════════

export type Tier = 'auto' | 'lowkey' | 'none';
export type FillKind = 'select' | 'iti' | 'input' | 'pseudo';

// 票 31（A-005）：填充结果三态信号 —— 成功填充 / 降级复制（字段未写入，值已进剪贴板）/
// 失败（填充不可用且剪贴板也不可用）。对标 Chromium ActorFormFillingError 枚举心智
// [atomcode 票31 §3.2]：状态是操作返回的结构化结果，不是文案副产物。
// fmtDiff：仅 input 策略有意义——字段声明式数字约束（pattern/inputmode=numeric/type=number）
// 与写入格式推测不一致（期望 digits 得 plus）的只读观测旗标，不改写入行为。
export type FillStatus = 'filled' | 'copied' | 'failed';

export interface FillResult {
  status: FillStatus;
  kind: FillKind | null;
  iso: string;
  code: string;
  fmtDiff: boolean;
}

export interface Country {
  code: string;
  iso: string;
  flag: string;
  country: string;
  countryEn: string;
}

export interface Signal {
  layer: string;
  name: string;
  pts: number;
}

export interface ScoreResult {
  score: number;
  tier: Tier;
  signals: Signal[];
  pseudo?: boolean;
}

// 伪 select / select 选项内容分布统计（detect optStats 与 pseudoOptionStats 共用口径）
export interface OptionStats {
  total: number;
  plusDial: number;
  parenDial: number;
  isoName: number;
  numeric: number;
}

// ── 站点规则文档（store/index.ts 头注为权威契约，此处为类型投影） ──
// 规则作用域（票 30 [A-004]）：'element' = selector 命中元素生效（强制选择器/负反馈）；
// 'page' = 页面级分档覆盖显式规则类型（全页 auto/lowkey 档重映射，不参与元素级匹配）。缺省 'element'。
export type RuleScope = 'element' | 'page';
export interface OverrideRule {
  id: string;
  host: string;
  selector: string;
  scope?: RuleScope;
  action: { tier: Tier };
  note: string;
  createdAt?: number;
  updatedAt: number;
}

export interface OverrideRuleInput {
  id?: string;
  host?: string;
  selector?: string;
  scope?: RuleScope;
  action?: { tier: Tier };
  note?: string;
}

export interface RulesDoc {
  version: 1;
  exempt: string[];
  overrides: OverrideRule[];
  global: null | { thresholds?: { auto?: number; lowkey?: number } };
}

export interface PrefsDoc {
  lowkeyMode?: string;
  [key: string]: unknown;
}

// ── 模块边界接口（工厂函数入参/返回；成员与各工厂实现一一对应） ──
export interface CchStore {
  init(): void;
  subscribe(fn: () => void): () => void;
  getSiteRules(): RulesDoc;
  isExempt(input: string): boolean;
  setExempt(input: string, on: boolean): boolean;
  _hostOf(input: string | { hostname?: string } | null | undefined): string;
  upsertOverride(rule: OverrideRuleInput): string | null;
  removeOverride(id: string): boolean;
  isFav(code: string, iso: string): boolean;
  addFav(c: Country): void;
  rmFav(code: string, iso: string): void;
  getFavs(): Country[];
}

export interface CchRules {
  listRules(): RulesDoc;
  isExempt(urlOrHost: string): boolean;
  isPageExcluded(): boolean;
  pageOverrides(): OverrideRule[];
  overridesFor(urlOrHost: string): OverrideRule[];
  forcedTier(el: AnyEl): Tier | null;
  pageTierOverride(): Tier | null;
  setExempt(urlOrHost: string, on?: boolean): boolean;
  upsertOverride(rule: OverrideRuleInput): string | null;
  removeOverride(id: string): boolean;
  rememberNone(el: AnyEl): string | null;
}

export interface CchUI {
  css(): void;
  toast(msg: string): void;
  attach(el: AnyEl, kind: FillKind, tier?: Tier, score?: number, signals?: Signal[], opts?: { force?: boolean }): void;
  detach(el: AnyEl): void;
  detachAll(): void;
  rememberLow(el: AnyEl, kind: FillKind, score: number, signals: Signal[]): void;
  _pruneLow(): void;
  _render(q: string): void;
  _feedback(): void;
  _popup: HTMLElement | null;
  _target: AnyEl | null;
  _kind: FillKind | null;
  open(target: AnyEl | null, kind: FillKind | null, anchor: AnyEl | null, opts?: { remoteSource?: Window | null }): void;
}

export interface CchFill {
  run(el: AnyEl, kind: FillKind | null, country: Country): Promise<FillResult>;
}

// ── iti 插件跨版本探测面（v16–v29；方法存在性由 _isFn 运行时裁决后调用） ──
export interface ItiInstance {
  setNumber(value: string): unknown;
  setSelectedCountry(iso: string): unknown;
  setCountry(iso: string): unknown;
  [key: string]: unknown;
}

export interface ItiApi {
  getInstance(el: Element): ItiInstance | null | undefined;
  instances?: Record<string, ItiInstance>;
  [key: string]: unknown;
}

export interface ItiAdapter {
  fill(el: AnyEl, country: Country, dispatch: (value: string) => void): boolean;
}

// 引擎鸭子类型元素：HTMLElement 成员 + 动态成员索引签名（见文件头注）
export type AnyEl = HTMLElement & Record<string, any>;

// 扫描穿透根容器（document / shadowRoot / 元素）
export type AnyRoot = Document | ShadowRoot | HTMLElement;

declare global {
  interface Window {
    // 可选性能探针（票 04 基线，页面不设置即零开销）
    __cchPerfHook?: (ms: number) => void;
    // 票 31：最近一次填充的三态结果（测试面唯一可读钩子；成功/降级/写入值同步落，
    // 剪贴板异步定态；E2E 经 page.evaluate 读取，勿再加第二套钩子 [handoff 31 信号设计]）
    __cchLastFill?: FillResult;
    // iti 插件宿主全局与页面 jQuery（跨版本鸭子探测面，运行时守卫 + try/catch 兜底）
    intlTelInput?: ItiApi;
    intlTelInputGlobals?: ItiApi;
    jQuery?: any;
    $?: any;
  }
}
