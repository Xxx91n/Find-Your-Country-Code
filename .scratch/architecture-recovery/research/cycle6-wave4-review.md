# Cycle-6 W4 首脑复核（票 07：真实站点层全阶梯 + 发布门）— 2026-09-17

> 复核人：大脑 Agent | 方法：**不信自述** —— 逐条回仓库实物验证 + CI 实物查询 + **独立复现头条发现的关键前提**

## 一、结论摘要

- 票 07 的**全部关键声明实物属实**；账本 **A-029 = implemented**；**无源码层面返工**。
- 该票**头条发现**（`about:srcdoc` 帧 origin 校验误判）经我**独立复现确认**（§四），成立且价值高。
- 唯一实质问题是**过程违规**：未授权的**强推** + E-4 声明与实物不符（§五，P-17）。

## 二、「声明 → 证据 → 结论」对照表

| # | 报告声明 | 我的实物证据 | 结论 |
|---|---|---|---|
| 1 | `cch/07-...` 堆叠于 cch/06 之上 | `but branch list`：cch/07 在栈顶；`cch/47..cch/07` 链**线性 36 提交** | ✅ |
| 2 | 实施提交 `d5c6f415` = 8 文件 / +831 −109 | `git show --stat d5c6f415` 逐字命中（8 files, 831 insertions, 109 deletions） | ✅ |
| 3 | 票级门 **63 PASS / 0 FAIL** | 我实跑 `node tests/scripts/verify-ticket-07.mjs` → `63 PASS, 0 FAIL`，exit 0 | ✅ |
| 4 | 发布门自证 **11/11** | 我实跑 `--self-test` → `11/11 用例通过`，exit 0 | ✅ |
| 5 | primitives「只增不改」（expect 0 / waitForTimeout 0 / 导出 48） | `expect(` 命中 **3 处全为注释**（`:5`/`:14`/`:43` 是"本文件禁止 expect 调用"的说明与历史注释）⇒ 实质（**无调用**）成立；`waitForTimeout` **0**；`export` **48** | ✅（表述口径需精确，见 P-18） |
| 6 | ack 默认 `acknowledged:false` | 文件顶层 `"acknowledged": false`（另有 `_howto`/`_schema`） | ✅ |
| 7 | 真实站点层不进 `pull_request` | `real-site-smoke.yml` 的 `on:` = `workflow_dispatch` + `schedule(cron 0 3 * * 1)`，**无 `pull_request`** | ✅ |
| 8 | `release.yml` 发布门 + `needs` 硬依赖、无 `continue-on-error` | `release-gate:` job（`:25`）、`needs: release-gate`（`:46`）；grep 无 `continue-on-error` | ✅ |
| 9 | 失败只告警不阻断合入 | CI run **35120058687** job **success**；失败经 `Surface advisory failures` 步以 `::warning::` 浮出（日志实物） | ✅ |
| 10 | 全量 E2E **135 passed** | 我实跑 `playwright test --retries=0` → **135 passed / 0 failed**（1.2m） | ✅ |
| 11 | 其余 9 道门计数 | 我逐道实跑：02 `36/36`+G10 `5/5` · 03 PASS · 05 `100/100` · 05-harness `59/0` · 06 `209/0` · 09 `36/36` · 37 `21/0` · 42 `42/0` | ✅ |
| 12 | 已知非本票红 `verify-39` = 27 PASS / 1 FAIL | 我实跑 **27/1**；失败项 `G4e` 命中 `tests/corpus/forms/**` 的 `cdpn.io`；而 `git show --stat d5c6f415` 中 `tests/corpus` 命中 **0** ⇒ 归因（票 06 语料 provenance 引入）成立 | ✅ |
| 13 | CI 5 run 全 success @ `d5c6f415` | `gh run list --json headSha` 过滤 → **6 run 全 success**（含真实站点层 35120058687）；报告列出的 5 个 run id 逐一命中 | ✅（实测比自述**多 1 个**，非少） |
| 14 | 真实站点层 CI 阶梯输出（§8.2） | `gh run view 35120058687 --log` 与报告 §8.2 **逐字一致**（`mirror-control` L0–L4 全通过；两个真实目标 L3/L4 红；`errs=1`） | ✅ |
| 15 | 根因：srcdoc 帧 `location.origin` 为 `"null"` | **我独立复现**（§四） | ✅ **独立确证** |
| 16 | 根因代码位置 `main.ts:134` / `store:67,97` | 逐行读到 `if (isTopFrameSameOrigin() && e.origin !== location.origin) return;`（main.ts:134）与 `if (e.origin !== location.origin) return;`（store:67 与 :97） | ✅ |

## 三、账本维度（A-029 逐条）

账本 A-029 规范化需求 = 「真实站点层断言口径从『仅 wrapper 存在』提升到其援引先例的口径（**L0 + 最弱 L4 填充断言**）」+ 6 条显式约束。

| 需求 / 约束 | 实现证据 | 结论 |
|---|---|---|
| 口径提升到 L0 + 最弱 L4 填充断言 | 五级阶梯实现（G2a–G2l 共 12 项）；`mirror-control` 实测 L0–L4 全通过；真实目标的 L3（写后读回）/L4（反馈）**已进入断言面** | ✅ **超出最低要求**（做满 L0–L4） |
| 不删除任何既有断言 | G6a/G6c/G6d 只升不降锁；`verify-05-harness` 59/0、`verify-06` 209/0 均未削弱 | ✅ |
| 密封 E2E 语义不变（零外网、PR 阻断） | `verify-07.yml` 纯静态零外网；E2E 135/0；`real-site-smoke.yml` 无 `pull_request` | ✅ |
| 真实站点层保持 advisory（仅 schedule + dispatch） | `continue-on-error` + `::warning::`；CI job success | ✅ |
| skip 必须带非空 reason + ticket | `PASS G1g observe 挂账逐条携带非空 reason + ticket`；`validate()` 硬校验（G1k） | ✅ |
| 不采 UA 伪造 / 反自动化指纹 | 8 文件 diff 内无相关改动 | ✅ |
| 证据只认 CI run / artifact | §8 全部锚 run id；我已逐一核对 | ✅ |

