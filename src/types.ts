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

export type PanelView = 'list' | 'rules' | 'diag';
export type Tier = 'auto' | 'lowkey' | 'none';
export type FillKind = 'select' | 'iti' | 'input' | 'pseudo';

// 票 31（A-005）：填充结果三态信号 —— 成功填充 / 降级复制（字段未写入，值已进剪贴板）/
// 失败（填充不可用且剪贴板也不可用）。对标 Chromium ActorFormFillingError 枚举心智
// [atomcode 票31 §3.2]：状态是操作返回的结构化结果，不是文案副产物。
// fmtDiff：仅 input 策略有意义——字段声明式数字约束（pattern/inputmode=numeric/type=number）
// 与写入格式推测不一致（期望 digits 得 plus）的只读观测旗标，不改写入行为。
// ── 诊断面（票 03 / A-028）：结构化诊断事件流作唯一事实来源 ──
// 字段集对标调研报告 Q2 最小集（7 字段）与 GrowthBook evalFeature 的「枚举 reason + ruleId」归因范式：
// level（门控分级）/ layer（四层判定归属）/ point（产生本记录的判定点 id）/ verdict（CI 断言主键）
// / reason（封闭枚举，仅 fail 时指向已验证因果）/ detail（平铺属性）。
// verdict 三值用极性正向命名（KEP-1623 教训）：pass=好状态，不造双重否定复合态。
export type DiagLevel = 'error' | 'warn' | 'info' | 'trace';
export type DiagLayer = 'tool' | 'inject' | 'logic' | 'write';
export type DiagVerdict = 'pass' | 'fail' | 'unknown';
export type DiagDetail = Record<string, string | number | boolean | null>;
export interface DiagRecord {
  seq: number;      // 单调序号（环形缓冲内唯一；导出可判截断）
  ts: number;       // 毫秒时间戳（人读时间线）
  level: DiagLevel;
  layer: DiagLayer;
  point: string;    // 判定点 id（命名空间见 DIAG_POINT_PREFIX）
  verdict: DiagVerdict;
  reason: string;   // DIAG_REASON 闭集取值
  verified: boolean;// reason 是否已比对闭集（false = 已降级为 unknown-open-debug）
  detail: DiagDetail | null;
}
export interface DiagCounters {
  scans: number; candidates: number; scored: number;
  injected: number; lowkey: number; registered: number; summoned: number; detached: number;
  fills: number; filled: number; copied: number; failed: number;
  errors: number; warns: number; traces: number; dropped: number;
}
export interface DiagLayerState {
  verdict: DiagVerdict;
  point: string;
  reason: string;
  ts: number;
}
// 修复提示的 i18n 键（字面量联合：t() 的键为编译期字面量，禁止动态拼接）
// 无已知修复手段则 null——不猜。
export type DiagFixKey = 'diagFixTool' | 'diagFixInject' | 'diagFixLogic' | 'diagFixWrite';
// 检查矩阵（D-012：面板与机器面同享同一份定义，仅 runner 不同）
export interface DiagCheck {
  id: string;
  layer: DiagLayer;
  status: DiagVerdict;
  reason: string;
  point: string;
  ts: number;
  fix: DiagFixKey | null;  // 修复提示的 i18n 键（无已知修复手段则 null，不猜）
}
export interface DiagSnapshot {
  version: number;
  generatedAt: number;
  url: string;
  frame: string;
  trace: boolean;      // 全链路 trace 门控当前状态
  capacity: number;
  dropped: number;     // 环形缓冲溢出丢弃总数
  truncated: boolean;  // dropped > 0
  health: DiagVerdict;
  counters: DiagCounters;
  layers: Record<DiagLayer, DiagLayerState>;
  checks: DiagCheck[];
  records: DiagRecord[];
}
export interface CchDiag {
  // 恒开通道（error/warn + 计数器）——高开销诊断才门控，可观测性不门控
  error(point: string, reason: string, detail?: DiagDetail | null): void;
  warn(point: string, reason: string, detail?: DiagDetail | null): void;
  counter(key: keyof DiagCounters, by?: number): void;
  // 门控通道（info/trace）——惰性构造：detail 以 thunk 传入，门控关时永不求值
  info(point: string, reason: string, thunk?: (() => DiagDetail | null) | null): void;
  trace(point: string, reason: string, thunk?: (() => DiagDetail | null) | null): void;
  // 读面（两个 serializer 读同一份数据，面板不持有独立状态）
  traceOn(): boolean;
  setTrace(on: boolean): boolean;
  records(): DiagRecord[];
  checks(): DiagCheck[];
  snapshot(): DiagSnapshot;
  text(): string;   // 人读文本投影（与 snapshot 同源，供复制/导出）
  clear(): void;
}
export type FillStatus = 'filled' | 'copied' | 'failed';

export interface FillResult {
  status: FillStatus;
  kind: FillKind | null;
  iso: string;
  code: string;
  fmtDiff: boolean;
  // 票 03（A-028）写入结果三元组（提交前状态 → 写入动作 → 提交后断言）。
  // 对标 Playwright trace before/action/after 三快照 + K8s 期望态/实际态：
  // status 仍为脚本自报（票 31 契约不变，D-002 降为诊断项），asserted 才是提交后断言结论。
  reason?: string;   // DIAG_REASON 闭集取值（已验证因果）
  pre?: string;      // 提交前读回值
  post?: string;     // 提交后断言读回值
  asserted?: boolean;// 提交后断言是否成立（读回值承载所选国家的区号/ISO 证据）
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
  // 票 08 [A-031 形态③]：选项文本中的**裸 +NN 区号令牌**（无括号）计数
  textDial: number;
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
  // 票 02 [A-026/A-027]：设置一级入口（打开面板 + 显式切到设置所在视图 + 深链定位语言行）
  openSettings(): void;
  // 票 02 [A-027]：语言切换后重注册 GM 菜单命令的回调（{ id } 原地更新 → 标签免重载跟随）
  _menuRefresh?: (() => void) | null;
  // 票 03 [A-028]：UI 偏好读/写面（GM 存储，独立键 UI_PREFS_KEY）——诊断面 trace 门控经此持久化
  prefs(): PrefsDoc;
  setPref(key: string, val: unknown): void;
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
  open(target: AnyEl | null, kind: FillKind | null, anchor: AnyEl | null, opts?: { remoteSource?: Window | null; view?: PanelView }): void;
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
    // 票 03：机器可读诊断输出（与面板同源；自动化/CI 的唯一读取口）
    __cchDiag?: () => DiagSnapshot;
    // iti 插件宿主全局与页面 jQuery（跨版本鸭子探测面，运行时守卫 + try/catch 兜底）
    intlTelInput?: ItiApi;
    intlTelInputGlobals?: ItiApi;
    jQuery?: any;
    $?: any;
  }
}
