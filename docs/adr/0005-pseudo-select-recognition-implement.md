# 0005 — 组件库伪-select 识别升级为「登记 + 手动召唤」实现

状态：accepted（实现范围 = 登记 + 手动召唤；自动注入与填充策略归票 18 二次裁决 —— 2026-09-17 二次裁决＝**维持**，见文末 Notes） | 日期：2026-09-05｜最近修订：2026-09-18（层级整理：二次裁决门槛迁入 Notes 子节，内容逐字未改；D-006 B⑧） | 来源：票 17 逐库取证（research/pseudo-select-forensics.md + research/pseudo-select-samples/）

## 背景

ADR-0004 将组件库伪 select 识别降级缓议，解冻条件为「先做一轮逐库 DOM/ARIA 取证」。票 17 已完成该取证：MUI / antd / Element-Plus / react-select / Radix 五库固定版本样本页 + Playwright 真实渲染探针，产出 aria snapshot 样本库与结构化事实（5/5 库捕获成功，复现命令见样本库 README）。

## 决策

**实现**（否决「继续缓议」）：在检测管线并入伪 select 信号源，命中档位为「登记 + 手动召唤」——识别到的伪 select 只登记候选并允许用户手动召唤面板，不自动注入图标、不自动填充。端到端实现（含填充策略与 fixture E2E）由票 18 承接，受本 ADR 档位约束。

## 依据（全部 observed，见取证报告）

1. 信号核心 5/5 库稳定存在：`role=combobox` + `aria-expanded` + `aria-controls` 可解出 `role=listbox` + `role=option`；差异仅在辅助属性（haspopup 三形态、activedescendant 3/5 库、antd 额外 aria-owns），组合信号可跨库成立。
2. 误报可控的分级依据充分：搜索型 combobox 与非选择 listbox 的否定信号（aria-autocomplete、可编辑性、option 结构缺失）在取证中同步确认，可进降权/否决组。
3. 「登记 + 手动召唤」与既有降级档位（隐藏字段、低置信）同构，不引入自动注入的新误报面——与 ADR-0004「误报治理优先」的关切兼容。
4. spec 心智模型 v2 将伪 select 两阶段列为 P1 覆盖补全项，阶段一（取证+裁决）即本票。

## 反证条件（满足任一即重开本 ADR，降回缓议或改裁决）

1. 探测策略在 14 票语料体系上产生不可接受的新误报（组合信号 + 降权组仍压不住，precision 基线显著回退）。
2. 实站取证发现主流站点大量使用非 ARIA 模式的伪下拉（无 role=combobox/listbox 语义），组合信号覆盖率实证不足。
3. 手动召唤交互在真实站点造成可复现的破坏性副作用（布局扰动、焦点劫持、组件崩溃）且无法在登记档内规避。
4. 样本库复现失败或取证证据被推翻（探针 exit 非零 / aria snapshot 与本 ADR 引用结论矛盾）。

## 后果

- ADR-0004 的「out-of-scope」结论被本 ADR 取代；0004 保留作为历史记录，其解冻条件（先取证）已满足。
- 覆盖扩大的收益先以「登记 + 手动召唤」形态兑现；自动注入的收益/风险权衡由票 18 在实现时以 CI 语料证据二次裁决。
- 维护成本新增：组件库大版本升级可能改变 DOM 结构（MUI v6+ 未覆盖，样本库已登记该偏差），需靠样本库探针回归。

## Notes（2026-09-17 · T-13 二次裁决：维持「登记 + 手动召唤」）

本节仅追加测量与裁决记录；上方背景 / 决策 / 门槛 / 依据 / 反证条件 / 后果各节均未改写（D-011 纪律：只 Status 字段 + 日期化 Notes）。

### 测量时点、命令与语料

