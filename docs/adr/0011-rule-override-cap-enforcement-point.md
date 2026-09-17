# ADR-0011: 站点规则上限（RULES_MAX_OVERRIDES）的强制点在写路径

日期：2026-09-17 ｜ 状态：accepted ｜ 来源：Cycle-6 票 12（A-036）

## 背景

`RULES_MAX_OVERRIDES`（`src/config.ts`，500）是站点规则文档 `overrides[]` 的数量上限。票 10 的门保真度取证（`research/window-reports/10-srcdoc-origin-fix-report.md` §6.2）发现：该上限**只在 `_normRulesDoc`（外来输入摄取路径）内截断**，本地写路径（`upsertOverride` → `_writeRules`）不截断，内存文档与 GM 持久化值均可超限；同时 `verify-ticket-05.mjs` 的 BroadcastChannel 替身按引用投递，使 S4「上限生效」断言在门内以**替身别名旁路截断**的方式为绿 —— 该绿不是实现保证（A-036）。

由此产生一个必须裁定的取舍：上限的**强制点**放在**写路径**（生产者拒绝）还是**读路径**（摄取修复 / 读取投影）？

## 决策

**强制点在写路径**：`upsertOverride` 在**新增**规则前 fail-closed 拒绝（返回 `null`，不落盘、不广播）。既有 id 的更新（改）与删除不受上限影响。

`_normRulesDoc` 的 `slice(0, RULES_MAX_OVERRIDES)` **保留**，但其定位明确为**外来输入的摄取修复**（BC 接收 / GM 远端监听 / 首次从存储载入）—— 第二层防御，不承担本上限的保证。

配套：`verify-ticket-05.mjs` 的 BC 替身补齐**结构化克隆投递**（真实平台语义），其 `origin` 直接消费 `src/config.ts` 的 `SELF_ORIGIN`（不另立第二套取值）。

## 依据

**本仓既有语义**

1. `RULES_MAX_OVERRIDES` 的注释自述为「文档内覆盖规则上限（防御异常增长）」—— 上限的语义对象是**文档**（持久化 + 广播的产物），不是某个读投影。
2. `_normRulesDoc` 的头注自述为「防御性规范化（远端/GM 值可能被外部写坏）」—— 该函数的定位是**外来输入**的修复面，不是本地生产者的约束面。
3. `src/store/index.ts` 文件头注是 v1 文档格式的权威契约（`src/rules/index.ts` 与 07 面板接口均以其为准）⇒ 上限属契约的一部分，产出该文档的本地写路径有义务不违约。

**工业界语义**（atomcode 深度调研，2026-09-17，落盘 `research/12-atomcode-enforcement-point.md`，15 条来源）

4. 系统级上限由**写入路径 fail-closed** 强制是 NoSQL 与关系库的共同默认（MongoDB 16 MiB 文档硬限；MongoDB Schema Validation **默认拒绝**会产生无效文档的插入/更新，另可配「允许但告警」档；DynamoDB 配额体系；NIST SP 800-53 SI-10「在离数据最近的层做输入校验」）。
5. 应用/仓储的写入边界不是替代而是**前置哨兵**，官方建议两层并置（Oracle 明确推荐「约束 + 应用代码双重校验」并为此提供 `PRECHECK`）。
6. 读取宽容（Tolerant Reader，Fowler 2011）的边界被精确限定为「外部提供方将来可能**合法变化**的部分」（未知字段、缺失字段）—— **不含**「记录数超上限」这类不变量；检索范围内**不存在**把数量上限放在读路径静默修复的一手案例。
7. 宽容读取的代价有协议层权威背书（RFC 3117 / RFC 9413）：宽容会固化缺陷、制造 bug-for-bug 兼容。

**本仓工程判据**

8. **跨标签页一致性**：写路径强制使「内存缓存 = GM 持久化 = 广播载荷」三面**同时**不超限；仅读路径强制会产生分歧窗口（写方 > 上限、接收方 ≤ 上限），而 S4 断言恰好探测该边界。
9. **被保护的资源**：上限保护的是**持久化 blob**（GM 存储）。只在读侧截断则超限 blob 已经落盘，保护在关键处失效。

## 后果

- 正：上限成为**真实保证**而非读投影的有损效果；跨标签页三面同源；面板可据 `upsertOverride` 的 `null` 返回如实提示（fail-closed 不静默）。
- 正：`_normRulesDoc` 的职责单一化（只做外来输入的容忍式修复），与 Tolerant Reader 的边界一致。
- 负：达到上限后新增规则被拒，用户须先删除既有规则（无自动淘汰）；`exempt` 列表不受本上限约束。
- 已知取舍：未在 `_writeRules` 增加「静默截断」式兜底 —— 静默截断会把「违反不变量」掩盖为「截断后正常」，与 fail-closed 取向相反。

## 反证条件

- 出现真实需求要求「上限满时自动淘汰最旧规则」（FIFO/LRU 淘汰）且有 ≥2 源实证该语义更优时，可把拒绝改为淘汰（不变量位置不变）。
- 出现「读路径强制 + 写路径不强制」在跨标签页场景下被证明更优（例如持久化介质本身有硬限且不可控）时重开本 ADR。

## 参考

- 裁定与取证：`.scratch/architecture-recovery/research/window-reports/12-rules-limit-fidelity-report.md`
- 缺口来源：`.scratch/architecture-recovery/research/window-reports/10-srcdoc-origin-fix-report.md` §6.1/§6.2
- 调研：`.scratch/architecture-recovery/research/12-atomcode-enforcement-point.md`
- 台账：A-036（`.scratch/architecture-recovery/decision-ledger.md`）
- 决定性对照实验：`.scratch/architecture-recovery/research/scripts/12-ab-cap-fidelity.mjs`（2×2：写路径强制 × 替身投递保真度）
- 实现：`src/store/index.ts`（`upsertOverride` 强制点 + 文件头契约注）；`tests/scripts/verify-ticket-05.mjs`（替身结构化克隆 + `SELF_ORIGIN` 同源）
