# 窗口报告 — 票 32 真实站点抽样语料 + 覆盖回归

- 分支: `cch/32-real-site-corpus`（GitButler，版本控制遵循 WORKFLOW §4.2）
- 覆盖摩擦点: **A-006**（合成 fixture 测试盲区：CI 绿不代表真实世界 coverage）
- 阻塞关系: Blocked by: **None**（W1 波次）；本票是 27/28/29 的地基，33 被 27-32 阻塞，35 被 33 阻塞
- 完成定义: 遵循 `handoffs/32-real-site-corpus.md` 内完成定义
- 证据铁律: commit sha + CI run ID（只认 CI 证据）——见 §9

---

## 1. 本票 Delta 落实对照

| 检查点 / 专属验收项 | 落实 | 证据 |
|---|---|---|
| 三类真实形态入 corpus（弱信号 input / ISO2-value 括号下拉 / 无 ARIA 自定义下拉），各标注期望 tier 与信号归因 | ✅ `tests/corpus/manifest.json` 新增 `family="real-site"` 4 例 + `realSiteForms` 3 形态元数据段 | §4 |
| 先产出 27/28/29 的复现基线（当前实现漏检证据），报告单列小节 | ✅ §4（含三形态 score/tier/信号归因/三重缺口） | §4 |
| 挂接 CI 回归（precision/recall 基线扩展） | ✅ `calibration-baseline.yml` 新增票 32 探针步骤 + summary 段 | §5、§9 |
| 少量真实站点低频冒烟 + 可跳过白名单；密封 E2E 供给边界不破坏 | ✅ 新增 `tests/live/` 第二层 + `real-site-smoke.yml`（无 PR 触发面） | §6 |
| CDP `Autofill.trigger` 先评估适配度再采用，不硬套 | ✅ opt-in 评估工具 + 判定 NOT-ADOPTED | §7 |
| 语料改动不得悄悄引入回归：calibration-baseline 前后 precision/recall 对照 | ✅ 前后对照绿（§5） | §5 |
| 专属验收：calibration-baseline 前后 precision/recall 对照绿，CI-only 证据 | ✅ **CI 绿**：run `34682668714`（sha `081bea8b`）success，且前后对照打印在同一份 CI 输出内（§5、§9） | §5、§9 |

---

## 2. 变更清单

**新增**
- `tests/scripts/32-real-site-corpus.mjs` — 契约硬校验 + 候选集覆盖探针（含自证）+ 三形态复现基线硬锁
- `tests/live/site-manifest.json` — 真实站点层目标表 + 可跳过白名单（跳过条目强制 `reason` + `ticket`）
- `tests/live/live-smoke.mjs` — 低频冒烟驱动（Playwright，弱断言，本地镜像自证）
- `tests/live/cdp-autofill-fitness.mjs` — CDP Autofill 域适配度评估（opt-in，不进断言面）
- `tests/live/pages/mirror-three-forms.html` — 三形态 + 已知好对照组的本地镜像页（零外网）
- `.github/workflows/real-site-smoke.yml` — advisory 层（`schedule` 每周 + `workflow_dispatch`，**无 `pull_request`**）

**修改**
- `tests/corpus/manifest.json` — append-only：+4 例（`family="real-site"`）+ `realSiteForms` 段 + `_meta` 规则补登；**未删除/未重写任何既有条目**
- `tests/scripts/14-lib-engine.mjs` — **前置修复**（见 §3）：函数束装载器先剥 TS 类型标注
- `.github/workflows/calibration-baseline.yml` — node 20 → 22；新增票 32 探针步骤与 summary 段

**未动（红线）**：`playwright.config.ts`、`tests/server.mjs`、`tests/helpers/userscript.ts`、`tests/fixtures/`、`tests/manual/`、既有 `*.spec.ts`、`src/` 全部零改动（`git diff --quiet` 逐文件验证）；密封 E2E 语义与触发面不变。

---

## 3. 前置修复：calibration 测量地基自 cch-23 起已死（本票先修再测）

