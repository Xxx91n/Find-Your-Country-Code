# 27 — 检测覆盖率下限补强

**What to build:** 让纯关键字/placeholder 弱信号、无锚的区号字段（`<input name="countryCode">`、placeholder="Country code" 等真实站点标准命名）跨过低置信线，被低调注入或至少登记可召唤，且不牺牲 precision。

**覆盖 A-xxx:** A-001

**Blocked by:** 32 — 需 32 先落真实站点语料，以其正负例标定本票改法并证明 precision/recall 不回退。（已解除：票 32 已落 `realSiteForms` 与 32 探针，本票复用其正负例与漂移契约）

**Status:** done

## 验收项

- [x] 在 corpus 新增弱信号字段正例（name=countryCode / placeholder="Country code" / "Dial code" 等），记录当前实现对其判 none 的复现基线
  - commit `049131a`（语料 + fixture + 标定脚本）；改前 30/none 由 `verify-ticket-27.mjs` G2 组锁定（`L1_ATTR_PHRASE_SCORE=0` 复算），CI run 34695235133
  - 新增 3 例：`rs-weak-input-dialcode`、`rs-weak-input-placeholder-dial`、`rs-weak-input-snake`，各带改前基线 30(none)；改前基线另存于 `baseline.preFix.observed`
- [x] 调整评分/阈值/补强信号，使弱信号字段 ≥ SCORE_LOWKEY（35）被低调注入（或至少登记可召唤）；SCORE_AUTO 不变
  - commit `2d2096d`：新增 `L1_ATTR_PHRASE_SCORE=8` 与 attrStr 强短语证据面；30(none) → 38(lowkey)
  - `SCORE_AUTO=70` / `SCORE_LOWKEY=35` / `L1_STRONG_KW_SCORE=30` 三者未动（G5 锁定），CI run 34695235133
- [x] 现有 tests/corpus 正负例 precision/recall 不回退（CI calibration baseline 绿）
  - commit `db1dcf8`；Calibration Baseline run 34695252905 绿：前 41 例 / 后 48 例 precision 1.0000、recall 1.0000、回归门禁 PASS；32 探针「契约 + 覆盖 + 复现基线硬门禁: PASS」
  - 改前 → 改后：recall 0.8077 → 1.0000，precision 全程 1.0000，22 例负例零抬升且分值逐例不变
- [x] 改法以 corpus 正负例标定，证据锚 commit sha + CI run ID
  - 标定脚本 `tests/scripts/27-weak-signal-calibration.mjs`（7 段：全语料基线 / 8 形态复现 / 逐例归因 / 候选常量扫描 / 选项①模拟 / 归一化命中 / 改前改后对照）
  - 票级验收门 `tests/scripts/verify-ticket-27.mjs` 81 断言（G1–G8），commit `3f4d9aa`，CI run 34695235133（81 passed / 0 failed）
- [x] E2E 全量绿（含新增弱信号 fixture）
  - commit `a16bc71`：`verify-27.yml` 新增 `ticket-27-e2e` 作业，CI run 34695235133 中 `npx playwright test tests/weak-signal.spec.ts` → 3 passed
  - 本地全量 `npm run e2e` 80 passed（含本票 3 条弱信号用例）
  - 注：共享 `e2e.yml` 安装步骤在本栈仍 ERESOLVE（预存债，修复归 cch/34 内联 / cch/31 .npmrc），详见窗口报告 D-27a

## 证据锚总表

| 交付 | commit sha | CI run ID |
| --- | --- | --- |
| 改法落地（config + detect） | `2d2096d` | 34697124610 |
| 语料 + fixture + 标定脚本 | `049131a` | 34697124610 / 34697148462 |
| 票级验收门 + verify-27.yml | `3f4d9aa` | 34697124610 |
| E2E 证据作业 | `a16bc71` | 34697124610（3 passed） |
| manifest 基线同步 | `a18cdc4` | 34697148462 |
| Typecheck | `1052f3c` | 34697124601（绿） |

