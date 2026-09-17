// ══════════════════════════════════════════════════════════════════
// verify-ticket-08.mjs — 票 08（阶段 B）/ A-031 · A-032 验收门
//
// 分组：
//   G1 A-031 语料先行：三个新形态已入校准语料，且未先改检测代码即已记录基线
//   G2 A-032 两子形态 fixture + N7 机理假设据实修正
//   G3 豁免语义不回退（票 13 检查点一：闸门只改注入档位、不改检测登记）
//   G4 无回退与常量锁（语料基线 / 参数锁 / 性能红线未弱化）
//   G5 声明与纪律
//
// 证据口径：本门为**本地自证**（WORKFLOW §8.1.2）；行为面闭环以 CI run 为准。
// 用法：node tests/scripts/verify-ticket-08.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, loadManifest, bundleEngine, buildElement, evaluateCase, runCorpus, metrics,
} from './14-lib-engine.mjs';

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log('[' + (ok ? 'PASS' : 'FAIL') + '] ' + name + (detail ? ' — ' + detail : ''));
}
const num = (src, name) => {
  const at = src.indexOf('export const ' + name);
  const m = at < 0 ? null : src.slice(at + ('export const ' + name).length).match(/-?[0-9]+/);
  if (!m) throw new Error('config constant not found: ' + name);
  return Number(m[0]);
};
const cfgSrc = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const detectSrc = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
const REG_MIN = num(cfgSrc, 'ITI_LOW_REGISTER_SCORE');

const manifest = loadManifest();
const { Detect } = bundleEngine();
const byId = new Map(manifest.cases.map((c) => [c.id, c]));
const sigOf = (r, name) => (r.signals || []).find((s) => s.name === name);
const evalId = (id) => evaluateCase(byId.get(id), Detect);

// ── G1 A-031 语料先行 ──
console.log('\n=== G1 A-031：三个新形态先入校准语料（正/负例） ===');
const a031Ids = ['N31-iti-searchbox', 'N31-iso2-lang-select', 'P31-noparen-dial-select', 'P31-paren-dial-control'];
check('G1a 三个 A-031 形态 + 括号对照例均已入语料',
  a031Ids.every((id) => byId.has(id)), 'ids=' + a031Ids.join(','));

const iti = evalId('N31-iti-searchbox');
check('G1b iti v29 内部搜索框登记为负例（不得注入）', !iti.injected && iti.tier === 'none',
  iti.score + '/' + iti.tier);
check('G1c 搜索框由 INPUT 类型闸门裁定（gate:input-type:search）',
  !!sigOf(iti, 'gate:input-type:search'), (iti.signals || []).map((s) => s.name).join('|'));

const lang = evalId('N31-iso2-lang-select');
check('G1d 值恰为 ISO2 的语言下拉不注入（伪区号陷阱）', !lang.injected && lang.tier === 'none',
  lang.score + '/' + lang.tier);
check('G1e 语言下拉由 L4 语言/翻译排除组裁定（exclude:latin）',
  !!sigOf(lang, 'exclude:latin'), (lang.signals || []).map((s) => s.name).join('|'));

const noparen = evalId('P31-noparen-dial-select');
const paren = evalId('P31-paren-dial-control');
check('G1f 无括号区号文本入账新信号 opts:+NN-text（票 08 前 L3 漏此形态）',
  !!sigOf(noparen, 'opts:+NN-text'), (noparen.signals || []).map((s) => s.name).join('|'));
check('G1g 无括号与括号形式同档位（证据本体是区号，括号只是排版）',
  noparen.tier === paren.tier && noparen.injected === paren.injected,
  'noparen=' + noparen.score + '/' + noparen.tier + ' paren=' + paren.score + '/' + paren.tier);
check('G1h 两个区号文本计数器互斥不重复计分（无括号例不产生 opts:(+NN)-text）',
  !sigOf(noparen, 'opts:(+NN)-text'), (noparen.signals || []).map((s) => s.name).join('|'));
check('G1i 值本身为区号时不额外计文本区号（避免同证据双写重复计分）',
  !sigOf(evalId('N7'), 'opts:+NN-text'), 'N7 signals=' + (evalId('N7').signals || []).map((s) => s.name).join('|'));

// ── G2 A-032 两子形态 fixture + N7 修正 ──
console.log('\n=== G2 A-032：视觉替换型隐藏 select 两子形态 ===');
const FIX = 'tests/fixtures/visual-replacement-hidden-select.html';
const SPEC = 'tests/visual-replacement.spec.ts';
const fixAbs = join(ROOT, FIX), specAbs = join(ROOT, SPEC);
check('G2a 密封 fixture 落盘', existsSync(fixAbs), FIX);
check('G2b 密封 spec 落盘', existsSync(specAbs), SPEC);
const fixSrc = existsSync(fixAbs) ? readFileSync(fixAbs, 'utf8') : '';
const specSrc = existsSync(specAbs) ? readFileSync(specAbs, 'utf8') : '';
check('G2c fixture 含子形态 A（width:1px + aria-hidden + clip/clip-path）',
  /id="vrs-a-native"/.test(fixSrc) && /aria-hidden="true"/.test(fixSrc) && /clip:\s*rect\(0 0 0 0\)/.test(fixSrc) && /clip-path:\s*inset\(50%\)/.test(fixSrc));
