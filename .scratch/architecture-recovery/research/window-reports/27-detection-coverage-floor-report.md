# 27 - 检测覆盖率下限补强（A-001）窗口报告

> Cycle-4 | 分支 cch/27-detection-coverage-floor | Blocked by: 32（真实站点语料先落，以其正负例标定改法）
> 证据铁律：全部结论锚 commit sha + CI run ID；报告自述不算证据。

## 0. 结论与证据锚

弱信号无锚区号字段（name=countryCode / placeholder="Country code" / name=dialCode / name=country_code）此前 30 分、L1:kw:strong 单信号，低于 SCORE_LOWKEY(35) 落 none。本票新增属性强短语证据面（L1_ATTR_PHRASE_SCORE=8）后为 38 分跨过低置信线，SCORE_AUTO(70) 与 L1_STRONG_KW_SCORE(30) 常量未动；全语料 precision 1.0000 不回退，recall 0.8077 升至 1.0000，22 例负例零抬升。

| 项 | 内容 | commit sha | CI run ID |
| --- | --- | --- | --- |
| 改法落地 | L1_ATTR_PHRASE_SCORE=8 + attrStr 强短语证据面 | 2d2096d | 34697124610（门 81/81 + E2E 3 passed） |
| 复现与标定 | 语料 3 例 + fixture + 标定脚本 | 049131a | 34697124610 / 34697148462 |
| 票级验收门 | verify-ticket-27.mjs（81 断言）+ verify-27.yml | 3f4d9aa | 34697124610 |
| E2E 证据作业 | verify-27.yml 增 ticket-27-e2e（弱信号 fixture） | a16bc71 | 34697124610（3 passed） |
| 基线登记同步 | manifest 基线同步到修后态（32 探针契约） | a18cdc4 | 34695252905（Calibration 绿） |
| 类型门禁 | Typecheck | 1052f3c | 34697124601（绿） |
| 校准基线 | precision/recall 不回退 + 32 探针契约 | 1052f3c | 34697148462（绿） |

最终头 1052f3c（本票 docs 提交，分支含 8 个 cch-27 提交）；过渡头 a18cdc4 / 5549d21 / 0fbf001 由并行窗口重排产生。栈拓扑随并行窗口变动，收口时 cch/29 -> cch/27 -> cch/34-lockfile-land -> cch/28 -> cch/32（见偏离点 D-27b、D-27e）。

## 1. 阻塞关系与必读清单复核

- Blocked by: 32 —— 票 32 已落 realSiteForms 与 32-real-site-corpus.mjs 探针，本票直接复用其正负例与漂移检测契约；提交依赖在执行期被 GitButler 显式校验（manifest.json depends on cch/32），与 issue 声明一致。
- 必读清单 8 项全部读全：issue 27 / spec.md / WORKFLOW.md（§4.2 版本控制）/ decision-ledger.md（A-001 条目）/ src/config.ts / src/detect/index.ts / docs/adr/0001 / tests/corpus/manifest.json。
- 版本控制全程走 GitButler（but commit / but push / but move），未使用任何 git 写命令。

## 2. 复现证据（改前基线）

改前信号归因（tests/scripts/27-weak-signal-calibration.mjs 段 [2]/[3]，改前以 L1_ATTR_PHRASE_SCORE=0 复算）：

| 形态 | 属性 | 改前分值 | 改前档位 | 信号归因 |
| --- | --- | --- | --- | --- |
| W1 | name=countryCode | 30 | none | L1:kw:strong(+30) 单信号 |
| W2 | placeholder="Country code" | 30 | none | 同上 |
| W3 | name=dialCode | 30 | none | 同上 |
| W4 | placeholder="Dial code" | 30 | none | 同上 |
| W5 | name=country_code | 30 | none | 同上 |
| W6 | name=country-code | 30 | none | 同上 |
| W7 | name=countrycode（紧凑） | 30 | none | 同上 |
| W8 | placeholder="国家区号"（CJK） | 0 | none | 无信号 |