**现象（CI 证据）**：`Calibration Baseline` 在 `main` 上持续红，最近 5 次 run 全部 failure，失败原因为
`SyntaxError: Unexpected token ':'`（例：run `34618705653`，2026-09-11T15:52Z，11-12s 即失败）。

**根因定位**（逐 commit 函数束装载复现）：

| commit | 日期 | `new Function(toModuleBody(src/detect/index.ts))` |
|---|---|---|
| `317d6f5` refactor(cch-22) 死代码消除 | 2026-09-11 | PASS |
| `188f9c1` fix(cch-23) **strict 全量类型修复** | 2026-09-11 | **FAIL** ← 断点 |
| `39490e3` fix(cch-23) strict 残余收敛 | 2026-09-11 | FAIL |
| `6b00ed0` feat(cch-24) 安全加固返工 | 2026-09-11 | FAIL |

即：**票 23 的 types-only 重构给 `src/*.ts` 引入显式类型标注，而 `14-lib-engine.mjs` 的“函数束装载”直接把 TS 源喂给 `new Function`**——零构建零依赖的设计在 TS 标注出现后失效。后果直击本票使命：A-006 的全部叙事是「CI 绿代表真实世界 coverage」，而**度量 coverage 的那把尺子本身已经死了**，`precision/recall` 数字自 cch-23 起不再产生。

**修法（最小、标准库优先、零新依赖）**：`tests/scripts/14-lib-engine.mjs` 的 `bundleEngine` 改用 Node 标准库
`module.stripTypeScriptTypes(src, { mode: 'strip' })` 剥类型后再 `new Function`；`calibration-baseline.yml` 的 `node-version`
20 → 22（该 API 需 Node ≥ 22.13）。

**修复增益（一处修复，四处受益）**：`14-lib-engine.mjs` 是共享装载器，`14-calibration-harness.mjs`、
`14-threshold-calibration.mjs`、`verify-ticket-13.mjs`、`verify-ticket-18.mjs` 均经由它装载引擎。
修复后本地实测：harness 出数、threshold calibration 出数（建议 `keep-current`，`SCORE_AUTO=70 / SCORE_LOWKEY=35` 现值可行）。

> 未做（超出本票范围，已登记）：`misdetect-repro-v2.mjs` / `verify-ticket-02/09/13/15.mjs` 各自私有一份同构的
> `toModuleBody`，同样会把 TS 源喂给 `new Function`；本票只修共享装载器，未改上述私有副本（避免与票 34 门禁减肥的
> 引擎门合并产生冲突）。

**发现（供收口/后续票）**：`main` 上 7 个 workflow 全红（`verify-13/15/16/18`、`calibration-baseline`、`typecheck`、`e2e`）。
其中只有 `calibration-baseline` 的根因是上述 TS 装载链；其余 6 个不是同一错误文本（需各归属票自证）。另：`npm install` /
`npm ci` 在 react@18 与 `react-dom19` 别名双 peer 冲突下**均直接 ERESOLVE 失败**（ADR-0006 「后果 2」登记项），
`e2e.yml` 用的是裸 `npm install`——这很可能是 `e2e` 在 `main` 上红的原因之一，但属 ADR-0006 已登记债务，本票不动。

**第二个安装层债务（同样已登记）**：已提交的 `package-lock.json` 与 `package.json` **失同步**——lockfile 根 `devDependencies` 仍记 `typescript: latest / vite: latest`，而 package.json 已被票 25 钉为 `^5.7` / `^6.0`。
CI 实证：`typecheck` 的 install 步直接 `EUSAGE`：`Invalid: lock file's typescript@7.0.2 does not satisfy typescript@5.9.3`、`vite@8.2.2 does not satisfy vite@6.4.3`、`Missing: esbuild@0.25.12 from lock file`——即 ADR-0006 「后果 3」「lockfile 重生成待 CI 实证（票 25 AC4 pending）」。
**本票未动依赖与 lockfile**（不属本票授权范围，且属票 25 AC4）；但已把该事实写入 `real-site-smoke.yml` 的安装步注释与回退逻辑。

