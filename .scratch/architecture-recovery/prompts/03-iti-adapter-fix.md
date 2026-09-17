你是「Find-Your-Country-Code 架构恢复」的修复窗口，负责票 03 的复核后修复（iti 适配层真实站点断链）。你是fresh上下文，靠读文件工作，不靠记忆。

## 背景（大脑复核结论，先自己验证再相信）

第 2 波复核（verification/review-wave2.md）发现 03 号票适配层在真实 intl-tel-input v18.2.1 环境主路径断链，双根因均为 confirmed（含反事实验证）：

1. `_global()` 优先级错误：`window.intlTelInput || window.intlTelInputGlobals`——v18.2.1 的 `window.intlTelInput` 是 factory function（无 getInstance），被优先命中后层1（setNumber）/层2（双名探测）全部跳过，直落层3。
2. 层3 DOM 兜底选择器矩阵缺 v18 代：v18.2.1 真实 DOM 是 `.iti__flag-container > .iti__selected-flag`（click listener 绑在 `.iti__selected-flag`）；现选择器 `.iti__flag-container`（父层）不触发子层 listener；v16 的 `.selected-flag` 在 v18.2.1 不存在。且 li 点击同步需要"先开 ul → 点 li[data-country-code]"时序。

反事实证据（大脑实测，你可复跑）：`.iti__selected-flag` 点击 → ul 打开（ulOpen=true）→ `li[data-country-code=jp].click()` → 实例 iso2 变 jp（verified 同步成功）；直调 `intlTelInputGlobals.getInstance(el)` 后 `setNumber('+81')` → iso2 即刻 jp（verified）。

## 必读文件（按序读全再动手）

1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave2.md（复核报告：根因与反事实证据）
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\03-iti-adapter.md（原始验收清单）
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\03-iti-adapter.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md（版本矩阵：getInstance 稳锚、v18 代 DOM、setNumber 优先依据）
5. D:\Aworker\mozilla\choose-your-country\src\iti-adapter\index.ts（待修复源码）
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\scripts\probe-iti-fill.mjs 与 brain-probe-iti-sync.mjs（复现探针）
7. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md（§2/§4）

## 修复任务

1. **修 `_global()`**：getInstance 稳锚必须命中 `window.intlTelInputGlobals`（对象形态）；`window.intlTelInput` 为 function 时不作 globals 使用，但可作「factory 带 getInstance/instances」的能力探测备选（探测通过才可用）。任何全局入口都必须先 `_isFn(g,'getInstance')` 检查再调用——这条已在层1，但要保证 _global 返回值不会让层1跳过。
2. **修层3 选择器矩阵**：触发器探测序列改为 `.iti__selected-country`（v29）→ `.iti__selected-flag`（v17–v27 代）→ `.selected-flag`（v16 前）→ `.iti__flag-container`（最后手段）；li 选择器补 `li[data-country-code]`（v18 代 li 元素）与 `.iti__country`（两代都有）。保持"先开下拉 → 再点 li → 等待同步"时序。
3. **修验收盲区**：升级 `research/scripts/iti-adapter-verify.mjs` 的场景 C 用例——面板选 Japan 前后各读一次实例选中态，断言 iso2 从 cn 变 jp（不许用初始态 +86 冒充联动成功）；把 brain-probe-iti-sync.mjs 的用户流路径整合为回归断言。
4. **摘标转绿**：修复后 `tests/fp-regression.spec.ts` 的 iti v18.2.1 缺口用例应真实转绿——运行 `npm run e2e`，若 unexpectedly passed 则按 06 报告 §6-2 维护契约删除该用例的 `test.fail()` 标记并在报告记录。
5. **版本矩阵更新**：对照 atomcode 矩阵逐版本重填覆盖表（v16/v17/v18.2.1/v25/v26/v27/v28/v29），v18.2.1 行从"完全覆盖"改为注明本次修复路径；其他版本仍为能力探测推断（如实标注哪些只有 mock 证据）。
6. 版本控制遵循 WORKFLOW §4.2：在 `cch/03-iti-adapter` 分支上续提交（修复属同票返工，不新开分支）；提交信息 `fix(cch-03): ...`。

## 质检自检（硬性，先质检再动手，质检不过不得修复）

开工第一句：先复述大脑复核的双根因与反事实证据，再复述必读清单。然后：
- **先质疑大脑的结论**：用你自己的探针独立复现双根因（可参考 brain-probe-iti-sync.mjs 但必须自己跑通并核对数据：ul 是否真的 iti__hide、getInstance 在 function 形态下是否真的 undefined）。若你的复现与大脑结论矛盾，停下并把矛盾证据写入报告，不得强行修复。
- 复现一致后，写下你的修复方案（选择器序列、_global 判定逻辑、验收升级方式），自检：是否覆盖 v16/v18/v29 三代 DOM？是否引入新的层间顺序违规？是否改动层1/层2 的优先级语义（不允许，只修探测与选择器）？
- 自检通过后才动手修复。修复后依次跑：`node research/scripts/iti-adapter-verify.mjs`（升级后版本）→ `npm run e2e`（全量）→ `node research/scripts/misdetect-repro-v2.mjs`（不得被破坏，仍须 25/25）→ `npm run build` exit 0。

## 完成定义

遵循 issue 03 验收清单（本次加验收 4 的真实联动断言版）。报告落盘：
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\03-iti-adapter-fix-report.md
必须包含：你的独立复现结果（与大脑结论一致或矛盾）、修复 diff 摘要、升级后验收命令与退出码、E2E 摘标记录、版本矩阵更新表、遗留风险。报告未落盘=票未完成。

收尾必做：完成后通知大脑重算 frontier（修复闭环解锁 Wave 3：04/05/09）。
