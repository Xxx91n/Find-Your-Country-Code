# 窗口实施报告：19 — 发版与发布链接恢复

> 大脑/用户角色执行（本票不做业务代码）| 2026-09-06 | 分支：`cch/19-release-links`（ymr/ozm/zrs/puv，已落地）+ `cch/19-dispatch-trigger`（lnw，已落地）
> 开工复述：Blocked by 12/13/14/15/16/18 —— wave1~wave4 复核全部通过（`verification/review-mmv2-wave*.md`），全部窗口报告落盘且经大脑复核，发布动作前置满足；必读 9 件按序读全（issue / handoff / spec / WORKFLOW / atomcode 存档 / 宏观报告 / release.yml / release-dry-run.yml / CONTRIBUTING）。

## 1. 检查点核对

| 检查点 | 结论 | 证据 |
|---|---|---|
| 一：全部实施票报告落盘并经大脑复核 | 满足后才开始发布动作 | wave4 复核 frontier：「全部实施票 11-18 + 三个修复票 = 全闭环。下一波 = 19」 |
| 二：版本三处一致以 CI dry-run 绿为准 | 通过 | dry-run run [34035726335](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34035726335) success：`artifact=1.4.0 vite.config.ts=1.4.0 package.json=1.4.0`；`Tag v1.4.0 does not exist - a push-to-main run WOULD create release v1.4.0` |
| 三：链接验证四条全 200 | 通过（方法与输出见 §3.3） | README 200 / GF 页 200 / Release 页 200+附件 302→200 / 安装直达 200 |
| 四：触发面与 install 口径统一 + Wave1 链按栈序合并 | 完成 | §2.1 合流 + §2.2 workflow 统一提交（ymr/lnw） |

## 2. 变更清单与理由

### 2.1 合流入 main（发布动作的前半，遵循 WORKFLOW §4.2，全程 but）

| 步骤 | 操作 | 说明 |
|---|---|---|
| 1 | `but land cch/18-pseudo-select-e2e --whole-stack --yes` | 实现栈 15 段（01→06→03→02→04→09→05→07→16→14→12→15→16fix→13→18）按栈序快进 origin/main 并推送；栈序=提交序，满足「按栈序合并」。预期不触发发布：旧 release.yml 触发面仅 `src/Find-Your-Country-Code.js`（冻结未动，hash 实证一致） |
| 2 | `but land cch/17-pseudo-select-forensics --yes` | 独立取证分支落地 |
| 3 | `but land cch/11-mental-model-docs --whole-stack --yes` | 文档栈 4 段（08→10→mmv2-tickets→11，14 提交）落地；命中 vite/package 路径触发 release.yml → 红 run 34035320882（裸 npm ci ERESOLVE，cch/12 已实证的口径问题，红噪不产生 Release） |
| 4 | 遗留冲突自愈 | lkq{conflicted}（wave1 §4 登记）在 land 后 reconcile 中自然消解：版本 bump 干净重放于实现栈内容之上；`but resolve finish` 曾两次内部失败（multi-base cherry-pick），未强行编辑冲突，改走「先落实现栈再 reconcile」路径 |

### 2.2 本票提交（cch/19-release-links + cch/19-dispatch-trigger）

| 文件 | 变更 | 理由 |
|---|---|---|
| `.github/workflows/release.yml` / `release-dry-run.yml` / `verify-16.yml` | `npm ci` → `npm ci --legacy-peer-deps` | install 口径统一（检查点四）：合并树含 react19/react-dom19 别名包，裸 `npm ci` ERESOLVE 恒红（红噪 run 34035320882 实证；cch/12 e2e.yml 先例） |
| `.github/workflows/calibration-baseline.yml` | push 触发面扩 `main`（保留 dispatch + cch/14） | 检查点四明示项；落地后 main 首跑绿（run 34035796148） |
| `.github/workflows/release.yml` | 补 `workflow_dispatch` | 见 §4 偏离点 1：版本 bump 先于口径修复落地，路径触发已耗尽，dispatch 成为本次发版触发器；并与其余 workflow 模式对齐 |
| `greasyfork/Glog.md` / `Glog_EN.md` | v1.4.0 小节补记 mmv2 六条（双语） | 票 10 时点的 v1.4.0 小节不含 mmv2 内容；发版前补记用户可感知变化（变更日志职责），版本号未动 |
| `README.md` / `README_EN.md` | 安装区补 GitHub Release v1.4.0 附件直达；移除指向冻结旧单文件的 JsDelivr CDN 过时链；手动安装改构建指引 | 验收 3：README 下载链接更新为可达目标（前一会话已删 CDN 链，本会话补 Release 直达） |
| `.scratch/architecture-recovery/**` + `.codegraph/.gitignore` + `mental-model-v2/goal.md` | 归档旧周期（01-10）票据/窗口报告/复核/调研脚本与 skills 存档 | main 上的周期记录完整性（docs 内引用的 .scratch 路径此前在 main 上是死链） |
| `issues/19-release-links.md` | 5 条验收勾选（对齐票 11 先例；Status 段保留） | 专属验收留痕 |

未动项：release-dry-run.yml 的 `cch/10-release-pipeline` push 触发（分支已删，休眠无害）；verify-13/15/16/18 分支触发（同上，dispatch 可用）；本地 main ref（见 §6.1）。

## 3. 验收证据（对应 issue 5 条）