- 时点：2026-09-17（Cycle-7 / W2 / T-13，D-013 + D-015）。
- 语料：tests/corpus/manifest.json，**59 → 63 例**（append-only 新增 4 例伪 select：mm2-pseudo-paren-dial / mm2-pseudo-dial-value / mm2-pseudo-nav-menu / mm2-pseudo-country-only；原 59 例逐字未动）。
- 命令：node tests/scripts/14-calibration-harness.mjs --out <tmp>/cal.md --json <tmp>/cal.json；node tests/scripts/32-real-site-corpus.mjs --out <tmp>/rs.md --json <tmp>/rs.json；子集度量 .scratch/cycle7-grill/scripts/t13-pseudo-subset.mjs（口径见下）。
- 全语料（补语料前 → 后）：precision 1.0000 (TP=31, FP=0) → 1.0000 (TP=31, FP=0)；recall 1.0000 (FN=0) → 1.0000 (FN=0)；回归门禁 PASS → PASS（仅例数 59 → 63）。
- 伪 select 子集（口径＝引擎进入伪 select 分支：pseudo===true 或信号含 custom:/pseudo: 前缀）5 例：rs-noaria-custom-dropdown、mm2-pseudo-paren-dial、mm2-pseudo-dial-value、mm2-pseudo-nav-menu、mm2-pseudo-country-only；实测 score ∈ {0, 34}、tier 均 none、injected 均 false、expect 全部相符（pass = 5/5）。阈值：SCORE_AUTO=70 / SCORE_LOWKEY=35 / ITI_LOW_REGISTER_SCORE=25（均读自 src/config.ts，未改）。

### 逐条门槛

**① Precision ≥ 95%：未达成（且注入口径不可测）**。注入口径（harness 默认 tier ∈ {auto, lowkey}，真值取语料 polarity 标签）：TP=0、FP=0 → precision = n/a（子集内零正例预测）。升级目标集代理口径（召唤面 = score ≥ ITI_LOW_REGISTER_SCORE(25)，即升级后会被注入的候选集；真值改取内容轴 dialEvidence / upgradeCandidate）：召唤面 4 例中 3 例携带区号内容证据、1 例（纯国家选择器 mm2-pseudo-country-only）零区号证据却登记 → 判别 precision = 3/4 = **0.7500**（严格按字段口径为 2/3 = 0.6667；rs-noaria-custom-dropdown 系既有条目、无 dialEvidence 字段，其 note 自述选项含 (+NN)）。两口径均远低于 95%。

**② 误报预算 < 1／千站点：不可直接测量（本仓无站点级抽样语料，语料集不是 1000 个站点）**。可给出的最接近的仓内代理（**明确标注为代理，非站点测量**）：召唤面内零区号证据的误报 1 例 / 非候选负例 2 例 = 0.5000 误报每形态 → 外推约 500/千站点，远超预算。**「误报可一键上报」半条：达成** —— 面板负反馈入口 #cch-fb（src/ui/index.ts:433 创建元素；:437 click → this._feedback()；:583 _feedback() 写入 none 规则并即时拆图标），即一键上报／一键否决通路存在。

**③ 升级由选项内容证据裁决（非容器结构）：达成**。内容门槛落点 src/detect/index.ts:592-594（custom.plusDial + custom.parenDial + custom.isoName === 0 → custom:gate:no-dial-evidence，无区号/国家证据的列表不进登记面）；内容证据统计落点 src/detect/index.ts:97-119（pseudoOptionStats 读选项 value / text / aria-label，与 DIAL_SET / ISO2_SET 比对）；容器结构仅决定**候选资格**（src/detect/index.ts:153-158：DIV/SPAN + tabindex）与 +20 结构分（src/detect/index.ts:596-597），且该分只在内容门槛通过后才计。反例 mm2-pseudo-nav-menu（可聚焦容器 + 后代 li 列表、零内容证据）实测 score=0 / pseudo=false，证伪「结构即证据」。残留：伪 select 侧 textDial 恒为 0（src/detect/index.ts:115-118），裸 +NN 文本证据未启用 —— 内容证据面窄于原生 select。

### 裁决结论

