# 0005 — 组件库伪-select 识别升级为「登记 + 手动召唤」实现

状态：accepted（实现范围 = 登记 + 手动召唤；自动注入与填充策略归票 18 二次裁决） | 日期：2026-09-05 | 来源：票 17 逐库取证（research/pseudo-select-forensics.md + research/pseudo-select-samples/）

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