改前全语料（45 例）：TP=20 FP=0 TN=22 FN=3，precision 1.0000 / recall 0.8696 / F1 0.9302；含本票 3 例新增弱信号正例后为 48 例、recall 0.8077。CI 侧该基线以 verify-ticket-27.mjs G2 组锁定（L1_ATTR_PHRASE_SCORE=0 复现 30/none），run 34695235133。

## 3. 改法选型（含标定数据）

任务书给三个选项：① attrStr 强短语补分组；② 无锚单强关键字 + tel 语义入低置信；③ 阈值重调（最后手段）。

### 3.1 候选全语料标定（27-weak-signal-calibration.mjs 段 [4]/[5]）

| 候选 | 改法 | precision | recall | 负例抬升 |
| --- | --- | --- | --- | --- |
| V0 | 基线（不改） | 1.0000 | 0.8077 | - |
| V1 | L1_STRONG_KW_SCORE 30 -> 35 | 1.0000 | 1.0000 | 0 |
| V2 | L1_STRONG_KW_SCORE 30 -> 36 | 1.0000 | 1.0000 | 0 |
| V3 | L1_STRONG_KW_SCORE 30 -> 40 | 1.0000 | 1.0000 | 0 |
| V4 | SCORE_LOWKEY 35 -> 30 | 1.0000 | 1.0000 | 0 |
| V5 | SCORE_LOWKEY 35 -> 28 | 1.0000 | 1.0000 | 0 |
| 选定 | ① 属性强短语 +8（30+8=38） | 1.0000 | 1.0000 | 0 |

六个候选在全语料指标上不可区分（precision 均 1.0000、负例零抬升），决定项不是指标而是副作用面。

### 3.2 决定性约束（为什么不能抬 L1_STRONG_KW_SCORE，也不能降 SCORE_LOWKEY）

tests/manual/test-page.html 的 #area-code（name="area-code"）经 joined 匹配命中 KW_STRONG 的 areacode，当前 68 分；tests/fp-regression.spec.ts 硬断言其必须保持 lowkey。

- 抬 L1_STRONG_KW_SCORE 至 35/36/40：68 + 5/6/10 = 73/74/78，均 >= SCORE_AUTO(70)，该例由 lowkey 变 auto，直接打破既有 E2E 分档断言。
- 降 SCORE_LOWKEY 至 30/28：属任务书明列的最后手段，且会同步放宽 30-34 分段的全部边界形态（含 no-aria-custom-dropdown 34 分一线的 ADR-0005 登记档语义），副作用面大于本票靶子。
- 选项 ① 天然规避：area code 不在强短语词表内，#area-code 拿不到属性短语分，68 分保持不变。

### 3.3 取值为什么是 8

L1_STRONG_KW_SCORE(30) + 8 = 38 >= SCORE_LOWKEY(35)，且 38 < SCORE_AUTO(70)，不触碰自动注入档。权重取低于 L1_LABEL_PHRASE_SCORE(26)：属性文本（placeholder / aria-label / name / id / class / data-name / title）是比 label 弱一等的证据——无 label 关联、可被 JS 动态改写、常为提示性文案。8 已覆盖 camelCase / snake_case / kebab / 紧凑 / placeholder 五种命名变体（G7 组断言），再高只会无谓扩大既有 66-68 分正例越过 SCORE_AUTO 的风险。

14-threshold-calibration.mjs 的独立结论与之一致：建议 keep-current（SCORE_AUTO=70 / SCORE_LOWKEY=35），可行域 72 组，60 组扰动中 56 组保持门禁可行。

## 4. 实现