**两个红都是安装阶段，不是测试/类型阶段**（关键归因证据）：本分支 `E2E` run `34682653098` 的 step 展开为 `Install dependencies` = failure，而 `Install Playwright browsers` / `Build userscript` / `Run E2E` 全部 **skipped** —— 没有任何一个 E2E 用例被执行；`typecheck` 同理，`npm ci` 未通过。因此这两个红与本票变更无关。
（另：两分支 run 的 `Line-ending guard` 均为 **success**，证明 CI checkout 后的工作树文本无 CRLF —— 即被强制的不变量成立。）

---

## 4. 27/28/29 复现基线（本票核心产物）

`tests/scripts/32-real-site-corpus.mjs` 实测输出（零依赖，纯确定性）：

```
— 真实站点抽样语料（票 32 / A-006）：SCAN_SELECTORS 8 条 / 形态 3 类
覆盖探针自证: PASS（21 断言）
[MISS     ] weak-signal-input            covered=true  expectTier=lowkey got=none  score=30 fix=27 (A-001)
[MISS     ] iso2-value-paren-dial-select covered=true  expectTier=lowkey got=none  score=14 fix=28 (A-002)
[UNCOVERED] no-aria-custom-dropdown      covered=false expectTier=none   got=none  score=14 fix=29 (A-003)
契约 + 覆盖 + 复现基线硬门禁: PASS
```

### 4.1 形态一：弱信号 input（A-001 → 票 27）

- corpus 用例：`rs-weak-input-name`（`<input name="countryCode" type="text">`）、`rs-weak-input-placeholder`（`placeholder="Country code"`）
- 期望 tier: `lowkey`；实测: `none`，`score=30`
- 信号归因：`L1:kw:strong` +30（`L1_STRONG_KW_SCORE`）为唯一信号；无 L2 锚分（无 `input[type=tel]` 同 form 锚）、无 L3 内容证据（input 无选项值域）
- **缺口**：`30 < SCORE_LOWKEY(35)` → 落 `none`，仅手动召唤。两个真实站点标准命名均复现

### 4.2 形态二：ISO2 作 value + 选项文本括号区号（A-002 → 票 28）

- corpus 用例：`rs-iso2-paren-select`（`<option value="us">United States (+1)</option>`）
- 期望 tier: `lowkey`；实测: `none`，`score=14`
- 信号归因：`L1:kw:country` +14；`L3:opts:(+NN)-text` **期望 +24（3 项 × 8）但被丢弃**；`L3:opts:plus-dial=0`（值域是 ISO2，非区号）
- **缺口（精确到代码）**：`src/detect/index.ts` 中 `parenDial` 计分嵌套在 `if (st.plusDial > 0)` 内 → ISO2-value 形态下 `plusDial=0`，`parenDial` 证据永远入不了账。另：选项文本含括号/加号/数字，不满足 ISO2↔国名互证的字符集 `/^[A-Za-z\s.'-]+$/` → `isoName=0`，因此也不会被国家选择器抑制
- 修后预测（供票 28 对照）：`14 + min(3×8, 45) = 38 ≥ 35` → `lowkey`

### 4.3 形态三：无 ARIA 手写自定义下拉（A-003 → 票 29）

- corpus 用例：`rs-noaria-custom-dropdown`（`div.select-country[tabindex=0]` + `ul>li`，选项文本含 `(+NN)`）
- 期望 tier: `none`（ADR-0005 伪 select 档位上限 = 登记 + 手动召唤，**不自动注入**）；实测 `none`、`score=14` —— 即 `expect=none` 本身不构成偏差，**真正的缺口在候选集/登记面**
- **三重缺口**（已登记进 `realSiteForms[].baseline.gaps`）：
  1. **candidate-set**：`SCAN_SELECTORS` 8 条子选择器**零命中**（`select` / `.iti input` / `.intl-tel-input input` / 4 条 `input[...]` / `[role="combobox"]`）→ 扫描阶段完全不可见
  2. **kind-dispatch**：`_process` 的 kind 分发无 div/自定义触发器分支 → `kind=null` 直接 `return`，`UI.rememberLow` 登记路径不可达
  3. **register-threshold**：即便进入评分，`14 < ITI_LOW_REGISTER_SCORE(25)`，仍不进召唤面
