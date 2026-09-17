# Cycle-7 独立审计报告 — 2026-09-17

> **审计窗口**（独立于修复窗口，**只出报告、不动手修**）
> **审计对象**：`.scratch/cycle7-grill/reports/2026-09-17-report.md`（修复窗口实施报告）
> **被审对象状态**：`HEAD` = `05d07f3a`（GitButler Workspace Commit，即 16 个票级分支的合并态）；基线 `origin/main` = `a93cb3a8`（v1.7.0）
> **审计口径**：**不接受报告自述**；硬验收（编译／打包／启动测活）全部亲自重跑；报告每条关键声明做仓库实物抽查（rg / 文件存在性 / 字节级行尾）。
> **隔离原则**：为排除并行工作流干扰，另在 OS 临时目录用 `git archive HEAD` 重建**提交态**并独立构建／测活，与工作区结果对照。
> **审计方法版本**：code-review 双轴（Standards + Spec）子代理并行取证 + 主审逐条实物复核（子代理结论一律以 HEAD 为准复核，已推翻 1 条）。

---

## 0. 结论（先行）

**功能面审计：通过。** 报告的核心硬验收声明（编译／打包／启动测活／门禁总账／校准指标）经**独立重跑与实物抽查全部成立**，且提交态数字**逐项精确吻合**。

**文本面审计：有条件通过 —— 存在 1 项硬性自述失真 + 若干需裁定／返工项。** 详见 §4。

| 面 | 判定 | 依据 |
|---|---|---|
| 编译（typecheck） | **通过** | 提交态与工作区均 exit 0 |
| 打包（build） | **通过** | 提交态 dist = **169,993 B**（报告 §11 载 169.99 kB，**精确吻合**） |
| 启动测活（E2E） | **通过** | 提交态 **146 passed / 0 failed**（报告 §11 载 146，**精确吻合**） |
| 门禁总账 | **通过** | 21 张票级门 **20/21 绿**；唯一红＝票 39 基线预存红（**已独立证实**） |
| 指标面 | **通过** | calibration 1.0/1.0（63 例）、real-site gate PASS、doc-facts OK 等全部复现 |
| 自述—实物一致性 | **不通过（1 项硬失）** | `countries.ts` 行尾自述与实物相反（§4.1） |
| 过程合规 | **待裁定（3 项）** | T-15 波次授权、T-14② 裁定授权、`.scratch/` 成为 CI 依赖（§4.4–4.6） |
| 闭环形态 | **未闭环** | 全部证据为本地自证；未 push ⇒ 无 CI run ID（报告 §6#8 已自认） |

> **本窗口不替用户追认。** 上述「不通过／待裁定」项须按 §6 处置：**低风险项打回原修复窗口返工**；**架构／门禁项呈报用户批准后修**；**授权留痕项须用户裁定**。无论谁修，**修完必须重跑 §6.3 同一套验收**。

---

## 1. 硬验收（亲自重跑，非转述）

### 1.1 提交态（隔离重建，主判据）

```bash
git archive HEAD | tar -x -C <OS_TMP>/cch-audit-head
ln -s <repo>/node_modules <OS_TMP>/cch-audit-head/node_modules
ln -s <repo>/tests/vendor/react19/node_modules <...>/tests/vendor/react19/node_modules   # 必需，见 §7.2
node node_modules/vite/bin/vite.js build
node node_modules/playwright/cli.js test --reporter=line
```

| 项 | 实测 | 报告自述 | 判定 |
|---|---|---|---|
| `tsc --noEmit` | exit **0** | exit 0 | ✅ 一致 |
| `vite build` | exit **0**，`dist/find-your-country-code.user.js` = **169,993 B** | 169.99 kB（§11） | ✅ **精确一致**（169.99 kB = 169,990 B，差 3 B 为报告四舍五入） |
| Playwright E2E | **146 passed / 0 failed**，exit **0**（1.4m） | 146 passed（§11） | ✅ **精确一致** |

### 1.2 工作区（含并行未提交变更，对照用）

| 项 | 实测 | 说明 |
|---|---|---|
| `tsc --noEmit` | exit 0 | 一致 |
| `vite build` | exit 0，**171,171 B** | 比提交态 +1,181 B |
| Playwright E2E | **149 passed / 0 failed** | 比提交态 +3 |

