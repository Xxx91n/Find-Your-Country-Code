# 窗口报告 — 票 28 ISO2-value 下拉区号证据补全（A-002）

> Cycle-4 | 票: issues/28-iso2-dial-evidence.md | 覆盖 A-002
> 分支: `cch/28-iso2-dial-evidence`（按 WORKFLOW §4.2 堆叠于 `cch/27-detection-coverage-floor` 之上，后者又堆叠于 `cch/32-real-site-corpus`）
> 完成定义: 遵循 `handoffs/28-iso2-dial-evidence.md` 内完成定义
> 证据铁律: commit sha + CI run ID（只认 CI 证据）——见 §7

## 1. 本票 Delta 落实对照

| 检查点 / 专属验收项 | 落实 | 证据 |
|---|---|---|
| 复现先行：`<option value="us">United States (+1)</option>` 的 value 不命中 DIAL_SET → plusDial=0 → 文本侧 parenDial 被 `if (st.plusDial > 0)` 吞掉 | ✅ 复现并留痕 | 票 32 基线 score=14/tier=none；本票改前本地复现一致 |
| 修法：文本括号区号证据独立计分（不嵌 plusDial 门），L3 常量口径复用 `src/config.ts`，不新增魔法数 | ✅ | `99ce511`；verify-28 G2（2.1–2.4）CI 绿 |
| 护栏 1：裸国家选择器抑制（`country-semantic:suppress`）保持有效——纯 ISO2 无区号证据下拉仍判 none | ✅ | verify-28 G3（3.1–3.3）；E2E「护栏1」用例 |
| 护栏 2：共享区号（+1）消歧不回退；`pseudoOptionStats` 与 `optStats` 口径同步（票 13 检查点二） | ✅ | verify-28 G4（4.1–4.2）、G5（5.1–5.2）；E2E「护栏2」消歧落点 CA |
| 标定：以票 32 真实站点模式库为正例源，CI calibration baseline 为放行标准 | ✅（门禁层面）/ ⚠️（workflow 层面见 D-28c） | run `34692680834`；run `34692755555` 中 harness 与 threshold 两步 ✓ |
| 专属验收：正例源用票 32 模式库；CI calibration baseline 绿 + E2E 绿，均须 CI run ID | ⚠️ 部分受限 | 见 §7 与 D-28a / D-28c |

## 2. 变更清单

| 提交 | sha | 内容 |
|---|---|---|
| 调研纪要 | `bc37aae` | `research/atomcode-ticket28-iso2-paren-dial.md`（parenDial 独立计分可行性调研 + 采用/不采用对照 + 一手信源） |
| 实现 | `99ce511` | `src/detect/index.ts`（select 侧 parenDial 移出 plusDial 门 + pseudo 侧口径同步）；`tests/corpus/manifest.json`（复现基线锁显式更新）；`tests/fixtures/iso2-dial-evidence.html` + `tests/iso2-dial-evidence.spec.ts`（新增） |
| 验收门 | `1f30990` | `tests/scripts/verify-ticket-28.mjs`（19 断言）+ `.github/workflows/verify-28.yml`（node 22、无 npm 安装面） |

### 2.1 改法（精确到代码）

改前（`src/detect/index.ts`）：

```ts
if (st.plusDial > 0) {
  score += add('L3', 'opts:plus-dial', ...);
  if (st.parenDial > 0) {                      // ← 嵌套在 plusDial 门内
    score += add('L3', 'opts:(+NN)-text', ...);
  }
}
```

改后：

```ts
if (st.plusDial > 0) {
  score += add('L3', 'opts:plus-dial', ...);
}
// 票 28（A-002）：文本括号区号 (+NN) 独立成 L3 证据，移出 plusDial > 0 门。
if (st.parenDial > 0) {
  score += add('L3', 'opts:(+NN)-text', Math.min(st.parenDial * L3_PLUS_PAREN_SCORE, L3_DIAL_CAP));
}
```

pseudo 侧同步：`if (st2.plusDial > 0 && st2.parenDial > 0)` → `if (st2.parenDial > 0)`（票 13 检查点二）。

分值全部复用 `L3_PLUS_PAREN_SCORE=8` / `L3_DIAL_CAP=45`，**无新增魔法数**；`SCORE_AUTO` / `SCORE_LOWKEY` 未动。

## 3. 修复前后对照（同引擎、同 harness）

