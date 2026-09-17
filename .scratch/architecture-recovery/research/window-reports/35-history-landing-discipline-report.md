# 窗口报告 — 票 35：历史可查落地纪律（A-010）

> Cycle-4 W4 收口纪律波 | 执行：大脑（合入 + 只读验证，未派子窗——票面即只读验证 + 纪律落档）| 2026-09-12
> 覆盖 A-010 | Blocked by: 33 ✅（done 复核通过）| 版本控制遵循 WORKFLOW §4.2

## §1 合入执行记录（11 支，底→顶，零 squash）

追认授权（用户 2026-09-12）：D-33a（release-dry-run.yml 越票面修复）、D-27e（lockfile 代解）、合入 main（含 release v1.5.0 触发）+ 票 35 收口。

land 序与结果（全部 `but land <branch> --yes`，GitButler 栈序自动 rebase 子支）：

| # | 分支 | land 后 main head | 冲突 |
|---|------|-------------------|------|
| 1 | cch/cycle4-brain-docs（大脑规划产物） | — | 无 |
| 2 | cch/30-rules-tier-scope-fix | c333476a… | 无 |
| 3 | cch/31-fill-feedback-loop | 74a9f6e5… | 无 |
| 4 | cch/34-gate-slimming | c5c068ea… | 无 |
| 5 | cch/34-docs-r2 | cb44bc53… | 无 |
| 6 | cch/32-real-site-corpus | 857bef52… | 无 |
| 7 | cch/28-iso2-dial-evidence | da97f4f9… | 无 |
| 8 | cch/34-lockfile-land | 27239541… | 无 |
| 9 | cch/29-scan-candidates-expansion | a55b8927… | 无 |
| 10 | cch/27-detection-coverage-floor | a00f639d… | 无 |
| 11 | cch/33-version-bump-delivery（殿后，发版触发点） | 20dc68ef → 019f228e（本票 docs） | 无 |

关键决策：cch/33 原堆于大栈中部（32 之上），若按栈序先 land 会让 release.yml 从**缺 27/28/29 的半成品 main** 建发版——land 前 `but move cch/33 --above cch/27` 抬至栈顶，确保发版基于完整合序 main。

## §2 只读验证（本票验收核心）

| 验证项 | 命令（只读） | 结果 |
|---|---|---|
| 非 squash / 父链完整 | `git log origin/main --format="%h parents:%p" -1` → `019f228e parents:f67b9a83` | ✅ 有父链 |
| 无新增 root commit | `git rev-list --max-parents=0 origin/main \| wc -l` = 1（唯一 root 仍为周期前既有 `7dbc6fc`） | ✅ 本周期零归零 |
| 票级提交可追溯 | `git log origin/main` 头部可见 `cch-33`×4、`cch-27`×6、`cch-34`×n、`cch-28`…逐票提交在父链中 | ✅ |
| v1.5.0 为 main 祖先 | `git merge-base --is-ancestor v1.5.0 origin/main` → TRUE | ✅ |
| 发版实证 | tag `v1.5.0` @019f228e（git ls-remote）；Release run 34708428429 + 34708464252 **success**；main 最终头 E2E/Typecheck/Calibration/Lockfile Regen/Release 全绿 | ✅ |

## §3 唯一红门与返修登记

- **Engine Gates @最终头红**（run 34708464239）：P8 expect=lowkey got=auto score=76——票 27 attr:phrase 在合序组合上把 dial 下拉抬过 auto 线；单栈验证互盲所致。
- 返修启动器已发：`prompts/27-detection-coverage-floor-fix.md`（裁决路线 A/B + 合序栈重跑全公共门）。A-001 维持 current，R1 绿后置 done。
- 教训已登记 WORKFLOW §5 两行（合入纪律 + 跨栈组合验证）。

## §4 纪律落档

WORKFLOW §5 新增：①周期合入一律 but land 栈序零 squash + 版本 bump 殿后 + 合序全门重跑；②行为面改动不得以单栈绿自证（P8 教训）。

## §5 issue 35 验收勾销

- [x] 落地不 squash 不改写历史（§1 十一支明细）
- [x] 只读验证 1 父链/无新 root（§2 前两行）
- [x] 只读验证 2 tag 祖先（§2）
- [x] 纪律落档 WORKFLOW §5（§4，含日期/教训/防再犯）
- [x] 证据锚：本票无 CI 证据面，commit sha + 只读命令输出即证据（§2 全文）；release 证据 run 34708428429

## §6 周期状态

- 账本：A-002…A-010 done；A-001 current（27-fix R1 返修在途）；**除 A-001 收尾外，Cycle-4 十摩擦点全部闭环，v1.5.0 已发布**。
- 未做（越出授权面，留用户）：GreasyFork 站内同步（凭证门控）、远端已合并分支清理、私有 E2E 作业并回统一 e2e（W2 呈报项）。