> **差异已完整归因（非报告失真）**：工作区存在**另一个并行窗口的在途未提交工作流**（`but status` 的 `zz [uncommitted]`）：`M src/detect/index.ts`、`M tests/scripts/verify-ticket-29.mjs`、`?? tests/contenteditable-scan.spec.ts`、`?? tests/fixtures/contenteditable-dial.html`。该工作流正在补齐报告 §6#6／§7 自认的两个 T-12 残留（缺口 2a：`:not([contenteditable="false"])`；缺口 2b：`contenteditable` 入 `OBSERVED_ATTRS`/`_fingerprint`）。
> **算术闭合**：源侧 `src/detect/index.ts` 提交态 61,226 B → 工作区 62,382 B（+1,156 B）；产物**保留注释**（`grep` 在 dist 命中中文注释，`vite-plugin-monkey` 未剥离），故产物 +1,181 B 与源侧 +1,156 B 同量级 ⇒ 171,171 − 1,181 = **169,990 B = 报告所载 169.99 kB**。E2E +3 恰为 `contenteditable-scan.spec.ts` 的 3 个用例。

### 1.3 门禁总账（复跑报告 §3 同一命令）

```bash
for k in $(node tests/scripts/verify-ticket-runner.mjs --list); do
  node tests/scripts/verify-ticket-runner.mjs --run "$k"; echo "exit=$?"
done
```

**实测：`--list` = 21 张；GREEN = 20/21；唯一红 = 票 39（exit 1）。** 与报告 §3 完全一致。

票 39 红的**独立归因证实**（不采信报告 §5.6 的转述）：

```
FAIL G4e live 目标 host 不出现在密封 spec/fixture/corpus/helper/config
  :: tests/corpus/forms/manifest.json ~ cdpn.io
   | tests/corpus/forms/mirrors/codepen-iti-v17-child.html ~ cdpn.io
   | tests/corpus/forms/mirrors/codepen-iti-v17.html ~ cdpn.io
   | tests/corpus/forms/skeletons/codepen-iti-v17.json ~ cdpn.io
   | tests/corpus/forms/sources.json ~ cdpn.io
```

§5.6 的 7 条结构性证据**逐条复现一致**：`sources.json`=1、`forms/manifest.json`=1、两个 mirror=1/1、`skeletons`=1、`tests/live/site-manifest.json`=3；且 `git status --porcelain | grep -E 'corpus|live/|site-manifest'` = **NONE**。本轮 76 个变更文件中**不含** `verify-ticket-39.mjs`、`tests/live/site-manifest.json`、`tests/corpus/forms/**`（仅 workflow 外壳 `.github/workflows/verify-39.yml` 随 T-01 合并删除）⇒ **该红在 HEAD 与基线必然同样复现**，归因成立。

### 1.4 其它门（全部亲自复跑）

| 门 | 实测 | 报告自述 | 判定 |
|---|---|---|---|
| `verify-ticket-runner.mjs --audit` | **AUDIT 19 passed / 0 failed**（A1–A19） | 19/0 | ✅ |
| `14-calibration-harness.mjs` | precision **1.0000** / recall **1.0000** / gate **pass** / cases **63** | 1.0/1.0/63 | ✅ |
| `32-real-site-corpus.mjs` | gate **PASS**（26 断言）；cases 56→63，Δprecision=0 | gate=pass | ✅ |
| `doc-facts.mjs` | **OK**（23 selectors，4 menu commands） | OK | ✅ |
| `issue-checkbox-audit.mjs` | 审计 6 · PASS 6 · FAIL/UNKNOWN **0** · SKIP 56 | 6/0/0 | ✅ |
| `corpus-exemption-lint.mjs` | **7 PASS / 0 FAIL** | 7/0 | ✅ |
| `38-gf-alignment-check.mjs` | **RESULT: OK（对齐）**；GF 线上 `@version` = 1.7.0 | OK | ✅ |
| `verify-ticket-02.mjs` | 用例门 **36/36** ＋ G10 **5/5** ＋ G11 **4/4** | 36/36+5/5+4/4 | ✅ |
| `.github/workflows/` 文件数 | **11**（30 → 11，A19 断言） | 11 | ✅ |

---

## 2. 关键声明 → 证据 → 结论 对照表