| 文件 | 改动 |
| --- | --- |
| src/config.ts | 新增 L1_ATTR_PHRASE_SCORE = 8（附标定注释），插在 L1_LOCAL_FIXED_PENALTY 之前；SCORE_AUTO / SCORE_LOWKEY / L1_STRONG_KW_SCORE 零改动 |
| src/detect/index.ts | 新增 ATTR_PHRASES_STRONG = LABEL_PHRASES_STRONG（与 label 强短语同词表）+ attrPhraseNorm / attrPhraseHit 两个纯函数；结算点在 iti 容器结算之后、L3 内容验证之前 |
| tests/corpus/manifest.json | append-only 新增 3 例弱信号正例；realSiteForms.weak-signal-input 基线同步（见 D-27c） |
| tests/fixtures/weak-signal.html | 5 正例 + 4 护栏负例；页面刻意不放 input[type=tel] 以保持无锚语义 |
| tests/weak-signal.spec.ts | 低调注入 / 护栏不抬升 / 注入总数守恒 三条 |
| tests/scripts/27-weak-signal-calibration.mjs | 改法标定脚本（7 段：基线、复现、逐例归因、候选扫描、选项①模拟、归一化命中、改前改后对照） |
| tests/scripts/verify-ticket-27.mjs | 票级验收门 81 断言（G1-G8） |
| .github/workflows/verify-27.yml | 门作业 + 本票 E2E 作业 |

两处刻意的设计决策：

1. 结算点在 iti 容器结算之后：属性文本不作为 iti 容器的最低佐证（票 13 检查点四语义），避免属性短语把容器级低置信抬成注入。
2. 归一化与 matchLatin 同口径：camel 边界拆分 + 非字母数字折叠为空格，再同时做 token 匹配与 joined 匹配，使 countryCode / country_code / country-code / countrycode 归一命中同一短语。

## 5. 验收证据（issue 五项）

| # | 验收项 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | corpus 新增弱信号正例并记录改前 none 复现基线 | PASS | 049131a；改前 30/none 由 G2 组锁定，run 34695235133 |
| 2 | 弱信号 >= SCORE_LOWKEY 被低调注入，SCORE_AUTO 不变 | PASS | 2d2096d；30(none) -> 38(lowkey)，G1/G5，run 34695235133 |
| 3 | 现有正负例 precision/recall 不回退（calibration 绿） | PASS | a18cdc4；Calibration Baseline run 34695252905（前 41 / 后 48 例 precision 1.0000、recall 1.0000、回归门禁 PASS） |
| 4 | 改法以 corpus 正负例标定，证据锚 sha + run ID | PASS | 049131a + 3f4d9aa；标定脚本 7 段 + 门 G1-G8，run 34695235133 |
| 5 | E2E 全量绿（含新增弱信号 fixture） | PASS | a16bc71；CI E2E 作业 3 passed（run 34695235133）；本地全量 E2E 80 passed |

CI 关键输出（run 34695252905 / 34695235133 原文摘录）：

- [PASS*] rs-weak-input-name positive expect=inject got=inject/lowkey score=38（5 例同形态同分）
- recall =1.0000 (FN=0)、回归门禁（非 residual 用例全部符合 expect）: PASS
- [MISS] weak-signal-input covered=true expectTier=lowkey got=lowkey score=38 fix=27 (A-001)
- 前 cases=41 precision=1.0000 recall=1.0000 gate=pass / 后 cases=48 precision=1.0000 recall=1.0000 gate=pass
- 契约 + 覆盖 + 复现基线硬门禁: PASS
- 票 27 验收门: 81 passed / 0 failed；npx playwright test tests/weak-signal.spec.ts -> 3 passed（最终头 1052f3c run 34697124610，两作业均 success）

## 6. 护栏证据

| 护栏 | 断言组 | 结果 |
| --- | --- | --- |
| SCORE_AUTO=70 / SCORE_LOWKEY=35 / L1_STRONG_KW_SCORE=30 未动 | G5 | PASS |
| 22 例负例零抬升且分值逐例不变 | G4 | PASS |
| 本地固话区号负例不进注入档 | G8 | PASS |
| 语言前缀负例不进注入档（L4 排除有效） | G8 | PASS |
| name=area-code（68 分）仍为 lowkey，未被推过 auto | G8 + 既有 fp-regression.spec.ts | PASS |
| 分值单一来源（config 常量 + 与 label 强短语同词表） | G3 | PASS |
| E2E 护栏：4 负例 wrapper count 0、注入总数守恒 = 5 | weak-signal.spec.ts 用例 2/3 | PASS（CI 3 passed，本地 80 passed） |

