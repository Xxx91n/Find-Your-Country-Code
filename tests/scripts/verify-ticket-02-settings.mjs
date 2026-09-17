// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// verify-ticket-02-settings.mjs \u2014 Cycle-6 \u7968 02\u300C\u8BBE\u7F6E\u9762\u6536\u53E3\u300D(A-026 \u00B7 A-027) \u7ED3\u6784\u95E8
// \u65B9\u6CD5\uFF1A\u76F4\u63A5\u8BFB src \u6587\u672C\u505A\u7ED3\u6784\u65AD\u8A00\uFF08\u65E0\u6D4F\u89C8\u5668\u3001\u65E0 npm \u4F9D\u8D56\u3001node \u76F4\u8DD1\uFF09\u3002
// \u8986\u76D6\uFF1AS0 \u81EA\u8BC1 / S1 \u6DF1\u94FE\u76EE\u6807=\u7A33\u5B9A\u6807\u8BC6\u7B26 / S2 \u672A\u65B0\u5EFA\u72EC\u7ACB\u8BBE\u7F6E\u89C6\u56FE / S3 \u672A\u6539 LOCALE_MODES
//   \u53D6\u503C\u8BED\u4E49\u4E0E UI_PREFS_KEY / S4 \u65E0\u624B\u5DE5\u9010\u9879\u5237\u65B0\uFF08\u5B57\u5178\u5316\u5168\u91CF\u91CD\u6E32\u67D3\uFF09/ S5 \u83DC\u5355 id \u539F\u5730\u66F4\u65B0 /
//   S6 \u4E09\u9009\u4E00\u663E\u5F0F\u8BED\u8A00\u63A7\u4EF6\uFF08\u5FAA\u73AF\u6309\u94AE\u5DF2\u79FB\u9664\uFF09\u3002
// \u7528\u6CD5\uFF1Anode tests/scripts/verify-ticket-02-settings.mjs
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let pass = 0;
const failures = [];
const ok = (m) => { pass++; console.log('  PASS ' + m); };
const eq = (a, b, m) => {
  if (a === b) ok(m + ' (' + JSON.stringify(a) + ')');
  else failures.push(m + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
};
const check = (c, m, extra) => {
  if (c) ok(m + (extra ? ' \u2014 ' + extra : ''));
  else failures.push(m + (extra ? ' \u2014 ' + extra : ''));
};
const count = (src, re) => (src.match(re) || []).length;

const CONFIG = read('src/config.ts');
const I18N = read('src/i18n.ts');
const MAIN = read('src/main.ts');
const TYPES = read('src/types.ts');
const UI = read('src/ui/index.ts');

// == S0 \u81EA\u8BC1\uFF08\u5DF2\u77E5\u597D\u6837\u672C\u5E72\u8DD1 [WORKFLOW \u00A75 \u6559\u8BAD]\uFF09==
{
  check(CONFIG.length > 0 && I18N.length > 0 && MAIN.length > 0 && UI.length > 0 && TYPES.length > 0,
    'S0 \u4E94\u4EFD\u6E90\u6587\u4EF6\u53EF\u8BFB\u975E\u7A7A',
    'config=' + CONFIG.length + ' i18n=' + I18N.length + ' main=' + MAIN.length + ' ui=' + UI.length + ' types=' + TYPES.length);
  check(/export const UI_PREFS_KEY\s*=\s*'cch_ui_prefs_v1'/.test(CONFIG), 'S0 \u5DF2\u77E5\u597D\u6837\u672C\u547D\u4E2D UI_PREFS_KEY');
  check(/export const LOCALE_MODES\s*=\s*\['auto', 'zh', 'en'\]/.test(I18N), 'S0 \u5DF2\u77E5\u597D\u6837\u672C\u547D\u4E2D LOCALE_MODES');
}

// == S1 \u6DF1\u94FE\u76EE\u6807 = \u7A33\u5B9A\u6807\u8BC6\u7B26\uFF08\u4E0D\u7ED1\u5185\u90E8\u5B9E\u73B0\u540D / \u6613\u53D8\u6392\u5E8F\u4F4D\u7F6E\uFF09==
{
  check(/export const SETTINGS_VIEW\s*=\s*'settings'/.test(CONFIG), 'S1 config \u5BFC\u51FA SETTINGS_VIEW');
  check(/export const SETTINGS_SECTION_LOCALE\s*=\s*'locale'/.test(CONFIG), 'S1 config \u5BFC\u51FA SETTINGS_SECTION_LOCALE');
  check(/import\s*\{[^}]*SETTINGS_VIEW[^}]*\}\s*from\s*'\.\.\/config'/.test(UI), 'S1 ui \u6D88\u8D39 SETTINGS_VIEW \u5E38\u91CF\uFF08\u975E\u5B57\u9762\u91CF\uFF09');
  check(/import\s*\{[^}]*SETTINGS_SECTION_LOCALE[^}]*\}\s*from\s*'\.\.\/config'/.test(UI), 'S1 ui \u6D88\u8D39 SETTINGS_SECTION_LOCALE \u5E38\u91CF');
  check(/setAttribute\('data-cch-view',\s*SETTINGS_VIEW\)/.test(UI), 'S1 \u89C6\u56FE\u6807\u8BB0\u7531\u5E38\u91CF\u5199\u5165');
  check(/setAttribute\('data-cch-section',\s*SETTINGS_SECTION_LOCALE\)/.test(UI), 'S1 \u884C slug \u7531\u5E38\u91CF\u5199\u5165');
  check(/querySelector<HTMLElement>\('\[data-cch-section="'\s*\+\s*slug/.test(UI), 'S1 \u5B9A\u4F4D\u8D70 data-cch-section \u5C5E\u6027\u9009\u62E9\u5668');
  check(!/getElementById\('cch-locale-row'\)/.test(UI), 'S1 \u5B9A\u4F4D\u4E0D\u4F9D\u8D56 id \u5B57\u9762\u91CF');
}

