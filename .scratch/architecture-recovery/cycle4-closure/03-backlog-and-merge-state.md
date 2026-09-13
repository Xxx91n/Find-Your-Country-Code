# Cycle-4 收口审计 — 03 合并状态 + Backlog 清单

## 合并状态（goal 第 6 步）

- `but pull`：**No new upstream commits — Everything is up to date**。
- 栈序逐支合并：**无待合支**——Cycle-4 全部 13 支（票 27-35 实施支 + 27-fix 返工支 + brain-docs 两批）已于复核通过后按栈序 land 进 main（`7dbc6fc → e3dda808`，零 squash，父链完整，票级提交全可溯）。
- **push 边界：停在本文件落盘时刻。** 本次审计新增的收口工件（ledger 结算 / CONTEXT 词条修订 / ADR-0007、0008 / docs/architecture-recovery-cycle4-decisions.md / 本目录 / issue28 AC5 闭合 / README 收口节）提交于本地分支 `cch/cycle4-closure`，**未 land、未 push**——待你明确指令。

## Backlog 清单（goal 第 7 步，等用户决定是否立票）

| # | 项 | 来源 | 建议处置 |
|---|---|------|---------|
| B-1 | GreasyFork 站内同步 @1.4.0→1.5.0（GitHub Release 已自动发布，GF 页落后） | 跨周期 | 维护者手动/凭证门控，非代码票 |
| B-2 | 远端已合并 `origin/cch/*` 11 支清理 | 本轮 land 副产物 | 一次 `git push origin --delete` 批清 + `fetch --prune` |
| B-3 | 每票私有 E2E 作业（verify-27/29 内复刻 e2e 步骤）并回统一 e2e.yml | W2 呈报 | 中票；共享安装面已修，合并回并削减门禁碎片 |
| B-4 | verify-09/13/15/18 私有 `toModuleBody` 裸求值 TS 残留（verify-15 F-1 S4 断言漂移同在） | cycle-3 F-1 + 票 32 D4 | 一张返修票统一 stripTypes + 修 S4 口径 |
| B-5 | typecheck.yml 注释/命令不一致（一行）+ D-33b lockfile 根 version 同步 | 票 33 呈报 | 随下次卫生票顺手清 |
| B-6 | P1/P8 同证据档位不一致（6 选项 auto vs 5 选项 lowkey）独立裁决 | 票 27 R1 §6 | 产品语义票，禁借补分越线 |
| B-7 | contenteditable 区号面（A-003 弱化项，无语料地基） | 票 29 D-29d | 先入 corpus 再立检测票 |
| B-8 | 真实站点层外部目标启用（D1 runbook 已写） | 票 32 | 人工核对后置 enabled:true |
| B-9 | react@18/react-dom19 双 peer 冲突根因修复（移除 --legacy-peer-deps 残留） | ADR-0008 负后果 | 依赖票 |
| B-10 | CI-only 政策与审计型本地硬验收的边界条款化（本次 goal 授权覆盖已记录） | 收口偏离 | WORKFLOW §6 增补，或维持逐次授权 |

以上未立票；立哪几张由你定。
