# 阈值标定报告（票 14）

> 只输出建议，不修改 src/config.ts；参数变更须经 16 票或独立批准（issue 14 验收 5）。
> 引擎装载: 函数束 + config 常量内存覆盖（零构建）；语料: tests/corpus/manifest.json。
> 标定宇宙 37 例 = 全语料 39 例 − iti 短路（阈值无关）− knownResidual（结构性偏差）。

## 1. 现值与基线

- 现值: SCORE_AUTO=70, SCORE_LOWKEY=35
- 现值可行域判定: 可行（全部非 residual 用例符合 expect）
- 基线 F1（标定宇宙, 注入口径 tier≠none）: 1.0000

| id | polarity | expect | score | tier | injected |
|---|---|---|---|---|---|
| P1 | positive | inject | 46 | lowkey | true |
| P2 | positive | inject | 60 | lowkey | true |
| P3 | positive | inject | 48 | lowkey | true |
| P4 | positive | inject | 100 | auto | true |
| N0a | negative | none | -66 | none | false |
| N0b | negative | none | 4 | none | false |
| N0c | negative | none | 0 | none | false |
| F1 | negative | none | 7 | none | false |
| F1b | negative | none | 11 | none | false |
| F1c | negative | none | 0 | none | false |
| F2 | negative | none | 44 | none | false |
| F3 | negative | none | -4 | none | false |
| F4 | negative | none | -32 | none | false |
| F5 | negative | none | 0 | none | false |
| F6 | negative | none | 4 | none | false |
| F7 | negative | none | 0 | none | false |
| F8 | negative | none | 0 | none | false |
| N1 | positive | inject | 86 | auto | true |
| N2 | positive | inject | 50 | lowkey | true |
| N2b | positive | inject | 50 | lowkey | true |
| N3 | positive | inject | 48 | lowkey | true |
| N4 | positive | inject | 48 | lowkey | true |
| N5 | negative | none | 10 | none | false |
| N6 | negative | none | 0 | none | false |
| N7 | positive | inject | 42 | lowkey | true |
| mm2-pos-fpcontrol | positive | inject | 68 | lowkey | true |
| mm2-pos-sdial | positive | inject | 60 | lowkey | true |
| mm2-pos-idial | positive | inject | 48 | lowkey | true |
| mm2-pos-l0tcc | positive | inject | 118 | auto | true |
| mm2-pos-l0country | positive | inject | 162 | auto | true |
| mm2-pos-l0cname | positive | inject | 132 | auto | true |
| mm2-pos-l0off | positive | inject | 48 | lowkey | true |
| mm2-pos-mobilecode | positive | inject | 48 | lowkey | true |
| mm2-neg-l0tel | negative | none | 10 | none | false |
| mm2-neg-plain | negative | none | 0 | none | false |
| mm2-neg-tanote | negative | none | 18 | none | false |
| mm2-neg-itires | negative | none | 100 | auto | true |
| mm2-neg-npa | negative | none | 4 | none | false |
| mm2-neg-monthen | negative | none | 0 | none | false |

## 2. 阈值可行域（网格步长 5，全量重评测）

- 满足门禁的 (AUTO, LOWKEY) 参数对: 120 组
- SCORE_AUTO 边际（出现于任一可行对）: 45 .. 160
- SCORE_LOWKEY 边际: 20 .. 40

约束解读（与语料直接对应）:

- AUTO 下界: F2（国家选择, score=44）依赖「tier=lowkey 才触发 country 语义抑制」，AUTO≤44 会令 F2 升 auto 绕过抑制而注入;
- AUTO 上界: mm2-pos-l0country（autocomplete=country, score=162）同理依赖 auto 档逃逸抑制，AUTO 越过 162 将其压入 lowkey → 被抑制 → 漏检;
- LOWKEY 下界: mm2-neg-tanote（score=18, 占位 +86 备注 textarea）以上必须不注入；
- LOWKEY 上界: N7（select2, score=42）为最低分正例，LOWKEY 越过 42 即漏检。

## 3. 权重敏感性（单变量 ×{0.5,0.75,1.25,1.5}）