// == S2 \u672A\u65B0\u5EFA\u72EC\u7ACB\u8BBE\u7F6E\u89C6\u56FE ==
{
  eq(count(UI, /setAttribute\('data-cch-view'/g), 1, 'S2 \u5168\u4ED3\u4EC5\u4E00\u5904\u89C6\u56FE\u6807\u8BB0\u5199\u5165');
  check(/#cch-rules-view/.test(UI), 'S2 \u8BBE\u7F6E\u9762\u6302\u5728\u65E2\u6709 #cch-rules-view\uFF08\u7968 07 \u65E2\u6709\u8282\u70B9\uFF09');
  check(!/cch-settings-view|id = 'cch-settings'/.test(UI), 'S2 \u672A\u65B0\u5EFA settings \u89C6\u56FE\u5BB9\u5668');
}

// == S3 \u672A\u6539 LOCALE_MODES \u53D6\u503C\u8BED\u4E49\u4E0E UI_PREFS_KEY ==
{
  eq(count(I18N, /export const LOCALE_MODES\s*=\s*\['auto', 'zh', 'en'\]/g), 1, 'S3 LOCALE_MODES \u53D6\u503C\u8BED\u4E49\u672A\u53D8');
  eq(count(CONFIG, /UI_PREFS_KEY\s*=\s*'cch_ui_prefs_v1'/g), 1, 'S3 UI_PREFS_KEY \u6301\u4E45\u5316\u952E\u672A\u53D8');
}

// == S4 \u65E0\u624B\u5DE5\u9010\u9879\u5237\u65B0\uFF08\u5B57\u5178\u5316\u5168\u91CF\u91CD\u6E32\u67D3\uFF09==
{
  eq(count(UI, /_applyLocaleText\(\): void/g), 0, 'S4 \u624B\u5DE5\u9010\u9879\u5237\u65B0 _applyLocaleText \u5DF2\u5220\u9664');
  check(/data-i18n-placeholder/.test(UI) && /data-i18n-title/.test(UI) && /data-i18n-aria-label/.test(UI),
    'S4 \u5B58\u5728 data-i18n* \u5B57\u5178\u6807\u8BB0\u65CF');
  check(/_i18n\(\): void \{/.test(UI), 'S4 \u5B58\u5728 _i18n() \u7EDF\u4E00\u5237\u65B0');
  check(/_refreshIconLabels\(\): void \{/.test(UI), 'S4 \u5B58\u5728\u56FE\u6807\u6587\u6848\u5237\u65B0');
  check(/_renderRows\(favList, favData\)/.test(UI) && /_renderRows\(allList, allData\)/.test(UI),
    'S4 \u884C\u6570\u636E\u5168\u91CF\u91CD\u6E32\u67D3\uFF08\u542B\u6536\u85CF\u884C title / \u7A7A\u6001\u6587\u6848\uFF09');
}

// == S5 \u83DC\u5355 id \u539F\u5730\u66F4\u65B0 ==
{
  eq(count(MAIN, /id:\s*'cch-menu-[a-z-]+'/g), 4, 'S5 \u56DB\u6761\u83DC\u5355\u547D\u4EE4\u5747\u5E26\u7A33\u5B9A id');
  check(/UI\._menuRefresh\s*=\s*refreshMenu/.test(MAIN), 'S5 \u83DC\u5355\u5237\u65B0\u56DE\u8C03\u5DF2\u63A5\u7EBF');
  check(/this\._menuRefresh\(\)/.test(UI), 'S5 \u8BED\u8A00\u5207\u6362\u89E6\u53D1\u83DC\u5355\u5237\u65B0');
  check(/openSettings\(\)/.test(MAIN), 'S5 \u83DC\u5355\u300C\u8BBE\u7F6E\u300D\u9879\u8C03\u7528 UI.openSettings()');
  check(/declare function GM_registerMenuCommand\(title: string, fn: \(\) => void, options\?: \{ id\?: string \}\)/.test(MAIN),
    'S5 declare \u5F62\u53C2\u542B options.id');
  check(/openSettings\(\): void;/.test(TYPES), 'S5 CchUI \u58F0\u660E openSettings()');
  check(/_menuRefresh\?: \(\(\) => void\) \| null;/.test(TYPES), 'S5 CchUI \u58F0\u660E _menuRefresh \u56DE\u8C03\u4F4D');
}

// == S6 \u4E09\u9009\u4E00\u663E\u5F0F\u8BED\u8A00\u63A7\u4EF6 ==
{
  check(/LOCALE_MODES/.test(UI), 'S6 \u8BED\u8A00\u63A7\u4EF6\u7531 LOCALE_MODES \u9A71\u52A8');
  check(/setAttribute\('data-locale', mode\)/.test(UI), 'S6 \u6BCF\u4E2A\u9009\u9879\u5E26 data-locale \u7A33\u5B9A\u503C');
  check(/cch-locale-opt/.test(UI), 'S6 \u5B58\u5728\u9009\u9879\u6837\u5F0F\u7C7B cch-locale-opt');
  eq(count(UI, /cch-locale-tg/g), 0, 'S6 \u5FAA\u73AF\u6309\u94AE cch-locale-tg \u5DF2\u79FB\u9664');
  check(/role', 'radiogroup'/.test(UI), 'S6 \u4E09\u9009\u4E00\u4E3A radiogroup \u8BED\u4E49');
}

console.log('-----------------------------');
console.log('verify-ticket-02-settings: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