| 指标 | 改前（票 32 基线） | 改后 |
|---|---|---|
| `rs-iso2-paren-select` | score 14 / tier none / 未注入 | **score 38 / tier lowkey / 注入** |
| 信号归因 | `L1:kw:country +14`；`L3:opts:(+NN)-text` 被丢弃 | `L1:kw:country +14`；`L3:opts:(+NN)-text +24`（3 项 × 8） |
| 语料（45 例，本票基线） | precision 1.0000 / recall 0.8696 / f1 0.9302 | **precision 1.0000 / recall 0.9130 / f1 0.9545**（FN 3→2，FP 恒 0） |

38 = 14 + 24 ≥ `SCORE_LOWKEY(35)` → lowkey；`isoName=0`（选项文本含括号/加号/数字，不满足 ISO2↔国名互证字符集）→ 不触发国家选择器抑制，与 A-002 语义一致。

## 4. 护栏验证

| 护栏 | 断言 | 结果 |
|---|---|---|
| 护栏 1 | F2（`value="US"` + 纯国名，4 项）仍 none（score 44），且 `country-semantic:suppress` 留痕 | ✅ |
| 护栏 1 | F8（ISO2 + CJK 国名）仍 none（score 0） | ✅ |
| 护栏 2 | `mm2-pos-shared-dial`（+1/+1/+44，US/CA 共享）仍 inject/lowkey，score 66 未回退 | ✅ |
| 护栏 2 | E2E 运行时：+1 下拉面板选 Canada → `selectedIndex === 1`（消歧落点正确，非首值 US） | ✅ |
| 口径同步 | pseudo 侧与 select 侧同常量、同独立计分条件 | ✅ |

> 护栏 1 复用既有语料 F2/F8，未新增 corpus 用例：既避免与票 27/29 并行改 manifest 的冲突，也让「纯国家选择器」负例获得永久回归保护。

## 5. atomcode 深度调研（串行护栏，单跑）

纪要：`research/atomcode-ticket28-iso2-paren-dial.md`。核心结论：

- **方向成立**：Chromium 2026 提交 `d41f91e`（crbug 479503511）承认 select 上「区号 vs 国家」常被误分类，与本票缺陷同源；但业界（Chromium/Firefox/Bitwarden/KeePassXC）**均不解析 option 文本**，WHATWG #8597 也只把 `(+NN)` 当填充启发式 —— 故 parenDial 是本项目的**自建增强，护栏必须自建**。
- **共享区号**：数据层用 libphonenumber `isMainCountryForCode`（+1→US 主国）；UI 层通行形态正是本票形态 B（value=ISO2 + 文本国家名 `(+NN)`）；形态 A（`value="+1"`）被 whatwg#8597 判为缺陷（first-match 会填成安圭拉）。本票不动 fill 侧，该约束由既有实现承担。
- **采用**：区号表白名单、排除 `(0)`/本地固话（强制 `+` 前缀）、负信号抑制、命中选项 ≥2 —— 四项均为既有实现已具备。
- **不采用**：「共现约束硬门」（与 ADR-0001「锚存在才加分」已决冲突，改硬门会压掉单字段页面的真区号字段）；「选项 ≥10 且命中率 ≥80%」（会直接打掉本票 3 项正例，属引擎阈值整体重构，spec Out of Scope）。

## 6. 本地验证（非 CI，仅作过程记录）

- `node tests/scripts/32-real-site-corpus.mjs`：契约 + 覆盖 + 复现基线硬门禁 **PASS**（更新基线后）
- `node tests/scripts/14-calibration-harness.mjs`：precision 1.0000 / recall 0.9130 / 回归门禁 **PASS**
- `node tests/scripts/verify-ticket-28.mjs`：**19 PASS / 0 FAIL**
- `npx tsc --noEmit`：**clean**
- `npx playwright test`：**73 passed / 0 failed**（含新增 4 条；`visibility` 的 ISO2 承值 select、`pseudo-select` 的 MUI/react-select 均无回归）

## 7. 证据锚（commit sha + CI run ID）

