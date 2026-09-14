# 票 41 窗口报告 — 过程证据出仓与升塔纪律

> Cycle-5 | 票: `issues/41-process-evidence-archive.md` | 覆盖 A-xxx: **A-018**
> 分支：`cch/41-process-evidence-archive`（按 WORKFLOW §4.2；因真实依赖堆叠于 `cch/44-detection-semantics-adjudication` 之上）
> 提交：`fff188b8`（归档主体）+ `d7322ae5`（口径补录）| 基线（归档前）：`b7b1f0a2`

## 0. 开工复述（阻塞项与必读清单）

- **阻塞项**：`Blocked by: 票 36,37,38,39,40,42,43,44`（全部实施票报告落盘后归档）。开工前逐票核对 `research/window-reports/NN-*-report.md` 均在磁盘（README 第五周期票务表显示 36/37/38/39/40/42/43/44 均 done）。
- **必读清单（6 份，已逐份读全）**：handoffs/41、issues/41、spec.md（Cycle-5）、WORKFLOW.md、decision-ledger.md、docs/adr/0006-ci-hygiene-policy.md。

## 1. 验收项逐条勾销

### AC1 冻结过程证据归档出工作树索引（`git ls-files .scratch` 显著下降，仅剩现役）— 达成（结构受限，见 §5 偏离点 D-1）

只读验证（分支 `cch/41-process-evidence-archive`）：

```bash
cd D:/Aworker/mozilla/choose-your-country
git ls-files .scratch | wc -l          # 397 -> 209
```
输出摘要：`397`（归档前）→ **`209`**（-47%）。剩余构成：`issues/` 45 + `handoffs/` 46 + `prompts/` 54 + `research/window-reports/` 49 + 根部 4（WORKFLOW/spec/decision-ledger/README）= **198 现役**，加 **11 在途票产物**（见 §5 D-1）。

归档口径（`git diff --stat 9929b8a7 d7322ae5`）：`191 files changed, 22 insertions(+), 14409 deletions(-)`——纯删除主导，符合 spec「纯删除型改动优先」。

### AC2 现役流程文件（WORKFLOW/spec/decision-ledger/issues/handoffs/prompts）全部可解析 — 达成

只读验证：遍历 `git ls-files .scratch` 全 209 项，逐文件检查存在性 / 非空 / 无 BOM，并对全部 199 个 `.md` 检查可读。输出摘要：`missing/empty/BOM = 0`。`prompts/01..19-*.md` 无 `#` 标题属其原文纯文本格式（启动器粘贴文本，非 markdown 标题体），非解析失败；本票未触碰。

### AC3 升塔纪律（先沉淀 fixture 再修脚本）写入 WORKFLOW — 达成

`WORKFLOW.md` 新增 **§4.5 升塔纪律（先沉淀 fixture 再修脚本）**：塔分层（塔基 harness/语料、塔身密封 fixture E2E、塔尖真实站点冒烟 advisory）+ 4 条硬条款（先沉淀再修/只升不降/塔尖弱断言/证据锚定）。另新增 §5 教训行一条（2026-09-14 S7(票41)）。LF、无 BOM、既有 §5 条目格式未变。

### AC4 无新增宽泛 .gitignore 通配 — 达成

只读验证：`git diff 9929b8a7 d7322ae5 -- .gitignore` → **空**。本票零 `.gitignore` 改动。（工作区中可见的 `live-out/` 条目来自票 39 的在途提交，非本票。）

## 2. 本票 Delta 检查点