### 3.1 版本决策落地 + CI dry-run 通过
- dry-run run [34035726335](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34035726335)（分支 cch/19-release-links，含全部合流内容 + 本票修复）success；关键输出：`artifact=1.4.0 vite.config.ts=1.4.0 package.json=1.4.0`。
- 版本决策沿用票 10 已确认记录：v1.4.0（用户 2026-09-05 确认，不走 beta；lkq 提交 + dry-run 33899481655 首验）。变更日志三处：Glog/Glog_EN v1.4.0 小节（本票补记 mmv2 六条）。

### 3.2 发布动作完成，Release 产物存在且可下载
- 发布 run [34035951623](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34035951623) success（`--ref main` dispatch）。
- Release **v1.4.0 = Latest**，published 2026-09-06T13:23:45Z，非 draft，附件 `find-your-country-code.user.js`。
- 附件内容核验：下载后 `grep -m1 '@version'` → `// @version            1.4.0`。
- Release body = Glog 全文（双语，含 v1.4.0 小节 12 条）。

### 3.3 链接验证四条（方法 + 输出，2026-09-06 实测）

| # | 链接 | 方法（curl） | 结果 |
|---|---|---|---|
| 1 | README（main 原文）`raw.githubusercontent.com/.../main/README.md` | `curl -sI` | **200** |
| 2 | GreasyFork 脚本页 `greasyfork.org/zh-CN/scripts/573755-find-your-country-code` | `curl -sI` | **200** |
| 3 | Release 页 `github.com/.../releases/tag/v1.4.0`；附件 `.../releases/download/v1.4.0/find-your-country-code.user.js` | `curl -sI`；`curl -sIL` | **200**；**302→200**（1 跳，release-assets 对象存储，符合 CONTRIBUTING 预期） |
| 4 | 安装直达 `update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js` | `curl -sI` | **200**，`content-type=text/javascript; charset=utf-8`（符合 CONTRIBUTING 预期） |

### 3.4 GreasyFork 同步状态核对
- GF meta 实抓：`@version 1.3.4` —— 站内同步**未发生**（预期内）：GF 由站内抓取/上传驱动，需维护者手动操作（凭证门控，窗口不可代办）。GF 安装链本身 200 可用，同步后即分发 1.4.0；README 已并列 GitHub Release v1.4.0 直达作为已可达路径。

### 3.5 波次表勾销与本周期总结
- `.scratch/architecture-recovery/README.md`：第二周期状态表 19 → done（含证据），frontier 改「周期收官 ✅」，新增「周期总结(2026-09-06)」小节，回滚注记更新（产物已归档入库）。
- 附加 CI 证据：E2E run [34035724870](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34035724870)（验证分支 push，59 passed 基线）success；Calibration Baseline run [34035796148](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34035796148)（main 首跑）success。

## 4. 偏离点

1. **发布触发方式 = workflow_dispatch（而非 push 路径触发）**：版本 bump（lkq，文档栈）先于 install 口径修复落地，其触发的 run 34035320882 红（ERESOLVE，无 Release 产生）；口径修复落地后本票提交不命中 release.yml 路径触发面（.github/greasyfork/README/.scratch 均不在 src/**/vite/package 内）→ 补 dispatch 后 `gh workflow run --ref main`。同一 workflow、同一 main 快照，发布语义与 push 触发等价。
2. **lkq 冲突处理**：`but resolve finish` 两次确定性内部失败（workspace commit 19b2055 multi-base cherry-pick）→ cancel --force 回退 → 改走「先落实现栈，文档栈 reconcile 时冲突自愈」路径；未手工改写冲突内容，未 amend 他人提交。
3. **Glog v1.4.0 增补**：发版 changelog 由本票补记 mmv2 六条（版本号不动）——票 10 编写时 mmv2 尚未实施，属遗漏补齐而非改版。
4. **issue 19 勾选**：对齐票 11 先例（勾验收框、Status 段保留）。

## 5. 未完成/未验证项

- GreasyFork 站内同步（维护者手动，目标 @1.4.0；同步前 GF 安装链分发 1.3.4）。
- 真实站点冒烟（用户实测；18 报告同项建议继续有效）。
- 17 票遗留 atomcode 交叉验证轮（串行护栏两度让位，大脑可选补跑）。
- 本地 main ref 对齐（GitButler CLI 无原生 ref-move；未动 git 写操作）。
- .gitattributes CRLF 规范化（01 票复核遗留，本票未动；workflow/README/Glog 盘上均为 CRLF）。

## 6. 给大脑/用户的风险提示

1. **本地 main（3ccfee2）与 origin/main（6df0d04+）分叉**：origin/main 经 land 快进推进；本地 main ref 停留前一会话的汇编态。短期内勿以本地 main 为基线开工；建议在 GitButler GUI「Set main to origin/main」或下轮卫生票处理。
2. **远端分支**：land 自动删除已落地 origin/cch/*（15+3 个）——10 报告的清理项基本自动完成；远端现仅剩 main（与历史 tag）。
3. **休眠触发器**：release-dry-run.yml（cch/10 分支）与 verify-13/15/16/18 的分支 push 触发随分支删除休眠，仅 dispatch 可用——属预期，不视为缺陷。
4. **e-branch-1 空分支**仍在工作区，可 `but clean`。
5. **GreasyFork 双版本窗口期**：站内同步完成前，GF 链 1.3.4 / Release 链 1.4.0 并存——README 两链并列已消除用户侧断链，但站内同步宜尽快执行。
