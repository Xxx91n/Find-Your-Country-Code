# 45: 仓库与流程收口

**What to build:** 远端 ref 列表可读；CI-only 边界有条款。

**Blocked by:** 票 41

**Status:** ready-for-agent

**覆盖 A-xxx:** A-024, A-025

- [x] 已确认合并的 origin/cch/* 分支清理完成（附清理前后 ls-remote 对比）；须用户授权 —— **达成（清理集为空，零删除，无需远端写授权）**。实物核验 2026-09-14：`git ls-remote origin` 全量 ref = `main` + 9 支 `refs/heads/cch/*`（36/37/38/39/40/42/43/44/cycle5-ticketing）+ 2 个 PR ref + 3 个 tag；逐支 `git merge-base --is-ancestor <sha> origin/main` **全部 NOT-MERGED**（`origin/main` = `e2a10d8e`，Cycle-4 收口头，Cycle-5 尚未 land）→ 无「已确认合并」分支可删。台账 A-024 所载 Cycle-4 land 副产物 11 支（27/27-fix/28/29/30/31/32/33/34/35/brain-docs）逐名 `git ls-remote --heads origin refs/heads/cch/<name>` **全部 ABSENT**，残留早已不在远端。清理前后 ls-remote 逐字节一致（见报告 §1）。
- [x] WORKFLOW 中新增 CI-only 政策与本地硬验收边界条款 —— 达成：新增 **§8 证据边界（CI-only 政策与本地硬验收）**（§8.1 CI-only 政策 5 条 + §8.2 本地硬验收边界 5 条）；总原则「行为面验收证据只认 CI run/artifact」显式标注**不可放松**，并给出例外登记四要素 + 逐次授权路径。行业对标 = atomcode 深度调研 `research/atomcode-45-ci-evidence-boundary.md`。
- [x] 不改既有 §5 教训条目格式 —— 达成：§5 仅按既有四列格式（日期 | 阶段 | 教训 | 防再犯）**追加 1 行**（票 45 台账外部状态失效教训），既有 11 行零改动（§5 表现共 12 行）。
