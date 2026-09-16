// \u7968 42\uFF08A-019\uFF09\uFF1A\u8BED\u8A00\u4E0D\u518D\u7531 navigator.language \u5355\u65B9\u9762\u51B3\u5B9A \u2014\u2014 \u9762\u677F\u624B\u52A8\u9009\u62E9\u7ECF GM \u6301\u4E45\u5316\u540E
// \u8986\u76D6\u81EA\u52A8\u5224\u5B9A\u3002\u4F18\u5148\u7EA7\uFF1A\u663E\u5F0F\u9009\u62E9 > \u6D4F\u89C8\u5668\u8BED\u8A00 > \u9ED8\u8BA4 zh\uFF08atomcode \u8C03\u7814\uFF1A\u4E0E CSS \u7EA7\u8054 /
// Accept-Language \u534F\u5546\u540C\u6784\uFF1BTampermonkey / Greasemonkey \u5B98\u65B9\u6587\u6863\u53CC\u6E90\u786E\u8BA4 GM_getValue \u7684
// \u9ED8\u8BA4\u503C\u8BED\u4E49\u6B63\u597D\u627F\u8F7D\u300C\u672A\u624B\u52A8\u9009\u8FC7\u300D\u5206\u652F\uFF09\u3002
// \u7EA6\u675F\uFF08decision-ledger A-019\uFF09\uFF1A\u4E0D\u7834\u574F\u65E2\u6709 t() \u5951\u7EA6\u4E0E\u4E2D/\u82F1\u6587\u6848\u952E\uFF1B\u5B58\u50A8\u952E\u4E0E\u6536\u85CF/\u89C4\u5219\u89E3\u8026
// \uFF08\u6CBF\u7528 UI_PREFS_KEY \u72EC\u7ACB\u952E\uFF0C\u672C\u6A21\u5757\u4E0D\u76F4\u63A5\u78B0 GM\uFF09\uFF1B\u4E0D\u65B0\u589E\u4F9D\u8D56\uFF08\u5185\u8054\u5B57\u5178\u76F4\u67E5 \u2014\u2014 i18next \u7C7B
// \u8FD0\u884C\u65F6 205-422KB\uFF0C\u5BF9\u5355\u6587\u4EF6 userscript \u4E0D\u53EF\u63A5\u53D7\uFF0C\u89C1 Paraglide benchmark\uFF09\u3002
// \u672C\u6A21\u5757\u4FDD\u6301\u96F6 import\uFF1A\u5355\u5143\u95E8\u6309\u88F8\u6A21\u5757\u4F53\u88C5\u914D\uFF08tests/scripts/verify-ticket-42.mjs \u540C\u5FC3\u667A\uFF09\u3002
export const LOCALE_MODES = ['auto', 'zh', 'en'];   // auto = \u672A\u624B\u52A8\u9009\u62E9\uFF0C\u8DDF\u968F\u6D4F\u89C8\u5668\u8BED\u8A00
const MSG = {
  zh: { search:'\u641C\u7D22\u56FD\u5BB6\u6216\u533A\u53F7\u2026', favs:'\u6536\u85CF', all:'\u5168\u90E8', none:'\u65E0\u7ED3\u679C',
        ok:'\u5DF2\u586B\u5165', copied:'\u672A\u5339\u914D\u5230\u9009\u9879\uFF0C\u5DF2\u590D\u5236', fmtDiverge:'\u5DF2\u586B\u5165\uFF08\u683C\u5F0F\u53EF\u80FD\u6709\u51FA\u5165\uFF09', fillFailed:'\u586B\u5145\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u8F93\u5165', needTarget:'\u8BF7\u5148\u70B9\u51FB\u76EE\u6807\u5B57\u6BB5',
        addFav:'\u6DFB\u52A0\u6536\u85CF', rmFav:'\u53D6\u6D88\u6536\u85CF',
        summon:'\u68C0\u6D4B\u5230\u7591\u4F3C\u533A\u53F7\u5B57\u6BB5\uFF08\u4F4E\u7F6E\u4FE1\uFF09\u2014 \u70B9\u6B64\u624B\u52A8\u53EC\u5524',
        openPanel:'\u6253\u5F00\u533A\u53F7\u9762\u677F',
        ruleNoneRemembered:'\u5DF2\u8BB0\u4F4F\uFF1A\u672C\u9875\u6B64\u5B57\u6BB5\u4E0D\u518D\u63D0\u793A',
        ruleExemptAdded:'\u5DF2\u5728\u672C\u7AD9\u7981\u7528\u672C\u811A\u672C',
        ruleExemptRemoved:'\u5DF2\u6062\u590D\u672C\u7AD9\u68C0\u6D4B',
        feedback:'\u8FD9\u4E0D\u662F\u533A\u53F7\u5B57\u6BB5', rules:'\u7AD9\u70B9\u89C4\u5219', ruleExempt:'\u5728\u672C\u7AD9\u7981\u7528',
        rulesEmpty:'\u672C\u7AD9\u6682\u65E0\u89C4\u5219', ruleDeleted:'\u5DF2\u5220\u9664\u89C4\u5219', on:'\u5F00', off:'\u5173',
        lowkeyStyle:'\u4F4E\u8C03\u6837\u5F0F\uFF08\u4E2D\u7F6E\u4FE1\uFF09', lowkeyDim:'\u4F4E\u8C03\u663E\u793A', lowkeyHidden:'\u9690\u85CF\uFF0C\u4EC5\u53EC\u5524',
        lang:'\u754C\u9762\u8BED\u8A00', langAuto:'\u81EA\u52A8\uFF08\u8DDF\u968F\u6D4F\u89C8\u5668\uFF09', langZh:'\u4E2D\u6587', langEn:'English',
        settings:'\u8BBE\u7F6E', iconLabel:'\u533A\u53F7\u52A9\u624B' },
  en: { search:'Search country or code\u2026', favs:'Favorites', all:'All', none:'No results',
        ok:'Filled', copied:'No match \u2014 copied', fmtDiverge:'Filled (format may differ)', fillFailed:'Fill failed \u2014 enter manually', needTarget:'Click target field first',
        addFav:'Add to favorites', rmFav:'Remove from favorites',
        summon:'Low-confidence matches found \u2014 click to summon',
        openPanel:'Open country-code panel',
        ruleNoneRemembered:'Remembered: this field will not be flagged again on this site',
        ruleExemptAdded:'Script disabled on this site',
        ruleExemptRemoved:'Detection restored on this site',
        feedback:'Not a country-code field', rules:'Site rules', ruleExempt:'Disable on this site',
        rulesEmpty:'No rules on this site', ruleDeleted:'Rule removed', on:'On', off:'Off',
        lowkeyStyle:'Low-key style (mid-confidence)', lowkeyDim:'Dim (visible)', lowkeyHidden:'Hidden (summonable)',
        lang:'Interface language', langAuto:'Auto (follow browser)', langZh:'\u4E2D\u6587', langEn:'English',
        settings:'Settings', iconLabel:'Country Code Helper' },
};
// \u81EA\u52A8\u5224\u5B9A\uFF1A\u6CBF\u7528\u65E2\u6709 navigator.language \u8BED\u4E49\uFF08\u4E0D\u6539\u7528 navigator.languages \u2014\u2014 \u90A3\u4F1A\u6539\u53D8\u65E2\u6709\u5224\u5B9A
// \u884C\u4E3A\uFF0C\u5C5E\u8D8A\u7EBF\uFF0C\u4EC5\u4F5C\u4E3A\u540E\u7EED\u5019\u9009\u767B\u8BB0\u5728\u7A97\u53E3\u62A5\u544A\uFF09\u3002try/catch \u515C\u5E95 Node \u5355\u6D4B\u73AF\u5883\u65E0 navigator \u5168\u5C40
// \uFF08verify \u811A\u672C\u4EE5 __navLanguage \u66FF\u8EAB\u6CE8\u5165\uFF0C\u89C1 tests/scripts/verify-ticket-42.mjs\uFF09\u3002
function autoLocale(): string {
  try { return (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en'; }
  catch { return 'zh'; }
}
// \u751F\u6548\u8BED\u8A00\uFF1A\u4EC5 'zh' / 'en' \u4E3A\u663E\u5F0F\u9009\u62E9\uFF1B'auto' \u4E0E\u4EFB\u4F55\u975E\u6CD5\u503C\u56DE\u843D\u81EA\u52A8\u5224\u5B9A
function resolveLocale(v: unknown): string { return v === 'zh' || v === 'en' ? v : autoLocale(); }
let _locale: string = autoLocale();
export function getLocale(): string { return _locale; }
export function setLocale(v: unknown): string { _locale = resolveLocale(v); return _locale; }
const t = (k: keyof typeof MSG.zh): string => ((MSG as Record<string, Record<string, string>>)[_locale] || MSG.en)[k] || k;

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

export { t };