| # | 报告声明 | 审计实物证据 | 结论 |
|---|---|---|---|
| 1 | 编译通过（每票复跑） | 提交态/工作区 `tsc --noEmit` 均 exit 0 | **成立** |
| 2 | 打包通过，dist 169.99 kB | 提交态构建 = 169,993 B | **成立（精确）** |
| 3 | 启动测活 146 passed / 0 failed，独立复跑一致 | 提交态 Playwright = 146 passed / 0 failed，exit 0 | **成立（精确）** |
| 4 | 21 张票级门 20/21 绿，唯一红为票 39 基线预存红 | `--list`=21；20 绿；票 39 `FAIL G4e ... cdpn.io`；断言代码/输入均不在本轮 diff | **成立** |
| 5 | T-01：21 workflow → 1 reusable + 1 调用方；`--audit` 19/0；零覆盖丢失 | `--audit` A1–A19 全 PASS；workflows = 11；`verify-ticket-plan.json` 存在（2,975 B） | **成立** |
| 6 | T-01 死触发清除（A18 全仓零 `cch/<数字>` 引用） | A17/A18 PASS | **成立** |
| 7 | T-04 doc-facts lint（23 选择器 / 菜单 4 条）；`:55`/`:172`/`:174` 已订正 | 脚本 exit 0；`ACCEPTANCE-SURFACE.md:55` 已是 `#cch-locale-row`；`:174` = 「顶层 4 条」；`#cch-locale-tg` 已消失 | **成立** |
| 8 | T-06 `diag:83` 由恒开改 `traceFlag` 门控；`src/` console 仅 1 处 | 实测该行 = `try { if (traceFlag) console.warn('[cch][diag] write failed'); } catch {}`；全 `src/` `console.` 计数 = **1** | **成立** |
| 9 | T-07 勾销补正 0/5→5/5；校验脚本 fail-closed | `issues/04-domain-modeling.md` 勾选 5/5 与自述一致；`unknown` 单列计数 | **成立** |
| 10 | T-08 陈旧审计报告加时点横幅（+12/−0 纯新增） | 变更文件含 `cycle6-audit-report.md` | **成立** |
| 11 | T-09 i18n 去 `\uXXXX` 转义（实测 669 处）；文案字节不变 | 提交态 `src/i18n.ts` 残留 `\uXXXX` = **0** | **成立** |
| 12 | T-09 `AnyElExtras`（12 可选成员、无索引签名）；残留 5 处非空断言 | `src/types.ts` 存在 `export interface AnyElExtras {…}`（12 成员，无索引签名）；`src/` diff 新增 `!` 断言 = **5**（fill/index.ts 0→5） | **成立**（注：Standards 子代理报「7 处」，经主审复核为**高估**，已推翻） |
| 13 | T-09 `config.ts:13` 删除算术快照注释 | 该行 = `export const L0_TEL_HINT_SCORE = 10;`，无 `（34→36）` | **成立** |
| 14 | T-09 `ui:880` 加 4 行防御性注释 | `row.innerHTML` 实位于 **:890**，其上 4 行（:886–:889）为「仅注释，不改渲染路径」的 XSS 说明 | **成立（行号略偏 10 行）** |
| 15 | T-10 摘 7 旗（状态位翻转、零删除）+ 三字段元数据 | `cases` 56→**63**；`knownResidual:true` 计数 = **0**；`exemptionStatus:"lifted"` = **7**；`- "id"` 删除行 = **0** | **成立** |
| 16 | T-11 README/GREADME 加「唯一权威渠道」声明，禁词扫描 NONE | 4 个文档均在变更集；未出现禁词（本审未逐词复核全文，采信脚本口径） | **成立（采信）** |
| 17 | T-12 `SCAN_SELECTORS` 追加复合描述符（10 → 13 条），不放裸 `[contenteditable]` | 提交态末条 = `[contenteditable][tabindex="0"][inputmode="tel"],…[autocomplete="tel"],…[role="textbox"]`；逗号切分总数 = **13** | **成立** |
| 18 | T-12 `ce-dial-positive` 维持 lowkey；评分层零改动 | calibration 用例 PASS（`ce-dial-positive` lowkey 档） | **成立** |
| 19 | T-13 补语料 59→63 后测门槛，据 D-015 默认分支维持现状，`src/` 零改动 | `cases` = 63（新 id `mm2-pseudo-*` ×4 在位）；`git diff --name-only -- src/` 在 T-13 commit 为空 | **成立**（基数笔误见 §4.3） |
| 20 | T-13 结论落 ADR-0005 dated Notes | `docs/adr/0005-*.md` 存在 `## Notes（2026-09-17 · T-13 二次裁决：维持「登记 + 手动召唤」）` 及 4 个子节 | **成立** |
| 21 | T-14① countries.ts 补 Kosovo(XK/+383)、Vatican(VA/+379) | 两行在位（:226/:227）；`verify-02` G11 4/4 PASS（含唯一性 + `ISO2_MAP` 全覆盖） | **成立** |
| 22 | T-14① 「文件保持 234 行**全 CRLF**，无混合行尾」 | `src/data/countries.ts` 的 **CR 字节 = 0**（两种独立方法），实为**全 LF**；行数 234 | **❌ 不成立（硬性自述失真）** |
| 23 | T-14② 裁定保留一次性群体召唤，`sm.remove()` 原样，零行为变更 | `sm.remove()` 仍在；`ui/index.ts:411–417` 注释块已重写并显式声明「不得读作会话内由 `_render` 维护」 | **成立**（授权面见 §4.5） |
| 24 | T-14③ 性能测量地基；实测重扫 7ms、强制样式 share ≈0%；不做优化 | `tests/perf-fingerprint.spec.ts` 在位（4,642 B）；报告给可复跑命令与日志 | **成立（采信自报日志；本审未单独复跑该 spec）** |
| 25 | T-15 新增 ADR-0012（16,449 B）五路分流；`isOptOutElement` 实现；`OBSERVED_ATTRS`/指纹同步 | ADR-0012 = **16,449 B**，5 个 `### ①–⑤` 子节齐备；`src/detect/index.ts` 存在 `function isOptOutElement(el: AnyEl): boolean`（HEAD :319–323）；`OBSERVED_ATTRS` 含 `data-1p-ignore`/`data-form-type`；`_fingerprint` :851 同步 | **成立** |
| 26 | ADR-0012 行号级锚点可追溯 | **主审按 HEAD 逐条复核 9 处锚点（:9-11 / :16 / :280-282 / :319-323 / :394-396 / :400-411 / :851 / :946-953 / :991-992）全部精确命中** | **成立**（Standards 子代理报「系统性偏移 4–11 行」，经复核**系其误读含并行未提交改动的脏工作区**，已推翻） |
| 27 | 全轮零网络面（D-016④） | `git grep -nE "fetch\(|XMLHttpRequest|GM_xmlhttpRequest|GM_download|sendBeacon|WebSocket" -- src/` = **0 命中** | **成立** |
| 28 | 零语料物理删除（ADR-0008 决策4） | `tests/corpus/manifest.json` `- "id"` 行 = **0**；cases 56→63 | **成立** |
| 29 | `package.json` 版本真源不动（D-018） | `package.json` **不在 76 个变更文件内**；build 输出 `find-your-country-code@1.7.0` | **成立** |
| 30 | 未改 `CONTEXT.md`（D-013 七术语上限） | `CONTEXT.md` **不在变更文件内** | **成立** |
| 31 | ADR-0003/0004 仅补结构化 `Superseded-by`（D-011 负向） | 两文件在变更集；本审确认 ADR-0005 另有**新增 H2 节**（见 §4.2） | **部分成立** |
| 32 | 工作区 `git status --porcelain` = 0（§7） | 实测 **4 项**（并行未提交工作流） | **时点漂移**（非报告失真，见 §4.7） |
| 33 | 存量 CRLF 漂移 **124** 个跟踪文本文件（§6#9） | 实测 **121**（`.scratch/architecture-recovery` 86 · `tests/fixtures` 18 · `.github/ISSUE_TEMPLATE` 4 · `docs/adr` 2 · 其余 1×11，含 `src/iti-adapter/index.ts`） | **❌ 数字不成立（差 3）** |
| 34 | 本轮未制造混合行尾 | 提交态 diff 内 `\r` 计数 0；变更文件无 CRLF blob | **成立** |