| 检查点 | 结论 | 证据 |
|---|---|---|
| 归档不销毁 | 达成（双份） | ① 仓库外归档 `D:\Aworker\mozilla\choose-your-country-evidence-archive\`：199 文件逐文件 SHA-256 与归档前比对 **199/199 匹配，0 失配**（`ARCHIVE-MANIFEST.json`）；② 历史副本：`git show b7b1f0a2:.scratch/architecture-recovery/<相对路径>`（实测取回 `research/cycle3-investigation.md` 成功） |
| 不得破坏 README 引用的路径 | 达成（零新增悬空） | 全量重解析见 §3；指向已归档内容的引用 **README 29 条 / ledger 9 条全部经归档解析成功** |
| 归档后逐条重解析 README/ledger 路径引用 | 达成 | 程序化扫描 README 116 条 / ledger 19 条路径引用并逐条重解析，见 §3 |

## 3. 引用重解析结果（程序化）

| 文件 | 引用总数 | 树内解析 | 经归档解析 | 非路径/预存/待建 |
|---|---|---|---|---|
| README.md | 116 | 74 | **29** | 13 |
| decision-ledger.md | 19 | 1 | **9** | 9 |

「非路径/预存/待建」明细（**均非本票引入**）：README — 归档根路径自身、`window-reports/` 简写（实为 `research/window-reports/`）、分支名 `cch/39…`/`cch/43…`/`cch/36-cycle5-brain`/`cch/cycle4-closure`、glob `cycle4-closure/01-03.md`、模板 `NN-slug-report.md`、**预存悬空 2 条**（`src/Find-Your-Country-Code.js` 于 Cycle-3 票 22 删除；`research/atomcode-testing-strategies.md` 归档前即不存在）、待建 1 条（`45-…-report.md`）；ledger — 归档根路径、URL 片段 `releases/latest`/`releases/download/v1.4.0/`、源码简写 `ui/index.ts`/`detect/index.ts`、CSS 串 `overflow:hidden/clip`、门名简写 `verify-13/15/18.yml`/`verify-ticket-09/13/15/18`、`corpus/manifest.json`（即 `tests/corpus`）。

**结论：本票未新增任何悬空引用。** 两份文件均已写入「归档说明」节，约定归档类路径相对归档根解析。

## 4. 归档产物

- **归档位置**：`D:\Aworker\mozilla\choose-your-country-evidence-archive\`（保留原 `.scratch/architecture-recovery/…` 相对结构）
- **快照范围**：199 文件 / 978KB（Cycle-1..4 过程证据 + mental-model-v2 + 已归档 spec-cycle2/3/4 + spec-cycle-v1.4.0）
- **清单**：`ARCHIVE-MANIFEST.json`（逐文件 path/bytes/sha256 + `removedFromWorkingTree=188` + `pendingUnlandedBranches`）
- **归档前基线**：commit `b7b1f0a2`（历史副本可取回）

## 5. 偏离点申报（待首脑/用户确认）

- **D-1（关键）11 文件未能归档**：`report/architecture-review-cycle5.html`、`research/cycle5-investigation.md`、`research/atomcode-43-dependency-peer-rootfix.md`、`research/scripts/39-*.mjs`（8 个）——均由**未落地且独立成栈**的分支 `cch/39-real-site-enablement` / `cch/43-dependency-peer-rootfix` / `cch/36-cycle5-brain` 创建，不在本票分支基线内，GitButler 无法在单一栈内表达其删除（且「不得移动他票分支」）；待上述分支落地后归档（建议作为 45 或收口阶段的收尾项）。已写入 README 归档说明与归档清单。
- **D-2 堆叠**：本票因真实依赖（`WORKFLOW.md` 与 `cch/44` 同文件；`research/launcher-selfcheck.md` 依赖 `cch/cycle5-ticketing`）堆叠于 `cch/44` 之上——依 WORKFLOW §4.2「确有依赖按 but move --above 堆叠」。注：`but branch new --anchor` 已 deprecated，应改用 `--above`。
- **D-3 无 CI 证据**：本票为纯 `.scratch`/文档改动，未触碰 `src/`/`tests/`；本地 `npm run typecheck` 退出 0（无回归）。按证据铁律需 commit sha + CI run 锚定，但**推送属远端写操作、需授权**——本地未推送，故本报告以 commit sha + 只读命令输出锚定，CI run 待授权后补录。
- **D-4 提交类型**：主体用 `refactor(cch-41)`（仓库结构重构，无行为变更）+ `docs(cch-41)`，与仓库既有 `docs(...)`/`feat(...)` 用法一致。
- **D-5 归档形态选择**：选「仓库外」而非「独立分支」——独立分支在本仓库 GitButler 共享工作树模型下不可行（证据已存在于基线历史，空提交分支会被 rebase 丢失；分支无法表达与主分支分歧的工作树态）。已在 README 归档说明中登记形态与取回方式。

## 6. 教训候选（供 WORKFLOW §5 取舍）

1. **在途分支产出的文件不可从单一分支归档**：GitButler 中「删除」= 从基线树移除路径；文件不在基线则删除不可表达且**静默丢弃**（无报错，工作树被回滚）。归档类票须先确认目标集全部分支已落地，否则会出现「看似提交成功、实则部分未生效」。
2. **多栈依赖不可用单锚点覆盖**：`but branch new --above` 只能锚定单一栈；三个独立未落地栈的产物无法在一个分支内删除，而移动他票分支越权。

## 7. 剩余风险 / 待办

- 11 在途文件待 `cch/39` / `cch/43` / `cch/36-cycle5-brain` 落地后归档（D-1）。
- 远端推送与 CI 证据待授权（D-3）。
- 归档副本位于仓库外，不随仓库克隆分发；仓库内以 commit `b7b1f0a2` 历史副本兼底（双份不销毁）。
