# 27 — 检测覆盖率下限补强

**What to build:** 让纯关键字/placeholder 弱信号、无锚的区号字段（`<input name="countryCode">`、placeholder="Country code" 等真实站点标准命名）跨过低置信线，被低调注入或至少登记可召唤，且不牺牲 precision。

**覆盖 A-xxx:** A-001

**Blocked by:** 32 — 需 32 先落真实站点语料，以其正负例标定本票改法并证明 precision/recall 不回退。（已解除：票 32 已落 `realSiteForms` 与 32 探针，本票复用其正负例与漂移契约）

**Status:** done

## 验收项

- [x] 在 corpus 新增弱信号字段正例（name=countryCode / placeholder="Country code" / "Dial code" 等），记录当前实现对其判 none 的复现基线
  - commit `4249b2f`（语料 + fixture + 标定脚本）；改前 30/none 由 `verify-ticket-27.mjs` G2 组锁定（`L1_ATTR_PHRASE_SCORE=0` 复算），CI run 34695235133
  - 新增 3 例：`rs-weak-input-dialcode`、`rs-weak-input-placeholder-dial`、`rs-weak-input-snake`，各带改前基线 30(none)；改前基线另存于 `baseline.preFix.observed`
- [x] 调整评分/阈值/补强信号，使弱信号字段 ≥ SCORE_LOWKEY（35）被低调注入（或至少登记可召唤）；SCORE_AUTO 不变
  - commit `2149576`：新增 `L1_ATTR_PHRASE_SCORE=8` 与 attrStr 强短语证据面；30(none) → 38(lowkey)
  - `SCORE_AUTO=70` / `SCORE_LOWKEY=35` / `L1_STRONG_KW_SCORE=30` 三者未动（G5 锁定），CI run 34695235133
- [x] 现有 tests/corpus 正负例 precision/recall 不回退（CI calibration baseline 绿）
  - commit `db1dcf8`；Calibration Baseline run 34695252905 绿：前 41 例 / 后 48 例 precision 1.0000、recall 1.0000、回归门禁 PASS；32 探针「契约 + 覆盖 + 复现基线硬门禁: PASS」
  - 改前 → 改后：recall 0.8077 → 1.0000，precision 全程 1.0000，22 例负例零抬升且分值逐例不变
- [x] 改法以 corpus 正负例标定，证据锚 commit sha + CI run ID
  - 标定脚本 `tests/scripts/27-weak-signal-calibration.mjs`（7 段：全语料基线 / 8 形态复现 / 逐例归因 / 候选常量扫描 / 选项①模拟 / 归一化命中 / 改前改后对照）
  - 票级验收门 `tests/scripts/verify-ticket-27.mjs` 81 断言（G1–G8），commit `65a3e68`，CI run 34695235133（81 passed / 0 failed）
- [x] E2E 全量绿（含新增弱信号 fixture）
  - commit `dba7fc5`：`verify-27.yml` 新增 `ticket-27-e2e` 作业，CI run 34695235133 中 `npx playwright test tests/weak-signal.spec.ts` → 3 passed
  - 本地全量 `npm run e2e` 80 passed（含本票 3 条弱信号用例）
  - 注：共享 `e2e.yml` 安装步骤在本栈仍 ERESOLVE（预存债，修复归 cch/34 内联 / cch/31 .npmrc），详见窗口报告 D-27a

## 证据锚总表

| 交付 | commit sha | CI run ID |
| --- | --- | --- |
| 改法落地（config + detect） | `2149576` | 34695235133 |
| 语料 + fixture + 标定脚本 | `4249b2f` | 34695235133 / 34695252905 |
| 票级验收门 + verify-27.yml | `65a3e68` | 34695235133 |
| E2E 证据作业 | `dba7fc5` | 34695235133（3 passed） |
| manifest 基线同步 | `db1dcf8` | 34695252905 |
| Typecheck | `db1dcf8` | 34695235083 |

分支：`cch/27-detection-coverage-floor`（栈顶 `db1dcf8`，栈序 cch/27 → cch/28 → cch/29 → cch/32）
窗口报告：`research/window-reports/27-detection-coverage-floor-report.md`（偏离点 D-27a~D-27d）