三条门槛未同时达成（① 未达成；② 不可测且代理口径远超预算；③ 达成）⇒ 依 D-015 默认分支，**维持「登记 + 手动召唤」**，**不升级为自动注入**。**零代码变更**：src/ 未动（本票仅语料 + 本文），build 169.99 kB / e2e 146 passed / 票级门 20/21（唯一红为票 39 基线预存红）与基线一致。门槛①仅在达成时才记录「具备升级资格（仍须用户拍板）」，本票不适用。

### 残留与所需前置

1. **站点级伪 select 语料不足**：本仓仅 5 例且均为合成形态（真实站点抽样需走 tests/scripts/32-real-site-corpus.mjs + tests/live/site-manifest.json 的独立取样路径）。门槛①②的站点级标定以此为前提。
2. **门槛②需要真实站点抽样**：「< 1／千站点」当前只有形态级代理，无站点级分母。
3. **内容证据面不对称**：伪 select 侧 textDial 未启用（src/detect/index.ts:115-118）→ 升级前需先补该形态语料并评估。
4. **语义抑制缺口**：country-semantic:suppress 只作用于原生 select 的 st（src/detect/index.ts:497-499 / 632），custom 与 ARIA 伪 select 分支无对照 ⇒ 纯国家选择器伪 select 会进召唤面（mm2-pseudo-country-only 即此族）。升级前必须先补该闸门，否则门槛①的分母里始终含此误报族。
5. **polarity 语义**：本票新增 4 例均 polarity=negative / expect=none（ADR-0005 工具口径真值），内容轴由 dialEvidence / upgradeCandidate 两字段承载；置 positive 会使非注入伪 select 计入 FN，击穿 verify-08/13/18/27 的 FN=0 / recall=1 既有断言。

### 二次裁决的量化门槛（2026-09-17 追加，D-015）

「登记 + 手动召唤」升级为自动注入，须**同时**满足以下三条（未达则维持现状）：

1. **Precision ≥ 95%**（站点语料上）——该数字须以**本仓自有语料**标定，**不得直接引用外部数字**（业界 precision/recall 具体门槛均未公开，95% 系外推）。
2. **误报预算 < 1／千站点**，且误报必须可**一键上报**。
3. 升级由**选项内容证据**裁决（选项列表出现国名／区号／dial code 词条），**而非容器结构**。

保留 select-only 型（开面板 + 键盘选值）与可编辑型（隐藏 input 原生 setter + 事件序列）的形态二分。裁决顺序不可颠倒：**补语料 → 测门槛 → 裁决**。

## Notes 追加（2026-09-18 · Cycle-8 D-009 采纳：门槛②的可测化口径）

> 形式：**追加**，不改动上方各节原文（含门槛①②原文）。**门槛数值未变**。

- 门槛②「误报预算 < 1／千站点」的**测量口径**已定稿于 **ADR-0015**，要点：抽样量由「95% CI 上界 < 门槛」反推 ⇒ **Wilson 守口径 n ≥ 3838**（rule of three 的 3000 偏乐观）；判定用 **OC 双点**（实算 **n = 4636 / c = 5**）；运行期用**燃烧率**（>3× 阻断发版 / 1×–3× 冻结并扩样 / ≤0.5× 常态）；门槛收窄至 **`tier ∈ {auto}`**，`lowkey` 只监控。
- **调研存档引用的 (n = 3000, c = 2) 经复算不满足 AQL 约束**（`P(接受|AQL) = 0.8089 < 0.95`）⇒ 以 ADR-0015 的实算值为准。
- 机器实现：`tests/scripts/50-site-threshold-plan.mjs`（零依赖，自带自检）。
- **未实施部分**：建站点级语料（~3838 站点 + ~500 pilot）属独立票，**须先经用户授权**。⇒ 门槛②的**可测化路径已就位**，但「已达成」与否仍**不可判定**（无语料）。
- 本注记**不改变**门槛①②的**数值**与**裁决顺序**（补语料 → 测门槛 → 裁决）。
