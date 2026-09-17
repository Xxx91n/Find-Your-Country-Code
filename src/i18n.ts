// 票 42（A-019）：语言不再由 navigator.language 单方面决定 —— 面板手动选择经 GM 持久化后
// 覆盖自动判定。优先级：显式选择 > 浏览器语言 > 默认 zh（atomcode 调研：与 CSS 级联 /
// Accept-Language 协商同构；Tampermonkey / Greasemonkey 官方文档双源确认 GM_getValue 的
// 默认值语义正好承载「未手动选过」分支）。
// 约束（decision-ledger A-019）：不破坏既有 t() 契约与中/英文案键；存储键与收藏/规则解耦
// （沿用 UI_PREFS_KEY 独立键，本模块不直接碰 GM）；不新增依赖（内联字典直查 —— i18next 类
// 运行时 205-422KB，对单文件 userscript 不可接受，见 Paraglide benchmark）。
// 本模块保持零 import：单元门按裸模块体装配（tests/scripts/verify-ticket-42.mjs 同心智）。
export const LOCALE_MODES = ['auto', 'zh', 'en'];   // auto = 未手动选择，跟随浏览器语言
const MSG = {
  zh: { search:'搜索国家或区号…', favs:'收藏', all:'全部', none:'无结果',
        ok:'已填入', copied:'未匹配到选项，已复制', fmtDiverge:'已填入（格式可能有出入）', fillFailed:'填充失败，请手动输入', needTarget:'请先点击目标字段',
        addFav:'添加收藏', rmFav:'取消收藏',
        summon:'检测到疑似区号字段（低置信）— 点此手动召唤',
        openPanel:'打开区号面板',
        ruleNoneRemembered:'已记住：本页此字段不再提示',
        ruleExemptAdded:'已在本站禁用本脚本',
        ruleExemptRemoved:'已恢复本站检测',
        feedback:'这不是区号字段', rules:'站点规则', ruleExempt:'在本站禁用',
        rulesEmpty:'本站暂无规则', ruleDeleted:'已删除规则', on:'开', off:'关',
        lowkeyStyle:'低调样式（中置信）', lowkeyDim:'低调显示', lowkeyHidden:'隐藏，仅召唤',
        // ticket 03 [A-028]: diagnostics surface strings (independent view + summary entry + per-layer fix hints)
        diagnostics:'诊断', diagOpen:'诊断', diagLayers:'四层判定', diagCounters:'计数器', diagTimeline:'决策链时间线', diagExport:'导出诊断', diagTrace:'全链路 trace', diagClear:'清空诊断', diagEmpty:'暂无诊断记录', diagTool:'工具层', diagInject:'注入层', diagLogic:'逻辑层', diagWrite:'写入层', diagPass:'通过', diagFail:'失败', diagUnknown:'未知', diagAll:'全部', diagTruncated:'记录已截断', diagFixTool:'检查字段识别信号与站点规则', diagFixInject:'检查注入档位与可见性闸门', diagFixLogic:'检查选项匹配与目标解析', diagFixWrite:'检查写入后读回断言', diagExported:'诊断已复制',
        lang:'界面语言', langAuto:'自动（跟随浏览器）', langZh:'中文', langEn:'English',
        settings:'设置', iconLabel:'区号助手' },
  en: { search:'Search country or code…', favs:'Favorites', all:'All', none:'No results',
        ok:'Filled', copied:'No match — copied', fmtDiverge:'Filled (format may differ)', fillFailed:'Fill failed — enter manually', needTarget:'Click target field first',
        addFav:'Add to favorites', rmFav:'Remove from favorites',
        summon:'Low-confidence matches found — click to summon',
        openPanel:'Open country-code panel',
        ruleNoneRemembered:'Remembered: this field will not be flagged again on this site',
        ruleExemptAdded:'Script disabled on this site',
        ruleExemptRemoved:'Detection restored on this site',
        feedback:'Not a country-code field', rules:'Site rules', ruleExempt:'Disable on this site',
        rulesEmpty:'No rules on this site', ruleDeleted:'Rule removed', on:'On', off:'Off',
        lowkeyStyle:'Low-key style (mid-confidence)', lowkeyDim:'Dim (visible)', lowkeyHidden:'Hidden (summonable)',
        // ticket 03 [A-028]: diagnostics surface strings (independent view + summary entry + per-layer fix hints)
        diagnostics:'Diagnostics', diagOpen:'Diagnostics', diagLayers:'Four layers', diagCounters:'Counters', diagTimeline:'Decision timeline', diagExport:'Export', diagTrace:'Full-chain trace', diagClear:'Clear', diagEmpty:'No diagnostics yet', diagTool:'Tool', diagInject:'Inject', diagLogic:'Logic', diagWrite:'Write', diagPass:'pass', diagFail:'fail', diagUnknown:'unknown', diagAll:'all', diagTruncated:'truncated', diagFixTool:'Check field signals and site rules', diagFixInject:'Check inject tier and visibility gate', diagFixLogic:'Check option matching and target resolution', diagFixWrite:'Check post-write read-back assertion', diagExported:'Diagnostics copied',
        lang:'Interface language', langAuto:'Auto (follow browser)', langZh:'中文', langEn:'English',
        settings:'Settings', iconLabel:'Country Code Helper' },
};
// 自动判定：沿用既有 navigator.language 语义（不改用 navigator.languages —— 那会改变既有判定
// 行为，属越线，仅作为后续候选登记在窗口报告）。try/catch 兜底 Node 单测环境无 navigator 全局
// （verify 脚本以 __navLanguage 替身注入，见 tests/scripts/verify-ticket-42.mjs）。
function autoLocale(): string {
  try { return (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en'; }
  catch { return 'zh'; }
}
// 生效语言：仅 'zh' / 'en' 为显式选择；'auto' 与任何非法值回落自动判定
function resolveLocale(v: unknown): string { return v === 'zh' || v === 'en' ? v : autoLocale(); }
let _locale: string = autoLocale();
export function getLocale(): string { return _locale; }
export function setLocale(v: unknown): string { _locale = resolveLocale(v); return _locale; }
const t = (k: keyof typeof MSG.zh): string => ((MSG as Record<string, Record<string, string>>)[_locale] || MSG.en)[k] || k;

// ════════════════════════════════════════════════════════════════════

export { t };