## 7. 偏离点呈报

### D-27a 共享 E2E 安装面预存红（非本票引入）

共享 .github/workflows/e2e.yml 的 npm install（无 flag）在本票栈上失败于 ERESOLVE：根项目钉 react@^18.3.1，而 react-dom19 别名（npm:react-dom@^19.2.8）要求 react@^19。该步骤在本票栈每次 push 均红（run 34695235118 等），main 与 27/28/29 同因；修复归属他票——内联 --legacy-peer-deps 归 cch/34，集中 .npmrc 口径归 cch/31 D-31a，二者均为独立分支，合流前本栈不可见。

处置：不改动任何共享 CI 文件（避免与 cch/31 / cch/34 产生合流冲突），改在本票自有 verify-27.yml 内新增 ticket-27-e2e 作业，以 npm install --legacy-peer-deps 复刻同一步骤并只跑 tests/weak-signal.spec.ts，取得本票 fixture 的 CI 绿证据（run 34695235133，3 passed）。cch/34 合流后共享 E2E 自动转绿，届时本作业可删。

### D-27b 并行窗口重排导致本票改动一度脱离分支

本票 src/detect/index.ts 改动曾被并行窗口以整文件提交语义卷入 cch/28（引擎文件由 28 持有）。此后 GitButler 栈被并行窗口反复重排，cch/27 多次落到 cch/28 之下，推送后远端快照缺失引擎改动（run 34693800574 报「票 27 归属用例数 = 5 got 2」），并一度把 manifest 提交重排为 conflicted/no-changes。

处置：每次推送前执行「but move 归位 -> 本地校验 -> 推送 -> git fetch 复核远端快照」四步，并以远端快照（detect 含 6 处 attrPhrase、manifest 含 2 处新用例、knownResidual: true 6 处、preFix 1 处）作为放行条件。最终拓扑 cch/27 -> cch/28 -> cch/29 -> cch/32（本票改动同时依赖 28 的引擎文件、29 的候选集扩张、32 的语料基座）。本票为恢复依赖图对 28/29 的堆叠位置执行过 but move，属可逆操作，特此呈报。

### D-27c 32 探针契约要求修复票改写「改前基线」字段

32-real-site-corpus.mjs 的漂移检测要求 baseline.observed 等于引擎实测，而本票的价值恰恰是让该值改变（30/none -> 38/lowkey）。探针提示要求修复票同步 baseline 与用例 knownResidual / expect。问题在契约第 198 行：verdict 非 MISS 时用例 expect 必须为 none，而本票 5 例为正例（expect=inject），故只能沿用票 28 的既有口径——baseline.observed 同步为修后值、verdict 保持 MISS、用例 knownResidual 置 true（rs-iso2-paren-select 同形态）。

补偿措施：改前复现基线另行存入新增字段 baseline.preFix.observed（30/none/false），并在 postFix 与 baseline.gaps 中登记归因，复现证据未丢失。knownResidual=true 只作用于 mismatch 豁免（不影响 TP/FN 计数），故 G6 的 recall 0.8077 -> 1.0000 仍是有效证据。

### D-27d W8（CJK placeholder）未纳入修复范围

placeholder="国家区号" 改前 0 分（短语词表为拉丁词表），改后仍 0 分。本票靶子是 decision-ledger A-001 记录的拉丁命名形态；CJK 文案弱信号需另立词表面，不在 A-001 范围内，登记为后续候选。

## 8. 教训与建议

1. 并行窗口下的「分支内容」必须复核远端而非本地：本地 ref 正确不等于推送后正确，栈重排会静默抽走依赖祖先。放行条件应固定为 git fetch 后的远端快照断言。
2. 跨票共享文件的整文件提交会把改动卷进他票：GitButler 提交粒度是文件级，多票同改一个引擎文件时必有一方持有。建议跨票共用引擎文件时改为串行窗口，或引入 hunk 级归属约定。
3. 「只认 CI 证据」遇到共享安装面预存红时的出口：优先在本票自有 workflow 内复刻步骤（零接触共享文件），而非改共享 CI 引发合流冲突。
4. 漂移检测类契约需要「改前基线」的存放位：本票以 baseline.preFix 补位；建议后续统一为 preFix / postFix 成对字段，避免每个修复票各造一套。

