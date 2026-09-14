// =====================================================================
// verify-ticket-42.mjs - \u7968 42 \u8BED\u8A00\u5207\u6362\u6536\u53E3\u5355\u5143\u95E8\uFF08node \u76F4\u8DD1\uFF0C\u65E0\u6D4F\u89C8\u5668\uFF09
// \u65B9\u6CD5\uFF1Aconfig / data / i18n / ui \u56DB\u6A21\u5757\u5265\u79BB import/export \u6309\u4F9D\u8D56\u5E8F\u62FC\u63A5 -> new Function
//   \u88C5\u914D\uFF08\u4E0E verify-ticket-05/31.mjs \u540C\u5FC3\u667A\uFF09\uFF1BGM_* \u7528\u5185\u5B58\u6876 mock\uFF08\u6301\u4E45\u5316\u771F\u76F8\u6E90\uFF09\u3002
// \u8986\u76D6\uFF1AG0 \u81EA\u8BC1\uFF08\u5DF2\u77E5\u597D\u6837\u672C\u5E72\u8DD1 [WORKFLOW 5 \u6559\u8BAD]\uFF09/ G1 \u6B7B\u5BFC\u51FA\u6E05\u9664 / G2 t() \u5951\u7EA6\u4E0E
//   zh-en \u952E\u96C6 / G3 \u81EA\u52A8\u5224\u5B9A\u4FDD\u7559 / G4 \u624B\u52A8\u9009\u62E9\u751F\u6548 / G5 \u9762\u677F\u6301\u4E45\u5316 + \u5B58\u50A8\u952E\u89E3\u8026
// \u7528\u6CD5\uFF1Anode tests/scripts/verify-ticket-42.mjs\uFF08CI \u9489 node 22\uFF09
// =====================================================================
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');

function stripTypes(src) {
  if (typeof stripTypeScriptTypes !== 'function') {
    throw new Error('verify-ticket-42 \u9700\u8981 Node >= 22.13\uFF08module.stripTypeScriptTypes\uFF09\uFF1BCI \u5DF2\u9489 node-version 22');
  }
  return stripTypeScriptTypes(src, { mode: 'strip' });
}

