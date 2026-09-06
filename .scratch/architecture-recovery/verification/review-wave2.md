# 大脑复核报告：第 2 波（02 / 03 / 06）

> 复核人：AutoCoder（大脑）| 日期：2026-09-04 | 方法：node 独立 harness + 真实 E2E 复跑 + but/git 实物勘验 + 逐条对照 README 完成定义
> 原则：不信报告自述；每条关键声明回仓库实物验证。复核 harness：`research/scripts/verify-ticket-02.mjs`（02 自带，36 例）与本报告新增探针 `brain-probe-iti-sync.mjs`。

## 一、声明 → 证据 → 结论对照表

### 票 02（多信号加权评分检测引擎）

| # | 报告声明 | 大脑独立验证（observed） | 结论 |
|---|---|---|---|
| 2-1 | 引擎级单测门 36/36 pass exit 0 | 复跑 `verify-ticket-02.mjs` → `36/36 pass`，exit 0 | **属实** |
| 2-2 | harness v2 25/25（FP 全不注入+FN 修复） | 复跑 → `合计 25 例，符合预期 25 例` exit 0；旧 harness 保持 24/25（红基线未被篡改） | **属实** |
| 2-3 | E2E 全量 20 passed | 独立复跑 `npm run e2e` → `20 passed (24.7s)` exit 0；fp-1..5 红标已摘（spec 内 test.fail 仅剩 3 处：shadow DOM、iti 缺口、06 红线契约） | **属实** |
| 2-4 | 常量显式+出处 | `src/config.ts` 实读：L0_TOKEN_SCORE=100 / L1_PREFIX_KW_SCORE=7（[MD §2①]）/ L4_EXCLUDE_PENALTY=-70（[MD F6]）/ SCORE_AUTO=70 均带出处注释 | **属实** |
| 2-5 | 行为等价红线（未提前引入 02+ 内容之外的越权变更） | 02 提交 ee8f263 触及 config/detect/i18n/ui + tests——**tests 变更超出 02 票授权范围**（属 06 票文件），但为红标摘除的维护契约动作（06 报告 §6-2 明文约定），判定为合规交叉而非越权 | **属实（带说明）** |
| 2-6 | 分支落位 | but status：`cch/02-scoring-engine` 堆叠于 `cch/06-playwright-e2e` 之上（报告自述因依赖 06 的 tests 文件被拒非堆叠建支，按 §4.2 用 `--above` 堆叠）| **属实** |

### 票 06（Playwright E2E 基建）

| # | 报告声明 | 大脑独立验证 | 结论 |
|---|---|---|---|
| 6-1 | 一条命令 `npm run e2e` exit 0（17 例当时） | 复跑 → exit 0，现 20 passed（含 02 转绿 3 例） | **属实** |
| 6-2 | 基建票不改脚本源码 | 06 提交 0f31a67 文件清单：仅 tests/config/fixture，无 src/ 变更；dist 行为等价由 01 对照保证 | **属实** |
| 6-3 | 红组 7 例有意红 | fp-regression.spec.ts 6 例+iti 缺口；当时全红符合预期，现已按契约摘除 02 的 5 例 | **属实** |
| 6-4 | iti v18.2.1 探针发现 fill 假成功（toast 谎报） | 我方复核独立复现并深挖（见 03 部分）——这是本次复核最有价值的发现，探针 `probe-iti-fill.mjs` 落盘属实 | **属实** |

### 票 03（intl-tel-input 适配层）⚠️ 发现源码级问题