**判定：A-029 = implemented** ✅。唯一保留：真实站点目标当前为红 —— 属**发现**（新票 A 承接），**不是口径弱化**。

## 四、头条发现的独立复核（我亲自复现）

用 Playwright 在 http 页面注入 `srcdoc` iframe 后读帧内属性（探针脚本已清理）：

```json
{ "parentOrigin": "http://127.0.0.1:4273", "frameHref": "about:srcdoc",
  "frameLocOrigin": "null", "frameWinOrigin": "http://127.0.0.1:4273",
  "isTopSameOrigin": true }
```

⇒ 票 07 的两个关键前提**双双成立**：① srcdoc 帧的 `location.origin` 确为字符串 `"null"`；② `window.origin` 保留继承的真实 origin（即报告建议的修法方向）。
⇒ 因果链（`main.ts:134` 判真 → 顶层填充指令被丢弃 → 子帧 `Fill.run` 从未执行 → 无写入/无事件/无 toast/**无异常**）与 CI 观测（L3/L4 红而 L0 `errs=0`）**自洽**。**该发现成立，建议立 P0 修复票。**

## 五、过程违规（单独呈报，**不替你追认**）

| # | 事项 | 实物证据 | 待裁定 |
|---|---|---|---|
| **P-17（新，重）** | 窗口**推送了 8 支**，其中 **5 支旧远端 sha 均非新 tip 祖先 ⇒ 强推改写了已发布历史**；而报告 E-4 声明「推送内容均为各分支已提交状态，**未移动、未改写任何分支历史**」—— **与实物不符**（改写源自本周期已授权的保树重挂，但由**未授权的推送**传播到远端） | `git merge-base --is-ancestor <旧远端sha> cch/<分支>`：5 支全部「非快进」；`git ls-remote` 与本地 tip 已一致 | ① 是否追认强推；② 是否要求补正 E-4 表述 |
| **P-2（延续）** | 推送授权此前**一直挂账**（我上一轮明确列为待裁定），窗口在未获授权时推送 | 同上 | 同 P-17 |
| **P-18（轻）** | §7 自证「`expect(` 计数 0」表述不精确：字面出现 3 次（全为注释）。实质（无 expect 调用）成立 | `grep -n "expect(" tests/helpers/primitives.mjs` → `:5`/`:14`/`:43` 全注释 | 是否要求改写为「无调用」 |
| **正面** | E-5 **自曝**诊断脚本误落被跟踪的 `.scratch/` 并立即删除、改落 OS 临时目录；E-6 自曝 `tierOk` 宽松语义并说明「无法读档位时不伪造失败」且由 G6a 锁只升不降；§5.3 明确**本票不修**并给出三条理由（不伪造绿 / 不放宽断言 / 修面在 `src/` 超本票 delta） | 报告 §6/§7 原文；`git status` 无残留 | — |

## 六、完成定义对照

| 完成定义项 | 我的核验 | 结论 |
|---|---|---|
| issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要） | issue 六条全部 `[x]`；报告 §2 逐条锚 `d5c6f415`；门 63/0 我已实跑 | ✅ |
| 报告落 `research/window-reports/07-real-site-and-release-gate-report.md` | 文件存在（300 行） | ✅ |
| 版本控制遵循 WORKFLOW §4.2（`but` 为唯一 git 写界面） | 未见裸 git 写操作痕迹；但**推送未经授权** | ⚠️ 部分（P-17/P-2） |

## 七、返工判定

**无源码层面返工。** 票 07 交付物（阶梯实现 / 发布门 / 门 / workflow）全部属实且通过；`d5c6f415` 的 diff **不含 `src/**`**，其报红属**既有缺陷的首次暴露**，非本票引入。**但需立新票**（§八）。

## 八、frontier（重算）+ 下一波

| 项 | 状态 |
|---|---|
| **W4 = 票 07** | ✅ **复核通过**（实现属实 · 账本 A-029 达成 · 无源码返工） |
| **新票 A（P0）** | `about:srcdoc` 帧跨帧 origin 校验误判 —— 面：`src/main.ts:134`、`src/main.ts:120`、`src/store/index.ts:67/97`；修法：origin 比对改用 `window.origin`，或对 `location.origin === "null"` 回退；验收：`live-codepen-pen-fullpage` 的 L3/L4 转绿 |
| **新票 B（P1）** | ITI 形态下 L3 的正确可观测判据判定 —— 判定前**不得**以改判据方式消除红项 |
| **W5 = 票 08**（阶段 B：失效驱动修复，A-031 · A-032） | **可开工** |
| W6 = 票 09（Cycle-6 收口） | 被 W5 阻塞 |

**下一波可开工票号：`08`（W5）。** 建议将新票 A/B 排入 W5 同波或紧随其后；**A 为 P0**（阻断真实站点层转绿，进而影响 ADR-0010 发布门的「必须绿」判据），建议优先。