## 9. 附录：复现命令

- 标定：node tests/scripts/27-weak-signal-calibration.mjs（需 Node >= 22.13，装载器用 module.stripTypeScriptTypes）
- 验收门：node tests/scripts/verify-ticket-27.mjs（81 断言）
- 探针：node tests/scripts/32-real-site-corpus.mjs --out <md> --json <json>
- E2E：npx playwright test tests/weak-signal.spec.ts；全量 npm run e2e（本地 80 passed）
- 版本控制：but status / but commit -b cch/27-detection-coverage-floor -m "..." <id> / but push cch/27-detection-coverage-floor

### D-27e 过渡头上 Calibration / Typecheck 曾转红（他票域漂移），最终头已转绿

在证据采集头 db1dcf8 上三门全绿（Verify 34695235133 / Calibration 34695252905 / Typecheck 34695235083）。并行窗口随后重排并重算提交，最终头 5549d21 上：

- Verify Ticket 27 **仍绿**（run 34695567968，门 81/81 + E2E 作业），本票内容零损伤；
- Calibration 转红（run 34695600773 / 34695844370），唯一违规为 `no-aria-custom-dropdown/rs-noaria-custom-dropdown: 引擎基线漂移 实测 score=14 基线 score=34` —— 属票 29 形态；同一份日志中本票形态仍为 `weak-signal-input covered=true expectTier=lowkey got=lowkey score=38`，探针自证断言数由 26 降至 21（SCAN_SELECTORS 集合变化），说明漂移源在票 29 的候选集贡献；
- Typecheck 转红（run 34695567993），失败于 `npm ci --legacy-peer-deps` EUSAGE：lockfile 记 typescript@7.0.2 / vite@8.2.2 而 package.json 钉 5.9.3 / 6.4.3 —— 即票 29 已登记并修复过的 `lockfile 与 package.json 重新同步` 债务，其效果在当前栈序下不可见。

**判定与消解**：两处红灯均落在票 28/29 共享的引擎文件与依赖面上，本票未触碰相关文件（`src/config.ts` 仅新增常量、`src/detect/index.ts` 仅新增属性短语证据面），本票不越界修复他票用例——越界修复会与并行窗口产生写冲突。

**消解**：并行窗口把 29 的候选集提交与 34 的 lockfile 修复（`cch/34-lockfile-land`）重新入栈后，本票把分支抬到整栈顶部重推，最终头 **0fbf001** 上三门全绿——Verify Ticket 27 run 34696245699（门 81/81 + E2E 作业 3 passed）、Calibration Baseline run 34696258480、Typecheck run 34696245666；探针自证与 no-aria 形态同步恢复（score 回到 34）。唯一仍红的共享 E2E（run 34696245668）仍是 D-27a 的安装阶段 ERESOLVE。

**遗留与本票的越界处置（已获授权）**：`cch/34-lockfile-land` 的 `srn`（票 34 的 CI 再生 lockfile 入库）与票 29 的 `nnr`（lockfile 与 package.json 重新同步）在 `package-lock.json` 上互斥（32 / 39 处冲突），GitButler 标记 conflicted 并禁止含该提交的推送，本票最后一次 docs 提交因此无法推送。经确认后由本票代为消解，口径与两票的共同依据一致——**以 `package.json` 为真相源**：

1. `npm install --package-lock-only --legacy-peer-deps` 重生成（typescript 5.9.3 / vite 6.4.3 / vite-plugin-monkey 5.0.9，lockfileVersion 3）；
2. 按票 34 的既定意图把 124 处 `registry.npmmirror.com` 改回 `registry.npmjs.org`（tarball 字节一致，integrity 不变）；
3. `npm ci --dry-run --legacy-peer-deps` 通过（added 51 packages），确认与 package.json 同步；
4. `but resolve srn` → `but resolve nnr` → `but resolve finish`，两个冲突提交均已消解，无残留冲突。