| 常量 | 现值 | 变体 | 门禁可行 | F1 | 违反例 | 档位翻转例 |
|---|---|---|---|---|---|---|
| L1_STRONG_KW_SCORE | 30 | 15 | NO | 0.6923 | P1(expect=inject,got=none), P3(expect=inject,got=none), N3(expect=inject,got=none), N4(expect=inject,got=none), N7(expect=inject,got=none), mm2-pos-idial(expect=inject,got=none), mm2-pos-l0off(expect=inject,got=none), mm2-pos-mobilecode(expect=inject,got=none) | P1(lowkey→none), P3(lowkey→none), N3(lowkey→none), N4(lowkey→none), N7(lowkey→none), mm2-pos-idial(lowkey→none), mm2-pos-l0off(lowkey→none), mm2-pos-mobilecode(lowkey→none) |
| L1_STRONG_KW_SCORE | 30 | 23 | yes | 1.0000 |  |  |
| L1_STRONG_KW_SCORE | 30 | 38 | yes | 1.0000 |  | mm2-pos-fpcontrol(lowkey→auto) |
| L1_STRONG_KW_SCORE | 30 | 45 | yes | 1.0000 |  | P2(lowkey→auto), mm2-pos-fpcontrol(lowkey→auto), mm2-pos-sdial(lowkey→auto) |
| L1_COUNTRY_KW_SCORE | 14 | 7 | yes | 1.0000 |  |  |
| L1_COUNTRY_KW_SCORE | 14 | 11 | yes | 1.0000 |  |  |
| L1_COUNTRY_KW_SCORE | 14 | 18 | yes | 1.0000 |  |  |
| L1_COUNTRY_KW_SCORE | 14 | 21 | yes | 1.0000 |  |  |
| L1_PREFIX_KW_SCORE | 7 | 4 | yes | 1.0000 |  |  |
| L1_PREFIX_KW_SCORE | 7 | 5 | yes | 1.0000 |  |  |
| L1_PREFIX_KW_SCORE | 7 | 9 | yes | 1.0000 |  |  |
| L1_PREFIX_KW_SCORE | 7 | 11 | yes | 1.0000 |  |  |
| L1_NPA_KW_SCORE | 4 | 2 | yes | 1.0000 |  |  |
| L1_NPA_KW_SCORE | 4 | 3 | yes | 1.0000 |  |  |
| L1_NPA_KW_SCORE | 4 | 5 | yes | 1.0000 |  |  |
| L1_NPA_KW_SCORE | 4 | 6 | yes | 1.0000 |  |  |
| L1_LABEL_PHRASE_SCORE | 26 | 13 | yes | 1.0000 |  |  |
| L1_LABEL_PHRASE_SCORE | 26 | 20 | yes | 1.0000 |  |  |
| L1_LABEL_PHRASE_SCORE | 26 | 33 | yes | 1.0000 |  | mm2-pos-fpcontrol(lowkey→auto) |
| L1_LABEL_PHRASE_SCORE | 26 | 39 | yes | 1.0000 |  | mm2-pos-fpcontrol(lowkey→auto) |
| L1_BARE_QU_SCORE | 8 | 4 | yes | 1.0000 |  |  |
| L1_BARE_QU_SCORE | 8 | 6 | yes | 1.0000 |  |  |
| L1_BARE_QU_SCORE | 8 | 10 | yes | 1.0000 |  |  |
| L1_BARE_QU_SCORE | 8 | 12 | yes | 1.0000 |  |  |
| L1_LOCAL_FIXED_PENALTY | -30 | -15 | yes | 1.0000 |  |  |
| L1_LOCAL_FIXED_PENALTY | -30 | -22 | yes | 1.0000 |  |  |
| L1_LOCAL_FIXED_PENALTY | -30 | -37 | yes | 1.0000 |  |  |
| L1_LOCAL_FIXED_PENALTY | -30 | -45 | yes | 1.0000 |  |  |
| L1_COMPOUND_SCORE | 40 | 20 | NO | 0.9375 | N2(expect=inject,got=none), N2b(expect=inject,got=none) | N1(auto→lowkey), N2(lowkey→none), N2b(lowkey→none) |
| L1_COMPOUND_SCORE | 40 | 30 | yes | 1.0000 |  |  |
| L1_COMPOUND_SCORE | 40 | 50 | yes | 1.0000 |  |  |
| L1_COMPOUND_SCORE | 40 | 60 | yes | 1.0000 |  | N2(lowkey→auto), N2b(lowkey→auto) |
| L2_ANCHOR_TEL_SCORE | 18 | 9 | yes | 1.0000 |  |  |
| L2_ANCHOR_TEL_SCORE | 18 | 14 | yes | 1.0000 |  |  |
| L2_ANCHOR_TEL_SCORE | 18 | 23 | yes | 1.0000 |  |  |
| L2_ANCHOR_TEL_SCORE | 18 | 27 | yes | 1.0000 |  |  |
| L3_PLUS_DIAL_SCORE | 4 | 2 | yes | 1.0000 |  |  |
| L3_PLUS_DIAL_SCORE | 4 | 3 | yes | 1.0000 |  |  |
| L3_PLUS_DIAL_SCORE | 4 | 5 | yes | 1.0000 |  | mm2-pos-fpcontrol(lowkey→auto) |
| L3_PLUS_DIAL_SCORE | 4 | 6 | yes | 1.0000 |  | mm2-pos-fpcontrol(lowkey→auto) |
| L3_PLUS_PAREN_SCORE | 8 | 4 | yes | 1.0000 |  |  |
| L3_PLUS_PAREN_SCORE | 8 | 6 | yes | 1.0000 |  |  |
| L3_PLUS_PAREN_SCORE | 8 | 10 | yes | 1.0000 |  |  |
| L3_PLUS_PAREN_SCORE | 8 | 12 | yes | 1.0000 |  |  |
| L3_DIAL_CAP | 45 | 23 | yes | 1.0000 |  |  |
| L3_DIAL_CAP | 45 | 34 | yes | 1.0000 |  |  |
| L3_DIAL_CAP | 45 | 56 | yes | 1.0000 |  |  |
| L3_DIAL_CAP | 45 | 68 | yes | 1.0000 |  |  |
| L3_ISO_BONUS | 30 | 15 | yes | 1.0000 |  |  |
| L3_ISO_BONUS | 30 | 23 | yes | 1.0000 |  |  |
| L3_ISO_BONUS | 30 | 38 | yes | 1.0000 |  |  |
| L3_ISO_BONUS | 30 | 45 | yes | 1.0000 |  | P2(lowkey→auto) |
| L3_NUMERIC_PENALTY | -40 | -20 | yes | 1.0000 |  |  |
| L3_NUMERIC_PENALTY | -40 | -30 | yes | 1.0000 |  |  |
| L3_NUMERIC_PENALTY | -40 | -50 | yes | 1.0000 |  |  |
| L3_NUMERIC_PENALTY | -40 | -60 | yes | 1.0000 |  |  |
| L4_EXCLUDE_PENALTY | -70 | -35 | yes | 1.0000 |  |  |
| L4_EXCLUDE_PENALTY | -70 | -52 | yes | 1.0000 |  |  |
| L4_EXCLUDE_PENALTY | -70 | -87 | yes | 1.0000 |  |  |
| L4_EXCLUDE_PENALTY | -70 | -105 | yes | 1.0000 |  |  |