---

## 3. D-xxx 逐条核对（子 Agent 声明 vs 实现证据）

口径：以 `decision-ledger.md`（19/19 current）的「规范化需求 + 显式约束／负向需求」为准，逐条对 `a93cb3a8...HEAD` 的 76 个变更文件取证。

| D | 声明去向 | 实现证据（实测） | 判定 |
|---|---|---|---|
| D-001 | spec Solution（A+B） | spec 双线结构在位；无 `improve-codebase-architecture` 新周期 | **落实** |
| D-002 | S-02 / T-02·T-11 | `38-gf-alignment-check.mjs` exit 0、`RESULT: OK`；README×2 + GREADME×2 在变更集；未声称闭合 | **落实**（GF 站内 sync 开关**公开面不可证成**，残留成立） |
| D-003 | S-06 / T-10 | 7 旗翻转 + `owner/reviewBy/reason` 齐备；`corpus-exemption-lint` 7/0；**零删除** | **落实**（既有 `realSiteForms` 条目 `verdict: MISS→FIXED` 属改写既有字段，报告 §5.2 已披露） |
| D-004 | S-01 / T-01 | 30→11 workflows；`--audit` 19/0；零覆盖丢失；`verify-30` 正名 | **落实**（触发面变更见 §4.3） |
| D-005 甲 | S-07 / T-09 | 5 项零行为变更；断言 5 处；i18n 转义 0 残留 | **落实** |
| D-005 乙 | S-10 / T-14①②③ | countries 补数据 + G11 断言；群体召唤裁定；性能地基 | **落实**（②授权面见 §4.5） |
| D-006 | S-03 / T-04 | doc-facts 23 选择器 + 菜单 4 条；ACC 三处已订正；**未新增 workflow 文件** | **落实** |
| D-007 | S-01 / T-03 | ADR-0006 增 monitor 例外 + 四判据表（10,687 B）；`gf-alignment-check.yml` **未补** `pull_request` | **落实** |
| D-008 | S-04 / T-05 | `verify-03` G8c 改相对比较；双向实证；范围未扩面（350ms 未动） | **落实** |
| D-009 | S-05 / T-06 | 见 §2 #8；票 03 报告纯追加补正 | **落实** |
| D-010 | S-03 / T-07 | 见 §2 #9；`unknown` fail-closed | **落实**（架构副作用见 §4.6） |
| D-011 | S-03 / T-08 | 时点横幅 + `superseded-by` 指针；零删除 | **部分落实**（ADR-0005 新增非 Notes H2 节，见 §4.2） |
| D-012 | 显式范围外 | 不立票；B-9…B-13 登记为纪律/观察项 | **落实** |
| D-013 | S-08 + S-09 | contenteditable 与伪 select 双项均在位；顺序 contenteditable 先 | **落实** |
| D-014 | S-08 / T-12 | 复合描述符 3 条、无裸 `[contenteditable]`、评分层零改动 | **落实**（端到端语料地基缺口，报告 §6#6 已自认；并行窗口在补） |
| D-015 | S-09 / T-13 | 补语料→测门槛→裁决 顺序未颠倒；结论落 ADR-0005 | **落实**（门槛①实为「不可测」而非「未达」，报告已如实标注 n/a） |
| D-016 | S-11 / T-15 | ADR-0012 五路分流；`isOptOutElement` + 语料 3 例；④驳回含零网络面实测 | **落实**（波次授权面见 §4.4） |
| D-017 | 波次本体 | 分波执行；T-01 先于 T-04/T-07；T-03 后于 T-02；T-13 内部顺序未颠倒 | **落实** |
| D-018 | 不发版 | `package.json` 1.7.0 未动；未触发 release；报告 §页头显式登记「ADR-0010 本轮未触发」 | **落实** |
| D-019 | S-10 / T-14 | 三项全纳入；①②③均有交付 | **落实**（②裁定授权面见 §4.5） |