- 结论：票 29 需同时解决「进候选集」+「进登记面」，不是单一选择器扩展

### 4.4 复现基线的“锁”语义

三形态的 `baseline.observed` / `baseline.matchedSelectors` / `coveredByCandidateSetBaseline` 写在 manifest 里，
由 `32-real-site-corpus.mjs` **硬校验**（漂移即 exit 1）。**27/28/29 落地后必须显式更新 manifest**（翻转 `knownResidual`、
更新 `baseline` 与覆盖基线），禁止静默漂移；脚本失败信息里带明确修复指引。

**门禁非空转（反向测试，已执行）**：篡改 `baseline.observed.score`（30→31）与 `coveredByCandidateSetBaseline`（false→true）后，
脚本 exit 1 并逐条报出 `引擎基线漂移` / `候选集覆盖漂移`；恢复后 manifest sha256 与篡改前一致（`8a6f6c06f7fb`，字节级校验）。

---

## 5. calibration-baseline 前后 precision/recall 对照

同一引擎、同一 harness，仅切分语料集（`family="real-site"` 入/不入）：

| 集合 | cases | TP | FP | TN | FN | precision | recall | f1 | 回归门禁 |
|---|---|---|---|---|---|---|---|---|---|
| 前（无 real-site） | 41 | 20 | 0 | 21 | 0 | 1.0000 | 1.0000 | 1.0000 | PASS |
| 后（含 real-site） | 45 | 20 | 0 | 22 | 3 | **1.0000** | **0.8696** | 0.9302 | **PASS** |
| Δ | +4 | 0 | 0 | +1 | +3 | 0.0000 | **-0.1304** | -0.0698 | — |

**CI-only 证据（run `34682668714`，sha `081bea8b`，Calibration Baseline success）**——对照数字直接打印在 CI 输出里，不依赖本地：

```
precision=1.0000 (TP=20, FP=0)                     ← 票 14 harness（含新增语料）
— calibration 前后对照（同引擎，仅切分 real-site 语料）
  前 cases=41 precision=1.0000 recall=1.0000 f1=1.0000 gate=pass
  后 cases=45 precision=1.0000 recall=0.8696 f1=0.9302 gate=pass
  Δ  precision=0.0000 recall=-0.1304（FN 从 0 升到 3，FP 不变 0）
契约 + 覆盖 + 复现基线硬门禁: PASS
precision=1 recall=0.8695652173913043 f1=0.9302325581395349 gate=pass   ← workflow 断言步
```

读法（这是本票要的“不漏不误”证据）：
- **precision 不回退**（1.0000，FP=0）：新增语料没带来任何新误报，三形态都是真阳漏检而非假阳
- **recall 如实下降 0.1304**（FN=3）：三个真实形态被量化地暴露为漏检——这就是 27/28/29 的靶子
- **门禁保持 PASS**：三例以 `knownResidual=true` 登记（计入 precision/recall 分母、不拦 CI），符合 manifest `appendOnlyRule`
- threshold calibration 同步出数：现值 `SCORE_AUTO=70 / SCORE_LOWKEY=35` 可行，建议 `keep-current`（**未改阈值**，A-001 的修法留给票 27）

---

## 6. 冒烟分层红线落实

