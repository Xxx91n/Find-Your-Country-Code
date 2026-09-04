// ════════════════════════════════════════════════════════
// 评分引擎常量（票 02）— 五层信号瀑布 L0–L4 的权重/阈值显式常量
// 出处缩写（调研文件均在 .scratch/architecture-recovery/research/）：
//   [AM] atomcode-industry-models.md  Chromium 分类优先级链 / WHATWG autocomplete token / 密码管理器三段式
//   [IM] industry-models.md           §④ L0–L4 蓝图 / P1 多信号 / P2 评分分级 / P3 锚关联 / P4 误报三件套
//   [MD] misdetection-root-causes.md  §2 误报 5 类 / §3 漏检 / §5 修复方向（harness reproduced 证据）
//   [SP] spec.md                      Implementation Decisions 评分引擎与分级行动 / US7
// ════════════════════════════════════════════════════════

// ── L0 语义标准层 [AM 核心结论1/2：autocomplete 除 off 外压过一切本地启发式；IM §④ L0"一票强命中"] ──
export const L0_TOKEN_SCORE = 100;        // 命中即高置信档（Chromium：autocomplete 覆盖启发式预测）
export const L0_TEL_TOKENS = ['tel-country-code', 'country', 'country-name'];
export const L0_TEL_HINT_SCORE = 10;      // autocomplete 含 tel 或 type=tel：主号锚语义，非区号字段 [IM P1 语义标准信号]；10 使「type=tel+label 强短语」在无锚场景仍达低调档（34→36）
export const L0_INPUTMODE_TEL_SCORE = 8;  // inputmode=tel [IM §④ L0 结构佐证]

// ── L1 结构文本层 [IM P1 结构文本信号"中"权重、§④ L1"不同组不同权重"；AM 核心结论3 Bitwarden 歧义词表需上下文裁决] ──
export const L1_STRONG_KW_SCORE = 30;     // 区号专名组（countrycode/dialcode/callingcode/phonecode/intlcode/mobilecode/areacode/…）
export const L1_COUNTRY_KW_SCORE = 14;    // country 裸词组 [MD §2④ 国家选择混同 → 低权重，靠 L3 内容验证拉满]
export const L1_PREFIX_KW_SCORE = 7;      // prefix 歧义降权组 [MD §2① prefix 称谓误报]
export const L1_NPA_KW_SCORE = 4;         // 北美编号计划词（npa/trunk，无国家语义）[MD §4 撞库类新发现]
export const L1_LABEL_PHRASE_SCORE = 26;  // label 强短语（国家区号/国际区号/电话区号/呼叫代码/country code/…）
export const L1_BARE_QU_SCORE = 8;        // label 裸词「区号」单独降权 [MD §2② 固话本地区号误报]
export const L1_LOCAL_FIXED_PENALTY = -30;  // label 含 固话/本地/local → 本地区号语义负分 [MD §2②]
export const L1_COMPOUND_SCORE = 40;      // 复合短语「国家/地区区号」「手机区号」白名单，优先级高于 L4 子串排除 [MD §5-0① N1 误杀修复]

// ── L2 锚→目标关联 [IM P3 锚字段→目标字段、§④ L2；SP Implementation Decisions"互证加分"] ──
// 孤立字段减分以"不加锚分"实现（显式负分会把单字段页面/懒渲染场景的真区号字段压出低置信档，
// 标定依据：fp-regression 正例控件（页面无 tel 锚）与 Case5 必须留在低置信档之上）。
export const L2_ANCHOR_TEL_SCORE = 18;    // 同 form（或全文档兜底）内存在另一 input[type=tel] 主号锚

// ── L3 内容验证层 [IM P4 内容验证 rationalization；MD §5-0②"值域整体分布判定而非单值"] ──
export const L3_PLUS_DIAL_SCORE = 4;      // 每个选项值命中真实区号表（+NN/00NN/裸NN 且在 COUNTRIES 拨号集内）
export const L3_PLUS_PAREN_SCORE = 8;     // 选项文本含「(+NN)」括号区号形态（更强证据，cch Case7）
export const L3_DIAL_CAP = 45;            // 内容验证分量上限（Chromium rationalization 复核不单票定案 [IM P4-2]）
export const L3_ISO_BONUS = 30;           // ISO2 值 + EN 国家名文本双占比 ≥50% → 国家选择器语义 [SP US7]
export const L3_NUMERIC_MIN_RATE = 0.6;   // 纯数字枚举占比 ≥60% 且无区号命中 → 排除 [MD §2③ "1-3个月内有效"]
export const L3_NUMERIC_PENALTY = -40;
export const L3_PLUS_LIKE_MIN_RATE = 0.5; // +NN 形似值占比门槛（旧 0.4 被 GMT+8 时区击穿 [MD F5]；现仅作旁证不单独定案）

// ── L4 排除层负分制 [IM §④ L4；MD §5-0① 词边界匹配 + 复合短语白名单优先] ─
export const L4_EXCLUDE_PENALTY = -70;    // 拉丁词按词边界整词匹配、CJK 按短语包含（hidden→idd 子串撞库教训 [MD F6]）

// ── 分级行动阈值 [SP 分级行动；IM P2 阈值分级] ──
export const SCORE_AUTO = 70;             // ≥ 高置信：自动注入
export const SCORE_LOWKEY = 35;           // ≥ 中置信：低调注入；< 不注入（面板可召唤）

// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════

// ── 重扫机制常量（票 04）[IM M8 每 root observer + 旧 observe() 350ms 防抖心智保留] ──
export const RESCAN_DEBOUNCE_MS = 350;    // 重扫防抖窗口；1000 节点级单次 scan 实测须 < 此窗口（票 04 报告 §4）

export const OWN_ROOT_ID = 'cch-root';
export const WRAPPER_CLASS = 'cch-wrapper';

// ════════════════════════════════════════════════════════
// 站点规则引擎常量（票 05）
// [AM] atomcode-industry-models.md 核心结论5：用户可干预后门是行业标配
//      （KeePassXC sites.js Site Preferences / Bitwarden linked custom field / 1Password data-1p-ignore）
// [SP] spec.md Implementation Decisions「站点规则引擎：GM 存储站点级规则（豁免域名 / 强制选择器 / 置信度覆盖）」
// 数据格式与 CRUD 函数边界的权威定义见 src/store/index.ts 头注 +
// research/window-reports/05-site-rules-engine-report.md（07 票接口契约）
// ════════════════════════════════════════════════════════
export const RULES_KEY = 'cch_site_rules_v1';        // 规则文档独立 GM 键（与 favs 键 cch_v33 解耦）
export const RULES_BROADCAST = 'cch-rules-sync-v1';  // 规则跨标签页广播通道名
export const RULE_TIERS = ['auto', 'lowkey', 'none']; // 规则可用分档（强制选择器命中统一按规则声明档注入）
export const RULE_FORCE_TIER = 'auto';               // 强制选择器默认注入档（高置信 [issue 验收2]）
export const RULES_MAX_OVERRIDES = 500;              // 文档内覆盖规则上限（防御异常增长；Ponytail 无导入导出场景）
// ── 面板 UI 常量（票 07）[SP US17「低调样式可配置」/ US18「低置信手动召唤」] ──
export const UI_PREFS_KEY = 'cch_ui_prefs_v1';          // UI 偏好 GM 键（独立键，与收藏/规则解耦）
export const LOWKEY_MODES = ['dim', 'hidden'];           // 中置信注入样式：dim=低调可见；hidden=不注入仅面板召唤
