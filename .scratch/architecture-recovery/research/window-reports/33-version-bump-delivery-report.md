# 33 — 版本 bump 交付闭环（A-007）窗口报告

> Cycle-4 | W3 收口波 | 分支 `cch/33-version-bump-delivery`（堆叠于 `cch/32-real-site-corpus` 之上）
> 证据铁律：全部结论锚 commit sha + CI run ID；报告自述不算证据。

## 0. 结论速览

| 项 | 结果 | 证据 |
|---|---|---|
| 目标版本号 | **1.5.0**（大脑开工指令给定，票面不预设） | 本次开工指令 |
| 三处版本一致 | ✅ package.json / vite.config.ts / Glog + Glog_EN 头条 全为 1.5.0 | `06fd225` + dry-run 日志 |
| 产物 @version | ✅ `1.5.0` | dry-run run `34705359110` |
| dry-run CI | ✅ **success** | run `34705359110` @ `e308765` |
| tag 状态 | ✅ `v1.5.0` 不存在 → 合入 main 后将创建 release v1.5.0 | 同 run 日志 + `git ls-remote` 实证 |
| 真实发版 | ⛔ **未执行**（零 tag / 零 Release / 零 GreasyFork 同步） | 权限边界，待用户确认 |

## 1. 阻塞关系与前置核对（Blocked by 全清方可开工）

| 票 | 覆盖 | 复核结论 | 复核记录 |
|---|---|---|---|
| 27 检测覆盖率下限补强 | A-001 | done（复核通过） | `verification/review-wave2-cycle4.md` |
| 28 ISO2-value 下拉区号证据补全 | A-002 | done（复核通过；AC5 `[~]` 合入后闭合） | 同上 |
| 29 扫描候选集扩展 | A-003 | done（复核通过；contenteditable 弱化呈报） | 同上 |
| 30 规则分档覆盖收敛到 selector 级 | A-004 | done（复核通过） | `verification/review-wave1-cycle4.md` |
| 31 填充结果可观测 + 失败反馈闭环 | A-005 | done（复核通过） | 同上 |
| 32 真实站点抽样语料 + 覆盖回归 | A-006 | done（复核通过） | 同上 |

六票报告均已落 `research/window-reports/`，Blocked by 全清 → 开工。

## 2. 版本现状与改动

bump 前：`package.json 1.4.0` / `vite.config.ts '1.4.0'` / Glog 与 Glog_EN 头条 `v1.4.0` / 最新 tag `v1.4.0`（`6340757`，2026-09-06）。v1.4.0 之后 main 已有 19 个提交（含 cch-23 strict 类型收敛、cch-24 安全加固、cch-25 依赖钉死、cch-26 收口），叠加 27–32 六票分支改动，全部未随新版本到达用户 —— 即 A-007 原文。

| 文件 | 改动 | 行尾 |
|---|---|---|
| package.json | `"version": "1.4.0"` → `"1.5.0"` | LF（保持） |
| vite.config.ts | `userscript.version '1.4.0'` → `'1.5.0'` | CRLF（保持） |
| greasyfork/Glog.md | 新增 `## v1.5.0 更新日志` 头条（7 条） | CRLF（保持） |
| greasyfork/Glog_EN.md | 新增 `## v1.5.0 Changelog` 头条（7 条） | CRLF（保持） |
| .github/workflows/release-dry-run.yml | 安装口径修复（见 §4） | LF（保持） |

**刻意未触碰 `package-lock.json`**：其根 `version` 字段不参与 `npm ci` 同步校验（本地 `npm ci --dry-run` exit 0 实证），且该文件的两个重生成版（票 29 `nnr` / 票 34 `srn`）互斥未合流（D-27e），本票不第三次改写同一冲突面。

changelog 内容来源：v1.4.0 之后 19 个 main 提交 + 27/28/29/30/31 五票的复核通过结论（32 为语料地基、34 为 CI 门禁，均非用户可感知改动，未单列条目）。

## 3. 分支与提交（WORKFLOW §4.2，全程 `but`，零 git 写操作）

- 新建分支 `cch/33-version-bump-delivery`（`but commit -b`）。
- `but move cch/33-version-bump-delivery --above cch/32-real-site-corpus` → 堆叠于合序栈顶；`git merge-base --is-ancestor origin/cch/32-real-site-corpus origin/cch/33-version-bump-delivery` 为真、反向为假 → 堆叠方向正确。

| sha | 内容 |
|---|---|
| `06fd225` | 版本 bump 至 1.5.0（Glog.md +10 / Glog_EN.md +10 / package.json / vite.config.ts） |
| `e701f3a` | release-dry-run 安装口径恢复 `--legacy-peer-deps` |
| `e308765` | 改 `npm install --legacy-peer-deps`（head，dry-run 绿） |

## 4. dry-run CI：红→绿两次迭代（只认 CI 证据）

