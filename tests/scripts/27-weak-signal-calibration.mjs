// ==========================================================================
// 27-weak-signal-calibration.mjs - 票 27 [A-001] 检测覆盖率下限：改法标定脚本
// --------------------------------------------------------------------------
// 职责（handoff 27 检查点：改法须附 corpus 正负例标定数据）:
//   1) 全语料基线: precision/recall/F1 + 逐例 score/tier
//   2) 弱信号复现: A-001 形态（纯关键字/placeholder、无 label、无锚、无内容证据）逐例评分
//   3) 改法标定: 候选常量取值 x 全语料指标对照，并校验负例不被抬回 lowkey
// 口径: 复用 14-lib-engine（同一 mock DOM、同一评分分发），不新造评测口径。
// ==========================================================================
import { loadManifest, bundleEngine, runCorpus, metrics, evaluateCase } from './14-lib-engine.mjs';

const manifest = loadManifest();

// A-001 弱信号形态集：W1/W2 与语料 rs-weak-input-* 同形；W3-W8 为真实站点命名变体（语料外）
const WEAK_FORMS = [
  { id: 'W1', desc: 'name=countryCode (camel)', el: { tag: 'input', name: 'countryCode', type: 'text' } },
  { id: 'W2', desc: 'placeholder=Country code', el: { tag: 'input', type: 'text', placeholder: 'Country code' } },
  { id: 'W3', desc: 'name=country_code (snake)', el: { tag: 'input', name: 'country_code', type: 'text' } },
  { id: 'W4', desc: 'name=countrycode (lowercase)', el: { tag: 'input', name: 'countrycode', type: 'text' } },
  { id: 'W5', desc: 'name=dialCode', el: { tag: 'input', name: 'dialCode', type: 'text' } },
  { id: 'W6', desc: 'placeholder=Dial code', el: { tag: 'input', type: 'text', placeholder: 'Dial code' } },
  { id: 'W7', desc: 'aria-label=国家区号', el: { tag: 'input', type: 'text', attrs: { 'aria-label': '国家区号' } } },
  { id: 'W8', desc: 'placeholder=电话区号', el: { tag: 'input', type: 'text', placeholder: '电话区号' } },
];

function pct(x) { return x === null ? String("n/a") : (x * 100).toFixed(2) + "%"; }

function fmt(name, m) {
  return [name.padEnd(26), "TP=" + m.TP, "FP=" + m.FP, "TN=" + m.TN, "FN=" + m.FN,
    "P=" + pct(m.precision), "R=" + pct(m.recall),
    "F1=" + (m.f1 === null ? "n/a" : m.f1.toFixed(4)), "N=" + m.cases].join("  ");
}

function evalWeak(Detect) {
  return WEAK_FORMS.map(function (f) {
    const r = evaluateCase({ el: f.el, labels: [], ctx: {} }, Detect);
    return { id: f.id, desc: f.desc, score: r.score, tier: r.tier };
  });
}

// 选项 ① 离线模拟：attrStr 强短语补分组。归一化 = camel 边界 ->空格 + 非字母数字 ->空格 + 小写
const ATTR_PHRASES_PROPOSED = ["country code", "dial code", "calling code", "phone code",
  "国家区号", "国际区号", "电话区号", "呼叫代码"];

function attrStrOf(caseDef) {
  const el = caseDef.el || {};
  const at = el.attrs || {};
  return [el.name, el.id, el.className, el.placeholder,
    at["aria-label"], at["data-name"], at["title"]].filter(Boolean).join(" ");
}

function attrPhraseHit(caseDef) {
  const raw = attrStrOf(caseDef);
  if (!raw) return null;
  const norm = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const low = raw.toLowerCase();
  for (const ph of ATTR_PHRASES_PROPOSED) {
    if (norm.indexOf(ph) >= 0 || low.indexOf(ph) >= 0) return ph;
  }
  return null;
}

const AUTO = 70, LOWKEY = 35;
function tierOf(s) { return s >= AUTO ? "auto" : (s >= LOWKEY ? "lowkey" : "none"); }