分支：`cch/27-detection-coverage-floor`（最终头 `1052f3c`，含 8 个 cch-27 提交；栈序随并行窗口变动）

> 注：过渡头曾因票 28/29 域漂移导致 Calibration / Typecheck 转红，已由重新入栈消解（D-27e）；最终头 `1052f3c` 三门全绿（Verify 34697124610 / Calibration 34697148462 / Typecheck 34697124601）。共享 E2E 仍卡安装阶段（D-27a），本票以自有作业取证。
窗口报告：`research/window-reports/27-detection-coverage-floor-report.md`（R1 追加节 `## 返工轮次 R1（2026-09-12）`）（偏离点 D-27a~D-27e；D-27e 含本票经授权代解票 29/34 的 package-lock.json 冲突之记录，需两票窗口复核）


## 返工轮次 R1（2026-09-12）— P8 跨线裁决

- **发现**：全栈合入 main 后 Engine Gates 唯一红 run 34708464239 @ `019f228e` —— 35/36，`P8(expect=lowkey, got=auto, score=76)`（68 + attr:phrase 8 越过 `SCORE_AUTO=70`）。根因：首轮只跑自有 verify-27 + calibration，票 34 R1 的 EG 绿取自不含票 27 改动的栈，全合序组合从未被验证。
- **裁决：路线 B（限制叠加，保 lowkey）**。理由：本票是覆盖率**下限**补强（floor），不应抬高上限（ceiling）；首轮 config 注释已点名 66-68 分正例为不得越线的风险带；引擎 L449「关键词↔内容同向锁定」已有同范式先例；atomcode 调研给出「同源证据不可叠加计分 / floor-ceiling 分离（Chrome Autofill ML、FICO 贡献封顶）」的方向性支撑（本轮零抓取，仅作方向依据）。
- **改法**：`src/detect/index.ts` 属性短语结算移到 L3 内容验证之后，当 `st.plusDial > 0 || st.parenDial > 0`（L3 已独立证明区号值域）时不重复计入，仅留痕 `attr:phrase:*:dedup(opts-dial)`；无内容证据的弱信号 input 照常 +8。`SCORE_AUTO/LOWKEY/L1_ATTR_PHRASE_SCORE` 三常量未动。
- **影响面**：P 组 36 例中仅 P8 档位变化（回 68/lowkey）；P1/P2/P6/A1 分值 -8 档位不变；F 组负例与 `area-code`（P10 = 68/lowkey）零变化；`rs-*` 真实语料形态判定不变。
- **新增锁定**：`verify-ticket-27.mjs` G9 组（81 → 86 断言）。

| 门 | run ID | 结论 |
| --- | --- | --- |
| Engine Gates（36/36 + 25/25） | 34710856761 | success |
| Verify Ticket 27（86 断言 + E2E 作业 3 passed） | 34710856759 | success |
| Verify Ticket 28（19） | 34710863480 | success |
| Verify Ticket 29（27） | 34710866693 | success |
| Calibration Baseline | 34710869926 | success |
| Typecheck | 34710856729 | success |
| E2E（共享面 80 passed） | 34710856691 | success |

commits：引擎去重 `53615470` / G9 锁定 `419b03d2` / 触发面 `793f0d39` / R1 收口文档 `a56f2da5`；分支 `cch/27-detection-coverage-floor-fix`。

**最终头复核（`a56f2da5`）**：Engine Gates 34735967970、Verify 27 34735967988、Verify 28 34735990282、Verify 29 34735992783、Calibration 34735996427、Typecheck 34735968024、E2E 34735968078 —— 七门全 success。

- **遗留建议**：P1（6 选项）72/auto 与 P8（5 选项）68/lowkey 语义证据相同而档位不同（首轮前即存在）。若产品判断 Case4 应自动注入，应作独立变更，不得借本票补分越线。