| 层 | 载体 | 触发面 | 外网 | 断言强度 | 失败后果 |
|---|---|---|---|---|---|
| 第一层 密封 E2E | `e2e.yml` + `tests/fixtures` + `tests/server.mjs` | PR / push(cch/**) | 零 | 强（终态 + 事件序列） | **阻断** |
| 第一层 确定性模式库 | `tests/corpus` + `14-calibration-harness.mjs` + `32-real-site-corpus.mjs` | PR | 零 | 强（precision/recall + 契约 + 基线锁） | **阻断** |
| 第二层 真实站点低频冒烟 | `tests/live/` + `real-site-smoke.yml` | **仅** `schedule`(周) + `workflow_dispatch` | 可选 | **弱**（`.cch-wrapper` / 注入后值） | **advisory** |

- **密封 E2E 语义不动**：`playwright.config.ts`、`tests/server.mjs`、既有 spec/fixture 全部零改动（`git diff --quiet` 逐文件验证）；本地全量 `npx playwright test` **59 passed**
- **不触外网的实现方式**：真实站点层不复用 `tests/server.mjs`，自带零依赖静态服务器只服务 `tests/live/pages/`；外部目标默认 `enabled:false`
- **可跳过白名单（可审计）**：`site-manifest.json` 跳过条目强制 `reason` + `ticket`（Bitwarden `testPages.skipTests` / Chromium `failing_test_names` 同构），脚本硬校验
- **advisory 不阻断 PR 的实现方式 = 触发面设计**：本层永不出现在 `pull_request` 触发面（YAML 已解析验证：triggers = `workflow_dispatch` + `schedule`），因此失败天然无法阻断任何 PR；同时 `continue-on-error` + `::warning::` 注解 + summary + artifact 保证告警可见

**本层实测（本地）**：

```
— 真实站点低频冒烟（票 32 / A-006）：选中 6 / 可跑 4 / 跳过 2
[pass    ] mirror-control           expect=injected .cch-wrapper 已挂上目标字段
[observed] mirror-weak-input        expect=observe  wrapped=false
[observed] mirror-iso2-paren        expect=observe  wrapped=false
[observed] mirror-noaria-dropdown   expect=observe  wrapped=false
[SKIPPED ] live-github-signup       ticket=32   ...
[SKIPPED ] live-twilio-signup       ticket=32   ...
白名单契约 + harness 自证: PASS
```

即：`mirror-control`（已知好对照组）在真实浏览器里注入成功 → **本层 harness 端到端自证通过**；三形态在真实浏览器里同样 `wrapped=false`，与 corpus 复现基线一致。

---

## 7. CDP `Autofill.trigger` 适配度评估（先评估后决定，不硬套）

### 7.1 调研结论（atomcode 串行单跑，三引擎交叉；原始调研已落 ctx 知识库）

CDP Autofill 域是**浏览器原生 AutofillManager 的驱动/观测接口，不是通用 DOM 填充 API**：
- `Autofill.trigger` 规范原文要求表单先被原生引擎识别（“cannot be autofilled, returns an error”）；`addressFormFilled` 由 `AutofillHandler::OnAutofillProfileOrCreditCardFormFilled` 发出，回调挂在 **AutofillManager 的 observer** 上（出生 CL `chromium 0b21800`）
- `FilledField.fillingStrategy` 只有 `autocompleteAttribute | autofillInferred` 两值，描述的是**浏览器自己**的分类 provenance
- userscript 走原生 value setter + `input→change→blur` 合成事件，**不经过 AutofillManager** → `addressFormFilled` 不会为脚本注入触发，`FilledField` 里也不会出现该字段
- 旁证：CSS `:autofill` 伪类永不命中脚本注入（web.dev 状态机把脚本注入归为“手动填写”）；Chrome 147 OT 的 `autofill` DOM 事件同样只由 UA 触发

### 7.2 本地实测（`tests/live/cdp-autofill-fitness.mjs`，opt-in）

| 信号 / 通道 | 触发条件 | 脚本注入是否可见 | 可否用作脚本填充断言 |
|---|---|---|---|
| CDP `addressFormFilled` | 原生 AutofillManager 填充地址表单 | ❌ 不触发 | ❌ |
| CDP `FilledField.autofillType/fillingStrategy` | 原生填充时由原生分类管线产出 | ❌ 不产出 | ❌ |
| CDP `Autofill.enable/setAddresses/trigger` | — | — | ❌（Playwright 随附 Chrome for Testing 151 headless 下三个方法均 `wasn't found`，域不可达） |
| CSS `:autofill` | UA 自动填充 | ❌ 永不命中 | ❌ |
| DOM `autofill` 事件（Chrome 147 OT） | UA 即将 autofill | ❌ 不触发 | ❌ |
| 合成 `input→change→blur` + 注入后 DOM 值断言 | 脚本写入 | ✅ | ✅ **唯一可靠通道（本仓库现口径，保留）** |

实测输出：`Autofill.enable` / `setAddresses` / `trigger` 均为 `unavailable`（协议方法不存在）；阶段 B（userscript 同构注入 `#m-iso2`，值真实写入 `cn`）新增 `addressFormFilled` 事件数 = **0**。

### 7.3 判定

**NOT-ADOPTED（不采用为脚本填充断言面）** —— 两条独立证据（规范/源码语义 + 本地实测不可达）同向收敛。
本轮**不硬套**：不把 CDP Autofill 接进任何断言；保留为可选的「原生分类 oracle」候选（fixture 侧逼出 Chrome 原生字段分类做检测基准），
**本轮不接线**，仅落 opt-in 评估工具供后续按需取用。

---

## 8. 偏离点 / 未做项（呈报）

| # | 项 | 说明 |
|---|---|---|
| D1 | 外部真实站点**本轮未启用**（`enabled:false`） | 两例候选（公开注册页）已登记 `reason` + `ticket`，但未人工核对页面仍存在目标形态。**不把未校准的断言写进仓库**；启用流程写进 `site-manifest.json` 的 `enablementRunbook`（人工核对 → 填 selector → 置 `enabled:true` → 先手动单跑）。本层 harness 已用本地镜像端到端自证 |
| D2 | 候选集覆盖探针为**受限 CSS 匹配器**（非通用引擎） | 只覆盖 `SCAN_SELECTORS` 实际用到的语法（tag / `.class` / `[attr]` / `:not([attr])` / 后代组合），已用 21 条断言自证（含已知命中/不命中样本 + 提取器断言），且选择器真源从 `src/detect/index.ts` 正则提取（无硬编码副本）。未支持语法会退化为只比 tag —— 由自证兜住 |
| D3 | `--legacy-peer-deps` 出现在新 workflow | react@18 与 `react-dom19` 别名双 peer 冲突使裸 `npm ci` / `npm install` **均 ERESOLVE 失败**（ADR-0006 「后果 2」登记债务）。新 workflow 用 `npm ci --legacy-peer-deps` 并锚定原因注释，**与 typecheck.yml 同口径**；根因修复（双 react 依赖或 lockfile 实证）后本行可移除 |
| D4 | 未修 `misdetect-repro-v2.mjs` / `verify-ticket-02/09/13/15.mjs` 的私有 `toModuleBody` 副本 | 同构缺陷但属其他票的门禁范围（票 34 门禁减肥），避免并发冲突；已在 §3 登记 |
| D5 | `:autofill` / DOM `autofill` 事件未做运行时探针 | 只做了一手规范与文档取证；两者对脚本注入均为「不可见」是确定性结论，运行时探针收益低 |
| D8 | 仓库 blob 级行尾为 CRLF（**预存、跨周期**，本票未改） | 实测基线提交 `7dbc6fc` 的 blob 本身就含 CRLF：`manifest.json` 243 行、`tests/server.mjs` 153 行、`e2e.yml` 42 行（`git cat-file blob` 直读，绕过 filter）。`.gitattributes` 为 `* text=auto eol=lf` + `core.autocrlf=false`，因此 **CI checkout 会转成 LF**，Line-ending guard 才得以通过。blob 级 CRLF 归一化已被 `spec.md` 明确列为 **Out of Scope（「.gitattributes CRLF 规范化——跨周期遗留」）**，本票不动，也未把 CRLF 当作新增问题 |
| D7 | `real-site-smoke.yml` **本轮无法取得 CI run ID** | `workflow_dispatch` 要求 workflow 已存在于**默认分支**；本 workflow 首次入仓于特性分支，GitHub API 直接返回 `404 not found on the default branch`。因此本层需**合入 main 后**才能首次 dispatch（schedule 同样要等合入后生效）。替代验证：YAML 已本地解析通过（PyYAML，11 step），`live-smoke.mjs` 已本地端到端跑通（本地镜像 + 真实 Chromium，白名单契约与 harness 自证 PASS） |
| D6 | `knownResidual` 在 harness 里的汇总文案仍写「计入 FP」 | 正向 residual 实际计入 FN（`recall` 分母）；文案是票 14 既有文本，本票未改（改动属票 14/34 范围），报告在此显式澄清 |

---

## 9. 证据锚（commit sha + CI run ID）

> 只认 CI 证据；下表 sha 为远端 sha（`git log` 可复核），run ID 可在 `gh run view <id>` 复核。

| 项 | 值 | 结果 |
|---|---|---|
| 提交 1（语料 + 冒烟层 + CDP 评估 + 前置修复） | `4f7102f8d37fed362b62fd412ba884ff71d3ed24` | — |
| 提交 2（前后对照入 CI + 安装回退） | `081bea8ba1a58d1955c9161ecf37998820c0ea92` | — |
| 提交 3（报告 + 证据锚） | `3e3b2ac`（`but status` / `git log` 可查） | — |
| 提交 4（报告措辞校正：blob 行尾事实 + 偏离点 D8） | 本提交 | 文档 only，不影响上面两次 Calibration run 的证据效力 |
| **Calibration Baseline** run（sha `4f7102f8`） | `34682530402` | ✅ **success**（12 step 全绿，cch-23 以来首次转绿） |
| **Calibration Baseline** run（sha `081bea8b`） | `34682668714` | ✅ **success**（前后对照已入 CI 输出，见 §5） |
| E2E run（sha `081bea8b`） | `34682653098` | ❌ failure（**安装阶段** ERESOLVE；后续 3 步全 skipped，无用例执行 —— 预存债务） |
| Typecheck run（sha `081bea8b`） | `34682653351` | ❌ failure（**安装阶段** lockfile 失同步 EUSAGE —— 预存债务） |
| Real-site smoke run | 不可在本分支触发（见 §8 D7） | ⏳ 合入 main 后首次 dispatch |
| 本地密封 E2E 回归 | `npx playwright test` | ✅ **59 passed**（密封 E2E 语义未破） |
| 本地 calibration 三脚本 | `14-calibration-harness` / `14-threshold-calibration` / `32-real-site-corpus` | ✅ 均出数；threshold 建议 `keep-current` |

---

## 10. 本票给下游的交接

- **票 27（A-001）**：靶子 = `rs-weak-input-name` / `rs-weak-input-placeholder`（`score=30`，需跨 35）；约束 `SCORE_AUTO` 不动、既有 precision/recall 不回退
- **票 28（A-002）**：靶子 = `rs-iso2-paren-select`（`score=14`）；改法 = `parenDial` 移出 `if (st.plusDial > 0)` 门独立成 L3 证据；修后预测 38 → `lowkey`
- **票 29（A-003）**：靶子 = `rs-noaria-custom-dropdown` 的**三重缺口**（候选集零命中 / `kind=null` / 登记分 14 < 25）；档位仍守 ADR-0005（登记不注入，`expect` 保持 `none`）
- **三票共同**：落地后**必须**同步更新 `manifest.realSiteForms[].baseline`（`observed` / `matchedSelectors` / `coveredByCandidateSetBaseline`）与用例 `knownResidual`/`expect`，否则 `Calibration Baseline` 会以精确的漂移信息红掉——这是设计意图，不是噪声
