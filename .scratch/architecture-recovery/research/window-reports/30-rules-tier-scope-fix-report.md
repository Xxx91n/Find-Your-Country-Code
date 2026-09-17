# 窗口报告 — 票 30：规则分档覆盖收敛到 selector 级（A-004）

> Cycle-4 W1 | 实施窗口 | 2026-09-12 | 分支 `cch/30-rules-tier-scope-fix`（基线 common base `7dbc6fc` = origin/main，未堆叠）
> 覆盖 A-004 | Blocked by: None | 版本控制：WORKFLOW §4.2（全程 but）

## §1 结论（TL;DR）

`pageTierOverride()` 的语义泄漏已收敛：分档覆盖只作用于命中 selector 的元素；页面级语义建模为**显式规则类型**（`scope:'page'`，v1 文档缺省 `element` 向后兼容）。复现红与不回退绿均以 CI 为证：

| 证据 | commit sha（远端） | CI run ID | 结果 |
|---|---|---|---|
| 复现红·门（断言级） | `1e2100e`（c2 红提交） | **34687387189** | gate 94/100，FAIL=6 全为 A-004 泄漏语义 |
| 复现红·E2E | `ee54d8a`（红中间态） | **34687024566** | 61 用例仅「票30 元素级规则不放大全页」红（`#cc-strong` 被错误压 lowkey 实拍） |
| 收敛绿·三合一 | `4b2ab94`（c3 修复提交） | **34687594979** | gate **100/100 ALL GREEN** + E2E **61 passed** + Typecheck **success** |

提交链：`bd7ceda`（c1 chore：门迁入 + verify-30 挂接 + CI 装载兼容）→ `1e2100e`（c2 test：复现/收敛断言，TDD 红）→ `4b2ab94`（c3 fix：语义收敛）。

## §2 调研（atomcode，串行护栏合规）

纪要：`.scratch/architecture-recovery/research/atomcode-ticket30-rule-scope.md`。核心输入：行业主流以「独立规则类型 + 显式 scope 字段」表达页面级规则（Apple exact-domain-match-only / Bitwarden match-detection / Dashlane 三粒度；1Password data-1p-ignore vs data-op-ignore 同构）；**通配 selector 表达整页语义系桌面小众场景，`*` 在元素匹配语境命中一切恰是放大路径——落选**。向后兼容口径：新字段缺省 = 旧元素语义，无需文档迁移（页面级规则从无 UI 写入口，仅测试态用 `body` 选择器，无真实存量）。

## §3 实施

数据契约（权威：`src/store/index.ts` 头注，本票已同步）：overrides 条目新增可选 `scope?: 'element' | 'page'`。

- `src/store/index.ts`：upsertOverride 归一并持久化 scope（仅 'page' 生效，其余含旧文档缺字段一律 'element'）；头注契约更新；isOverrideRule 不动（旧文档直通）。
- `src/types.ts`：`RuleScope` 类型 + OverrideRule/OverrideRuleInput 投影。
- `src/rules/index.ts`：`pageTierOverride()` 仅消费 `scope:'page'` 规则；`forcedTier()` 跳过页面规则（页面规则不得走免评分强注路径）；`overridesFor` 副本投影 scope。
- `src/ui/index.ts`：`matchingOverrides` 排除页面规则——负反馈冲突清理/幂等判定只针对元素级规则（防页面规则 `*` 选择器被用户负反馈一键删除）。
- `src/detect/index.ts`：消费块注释同步语义（无行为改动——重映射/撤图标路径原样，唯一入口由 rules 层收紧）。

不变项（断言锁定）：豁免域名=整站跳过、`rememberNone` 负反馈元素级、强制选择器评分前命中、页面档=注入档位下限（auto/lowkey 双向重映射走评分后路径，signals 留痕 `rule:tier-override`，可见性闸门仍适用）。

测试资产：门 `verify-ticket-05.mjs` 自 `.scratch/research/scripts` 迁入 `tests/scripts/`（A-006 卫生基线；票 05 门 79 项断言全数保留，S2/S3 页面用例改显式 scope 表达）；新增 S5 组 21 断言（A-004 复现/收敛/不变项/CRUD 边界）；E2E `tests/rules-ui.spec.ts` 新增票 30 两用例；`.github/workflows/verify-30.yml`（PR 门控 + 本票分支 push + dispatch）。

## §4 偏离点呈报（待大脑收口确认，未擅改）

- **D-30a 词表冲突**：`CONTEXT.md`「分档覆盖」词条（“页面级规则，把该页检测结果的注入档位下限抬升/压到声明档”）与新语义冲突——收敛后“分档覆盖”默认作用于命中元素（并入「强制选择器」消费路径），页面级仅存于显式 `scope:'page'` 规则类型。建议收口时词条拆分为「分档覆盖（元素级）/页面级覆盖」或改写。本票未改词汇表。
- **D-30b ADR-0003 措辞**：「页面级分档覆盖（用户显式档压过启发式）」仍然成立但不再完整（“任意 selector 规则皆页面级”这一隐式语义已被移除，属票面目标）。建议收口时 ADR 附注 scope 显式化。本票未改 ADR。
- **D-30c 门迁移与装载兼容（票外前置）**：05 门原无 CI 挂接点（仅 .scratch 磁盘态，违反证据铁律），迁入 tests/scripts 并挂 verify-30；装载修复三处（ROOT 两级、cch-23 类型标注后必须 `module.stripTypeScriptTypes` 先剥类型再拼 return、workflow 钉 node 22）——口径复用 14-lib-engine 票 32 前置修复，非本票发明。
- **D-30d 共享安装面预存红**：`e2e.yml`（裸 npm install）与 `typecheck.yml`（npm ci）在本分支及并行分支（票 31 `682e599`、票 34）持续红——根因基线漂移：package-lock.json 失同步（F-3）+ react-dom19 浮动解析 ERESOLVE（F-2）；与票 31 `8b58861`（D-31a）同机制同口径。本票不越权共改共享 workflow，E2E/类型证据由 verify-30 自带作业承担（npm install --legacy-peer-deps）。收口需统一处置 lockfile。
- **D-30e 无 UI 面**：页面级规则暂无面板创建入口（票 07 面板只写元素级），scope:'page' 仅 GM 手工/API 可达；如需暴露属后续票，非 A-004 范围。

## §5 TDD 红绿账与教训

红→绿各一次真实迭代；过程中三处自身失误全部由 CI 暴露并修正（未本地自证，合规 CI-only 政策）：① ROOT 迁移少一级（ENOENT）；② store 头注 scope 行漏 `//` 前缀（三 job 同点炸）；③ S4 批量用例 500 条规则塞满 RULES_MAX_OVERRIDES 截断位，S5 规则被切片隐形（FAIL 面失真）。建议登记 WORKFLOW §5 候选教训：**门脚本新增 section 一律自带状态隔离（清共享 mock 桶），不得依赖组间执行序**；证据链以最终干净红/绿对为准，中间污染 run（97551c9/da25eff/dcf3b1d/9a229b9/ee54d8a-gate 装载炸）不引用。

## §6 收尾状态

issue 五项验收已勾销（`issues/30-rules-tier-scope-fix.md`，各附 sha+run ID）。分支已推送 origin；合入 main 属大脑收口动作（票 35 纪律：非 squash），本窗口不 land、不 PR（未获指令）。
