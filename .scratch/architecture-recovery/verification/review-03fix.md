# 大脑复核报告：03 修复版（iti 适配层真实站点断链）

> 复核人：AutoCoder（大脑）| 日期：2026-09-04 | 对象：research/window-reports/03-iti-adapter-fix-report.md
> 方法：四道门独立复跑 + 仓库实物抽查 + 大脑自有终审探针（brain-probe-iti-sync.mjs）+ git/but 勘验

## 一、声明 → 证据 → 结论对照表

| # | 报告声明 | 大脑独立验证（observed） | 结论 |
|---|---|---|---|
| 1 | 先质疑大脑：独立复现双根因（repro-03-fix.mjs） | 脚本落盘（71 行，git 737025a）；报告内数据与大脑第 2 波复核数据完全一致（function 形态无 getInstance；v18 DOM `.iti__selected-flag`；反事实 cn→jp 双路径） | ✅ 质检通过：无矛盾，修复方案成立 |
| 2 | `_global()` 重写：globals 对象优先，factory 需自带 getInstance 才可用 | 实读 src/iti-adapter/index.ts L16-25：先 `globals.getInstance` 检查 → factory 仅当 `_isFn(factory,'getInstance')` 才返回——根因 1 修复到位 | ✅ 属实 |
| 3 | 层3 选择器矩阵补 v18 代 | L107：`.iti__selected-country, .iti__selected-flag, .selected-flag, .iti__flag-container`；li 选择器补 `li[data-country-code]`（L113/115）——根因 2 修复到位 | ✅ 属实 |
| 4 | 验收升级：场景 C 断言 beforeIso=cn → afterState.iso2=jp | verify 脚本实读 L162-184 含 beforeIso/afterState 双读断言；复跑 9/9 exit 0，关键行 `"afterState":{"iso2":"jp","dialCode":"81"}` | ✅ 属实（盲区已堵） |
| 5 | E2E 摘标（test.fail 移除） | 实读 fp-regression.spec.ts：iti 用例 describe 标题改为「已转绿」，无 test.fail；独立复跑 `npm run e2e` → **20 passed (40.3s) exit 0** | ✅ 属实 |
| 6 | 四道门（verify/e2e/harness-v2/build）全过 | 大脑全部独立复跑：verify 9/9 exit 0；e2e 20 passed exit 0；harness v2 25/25 exit 0（03 修复未破坏 02 误报回归）；build exit 0（50.97 kB，dist 含 globals-first 与 v18 选择器标记） | ✅ 属实 |
| 7 | 大脑终审探针（真实页面 cn→jp 用户流） | 大脑自有探针（06 hermetic server + dist 注入 + tab 切换 + 真实点击流）：`BEFORE_ISO=cn → AFTER={"iso2":"jp"} VERDICT=ITI_FILL_SYNCED` exit 0 | ✅ **真实站点联动 confirmed** |
| 8 | 版本矩阵如实标注证据强度 | v18.2.1 标注 reproduced（真实联动），v16/v25-v29 标注"能力探测推断"——未夸大 | ✅ 属实 |

## 二、分支落位与提交范围纪律

- `cch/03-iti-adapter` 顶端新增 `737025a fix(cch-03)`：仅触及适配层源码 + verify/repro 脚本 + 报告（4 文件），同票返工未新开分支——符合修复启动器约定。
- 摘标提交 `aee9374 test(cch-03)` 落在 **cch/02-scoring-engine 分支顶端**（因 02 堆叠 06 堆叠之上的拓扑，fp-regression.spec.ts 由 06 引入）：仅 2 行变更（test.fail 摘除+标题），属 06 维护契约动作，git 提交信息已正确标注 `test(cch-03)`。**判定：合规交叉**（与第 2 波 02 触及 tests/ 同性质）。
- 过程违规检查：开工复述（先质检大脑结论再修复）已执行——报告 §1 有独立复现数据；无越权、无未经确认动作。

## 三、结论

**03 修复版复核通过（done）。** 双根因修复均有源码实物 + 独立复跑 + 大脑终审探针三重证据；issue 03 验收 4（场景 C 真实联动）由"初始态冒充"升级为 cn→jp 真实切换断言并转绿。

遗留（如实登记，不阻塞）：
1. v16 前/v29 代 DOM 无真实页面回归（证据强度已如实标注 mock/反事实）。
2. dist 体积 44.93→50.97 kB（02 引擎+适配层增量），无体积门槛，观察项。
3. 异步 utilsScript 慢加载极端时序未专项覆盖（层3 120ms 兜底+实例优先已覆盖常见场景）。

## 四、frontier（重算）

**Wave 3 解锁：04（可重评估扫描+Shadow DOM）/ 05（站点规则引擎）/ 09（框架注入加固）——三窗并行开工。**
（04 转绿后将摘最后一个 test.fail 红标；05 完成解锁 Wave 4 的 07/08；收口票 10 待 09+07。）
