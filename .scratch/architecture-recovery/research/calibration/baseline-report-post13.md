# 校准基线（票 13 重测副本，append-only）

> evidenceRun: https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34017498607
> ref: cch/13-visibility-l3-hardening @ 589ff3162702631df47c2ed1aa212fd069558a57
> 说明: 票 13 iti 容器唯一证据佐证防线落地后重测；mm2-neg-itires 转通过（score=0/none），knownResidual 状态位翻转。原件未动（票 14）。

# Precision/Recall 基线报告（票 14 harness）

- 引擎: `src/detect/index.ts`（函数束装载，零构建零依赖，不改检测行为）
- 语料: `tests/corpus/manifest.json`（41 例，append-only，每例标注正/负与来源）
- 注入口径: tier ∈ {auto, lowkey}（与 misdetect-repro-v2.mjs 一致）

| 指标 | 值 |
|---|---|
| precision | 1.0000 (TP=20, FP=0) |
| recall | 1.0000 (FN=0) |
| F1 | 1.0000 |
| accuracy | 1.0000 |

## 回归门禁

PASS — 非 residual 用例全部符合 expect

## 逐例结果

| id | family | polarity | expect | got | score | residual | source |
|---|---|---|---|---|---|---|---|
| P1 | legacy | positive | inject | inject/lowkey | 46 |  | tests/fixtures/fp-regression.html 正例对照组；research/scripts/misdetect-repro-v2.mjs#P1 |
| P2 | legacy | positive | inject | inject/lowkey | 60 |  | tests/fixtures/fp-regression.html 正例对照组；research/scripts/misdetect-repro-v2.mjs#P2 |
| P3 | legacy | positive | inject | inject/lowkey | 48 |  | tests/fixtures/fp-regression.html 正例对照组；research/scripts/misdetect-repro-v2.mjs#P3 |
| P4 | legacy | positive | inject | inject/auto | 70 |  | research/scripts/misdetect-repro-v2.mjs#P4；tests/fixtures/unified-inject.html iti 形态 |
| N0a | legacy | negative | none | none | -106 |  | tests/fixtures/fp-regression.html；research/scripts/misdetect-repro-v2.mjs#N0a |
| N0b | legacy | negative | none | none | -36 |  | research/scripts/misdetect-repro-v2.mjs#N0b |
| N0c | legacy | negative | none | none | 0 |  | tests/fixtures/fp-regression.html；research/scripts/misdetect-repro-v2.mjs#N0c |
| F1 | legacy | negative | none | none | 7 |  | tests/fixtures/fp-regression.html#fp-prefix；research/misdetection-root-causes.md §2①；research/scripts/misdetect-repro-v2.mjs#F1 |
| F1b | legacy | negative | none | none | -29 |  | research/scripts/misdetect-repro-v2.mjs#F1b |
| F1c | legacy | negative | none | none | 0 |  | research/scripts/misdetect-repro-v2.mjs#F1c |
| F2 | legacy | negative | none | none | 44 |  | tests/fixtures/fp-regression.html#fp-country；research/misdetection-root-causes.md §2④；research/scripts/misdetect-repro-v2.mjs#F2 |
| F3 | legacy | negative | none | none | -4 |  | research/scripts/misdetect-repro-v2.mjs#F3 |
| F4 | legacy | negative | none | none | -32 |  | tests/fixtures/fp-regression.html#fp-area-local；research/misdetection-root-causes.md §2②；research/scripts/misdetect-repro-v2.mjs#F4 |
| F5 | legacy | negative | none | none | 0 |  | tests/fixtures/fp-regression.html#fp-timezone；research/misdetection-root-causes.md §2③；research/scripts/misdetect-repro-v2.mjs#F5 |
| F6 | legacy | negative | none | none | -36 |  | tests/fixtures/fp-regression.html#fp-qty；research/misdetection-root-causes.md §2⑤；research/scripts/misdetect-repro-v2.mjs#F6 |
| F7 | legacy | negative | none | none | 0 |  | research/scripts/misdetect-repro-v2.mjs#F7 |
| F8 | legacy | negative | none | none | 0 |  | research/scripts/misdetect-repro-v2.mjs#F8 |
| N1 | legacy | positive | inject | inject/auto | 86 |  | research/misdetection-root-causes.md §5-0① N1；research/scripts/misdetect-repro-v2.mjs#N1 |
| N2 | legacy | positive | inject | inject/lowkey | 50 |  | research/scripts/misdetect-repro-v2.mjs#N2 |
| N2b | legacy | positive | inject | inject/lowkey | 50 |  | research/scripts/misdetect-repro-v2.mjs#N2b |
| N3 | legacy | positive | inject | inject/lowkey | 48 |  | research/scripts/misdetect-repro-v2.mjs#N3 |
| N4 | legacy | positive | inject | inject/lowkey | 48 |  | research/scripts/misdetect-repro-v2.mjs#N4 |
| N5 | legacy | negative | none | none | 10 |  | research/scripts/misdetect-repro-v2.mjs#N5（语义保留） |
| N6 | legacy | negative | none | none | 0 |  | research/scripts/misdetect-repro-v2.mjs#N6（语义保留） |
| N7 | legacy | positive | inject | inject/lowkey | 42 |  | research/scripts/misdetect-repro-v2.mjs#N7 |
| mm2-pos-fpcontrol | mm2 | positive | inject | inject/lowkey | 68 |  | tests/fixtures/fp-regression.html#fp-control（E2E 正例控件转录） |
| mm2-pos-sdial | mm2 | positive | inject | inject/lowkey | 60 |  | tests/fixtures/unified-inject.html#s-dial（票 09 转录） |
| mm2-pos-idial | mm2 | positive | inject | inject/lowkey | 48 |  | tests/fixtures/unified-inject.html#i-dial（票 09 转录） |
| mm2-pos-l0tcc | mm2 | positive | inject | inject/auto | 118 |  | tests/fixtures/autocomplete.html#l0-tcc（票 02 验收 4 转录） |
| mm2-pos-l0country | mm2 | positive | inject | inject/auto | 162 |  | tests/fixtures/autocomplete.html#l0-country（fixture 头注：country 属于"必须注入"三字段之一） |
| mm2-pos-l0cname | mm2 | positive | inject | inject/auto | 132 |  | tests/fixtures/autocomplete.html#l0-country-name（fixture 头注：country-name 属于"必须注入"三字段之一） |
| mm2-pos-l0off | mm2 | positive | inject | inject/lowkey | 48 |  | tests/fixtures/autocomplete.html#l0-off（票 02 验收 4 转录） |
| mm2-pos-mobilecode | mm2 | positive | inject | inject/lowkey | 48 |  | src/config.ts L1_STRONG_KW_SCORE 词表（mobilecode）；mm2 语料新增 |
| mm2-neg-l0tel | mm2 | negative | none | none | 10 |  | tests/fixtures/autocomplete.html#l0-tel（票 02 验收 4 转录） |
| mm2-neg-plain | mm2 | negative | none | none | 0 |  | tests/fixtures/autocomplete.html#l0-plain（票 02 验收 4 转录） |
| mm2-neg-tanote | mm2 | negative | none | none | 18 |  | tests/fixtures/unified-inject.html#t-note（票 09 转录） |
| mm2-neg-itires | mm2 | negative | none | none | 0 |  | .scratch/mental-model-v2/report.md §2.3 残留风险（_isIti 短路）；mm2 语料新增 |
| mm2-neg-npa | mm2 | negative | none | none | 4 |  | src/config.ts L1_NPA_KW_SCORE（npa/trunk 北美编号计划，无国家语义）；research/misdetection-root-causes.md §4；mm2 语料新增 |
| mm2-neg-monthen | mm2 | negative | none | none | 0 |  | mm2 语料新增（N0b 英文月份变体，覆盖无 CJK 场景的零证据负例） |
| mm2-pos-shared-dial | mm2 | positive | inject | inject/lowkey | 66 |  | issue 13 验收4（共享区号 +1/+44 多国下拉）；research/atomcode-mental-model-v2.md whatwg#8597 |
| mm2-pos-placeholder-dial | mm2 | positive | inject | inject/lowkey | 42 |  | issue 13 验收5（占位首项不参与内容验证计分）；handoffs/13 检查点二 |

> knownResidual=yes 的用例为已登记结构性残留（见 manifest note），计入 precision 分母、不拦门禁。