function toModuleBody(file) {
  return readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^declare\s+function[\s\S]*?;\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

// -- GM mock\uFF1A\u5185\u5B58\u6876\uFF08\u7968 42 \u6301\u4E45\u5316\u65AD\u8A00\u7684\u771F\u76F8\u6E90\uFF09--
const BUCKET = Object.create(null);
globalThis.GM_getValue = (k, d) => (k in BUCKET ? BUCKET[k] : d);
globalThis.GM_setValue = (k, v) => { BUCKET[k] = v; };
globalThis.GM_addValueChangeListener = () => 0;

const I18N_SRC = readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8');
const STORE_SRC = readFileSync(join(ROOT, 'src', 'store', 'index.ts'), 'utf8');
const FAVS_KEY = (STORE_SRC.match(/_k:\s*'([^']+)'/) || [])[1];

const BUNDLE = [
  toModuleBody(join(ROOT, 'src', 'config.ts')),
  toModuleBody(join(ROOT, 'src', 'data', 'countries.ts')),
  toModuleBody(join(ROOT, 'src', 'i18n.ts')),
  toModuleBody(join(ROOT, 'src', 'ui', 'index.ts')),
].join('\n').replace(/navigator\.language/g, '__navLanguage');

// \u6BCF\u6B21\u88C5\u8F7D = \u4E00\u4E2A\u811A\u672C\u5B9E\u4F8B\uFF08__navLanguage \u4E3A\u6D4F\u89C8\u5668\u8BED\u8A00\u66FF\u8EAB\uFF09
function load(navLang) {
  const prelude = 'const __navLanguage = ' + JSON.stringify(navLang) + ';\n';
  return new Function(prelude + stripTypes(BUNDLE) +
    '\n;return { t, setLocale, getLocale, LOCALE_MODES, MSG, createUI, UI_PREFS_KEY, RULES_KEY };')();
}

let pass = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push(name + (detail ? ' | ' + detail : ''));
  console.log('FAIL ' + name + (detail ? ' | ' + detail : ''));
}
function eq(a, b, name) { check(name, a === b, 'got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }

// == G0 \u81EA\u8BC1\uFF1A\u9A8C\u6536\u811A\u672C\u5148\u5BF9\u5DF2\u77E5\u597D\u6837\u672C\u5E72\u8DD1\uFF08WORKFLOW 5 \u6559\u8BAD\uFF1A\u5148\u533A\u5206\u5DE5\u5177\u8BEF\u62A5\u4E0E\u771F\u5B9E\u7F3A\u9677\uFF09==
{
  const m = load('zh-CN');
  check('G0 \u88C5\u914D\u6210\u529F\uFF08i18n+ui \u6A21\u5757\u4F53\u53EF\u6267\u884C\uFF09', typeof m.t === 'function' && typeof m.createUI === 'function');
  eq(m.t('favs'), '\u6536\u85CF', 'G0 \u5DF2\u77E5\u597D\u6837\u672C zh-CN -> \u4E2D\u6587');
  eq(m.t('all'), '\u5168\u90E8', 'G0 t() \u65E2\u6709\u952E\u672A\u7834\u574F');
  const e = load('en-US');
  eq(e.t('favs'), 'Favorites', 'G0 \u5DF2\u77E5\u597D\u6837\u672C en-US -> \u82F1\u6587');
}

// == G1 \u6B7B\u5BFC\u51FA\u6E05\u9664\uFF08A-019 \u540E\u534A\uFF1A\u6A21\u5757\u65E0\u6B7B\u5BFC\u51FA\uFF09==
{
  check('G1 LANG \u6B7B\u5BFC\u51FA\u5DF2\u6E05\u9664\uFF08i18n.ts \u65E0 LANG \u6807\u8BC6\u7B26\uFF09', !/\bLANG\b/.test(I18N_SRC));
  const names = [];
  for (const mm of I18N_SRC.matchAll(/^export\s+(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)) names.push(mm[1]);
  for (const mm of I18N_SRC.matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm)) {
    for (const part of mm[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.push(n);
    }
  }
  check('G1 i18n \u5BFC\u51FA\u9762\u975E\u7A7A', names.length > 0, 'exports=' + names.join(','));
  const imported = new Set();
  for (const d of ['', 'detect', 'fill', 'iti-adapter', 'rules', 'store', 'ui']) {
    for (const f of readdirSync(join(ROOT, 'src', d))) {
      if (!f.endsWith('.ts')) continue;
      const s = readFileSync(join(ROOT, 'src', d, f), 'utf8');
      for (const mm of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*i18n'/g)) {
        for (const part of mm[1].split(',')) { const n = part.trim(); if (n) imported.add(n); }
      }
    }
  }
  const dead = names.filter(n => !imported.has(n));
  check('G1 \u6A21\u5757\u65E0\u6B7B\u5BFC\u51FA\uFF08\u6BCF\u4E2A export \u90FD\u88AB src/ \u5177\u540D\u5BFC\u5165\uFF09', dead.length === 0,
    'dead=' + dead.join(',') + ' | exports=' + names.join(',') + ' | imported=' + [...imported].join(','));
}

// == G2 t() \u5951\u7EA6\u4E0E\u4E2D/\u82F1\u6587\u6848\u952E\uFF08issue \u9A8C\u65362\uFF09==
{
  const m = load('zh-CN');
  eq(typeof m.t, 'function', 'G2 t() \u4ECD\u662F\u51FD\u6570\uFF08\u5951\u7EA6\u672A\u53D8\uFF09');
  eq(m.t('__nope__'), '__nope__', 'G2 \u672A\u547D\u4E2D\u952E\u56DE\u843D\u952E\u540D\uFF08\u65E2\u6709\u5951\u7EA6\uFF09');
  const kz = Object.keys(m.MSG.zh).sort(), ke = Object.keys(m.MSG.en).sort();
  check('G2 zh/en \u952E\u96C6\u4E00\u81F4', JSON.stringify(kz) === JSON.stringify(ke), kz.join(',') + ' vs ' + ke.join(','));
  check('G2 \u8BED\u8A00\u9009\u62E9\u65B0\u589E\u952E\u53CC\u8BED\u9F50',
    typeof m.MSG.zh.lang === 'string' && typeof m.MSG.en.lang === 'string' &&
    typeof m.MSG.zh.langAuto === 'string' && typeof m.MSG.en.langAuto === 'string');
  eq(m.MSG.zh.search, '\u641C\u7D22\u56FD\u5BB6\u6216\u533A\u53F7\u2026', 'G2 \u65E2\u6709\u4E2D\u6587\u6848\u672A\u6539');
  eq(m.MSG.en.search, 'Search country or code\u2026', 'G2 \u65E2\u6709\u82F1\u6587\u6848\u672A\u6539');
}

// == G3 \u81EA\u52A8\u5224\u5B9A\u4FDD\u7559\uFF08\u6D4F\u89C8\u5668\u8BED\u8A00\u4ECD\u662F\u672A\u624B\u52A8\u9009\u62E9\u65F6\u7684\u6765\u6E90\uFF09==
{
  eq(load('zh-CN').getLocale(), 'zh', 'G3 zh-CN -> zh');
  eq(load('zh-TW').getLocale(), 'zh', 'G3 zh-TW -> zh');
  eq(load('en-US').getLocale(), 'en', 'G3 en-US -> en');
  eq(load('ja-JP').getLocale(), 'en', 'G3 \u975E\u4E2D\u6587 -> en');
  eq(load('').getLocale(), 'zh', 'G3 \u6D4F\u89C8\u5668\u8BED\u8A00\u7F3A\u5931 -> zh\uFF08\u65E2\u6709 || zh \u8BED\u4E49\uFF09');
}

// == G4 \u624B\u52A8\u9009\u62E9\u8986\u76D6\u81EA\u52A8\u5224\u5B9A\uFF08issue \u9A8C\u65361 \u524D\u534A\uFF1A\u8BED\u8A00\u4E0D\u518D\u7531 navigator.language \u5355\u65B9\u9762\u51B3\u5B9A\uFF09==
{
  const m = load('ja-JP');
  eq(m.getLocale(), 'en', 'G4 \u57FA\u7EBF\uFF1A\u81EA\u52A8\u5224\u5B9A en');
  eq(m.setLocale('zh'), 'zh', 'G4 setLocale \u8FD4\u56DE\u751F\u6548\u8BED\u8A00');
  eq(m.getLocale(), 'zh', 'G4 \u624B\u52A8\u9009\u4E2D\u6587\u751F\u6548');
  eq(m.t('favs'), '\u6536\u85CF', 'G4 \u624B\u52A8\u9009\u62E9\u8986\u76D6\u6D4F\u89C8\u5668\u8BED\u8A00\uFF08t \u5373\u65F6\u5207\u6362\uFF09');
  eq(m.setLocale('en'), 'en', 'G4 \u5207\u56DE\u82F1\u6587');
  eq(m.t('favs'), 'Favorites', 'G4 t \u5373\u65F6\u5207\u56DE\u82F1\u6587');
  eq(m.setLocale('bogus'), 'en', 'G4 \u975E\u6CD5\u503C\u56DE\u843D\u81EA\u52A8\u5224\u5B9A');
  eq(m.setLocale('auto'), 'en', 'G4 auto \u56DE\u843D\u81EA\u52A8\u5224\u5B9A');
  check('G4 LOCALE_MODES \u542B auto/zh/en', ['auto', 'zh', 'en'].every(x => m.LOCALE_MODES.includes(x)),
    JSON.stringify(m.LOCALE_MODES));
}

// == G5 \u9762\u677F\u6301\u4E45\u5316 + \u5B58\u50A8\u952E\u89E3\u8026\uFF08issue \u9A8C\u65361/3\uFF09==
{
  const m = load('en-US');
  eq(m.UI_PREFS_KEY, 'cch_ui_prefs_v1', 'G5 \u6CBF\u7528 UI_PREFS_KEY \u72EC\u7ACB\u952E');
  check('G5 \u4E0E\u6536\u85CF\u952E\u89E3\u8026', m.UI_PREFS_KEY !== FAVS_KEY, 'favs=' + FAVS_KEY);
  check('G5 \u4E0E\u89C4\u5219\u952E\u89E3\u8026', m.UI_PREFS_KEY !== m.RULES_KEY, 'rules=' + m.RULES_KEY);

  const Store = { getFavs: () => [], subscribe: () => () => {}, getSiteRules: () => null };
  const UI = m.createUI(Store, { Fill: null, Rules: null });
  eq(UI.prefs().locale, 'auto', 'G5 \u65E0\u504F\u597D -> locale=auto\uFF08\u8DDF\u968F\u6D4F\u89C8\u5668\uFF09');

  UI.setPref('locale', 'zh');
  const doc1 = JSON.parse(BUCKET[m.UI_PREFS_KEY]);
  eq(doc1.locale, 'zh', 'G5 setPref \u5199\u5165 GM \u6876 locale=zh');
  check('G5 \u504F\u597D\u6587\u6863\u4E0D\u542B\u6536\u85CF/\u89C4\u5219\u6570\u636E', !('favs' in doc1) && !('exempt' in doc1), JSON.stringify(doc1));
  check('G5 \u672A\u6C61\u67D3\u6536\u85CF\u952E', !(FAVS_KEY in BUCKET), 'bucket=' + Object.keys(BUCKET).join(','));
  check('G5 \u672A\u6C61\u67D3\u89C4\u5219\u952E', !(m.RULES_KEY in BUCKET), 'bucket=' + Object.keys(BUCKET).join(','));

  const UI2 = m.createUI(Store, { Fill: null, Rules: null });
  eq(UI2.prefs().locale, 'zh', 'G5 \u65B0\u5B9E\u4F8B\uFF08= \u5237\u65B0\u9875\u9762\uFF09\u8BFB\u56DE zh \u2014\u2014 \u6301\u4E45\u5316\u6210\u7ACB');
  m.setLocale(UI2.prefs().locale);
  eq(m.t('favs'), '\u6536\u85CF', 'G5 \u6301\u4E45\u5316\u7684\u8BED\u8A00\u9009\u62E9\u9A71\u52A8 t()');

  UI2.setPref('locale', 'en');
  const UI3 = m.createUI(Store, { Fill: null, Rules: null });
  eq(UI3.prefs().locale, 'en', 'G5 \u5207\u82F1\u6587\u540E\u8BFB\u56DE en');
  m.setLocale(UI3.prefs().locale);
  eq(m.t('favs'), 'Favorites', 'G5 \u5207\u82F1\u6587\u540E t() \u4E3A\u82F1\u6587');

  BUCKET[m.UI_PREFS_KEY] = '{not json';
  eq(m.createUI(Store, { Fill: null, Rules: null }).prefs().locale, 'auto', 'G5 \u635F\u574F JSON -> \u56DE\u843D auto');
  BUCKET[m.UI_PREFS_KEY] = JSON.stringify({ locale: 'xx', lowkeyMode: 'dim' });
  const UI5 = m.createUI(Store, { Fill: null, Rules: null });
  eq(UI5.prefs().locale, 'auto', 'G5 \u975E\u6CD5 locale -> \u56DE\u843D auto');
  eq(UI5.prefs().lowkeyMode, 'dim', 'G5 \u5F52\u4E00\u5316\u4E0D\u4E22\u65E2\u6709 lowkeyMode');
  delete BUCKET[m.UI_PREFS_KEY];
}

console.log('-----------------------------');
console.log('verify-ticket-42: ' + pass + ' PASS, ' + failures.length + ' FAIL');
if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