| 门 | CI run ID | 结论 | sha |
|---|---|---|---|
| **Verify Ticket 28** | **34692680834** | **success（19/19）** | `1f30990` |
| Calibration Baseline（dispatch） | 34692755555 | `Run precision/recall harness` ✓、`Run threshold calibration` ✓；`Run real-site corpus probe` ✗（违反项全属票 27/29，见 D-28c） | `1f30990` |
| E2E | 34692680806 / 34692544829 | **failure —— 安装阶段** `npm install` ERESOLVE，未执行任何测试（预存破窗 D-28a） | `1f30990` / `d95c50a` |
| Typecheck | 34692680832 / 34692276331 | **failure —— 安装阶段**（同 D-28a） | `1f30990` / `53b7449` |

> E2E/Typecheck 的安装阶段失败在票 32 报告（`3e3b2ac`）已登记为「预存安装层债务，均安装阶段未执行测试」，非本票引入。

## 8. 偏离点 / 阻塞（呈报）

| ID | 事项 | 性质 | 建议 |
|---|---|---|---|
| **D-28a** | 仓库级 npm 安装面破损：`cch-25`（`4b420be`）把 8 个 workflow 的 `npm ci --legacy-peer-deps` 改为 `npm ci`，而 lockfile 未再生（票 25 AC4 pending）；票 31 的 `.npmrc legacy-peer-deps=true` 修复（提交 `lom`）**尚未落到本票分支**。E2E/Typecheck 因此无法取证 | 跨票预存红（票 31 D-31a 已登记） | 将 `.npmrc` 落地，或按 `real-site-smoke.yml` 的 `npm ci --legacy-peer-deps \|\| npm install --legacy-peer-deps` 回退。**本票未擅自回滚票 25 交付物** |
| **D-28b** | 票 27 提交 `fcfe328` 同时改 detect 与 config，但本票分支基线**只含 detect 侧**，`L1_ATTR_PHRASE_SCORE` 未定义 → 分支上引擎在 `attrPhrase` 命中时抛 `ReferenceError`（真实运行时缺陷，CI run 34692544879 实证） | 跨票半落地 | 按 WORKFLOW §4.2 以 `but move cch/28 --above cch/27` 堆叠消解。**副作用：连带将 `cch/27-detection-coverage-floor`（`481713c`）首次推到 origin**，请票 27 负责人知悉 |
| **D-28c** | Calibration Baseline 的 real-site 门禁在 27+28 上仍红：违反项全部为票 27 的 `weak-signal-input`（5 例基线漂移 + `knownResidual` 与 verdict 不一致）与票 29 的 `no-aria-custom-dropdown`（34→14）。本票 `iso2-value-paren-dial-select` 实测 `got=lowkey score=38` **零违反** | 他票在途 | 票 27/29 各自更新 `realSiteForms[].baseline.observed` 与用例 `knownResidual`。**本票未代改他人基线** |
| **D-28d** | 票 32 门禁语义限制：`verdict='MISS'` 时要求 `knownResidual=true`，而 `verdict≠'MISS'` 时又要求 `expect='none'` → **修复后的正例不存在合法编码状态**。故本票保留 `verdict='MISS'` + `knownResidual=true`，只更新 `baseline.observed`（回归保护由该锁承担，非 mismatch 列表） | 门禁设计缺口 | 建议票 34/35 增设 verdict 状态位（如 `MISS-RESOLVED`），使修复后正例可脱离 residual 语义 |
| **D-28e** | 未采纳 atomcode 的两条护栏建议（共现约束硬门 / 选项 ≥10） | 有意偏离 | 理由见 §5 与调研纪要，均指向与 ADR-0001 已决或 spec Out of Scope 冲突 |
| 未做 | 未新增 corpus 用例 | 有意 | 护栏 1 由既有 F2/F8 覆盖；避免与票 27/29 并行改 manifest |

## 9. 本票给下游的交接

- **票 29（A-003）**：`realSiteForms[].no-aria-custom-dropdown.baseline.observed` 需同步（当前登记 34，27+28 上实测 14）。
- **票 27（A-001）**：`realSiteForms[].weak-signal-input.baseline.observed` 仍为 30/none，实测已 38/lowkey，且 5 例 `knownResidual=false` 与 `verdict='MISS'` 冲突，需一并更新。
- **票 33（A-007）**：版本 bump 前需 27/28/29 三门全绿；本票贡献 recall 0.8696 → 0.9130（叠加票 27 后语料 48 例口径下 CI 实测 precision 1.0000 / recall 1.0000）。
- **票 34（A-008/A-009）**：本票新增 `verify-28.yml`（免 npm 安装面，同 verify-31 口径），供后续三合一归并时一并纳入。