**缺失／弱化／跑偏 单独列出：**

1. **D-014「语料先行」弱化**：`src/detect/index.ts` 的扫描层复合描述符在提交态**无端到端语料背书**（3 条 `ce-*` 语料无 `tabindex`，只喂 `scoreElement`）。报告 §6#6 **已自认**该缺口并建议补测；**并行窗口的在途未提交工作流正在补**（`tests/contenteditable-scan.spec.ts` + fixture）。⇒ 定性为**已披露的弱化**，但**提交态下仍成立**，须纳入下一轮验收。
2. **D-011 形式跑偏**：ADR-0005 正文新增 `## 二次裁决的量化门槛（2026-09-17 追加，D-015）`（位于「决策」与「依据」之间），非 Notes 区。有 **D-015 明文授权**（「把三条量化门槛写入 ADR-0005 的二次裁决条件」），但越出 **D-011 负向**「变更只经 Status 字段 + 带日期 Notes」的措辞。⇒ **D-011 与 D-015 的交叉张力**，报告 §9.6 未点明该节（只述「正文仅 Status 行加 1 处指针」）。
3. **D-003 语义边界**：`tests/corpus/manifest.json` 的 `realSiteForms` 两条**既有**条目 `baseline.verdict` 由 `MISS` 改写为 `FIXED`。报告 §5.2 已披露；D-003 负向「不得重写既有条目语义」在此为**边界情形**（属状态位语义的配套扩改）。
4. **D-004 触发面**：`verify-tickets.yml` 新增 `push: branches: [main, 'cch/**']`（原 21 处为 `cch/NN-<slug>`，均已死）。runner 的 A17 只拦 `cch/<数字>` 字面量，故 `cch/**` 合法通过。⇒ **触发面由「21 处死触发」变为「全 `cch/**` 活触发」**，属设计选择，但报告未作为「变更项」显式登记。
5. **票号误标**：`src/data/countries.ts:225` 与 `tests/scripts/verify-ticket-02.mjs` 的 G11 注释均标「**票 12**」，而该交付物在报告中的编号为 **T-14①**（D-005 乙级 / D-019①）。⇒ 标签与报告自身编号不一致。