代价与提示：此举改写了票 29 / 票 34 各一个提交的内容（lockfile 侧），需由两票窗口复核确认；两票的功能语义（候选集扩张、lockfile 入库）未受影响。

## 返工轮次 R1（2026-09-12）

> 触发：跨栈全门复核发现 Engine Gates 唯一红 —— run 34708464239 @ `019f228e`，`P8(expect=lowkey, got=auto, score=76)`，35/36。
> 根因：首轮只跑自有 verify-27 + calibration，票 34 R1 的 EG 绿取自不含票 27 改动的栈，**全合序组合从未被任何一方验证**。
> 返工分支：`cch/27-detection-coverage-floor-fix`（首轮已合入 main，公共基址 `8c09e045`）。

### 1. 复现与归因

P8 形态 = Case4：`aria-label="Select country calling code"` + 5 个 `+NN` 选项 + tel 锚。信号明细：

| 信号 | 首轮前（attr=0） | 首轮后（attr=8） |
| --- | --- | --- |
| `L1 kw:strong` | 30 | 30 |
| `L1 attr:phrase:calling code` | 0 | 8 |
| `L3 opts:plus-dial`（5 项 x 4） | 20 | 20 |
| `L2 anchor:tel` | 18 | 18 |
| **合计 / 档位** | **68 / lowkey** | **76 / auto** |

即：属性短语与 `kw:strong` 同源于同一段 aria-label 文本，两者叠加后又与 L3 内容证据（+NN 值域）同向 —— 相关证据朴素求和，把 68 分的既有正例推过 `SCORE_AUTO(70)`。

### 2. 影响面普查（全 P 组 36 例 + N/F 负例）

以 `L1_ATTR_PHRASE_SCORE` 覆写为 0 / 8 的同引擎对照：

| 用例 | attr=0 | attr=8 | 档位变化 |
| --- | --- | --- | --- |
| P8 | 68/lowkey | 76/auto | **漂移** |
| P1 | 72/auto | 80/auto | 无（分值 +8） |
| P2 | 78/auto | 86/auto | 无（分值 +8） |
| P3 | 48/lowkey | 56/lowkey | 无 |
| P6 | 72/auto | 80/auto | 无（分值 +8） |
| P16 | 48/lowkey | 56/lowkey | 无 |
| A1 | 86/auto | 94/auto | 无（分值 +8） |
| F 组负例（含 F2 62/none） | 不变 | 不变 | 零变化 |

结论：**36 例中仅 P8 一例档位漂移**，与任务书预期一致；负例与 `area-code` 类专名（P10 = 68/lowkey）的分值与档位均未变。

补充事实：P1（6 个 +NN 选项）72 分即 auto，P8（5 个 +NN 选项）68 分落 lowkey —— 两者语义证据完全相同（kw:strong 30 + anchor 18），差异仅来自选项数（plus-dial 24 vs 20）。该不一致**在首轮之前即存在**，非本票引入。

### 3. 裁决：路线 B（限制叠加，保 lowkey）

| 维度 | 路线 A（认 auto） | 路线 B（保 lowkey，**选定**） |
| --- | --- | --- |
| 改动面 | 改票 02 门里 P8 的注册期望（lowkey→auto） | 改本票引擎：属性短语在内容证据已证成时不重复计入 |
| 真实站点行为 | **变更**：Case4 类下拉由低调注入升自动注入 | **不变**：全部既有档位逐例保持 |
| 与首轮意图 | 违背首轮 config 注释「不扩大 66-68 分正例越线」 | 一致（68 分正例正是该注释点名的风险带） |
| 治理成本 | 改他票（02）注册表，等于改写「什么算正确」 | 只修本票自身的泄漏 |
| 副作用 | 用户可见升级 | 无 |

**选定路线 B 的理由**：