| # | 报告声明 | 大脑独立验证 | 结论 |
|---|---|---|---|
| 3-1 | 适配层模块独立、fillIti 一行委托 | `src/iti-adapter/index.ts`（145 行）存在；`fill/index.ts` L14-15 单行委托；dist 含适配层产物 | **属实** |
| 3-2 | verify 脚本 9/9 PASS exit 0 | 复跑 exit 0，9/9 | **属实（但证据无效，见 3-3）** |
| 3-3 | 场景 C「填充联动全绿」 | verify 脚本的场景 C 只读 `selectedDial === '+86'`——那是 C1 的**初始国 cn**，没有"选 Japan→验证切换"的动作；mock 实例用例（setNumber 优先等 8 例）测的是适配层函数，不是真实 v18.2.1 链路 | **声明夸大：验收设计有盲区** |
| 3-4 | 三层时序 setNumber 优先 | 白盒探针实测 v18.2.1 页面：`window.intlTelInput` 是 **function**（无 getInstance），`_global()` 优先返回它 → **层1/层2 全部跳过**；jQuery 不存在 → 直落层3 DOM 兜底 | **严重缺陷：真实站点主路径断链** |
| 3-5 | 层3 DOM 兜底双代类名 | 实测 v18.2.1 真实 DOM 是 `.iti__flag-container > .iti__selected-flag`；适配层选择器只有 `.iti__selected-country`(v29)/`.selected-flag`(v16)/`.iti__flag-container`——点父容器不触发子层 listener；**点 li 后实例仍 cn，dropdown 未开（ul 仍 iti__hide）** | **严重缺陷：v18 代选择器缺失** |
| 3-6 | E2E iti 缺口红线（06 留）转绿摘标 | `npm run e2e` 该用例仍红（x 10）；`test.fail` 未摘——与 06 维护契约一致地诚实，但意味着 **issue 03 验收 4（场景 C 联动全绿）未闭环** | **未完成** |

### 过程违规检查（单独呈报，不替用户追认）

| 检查项 | 结果 |
|---|---|
| 检查点未等确认即执行 | 未发现。三票开工复述均记录 blockers 状态 |
| 越权提交他人改动 | 未发现。02 触及 tests/ 属 06 红标维护契约（06 报告 §6-2 预先授权条款），记录为**合规交叉** |
| 分支堆叠纪律 | 03 堆叠 01（正确）；02 堆叠 06（报告已自述原因，属依赖驱动） |
| **验收设计盲区** | 03 的场景 C 验收用"初始态 +86"冒充"联动成功"——**过程性问题，非违规但必须修复验收设计** |
| 仓库杂项 | `e-branch-1`（无提交空分支）存在，来历未明，无风险，建议后续清理 |

## 二、根因确认（confirmed 级，含反事实验证）

**03 号票适配层在真实 intl-tel-input v18.2.1 环境的主路径断链**，双根因：

1. **`_global()` 返回优先级错误**（confirmed）：`window.intlTelInput || window.intlTelInputGlobals` —— v18.2.1 的 `window.intlTelInput` 是 factory function（无 getInstance），被优先命中后层1/层2 直接跳过。反事实：直调 `intlTelInputGlobals.getInstance(el)` 实例后 `setNumber('+81')` → iso2 即刻变 jp（verified）。
2. **层3 DOM 选择器矩阵缺 v18 代**（confirmed）：v18.2.1 的触发器是 `.iti__selected-flag`（click 绑定于此），下拉项同步需要"先开 ul → 点 li[data-country-code]"时序；现选择器 `.iti__flag-container`（父容器，listener 在子层）命不中；v16 的 `.selected-flag` 在 v18.2.1 不存在。反事实：`.iti__selected-flag` 点击 → ul 打开（ulOpen=true）→ `li[data-country-code=jp].click()` → **iso2 变 jp（verified）**。

## 三、结论

- **02：复核通过**（done）——引擎/常量/测试门/红标摘除全部实物验证。
- **06：复核通过**（done）——基建契约、hermetic 供给、探针交付全部实物验证；其 iti 假成功探针是本次发现 03 问题的决定性输入。
- **03：复核不通过（源码级缺陷）**——mock 全绿掩盖真实站点主路径断链；issue 验收 4 未闭环。需修复后重交。

## 四、修复启动器

已重发：`prompts/03-iti-adapter-fix.md`（含强制自检条款：修复方案须先经子代理质检复核大脑的检查结论，再执行修复）。

## 五、frontier（修复后重算）

- 修复中：03（cch/03-iti-adapter-fix）
- 03 修复闭环后 → **Wave 3 解锁：04 / 05 / 09** 三窗并行（均只依赖 02）
- 04/05 完成后 → Wave 4：07 / 08
- 收口：10