## 4. 建议参数

```json
{
  "suggestion": {
    "decision": "keep-current",
    "SCORE_AUTO": 70,
    "SCORE_LOWKEY": 35
  },
  "feasibleRange": {
    "SCORE_AUTO": [
      45,
      50,
      55,
      60,
      65,
      70,
      75,
      80,
      85,
      90,
      95,
      100,
      105,
      110,
      115,
      120,
      125,
      130,
      135,
      140,
      145,
      150,
      155,
      160
    ],
    "SCORE_LOWKEY": [
      20,
      25,
      30,
      35,
      40
    ]
  },
  "currentInFeasibleRegion": true,
  "governance": "建议不生效；参数变更走 16 票（评分一致性）或独立批准"
}
```

## 5. 结构性说明（阈值不可解项）

- mm2-neg-itires（.iti 容器内非电话输入）: _isIti 无条件 score:100 auto，任何阈值组合均无法消除——修复路径为 16 票「iti 识别并入评分，取消无条件最高分短路」；
- 小整数 option 值与拨号集撞库: 值 1..99 中恰为真实区号者（如月份 1..3 命中 +1/+31）会获得 L3 plus-dial 加分并压制 numeric-enum 罚分（N0b=4、F1b=11、F6=4、N0a=-66），现均未达注入档，但属 16 票 L3 加码时的已知敏感面;
- country 语义抑制与 SCORE_AUTO 耦合（见 §2 约束解读）: 调整 AUTO 时必须同时复跑本语料。