1. 本票是 A-001「覆盖率**下限**」补强（floor），授权范围是把落 none 的弱信号抬到可注入，**不是**把既有中置信字段抬到高置信自动注入（ceiling）。
2. 首轮 `src/config.ts` 的标定注释已明示风险带为 66-68 分正例，P8 恰在其中 —— 修自身越界比改他票期望值更正当。
3. 引擎内已有同范式先例：L449「关键词↔内容同向锁定」（内容证据与 L1 相悖时撤销 kw 分）；本次是其**同向冗余**侧的对称补齐。
4. atomcode 调研支撑：**「相关证据朴素求和高估置信 —— aria-label 与 +NN 选项同源，不能叠加计分」**；「新证据抬高下限、不抬高上限（floor/ceiling 分离）」有 Chrome Autofill ML（只提升下限、填充门槛独立）与 FICO / SpamAssassin（贡献封顶 + 分档决策）先例。

> 调研诚实标注：本轮 atomcode 以 `--no-tools` 运行，**零网页抓取**；来源为其训练知识给出的公开资源清单（Chrome / Firefox formautofill / Bitwarden / 1Password / libphonenumber 等，URL 见调研原文），未经本机核验，仅作方向性支撑。决定性依据仍是本仓实证：首轮 config 注释 + L449 同范式 + 影响面普查。

### 4. 改法

`src/detect/index.ts`：属性短语结算位置由「iti 容器结算之后」移到「L3 内容验证之后」（需在内容证据已知时判定；仍保持不作 iti 容器最低佐证 —— 票 13 检查点四不变），并加同源去重：

| 条件 | 行为 |
| --- | --- |
| `st.plusDial > 0` 或 `st.parenDial > 0`（L3 已独立证明区号值域） | 属性短语**不计分**，仅留痕 `attr:phrase:*:dedup(opts-dial)`（0 分） |
| 其他（无内容区号证据：纯 name/placeholder 弱信号 input 等） | 照常 `+L1_ATTR_PHRASE_SCORE(8)` |

`SCORE_AUTO(70)` / `SCORE_LOWKEY(35)` / `L1_ATTR_PHRASE_SCORE(8)` 三个常量均未改动；`rs-*` 真实语料形态判定不变；护栏（负例零抬升）不变。

`tests/scripts/verify-ticket-27.mjs` 新增 **G9 锁定组**（81 → 86 断言）：P8 形态改后 68/lowkey、与首轮改前基线一致、去重留痕存在、无内容证据弱信号 input 仍 38/lowkey、弱信号 input + tel 锚仍 56/lowkey。

### 5. 验收证据（合序态，全 CI）

| 门 | run ID | 结论 |
| --- | --- | --- |
| Engine Gates（36/36 + 25/25） | 34710856761 | **success** |
| Verify Ticket 27（86 断言 + E2E 作业 3 passed） | 34710856759 | **success** |
| Verify Ticket 28（19） | 34710863480 | **success** |
| Verify Ticket 29（27） | 34710866693 | **success** |
| Calibration Baseline | 34710869926 | **success** |
| Typecheck | 34710856729 | **success** |
| E2E（共享面，80 passed） | 34710856691 | **success** |

红基线（修复前）：Engine Gates run 34708464239 @ `019f228e` —— 35/36，`P8(expect=lowkey, got=auto, score=76)`。

| 交付 | commit sha |
| --- | --- |
| 引擎去重改法 | `53615470` |
| G9 锁定组（81 → 86 断言） | `419b03d2` |
| verify-27.yml 触发面补返工分支 | `793f0d39` |

### 6. 遗留与建议

- **P8 的不一致仍在（非本票引入）**：P1（6 选项）72/auto 与 P8（5 选项）68/lowkey 语义证据相同而档位不同。若产品判断 Case4 应自动注入，应作为**独立变更**上调其档位或调整 L3 选项数门槛，而不是借本票的补分越线 —— 本轮已显式登记该建议。
- **教训（与票 33 同步登记）**：跨栈行为改动必须在最终合序栈复跑公共门；单票自有门绿不足以证明组合正确。本轮 R1 即该教训的第一次兑现。
