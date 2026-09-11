# 0006 — 仓库工程卫生基线：CI 脚本入 tests/scripts、PR 门控、strict 类型门禁、依赖钉死、单一 tests/ 目录

状态：accepted | 日期：2026-09-11 | 来源：第三周期仓库工程卫生票 20-25（spec.md Cycle-3；复核 verification/review-wave1-cycle3.md + review-wave2-cycle3.md）

## 背景

两个功能周期后，外部审计（锐评1.txt，取证见 research/cycle3-investigation.md）坐实八项仓库级卫生债务：CI 验证脚本住在名义可抛弃的 `.scratch/`、全部 workflow 无 pull_request 触发（main 裸奔）、`strict: false` 且 CI 无类型检查、985 行零引用遗留单文件 `src/Find-Your-Country-Code.js`、多处死导出、postMessage/BroadcastChannel 无 origin 校验、依赖 `latest` 浮动使 CI 不可复现、`test/` 与 `tests/` 双目录。检测核心质量不受影响（语料 precision=1.0），债务属仓库层。票 20-25 已实施并经大脑两轮复核对账，本 ADR 固化其中不可逆的策略决策；票 24 安全加固属引擎威胁模型裁决（跨域下 `'*'` targetOrigin 不可避免、退化为来源锚点），以窗口报告与提交 b57a25d 为记，不在本 ADR 重复。

## 决策