---

## 4. 过程违规与需裁定项（单独呈报，不替用户追认）

### 4.1 【硬性】`countries.ts` 行尾自述与实物相反
- **报告原文**：§T-14①「文件保持 234 行**全 CRLF**，无混合行尾」；§6#9「`countries.ts` **全 CRLF**」。
- **实物**：`src/data/countries.ts` 的 CR 字节数 = **0**（`Buffer` 逐字节 + 正则两种独立方法一致）；LF 行 231；HEAD blob 亦为 LF。文件**不在** §6#9 的 CRLF 清单内（CRLF 清单中 `src/` 仅 `src/iti-adapter/index.ts`）。
- **判定**：**自述失真**（声称 CRLF，实为 LF）。功能无影响，但**属本周期主题（D-006/D-010 自述—实物一致性）同族缺陷**。

### 4.2 【形式】ADR-0005 新增非 Notes H2 节
- 见 §3 跑偏 #2。**有 D-015 授权、越出 D-011 措辞**。建议：在 ADR-0006 或 ADR-0005 Status 处补一句「本节经 D-015 授权，属量化门槛条款而非决策改写」，或在 ADR-0006 条款 4 显式承认「量化门槛/裁决条件类追加可落独立 H2 节」。

### 4.3 【数字】两处计数不实
- CRLF 文件数：报告 **124** → 实测 **121**（差 3）。
- 语料基数：报告 §9.5 写「**59 → 59+3**」→ 实测基线 `git show a93cb3a8:tests/corpus/manifest.json` `cases` = **56**（§9.3 与 §9.6 的「56 / 59→63」链条自身成立：56 +3（T-15）= 59，59 +4（T-13）= 63，终态 63 ✅）。⇒ **§9.5 的基数 59 为笔误**。

### 4.4 【授权留痕缺失】T-15 波次「未指派即开工」
- `spec.md` 波次表与 `next-round.md` T-15 完成判据均记「**波次账本未指定，需用户裁定**」；`decision-ledger.md` D-017 未为 D-016 的 ①②③ 指派波次。
- 报告 §0/§9 称「**本轮经用户授权开工**」，但**仓库内无该授权的落盘留痕**（台账 D-016/D-017 状态仍为 current，未追加授权记录）。
- **判定**：**须用户确认**。若确有授权，建议在 `decision-ledger.md` 追加 D-020（授权留痕）或在 D-017 备注；若无，则 T-15 属**越权开工**，须追认或回退。

### 4.5 【授权留痕缺失】T-14② 语义裁定自决
- 报告 §9.2（第二轮）自述：「**须用户拍板后方可改代码**」。
- 报告 §9.4（第三轮）直接落地「保留一次性群体召唤 + 订正注释」，**无用户拍板记录**。
- 变更本身**零行为变更**（仅注释 + `sm.remove()` 原样），风险低；但**流程上属自决**。D-019 负向只要求「语义裁定为票内前置」，未要求用户签核——**是报告自身在 §9.2 抬高了门槛又未履行**。
- **判定**：**须用户确认**（追认即可，无需回退）。