| 轮次 | run | sha | 结论 | 失败步骤与归因 |
|---|---|---|---|---|
| R1 | `34704984108` | `06fd225` | failure | Install dependencies：`npm ci` **ERESOLVE**（react 18 ↔ react-dom19 别名包 peer 冲突） |
| R2 | `34705250821` | `e701f3a` | failure | Install dependencies：`npm ci --legacy-peer-deps` **EUSAGE**（lockfile 与 package.json 失同步） |
| R3 | `34705359110` | `e308765` | **success** | — |

### 归因链（两次红灯均为预存安装面红，与 1.5.0 bump 无因果，且都发生在任何版本断言之前）

1. cch-19 `4544a72` 为 release/dry-run 加 `--legacy-peer-deps`，实证裸 `npm ci` ERESOLVE 恒红（run `34035320882`）。
2. cch-25 `4b420be`「移除 8 个 workflow 中的 --legacy-peer-deps」→ 回归。
3. cch-34 R1 联③ 修 e2e/typecheck，但明言「release 系零接触」→ release-dry-run 保持预存红。
4. 本栈 `package-lock.json` 仍是 cch-25 前遗留的 `latest`/1.3.4 版（typescript@7.0.2 / vite@8.2.2 / vite-plugin-monkey@8.1.1 不满足票 25 钉死范围），票 29 `nnr` 与票 34 `srn` 两个重生成版因 D-27e 所有权冲突未进本栈 → `npm ci` 必 EUSAGE。

**修复**：改 `npm install --legacy-peer-deps` —— 不依赖 lockfile 同步，与 cch-34 联③ 修 e2e.yml 的口径一致（E2E run `34694435571` 已绿先例）。只改验证型 workflow，`release.yml` 与发版语义零触碰。

### R3 绿日志原文（本票专属验收证据）

```
Cross-check version sources  artifact=1.5.0 vite.config.ts=1.5.0 package.json=1.5.0
Report tag state             Tag v1.5.0 does not exist - a push-to-main run WOULD create release v1.5.0
```

另有 `git ls-remote --tags origin` 实证：远端仅 `v1.3.4` / `v1.4.0`，`v1.5.0` 确不存在。

## 5. issue 33 验收勾销

| 验收项 | 状态 | 证据 |
|---|---|---|
| 版本号三处一致 bump | ✅ | `06fd225` + dry-run `34705359110`（artifact / vite.config.ts / package.json 三源均 1.5.0；Glog 双语头条已入同提交） |
| dry-run CI 先行验证三处一致 + tag 状态 | ✅ | run `34705359110` @ `e308765` success |
| 发行动作须用户确认后执行 | ✅（合规：未执行） | 本窗口零 tag / 零 Release / 零 GreasyFork 同步；`git ls-remote` 实证无 v1.5.0 |
| 证据锚 commit sha + CI run ID | ✅ | 见上三行 |

## 6. 偏离点与呈报（单列，不追认）

- **D-33a 越票面修改 `release-dry-run.yml`**：票 34 明确「release 系零接触」，本票为使专属验收（dry-run 绿）成立而修改该文件安装步骤。仅影响验证型 workflow（dry-run 不建 release），`release.yml` 未动。**需用户/收口追认。**
- **D-33b 未同步 `package-lock.json` 的 version 字段**：本栈锁文件为 cch-25 前遗留版，根字段本就为 1.3.4。理由：① 根 `version` 不参与 `npm ci` 同步校验（本地实证）；② 该文件是票 29/34 所有权冲突区，本票不第三次改写。建议随 lockfile 单一真相版（srn）合流时一并处理。
- **D-33c W2 复核登记的「typecheck.yml 注释/命令一致性顺手修正」未在本票执行**：实读本栈 `typecheck.yml` 为 `npm ci --legacy-peer-deps`，与注释「回迁 npm ci」一致；该不一致存在于 `cch/34-gate-slimming` 栈的版本（Workspace 视图），不在本栈可达范围。越栈修改会引入合流冲突，故转登记，留票 34/35 收口。

## 7. 遗留与风险（收口须知）

1. **「最终合序栈全绿复核」未被本票闭合**：本分支 E2E（`34705346756`）与 Typecheck（`34705346755`）仍红，但属预存安装面红 —— cch/32 头 `4271ef9` 上同样两门皆红（run `34682857308` / `34682857326`），与本票改动无因果。本栈 `e2e.yml` 仍是 `npm install`（ERESOLVE）、`typecheck.yml` 仍是 `npm ci --legacy-peer-deps`（EUSAGE）；联③ 修复版位于 `cch/34-gate-slimming` 栈，未进本栈。dry-run 只校验版本与 tag，不承担 E2E/Typecheck。
2. **本栈未含 30 / 31 / 34-gate-slimming**：它们是独立栈（互不堆叠）。本次 dry-run 实际覆盖 27 → 29 → 34-lockfile-land → 28 → 32 → 33。真正合入时的全绿复核须以最终合序栈（含 30/31/34）重跑 E2E/Typecheck。
3. **合入 main 即会创建 release v1.5.0**（tag 去重逻辑：tag 不存在 → 建 release）。**此为不可逆公开发布动作，须用户明确确认后由大脑执行，不在本票权限内。**
4. GreasyFork 脚本页同步（更新日志发布）同属发版动作，未执行。