1. **CI 脚本位置约定**：一切被 CI 引用的验证/校准脚本置于 `tests/scripts/`（脚本以自身位置上溯 2 级锚定仓库根）；`.github/workflows/*.yml` 禁止出现 `.scratch/` 路径引用。`.scratch/architecture-recovery/research/scripts/` 降级为可抛弃调研现场，不再是 CI 单点故障。（票 20：9 脚本迁移、workflows `.scratch/` 引用清零；calibration run 34569015933 + E2E run 34568992880 绿）
2. **PR 门控策略**：所有非发版 workflow 必须声明 `pull_request:` 触发，main 合入以 CI 门禁为前置（typecheck + E2E + calibration baseline + verify-* 票级回归）；发版系 `release.yml` / `release-dry-run.yml` 例外，只由发版事件与手动触发。（票 21：六 workflow 补齐 + 票 23 typecheck.yml 原生自带，PR#2 实证六 run 并行触发；verify-15 预存红见后果 1）
3. **类型门禁**：`tsconfig.json` 保持 `"strict": true`；`npm run typecheck`（tsc --noEmit）由 typecheck.yml 在 pull_request / push(main, cch/**) / workflow_dispatch 三事件执行。类型修复必须 types-only——以同提交 E2E 绿为无运行时行为变更的实证；共享类型层集中 `src/types.ts`，禁 `as any` 逃逸。（票 23：240→0 错误四轮收敛，Typecheck run 34590080334 + E2E run 34590080352 同提交 7b98132 双绿）
4. **依赖版本钉死策略**：package.json 依赖一律显式 semver 范围、禁 `latest` 浮动（typescript `^5.7` / vite `^6.0` / vite-plugin-monkey `^5.0`）；CI 安装以 package-lock.json + `npm ci` 复现。`--legacy-peer-deps` 属登记在案待清偿的例外而非策略。（票 25：devDependencies `latest` 清零、七 workflow 移除该 flag；typecheck.yml 残留 1 处见后果 2）
5. **目录结构约定**：仓库只有一个 `tests/` 根：`manual/` 手工验证页、`scripts/` CI 验证脚本、`fixtures/`+`corpus/` 语料、`*.spec.ts` E2E；`test/` 废止（3 个手工验证页迁至 `tests/manual/`）。冻结基准不入库：v1.3.4 遗留单文件已删除，历史对照走 `git show v1.3.4`（CONTRIBUTING 双语已改）；死导出删除以 rg 零调用者为前提，存活调用者（store 侧 subscribe）保留。（票 22/25：E2E run 34569162088 场景 A–E 绿证行为不变）

## 依据（全部 observed，证据锚点为 commit sha / CI run，非磁盘态）

1. `.scratch/` 名义可抛弃与 CI 单点故障的矛盾：审计 16 条指控逐条取证坐实（cycle3-investigation.md）；迁移后 workflows `rg '.scratch/'` 0 命中且 calibration 全 9 step 绿、precision=1.0000（票 20 报告 §6）。
2. 无 PR 门禁时 main 不受任何检查保护：此前全部 8 个 workflow 仅 push + workflow_dispatch；补 `pull_request:` 后 PR#2 实测 6 workflow 并行触发、5 绿 1 预存红（票 21 报告 §2）。
3. strict 关闭使接口错配可无声进主干：开启后第一轮 tsc 捕获 240 错误/30 文件，四轮修复收敛至 0，且同提交 E2E 全绿兑现 types-only 承诺（票 23 报告 §2/§4）。
4. `latest` 浮动使 `npm ci` 结果随安装时刻漂移，TS/Vite 大版本跳变即 CI 红噪：钉 `^major` + lockfile 后口径可复现（票 25 报告 §3.1-3.2；复核 review-wave1 §票25 实物验证）。
5. 双 `test/` 目录与 985 行零引用遗留文件构成静默双维护面：`rg` 实证 src/ 零引用后删除，E2E 场景 A–E 绿证明运行时行为无变化（票 22 报告 (a)/(b)）。
6. 迁移先于触发器扩面是竞态实证驱动的顺序依赖：票 21 的 Blocked by 20 避免 YAML 路径 hunk 与触发面 hunk 同文件并发（V3 竞态事故为反面教材，review-wave1 违规清单）。

## 反证条件（满足任一即重开本 ADR 相应条款）

1. 位置约定失守：出现新 workflow 必须引用 `.scratch/` 路径才能运行——重开迁移范围与 `tests/scripts/` 边界裁决。
2. PR 门控造成不可接受的阻塞：预存红（如 F-1）或门漂移使 PR 队列长期不可过且无法以限定统计口径修复——降级为「typecheck + E2E 入门禁、verify-* 转 advisory」。
3. 类型门禁与工具链升级冲突：tsc 大版本（7.x）合流造成不可立即收敛的错误面——按票 23 风险提示做合流复核后再裁决，而非默认关闭 strict。
4. 钉死策略不足：`^major` + lockfile 仍出现 CI 不可复现（工具链隐式浮动）——升级为精确 pin + 自动化升级通道（Dependabot/Renovate）裁决。

## 后果

- `.scratch/` 不再是 CI 依赖：删除调研现场不影响流水线；其归档/清理留待后续周期（本周期 spec 明确 Out of Scope）。
- 本周期登记三项遗留，属执行残差而非策略推翻：
  1. **F-1 verify-15 S4 门预存红**（PR run 34606286040 与 main 基线 run 34606594163 同红 27/28）：断言「dispatchEvent 恰 1 处」早于 cch-18 引入 pseudo-select keydown 第二派发点（src/fill/index.ts:246），PR 门控合入 main 后将挡所有 PR；修法为 S4 口径限定（仅统计 input/change 值事件派发点）或豁免登记——待返修票，票 21/26 窗口均无改测试授权未动。
  2. **typecheck.yml 残留 `--legacy-peer-deps`**（D-23b：react@18 与 react-dom19 别名双 peer 结构性冲突使裸 npm ci 必红；票 25 的七 workflow 清单不含票 23 新建文件）。根治双 react 依赖或 lockfile 实证后可移除；移除前按票 25 §4 约定加注释锚定原因。
  3. **lockfile 重生成待 CI 实证**（票 25 AC4 pending；工作区尚存他窗在途的 workflow 安装命令改动，本票不触碰）。
- V5 过程教训：票 23 在「本周期消除该 flag」背景下新建 workflow 反向引入 flag——新 workflow 一律以基线最新口径起稿（建议写回 WORKFLOW §5）。
- CONTEXT.md 新增「工程门禁与仓库卫生」术语节（CI 门禁 / PR 门控 / 密封 E2E / 类型门禁 / 依赖钉死），后续周期以词表为准引用。
- 票 20-26 分支合入 main 属人工收口动作（forge 配置见票 21 D-21c；合入前先修 F-1、合入门控上线前先跑 main 全门基线——票 21 教训），本 ADR 不记录合并事件本身。