### 4.6 【架构】T-07 的 CI 门依赖 `.scratch/`（未披露的架构副作用）
- `tests/scripts/issue-checkbox-audit.mjs` 以 `ROOT/.scratch/architecture-recovery/issues` 与 `.../research/window-reports` 为**唯一数据源**，缺目录即 `process.exit(1)`；该脚本已挂入 **`engine-gates.yml`**（CI 门）。
- 与 **ADR-0006** 的既定后果相抵：调研现场（`.scratch/`）本应是**可抛弃工作区**（删除不应影响流水线）；ADR-0006 条款 1 亦以「workflow 禁引 `.scratch/`」表达同一意图（字面已满足，**意图未满足**）。
- **判定**：**需用户裁定**。选项：(a) 把票据勾销标记迁出 `.scratch/`（如 `docs/` 或 `tests/`）；(b) 在 ADR-0006 显式承认「票据勾销对账门依赖 `.scratch/architecture-recovery/`，该目录因此转为受管工件」；(c) 门降级为 advisory。**不得静默维持**。

### 4.7 【卫生】`git diff --check` 非净 + 提交信息与内容不符
- `git diff --check a93cb3a8...HEAD` → `docs/adr/0006-ci-hygiene-policy.md:69: new blank line at EOF.`（文件尾连续两个空行）。
- t16 提交信息自述「**13 张票（12 完整 + T-14 部分）**」，而其提交内容（报告 §1）为「**15/15 票全部落地**」。⇒ 提交信息未随报告二/三轮修订同步。
- 报告 §7 的「13 个票级分支」为第一轮快照，§11 为「16 个票级分支 + 报告」（实测 `git branch` = 17 个 `cch/t*` 含报告分支，一致）。

### 4.8 【时点漂移，非报告失真】§7「porcelain = 0」
- 报告写作时点为真；审计时点实测 4 项未提交变更，**全部来自另一并行窗口的在途 T-12 缺口 2a/2b 工作流**。⇒ 属**并行工作流的合法在途状态**，但意味着**报告所述「零未提交变更」在当前工作区不成立**，且**审计的硬验收必须按提交态（`git archive HEAD`）判定**（本报告已如此执行）。

---

## 5. 未闭环项（承接报告 §6 残留，逐条复核）

| 报告残留 | 审计复核 |
|---|---|
| #1 T-13 站点级语料不足 | 成立：`realSiteForms` 仅 3 条，伪 select 面 1 条负例；门槛②「/千站点」不可测 |
| #4 票 39 缺同红 CI run ID | 成立：无 push ⇒ 无 run。**结构性归因已由本审独立复现**（§1.3） |
| #5 GF 站内 sync 开关不可证成 | 成立：`38-gf-alignment-check.mjs` 仅能证 `ALIGNED`/`REACHABLE`，不能证 sync 已配置 |
| #6 T-12 缺端到端语料地基 | 成立（提交态）；**并行窗口在途修复中**（未提交） |
| #7 T-12 两处边缘精度（`:not` 缺、`OBSERVED_ATTRS` 缺 contenteditable） | 成立（提交态）；**并行窗口在途修复中**（未提交） |
| #8 全部证据为本地自证 | 成立：本审亦只能本地复现；**闭环须待 CI run** |
| #9 存量 CRLF 漂移 | 成立（实测 121 文件，非 124）；**未授权不改**一致 |
| #10 `but land`/`but push` 未执行 | 成立：`but status` 显示各票级分支均在 applied 态，未落地 |

---

## 6. 处置建议（职责分离：审计窗口不动手修）

### 6.1 建议**打回原修复窗口返工**（低风险、纯文本／纯元数据）
1. 订正 `countries.ts` 行尾自述（报告 §T-14① 与 §6#9 的「全 CRLF」→ 实为全 LF），并复核其余行尾自述。
2. 订正 CRLF 计数 124 → 121（或给出可复现口径）。
3. 订正 §9.5 语料基数 59 → 56。
4. 修 `docs/adr/0006-ci-hygiene-policy.md` 文件尾多余空行（`git diff --check` 须净）。
5. 订正 `src/data/countries.ts:225` 与 `verify-ticket-02.mjs` G11 注释的「票 12」→「T-14①」。
6. 订正 t16 提交信息（13 票 → 15/15 票）。

### 6.2 建议**呈报用户批准后修**（涉及架构／门禁／ADR 形式）
7. T-07 的 `.scratch/` CI 依赖（§4.6）——三选一，须落 ADR-0006 或迁移数据源。
8. ADR-0005 非 Notes H2 节的合规化（§4.2）。
9. `verify-tickets.yml` 的 `push: cch/**` 触发面显式登记（§3 跑偏 #4）。
10. `32-real-site-corpus.mjs` 的 verdict↔expect 谓词变更（报告 §5.2 已披露）是否需 ADR 追加。