function main() {
  const byId = new Map(manifest.cases.map(function (c) { return [c.id, c]; }));

  const base = bundleEngine({});
  const bRes = runCorpus(manifest, base.Detect);
  const bM = metrics(bRes, manifest);
  console.log("=== [1] 全语料基线（当前实现）===");
  console.log(fmt("baseline", bM));
  console.log("mismatches(非 knownResidual): " + (bM.mismatches.length ? bM.mismatches.join(" | ") : "NONE"));
  const residual = bRes.filter(function (r) { return byId.get(r.id).knownResidual; });
  console.log("knownResidual: " + residual.map(function (r) { return r.id + "=" + r.score + "/" + r.tier; }).join(", "));

  console.log("");
  console.log("=== [2] A-001 弱信号形态复现（当前实现）===");
  const weak = evalWeak(base.Detect);
  for (const w of weak) {
    console.log("  " + w.id + "  " + String(w.score).padStart(4) + "  " + w.tier.padEnd(7) + " " + w.desc);
  }
  console.log("  落 none: " + weak.filter(function (w) { return w.tier === "none"; }).length + "/" + weak.length);

  console.log("");
  console.log("=== [3] 逐例明细 ===");
  for (const r of bRes) {
    const c = byId.get(r.id);
    const sig = (r.signals || []).filter(function (s) { return s.pts !== 0; })
      .map(function (s) { return s.name + "(" + (s.pts > 0 ? "+" : "") + s.pts + ")"; }).join(",");
    console.log("  " + (c.family + "          ").slice(0, 10) + (r.id + "                          ").slice(0, 26) +
      String(r.score).padStart(5) + "  " + r.tier.padEnd(7) + (c.polarity === "positive" ? "POS" : "neg") + "  " + sig);
  }

  console.log("");
  console.log("=== [4] 改法标定：候选常量 x 全语料 ===");
  const variants = [
    { name: "V0 baseline", ov: {} },
    { name: "V1 L1_STRONG_KW=35", ov: { L1_STRONG_KW_SCORE: 35 } },
    { name: "V2 L1_STRONG_KW=36", ov: { L1_STRONG_KW_SCORE: 36 } },
    { name: "V3 L1_STRONG_KW=40", ov: { L1_STRONG_KW_SCORE: 40 } },
    { name: "V4 SCORE_LOWKEY=30", ov: { SCORE_LOWKEY: 30 } },
    { name: "V5 SCORE_LOWKEY=28", ov: { SCORE_LOWKEY: 28 } },
  ];
  for (const v of variants) {
    const eng = bundleEngine(v.ov);
    const res = runCorpus(manifest, eng.Detect);
    const m = metrics(res, manifest);
    const w = evalWeak(eng.Detect);
    const fp = res.filter(function (r) { return byId.get(r.id).polarity !== "positive" && r.injected; }).map(function (r) { return r.id; });
    console.log(fmt(v.name, m));
    console.log("      weak: " + w.map(function (x) { return x.id + "=" + x.score + "/" + x.tier; }).join(" ") +
      "  | FP: " + (fp.length ? fp.join(",") : "NONE"));
  }

  console.log("");
  console.log("=== [5] 选项①离线模拟: attrStr 强短语 +delta（与 kw:strong 叠加）===");
  const eng0 = bundleEngine({});
  const res0 = runCorpus(manifest, eng0.Detect);
  for (const delta of [5, 6, 8, 10]) {
    const patched = res0.map(function (r) {
      const c = byId.get(r.id);
      const hit = attrPhraseHit(c);
      if (!hit) return r;
      const score = r.score + delta;
      const tier = tierOf(score);
      return { id: r.id, score: score, tier: tier, injected: tier === "auto" || tier === "lowkey", signals: r.signals, _hit: hit };
    });
    const m = metrics(patched, manifest);
    const fp = patched.filter(function (r) { return byId.get(r.id).polarity !== "positive" && r.injected; }).map(function (r) { return r.id; });
    console.log(fmt("  attr-phrase +" + delta, m));
    console.log("      FP: " + (fp.length ? fp.join(",") : "NONE") +
      " | hits: " + patched.filter(function (r) { return r._hit; }).map(function (r) { return r.id + "(" + r._hit + ")"; }).join(", "));
  }

  console.log("");
  console.log("=== [6] 选项①在弱信号形态上的归一化命中 ===");
  for (const f of WEAK_FORMS) {
    console.log("  " + f.id + "  attr=[" + attrStrOf({ el: f.el }) + "]  hit=" + (attrPhraseHit({ el: f.el }) || "-"));
  }
}

// 改前 / 改后对照：把 L1_ATTR_PHRASE_SCORE 覆写为 0 即复算票 27 的复现基线
function reportPrefixBaseline() {
  const pre = bundleEngine({ L1_ATTR_PHRASE_SCORE: 0 });
  const post = bundleEngine({});
  const weakIds = manifest.cases.filter(function (c) { return String(c.fixingTicket) === '27'; }).map(function (c) { return c.id; });
  console.log(String(""));
  console.log("=== [7] 票 27 归属用例：改前(L1_ATTR_PHRASE_SCORE=0) / 改后 对照 ===");
  for (const id of weakIds) {
    const c = manifest.cases.find(function (x) { return x.id === id; });
    const a = evaluateCase(c, pre.Detect);
    const b = evaluateCase(c, post.Detect);
    const bInj = b.tier === 'auto' || b.tier === 'lowkey';
    console.log("  " + (id + "                                ").slice(0, 32) +
      String(a.score).padStart(4) + "/" + (a.tier + "      ").slice(0, 7) + "  ->  " +
      String(b.score).padStart(4) + "/" + (b.tier + "      ").slice(0, 7) + "  " + (bInj ? "OK" : "MISS"));
  }
  const pm = metrics(runCorpus(manifest, pre.Detect), manifest);
  const qm = metrics(runCorpus(manifest, post.Detect), manifest);
  console.log("  全语料 改前: " + fmt("pre  (attr-phrase=0)", pm));
  console.log("  全语料 改后: " + fmt("post (attr-phrase=8)", qm));
}

main();
reportPrefixBaseline();