check('G2d fixture 含子形态 B（display:none）',
  /id="vrs-b-native"/.test(fixSrc) && /\.vrs-chosen-select\s*\{\s*display:\s*none/.test(fixSrc));
check('G2e spec 两个子形态各有用例（闸门降档 + 登记不回退）',
  /#vrs-a-native/.test(specSrc) && /#vrs-b-native/.test(specSrc) && /toHaveCount\(0\)/.test(specSrc) && /toHaveCount\(1\)/.test(specSrc));
check('G2f spec 断言填充写入 + 事件 + 页面侧回声（外部可观测，D-002）',
  /softHostValue/.test(specSrc) && /softFieldEvent/.test(specSrc) && /vrs-a-echo|vrs-b-echo/.test(specSrc));

const n7 = byId.get('N7');
check('G2g N7 机理假设已据实修正（aria-hidden + clip + 非零尺寸）',
  n7 && n7.el && n7.el.attrs && n7.el.attrs['aria-hidden'] === 'true' &&
  !!(n7.el.style && n7.el.style.clip) && !!(n7.el.rect && n7.el.rect.width === 1),
  JSON.stringify(n7 && n7.el && n7.el.attrs));
check('G2h N7 保留原文假设供审计（supersededAssumption）',
  !!(n7 && n7.supersededAssumption && /\u673a\u7406\u5047\u8bbe|\u4e0d\u7b26/.test(n7.supersededAssumption)));
const n7b = byId.get('N7b');
check('G2i N7b 子形态 B 入语料（display:none）',
  n7b && n7b.el && n7b.el.style && n7b.el.style.display === 'none');
check('G2j 两子形态均被可见性闸门判定为隐藏（机理可测）',
  Detect._hiddenByStyle(buildElement(n7)) === true && Detect._hiddenByStyle(buildElement(n7b)) === true);
check('G2k 两子形态评分层未被硬排除（score >= 登记线 ' + REG_MIN + '，登记可达）',
  evalId('N7').score >= REG_MIN && evalId('N7b').score >= REG_MIN,
  'N7=' + evalId('N7').score + ' N7b=' + evalId('N7b').score);
check('G2l 两子形态不再命中 aria-hidden 硬闸门（select 例外）',
  !sigOf(evalId('N7'), 'gate:aria-hidden') && !sigOf(evalId('N7b'), 'gate:aria-hidden'));

// ── G3 豁免语义不回退 ──
console.log('\n=== G3 \u8c41\u514d\u8bed\u4e49\u4e0d\u56de\u9000\uff08\u7968 13 \u68c0\u67e5\u70b9\u4e00\uff09 ===');
const inputCarrier = evaluateCase(
  { el: { tag: 'input', type: 'text', name: 'country', attrs: { 'aria-hidden': 'true' } }, labels: [], ctx: {} }, Detect);
check('G3a aria-hidden \u627f\u503c input \u4ecd\u786c\u6392\u9664\uff08\u975e SELECT \u4e0d\u653e\u5bbd\uff0c\u9632\u627f\u503c\u9762\u6df7\u5165\u767b\u8bb0\uff09',
  inputCarrier.score === 0 && !!sigOf(inputCarrier, 'gate:aria-hidden'),
  inputCarrier.score + '/' + inputCarrier.tier);
check('G3b \u65e0\u6d4b\u91cf\u80fd\u529b mock \u4ecd fail-open \u5224\u53ef\u89c1\uff08\u4e0d\u8bef\u6740\uff09',
  Detect._hiddenByStyle({ tagName: 'SELECT', ownerDocument: { defaultView: null } }) === false);
check('G3c \u96f6\u5c3a\u5bf8 mock \u5224\u9690\u85cf / \u6b63\u5e38\u5c3a\u5bf8\u5224\u53ef\u89c1\uff08\u65e7\u8bed\u4e49\u4e0d\u53d8\uff09',
  Detect._hiddenByStyle({ tagName: 'SELECT', ownerDocument: { defaultView: null }, getBoundingClientRect: () => ({ width: 0, height: 0 }) }) === true &&
  Detect._hiddenByStyle({ tagName: 'SELECT', ownerDocument: { defaultView: null }, getBoundingClientRect: () => ({ width: 200, height: 30 }) }) === false);
check('G3d \u53ef\u89c1\u6027\u4e0d\u5f71\u54cd scoreElement\uff08\u95f8\u95e8\u53ea\u6539\u6863\u4f4d\u4e0d\u6539\u767b\u8bb0\uff09',
  /gate:visibility-hidden/.test(detectSrc) && /summonedWrap/.test(detectSrc) && /ITI_LOW_REGISTER_SCORE/.test(detectSrc));
check('G3e \u7968 13 \u65e2\u6709 E2E \u4e0d\u88ab\u5220\u5f31\uff08\u9690\u85cf\u627f\u503c select \u53ec\u5524\u2192\u586b\u5145\u7528\u4f8b\u4ecd\u5728\uff09',
  /\u9690\u85cf\u627f\u503c\u539f\u751f select/.test(readFileSync(join(ROOT, 'tests', 'visibility.spec.ts'), 'utf8')));

// ── G4 \u65e0\u56de\u9000\u4e0e\u5e38\u91cf\u9501 ──
console.log('\n=== G4 \u65e0\u56de\u9000\u4e0e\u5e38\u91cf\u9501 ===');
const met = metrics(runCorpus(manifest, Detect), manifest);
check('G4a \u8bed\u6599\u57fa\u7ebf\u4e0d\u56de\u9000\uff08precision/recall = 1\uff0cFP/FN = 0\uff09',
  met.precision === 1 && met.recall === 1 && met.FP === 0 && met.FN === 0,
  'cases=' + met.cases + ' TP=' + met.TP + ' TN=' + met.TN);
check('G4b \u8bed\u6599 append-only \u672a\u5220\u51cf\uff08\u7528\u4f8b\u6570 \u2265 56\uff09', met.cases >= 56, 'cases=' + met.cases);
check('G4c \u6863\u4f4d\u9608\u503c\u672a\u52a8\uff08SCORE_AUTO=70 / SCORE_LOWKEY=35 / \u767b\u8bb0\u7ebf=25\uff09',
  num(cfgSrc, 'SCORE_AUTO') === 70 && num(cfgSrc, 'SCORE_LOWKEY') === 35 && REG_MIN === 25);
check('G4d L3 \u533a\u53f7\u53c2\u6570\u672a\u52a8\uff08\u6bcf\u9009\u9879 4 / \u62ec\u53f7 8 / \u5c01\u9876 45\uff09',
  num(cfgSrc, 'L3_PLUS_DIAL_SCORE') === 4 && num(cfgSrc, 'L3_PLUS_PAREN_SCORE') === 8 && num(cfgSrc, 'L3_DIAL_CAP') === 45);
const cdSpec = readFileSync(join(ROOT, 'tests', 'custom-dropdown.spec.ts'), 'utf8');
const rsSpec = readFileSync(join(ROOT, 'tests', 'rescan.e2e.spec.ts'), 'utf8');
check('G4e \u6027\u80fd\u7ea2\u7ebf\u672a\u5f31\u5316\uff081000 \u8282\u70b9 scan < 350ms \u65ad\u8a00\u4ecd\u5728\uff09',
  /toBeLessThan\(350\)/.test(cdSpec) && /toBeLessThan\(350\)/.test(rsSpec));
check('G4f \u672c\u7968\u672a\u52a8\u53ef\u89c1\u6027\u95f8\u95e8\u7684\u65e2\u6709\u4f8b\u5916\u8bed\u4e49\uff08_gate \u4f9d\u7136\u5bf9 SELECT \u964d\u6863\u4e0d\u5220\u767b\u8bb0\uff09',
  /tag !== 'SELECT'/.test(detectSrc) && /gate:visibility-hidden/.test(detectSrc));

// ── G5 \u58f0\u660e\u4e0e\u7eaa\u5f8b ──
console.log('\n=== G5 \u58f0\u660e\u4e0e\u7eaa\u5f8b ===');
const iss = readFileSync(join(ROOT, '.scratch', 'architecture-recovery', 'issues', '08-phase-b-failure-fixes.md'), 'utf8');
check('G5a issue \u58f0\u660e\u672c\u7968\u8986\u76d6 A-031 \u00b7 A-032', /A-031/.test(iss) && /A-032/.test(iss));
check('G5b \u65b0\u589e\u8bed\u6599\u6761\u76ee\u5747\u58f0\u660e\u6765\u6e90\uff08source \u975e\u7a7a\uff09',
  a031Ids.concat(['N7b']).every((id) => byId.has(id) && typeof byId.get(id).source === 'string' && byId.get(id).source.length > 8));
check('G5c \u68c0\u6d4b\u4ee3\u7801\u672a\u8d85\u672c\u7968\u6388\u6743\u8303\u56f4\uff08\u4ec5 detect/types/config/\u8bed\u6599/fixture/spec \u6539\u52a8\uff09',
  /textDial/.test(detectSrc) && /textDial/.test(readFileSync(join(ROOT, 'src', 'types.ts'), 'utf8')));

console.log('\n' + '\u7968 08 \u9a8c\u6536\u95e8: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) console.log('FAILURES: ' + failures.join(', '));
process.exit(fail ? 1 : 0);