### 6.3 建议**须用户裁定**
11. T-15 波次授权留痕（§4.4）——追认并落 `decision-ledger.md`，或回退。
12. T-14② 语义裁定授权留痕（§4.5）——追认即可。
13. 并行在途的 T-12 缺口 2a/2b 未提交工作流：**须走与本轮同一套验收后**方可提交（含 `verify-29` 断言变更复核）。
14. CRLF 漂移 121 文件的处置授权（沿用「未授权不改」则继续登记）。

### 6.4 修复后**必须重跑**的同一套验收（重跑清单）
```bash
cd <repo>
npm run typecheck                                              # 期望 exit 0
npm run build                                                  # 期望 exit 0；提交态 dist 应仍为 169.99 kB 量级
node tests/scripts/verify-ticket-runner.mjs --audit            # 期望 AUDIT 19 passed / 0 failed
for k in $(node tests/scripts/verify-ticket-runner.mjs --list); do \
  node tests/scripts/verify-ticket-runner.mjs --run "$k"; echo "$k exit=$?"; done   # 期望 20/21（唯一红＝票 39）
node tests/scripts/14-calibration-harness.mjs --out /tmp/c.md --json /tmp/c.json      # 期望 1.0/1.0/pass
node tests/scripts/32-real-site-corpus.mjs --out /tmp/rs.md --json /tmp/rs.json       # 期望 gate=pass
node tests/scripts/doc-facts.mjs                              # 期望 OK
node tests/scripts/issue-checkbox-audit.mjs                    # 期望 6/0/0
node tests/scripts/corpus-exemption-lint.mjs                   # 期望 7/0
node tests/scripts/38-gf-alignment-check.mjs                   # 期望 RESULT: OK
node tests/scripts/verify-ticket-02.mjs                        # 期望 36/36 + G10 5/5 + G11 4/4
npm run e2e                                                    # 期望 146 passed / 0 failed
git diff --check <baseline>...HEAD                             # 期望净
```

---

## 7. 审计方法与可复现说明

### 7.1 双轴评审（code-review skill）
- **Standards 轴**（子代理）：对照 `CONTRIBUTING.md`/`CONTEXT.md`/`docs/adr/*`/`.gitattributes` + Fowler smell 基线；结论「无确凿硬违规」，边界缺口＝ADR-0006 条款 2 未覆盖 reusable 形态；smell 若干（6 份 verify 脚本重复片段、`LEGACY` 表三处维护、`Q = String.fromCharCode(34)` 之类可读性牺牲、`doc-facts` 文本刮取）。
- **Spec 轴**（子代理）：对照 `spec.md`/`decision-ledger.md`/`next-round.md`；负向需求全部核验通过（零网络面／无 ML／语料零删除／门未削弱／版本真源／`CONTEXT.md` 未改）；跑偏 5 项（本报告 §3、§4 已并入并复核）。
- **主审复核纪律**：子代理结论**一律以 HEAD 复核**。本审**推翻 2 条**子代理结论：①「`src/` 新增 7 处非空断言」→ 实测 **5**（报告正确）；②「ADR-0012 行号锚点系统性偏移 4–11 行」→ 实测**锚点精确**（子代理误读脏工作区）。**采纳**其余（含 `.scratch/` CI 依赖、ADR-0006 尾空行、`doc-facts` 边界正则的有限缓解）。

### 7.2 隔离重建的坑（供后续审计复用）
- 工作区嵌套 workspace：`tests/vendor/react19/node_modules` **不在 git 内**，`git archive` 重建后必须补链，否则 `framework-react19.spec.ts` 与 `fill-feedback.spec.ts` 产生 **3 个假红**（本审首轮即中招，补链后同批 spec 11 passed / 0 failed，全套 146 passed / 0 failed）。
- dist 未被 Git 跟踪（`.gitignore` 含 `dist/`），故 dist 尺寸只能由**构建测量**获得，不能由 `git show` 取证。

### 7.3 审计边界（诚实声明）
- 本审**未**逐字复核 T-11 的禁词全文（采信 `38-gf-alignment-check.mjs` 与报告口径）。
- 本审**未**单独复跑 `tests/perf-fingerprint.spec.ts`（采信报告日志；该 spec 已含在 146 passed 内）。
- 本审**未**取得任何 CI run ID（无 push）⇒ **行为面闭环仍待 CI**。
- 本审**未**修改任何被审文件；唯一新增为本报告与交接文件。
