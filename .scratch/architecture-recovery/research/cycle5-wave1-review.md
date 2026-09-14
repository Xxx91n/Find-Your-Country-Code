# Cycle-5 第 1 波首脑复核报告（W1：票 36/37/40/42/43/44）

> 复核人：大脑 Agent | 2026-09-14 | 方法：**不信报告自述，逐条回仓库实物验证**（测试门实跑 / 代码 rg 抽查 / but status 分支落位 / gh run 实物查询）

## §1 复核方法（可复现）

- **测试门**：`node tests/scripts/verify-ticket-NN.mjs` 逐个实跑取 exit code + 通过数；`npx playwright test` 全量实跑。
- **代码抽查**：对报告声明的每个文件/行为用正则实读源码，不接受文字描述。
- **分支落位**：`but status` 实物输出。
- **CI 证据**：`gh run view <id>` 逐条查 conclusion + headBranch，只认 success 且分支匹配。

## §2 分支落位（but status 实物）

| 分支 | 提交数 | 提交 sha（git log 实物） | 结论 |
|------|--------|--------------------------|------|
| cch/36-gate-integrity-repair | 2 | 156362032686…（fix）+ docs | ✅ 落位 |
| cch/43-dependency-peer-rootfix | 2 | 898340d6（fix）+ b813ddbf（docs） | ✅ 落位 |
| cch/37-entry-point-accessibility | 2 | 13ec60ff（feat）+ 84b8ed7f（docs） | ✅ 落位 |
| cch/42-locale-switch | 4 | 86df9b14 → fec312a0（R1）→ … | ✅ 落位 |
| cch/40-frame-governance-degradation | 2 | c70845c0（fix）+ docs | ✅ 落位 |
| cch/44-detection-semantics-adjudication | 2 | 894e6efb + qyt | ✅ 落位 |

**并行性实物**：6 支均存在于工作区；但存在两处堆叠（见 §5 P-5）：36 栈于 43 之上、37 栈于 42 之上。

## §3 声明 → 证据 → 结论 对照表

### 票 36 门禁完整性返修（A-014 / A-015 / A-020）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| 四门裸 new Function 改 stripTypeScriptTypes | rg 实读：verify-ticket-09/13/15/18.mjs 均含 `stripTypeScriptTypes` | ✅ 属实 |
| 四门本地 exit 0 且断言数不下降 | 实跑：09=36/36、13=28 PASS、15=28/28、18=35 PASS，exit 均 0 | ✅ 属实 |
| verify-13/15/18.yml node 20→22 | rg 实读：三门均 `node-version: 22` | ✅ 属实 |
| verify-13 语料断言动态化 | rg：`m.cases >= 41` 存在、`=== 41` 已消失（13/18 同） | ✅ 属实 |
| 票级私有 E2E 作业并回统一 e2e.yml | workflow jobs 实读：13=acceptance-gate、15=engine-gate、18=acceptance-gate、27/29/30 均无 e2e 作业；**verify-16.yml 已整文件删除** | ✅ 属实 |
| 10/10 门 CI success run | gh 逐条：12 个 run ID 全部 `success` 且 headBranch=`cch/36-gate-integrity-repair` | ✅ 属实（强） |
| A-020 由 cch/43 承载 | .npmrc 已删、lockfile 根 version=1.5.0、workflow legacy-peer-deps 零命中 | ⚠️ 属实但**跨票承载**（见 §4 A-020） |

### 票 37 入口可达性（A-012 / A-013）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| GM 菜单「打开面板」直达 UI.open(null,null,null) | rg：`main.ts` 含 `GM_registerMenuCommand(t('openPanel')` | ✅ 属实 |
| lowkey 图标移入盒内防 overflow 裁剪 | rg：`.cch-btn-lowkey{top:50%;right:6px}`（行 86）覆盖；基础 `.cch-btn` 的 top:-12px 仍存（auto 档，设计内） | ✅ 属实 |
| 空目标 needTarget 守卫 | rg：`needTarget` 存在于 ui/index.ts | ✅ 属实 |
| 密封断言 + 票级门 | 实物：entry-access.spec.ts / verify-ticket-37.mjs(20) / verify-37.yml / 两个 fixture 均存在；实跑 verify-37=**20 PASS** | ✅ 属实 |
| 94/94 e2e + typecheck 0 错 | 实跑全量 E2E=**94 passed**（含本票 5 例）；iframe.e2e.spec.ts 7/7 | ✅ 属实 |
| **CI run 证据** | **无**——报告自述「未推送」，全文零 run ID | ❌ **缺失（见 §5 P-1）** |

### 票 40 帧治理降级反馈（A-017）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| isEmbeddedFrame 双相递归（浏览上下文树 + shadowRoot） | rg：`main.ts` 含 `shadowRoot` 遍历 | ✅ 属实 |
| 校验失败降级 toast（不再静默） | rg：`main.ts` 拒绝分支含 `toast` | ✅ 属实 |
| 3 个新 fixture + 嵌套 E2E spec | 实物：iframe-mid.html / iframe-mid-x.html / iframe-nested.html / iframe-nested.e2e.spec.ts 均存在 | ✅ 属实 |
| commit c70845c0 + 4 门 CI 绿 | git cat-file=commit；gh 逐条：34826506374/34826506446/34826506381/34826506332 全 `success` 且分支匹配 | ✅ 属实 |

### 票 42 语言切换收口（A-019）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| i18n 去 LANG 死导出改可切换 | rg：`LOCALE_MODES` 存在；`export const LANG` **已消失** | ✅ 属实 |
| 面板语言选择 + UI_PREFS_KEY 持久化 | rg：ui/index.ts 含语言选择面 | ✅ 属实（main.ts 内无 UI_PREFS_KEY，持久化在 ui 层，非缺陷） |
| 票级门 42 断言 | 实跑 verify-ticket-42=**42 PASS, 0 FAIL** | ✅ 属实 |
| R1 返工（漏 await 归因） | git log 实物：tyr（test 修正）+ vlw（R1 收口）；报告已追加返工轮次 | ✅ 属实 |
| 5 门 CI 绿 + R1 后 5 门绿 | gh 逐条：抽验 7 个 run ID 全 `success` 且 headBranch=`cch/42-locale-switch` | ✅ 属实 |

### 票 43 依赖根修（A-021）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| workspaces 拆 React 19 到独立安装根 | rg：`package.json` 含 `workspaces`；`tests/vendor/react19/package.json` 存在 | ✅ 属实 |
| .npmrc 删除 + workflow flag 清零 | 实物：`.npmrc` 不存在；`grep -rl legacy-peer-deps .github/workflows/` = **0 文件** | ✅ 属实 |
| 裸 npm ci 可复现 | gh：34826911474 `success`（e2e 作业 Install dependencies 无 flag） | ✅ 属实 |
| server.mjs 供给路径切换 | rg：`REACT19_ROOT` 存在 | ✅ 属实 |
| 4 门 CI 绿 | gh 逐条：34826911474/34826911801/34826912150/34826911946 全 `success` | ✅ 属实 |
| **提交信息可读** | `git log --format=%s` 字节实读：`docs(cch-43): \u7a97\u53e3…` ——**字面量 \uXXXX 转义** | ❌ **缺陷（见 §5 P-2）** |

### 票 44 检测语义裁决与语料先行（A-022 / A-023）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| A-022 方案 C 裁决留档 ADR-0009 | 实物：`docs/adr/0009-evidence-quantity-tier-boundary.md` 存在（2360B，status accepted，含方案 C） | ✅ 属实 |
| CONTEXT.md 分级行动词条更新 | rg：CONTEXT.md 含「证据量/单调」语义 | ✅ 属实 |
| CI 锁定（verify-02 G10 负控） | rg：verify-ticket-02.mjs 含 `G10` 与 `ADR-0009`；实跑 02 = 36/36 + G10 5/5 | ✅ 属实 |
| A-023 语料 append 3 例 | 实物：corpus manifest 实读 `cases.length = 51`（48+3）；ledger A-022 置 done | ✅ 属实 |
| 零引擎改动 / 零档位变更 | verify-02 全绿 + calibration 未回退（report 自述；未独立重跑 calibration） | ⚠️ 部分（calibration 未独立复跑） |
| **CI run 证据** | **无**——报告自述未推送，全文零 run ID | ❌ **缺失（见 §5 P-1）** |

## §4 账本维度（逐 A-xxx 核对实现证据）

| A-ID | 票 | 实现证据 | 判定 |
|------|----|---------|------|
| A-014 | 36 | 4 脚本 stripTypes 实读 + 4 门实跑绿 + CI run 齐 | ✅ implemented |
| A-015 | 36 | workflow jobs 实读无 e2e 作业 + verify-16.yml 删除 + E2E run 34827616463 success | ✅ implemented |
| A-020 | 36 | 由 cch/43 承载（.npmrc 删/lockfile 1.5.0/flag 清零实物属实） | ⚠️ implemented 但**跨票承载**，验收依赖 cch/43 合流 |
| A-012 | 37 | 代码 + 断言 + 门全绿属实；**无 CI 证据** | ⚠️ **证据弱化**（实现可信，CI-only 未满足） |
| A-013 | 37 | 同上 | ⚠️ **证据弱化** |
| A-017 | 40 | 代码 + fixture + spec + 4 CI run 齐 | ✅ implemented |
| A-019 | 42 | 代码 + 门 42/42 + R1 返工 + 7 CI run 齐 | ✅ implemented |
| A-021 | 43 | workspaces + .npmrc 删 + flag 清零 + 4 CI run 齐 | ✅ implemented（提交信息缺陷另计） |
| A-022 | 44 | ADR-0009 + CONTEXT + G10 锁定 + 门绿；**无 CI 证据** | ⚠️ **证据弱化** |
| A-023 | 44 | corpus 51 例实物；**无 CI 证据** | ⚠️ **证据弱化** |

**缺失/弱化/跑偏单独列出**：A-012、A-013、A-022、A-023 = **证据弱化（无 CI 证据）**；A-020 = **跨票承载**（非跑偏，但验收链跨票）。

## §5 过程违规（单独呈报，不代为追认）

| # | 违规 | 实物证据 | 影响 | 待裁定 |
|---|------|---------|------|--------|
| **P-1** | 票 37/44 **未推送**，无任何 CI run；两票报告均自述「未推送」 | 两报告全文零 run ID；gh 无可查 run | 违反 CI-only 政策（证据只认 CI run/artifact）；A-012/013/022/023 证据链不闭合 | 是否授权 push 取 CI 证据 |
| **P-2** | cch/43 两提交信息为**字面量 \uXXXX 转义**，git log 不可读 | `git log -1 --format=%s` 字节实读：`\u7a97\u53e3…` | 历史可读性受损（A-010 精神） | 是否授权改写已推送提交信息 |
| **P-3** | cch/44 两提交**缺 `fix(cch-44):`/`docs(cch-44):` 前缀** | 提交信息实读为 `nzu 票 44：…` / `qyt 票 44 收口：…` | 违反 WORKFLOW §4.2 提交信息约定 | 同上（未推送则易改） |
| **P-4** | 3 个 issue 文件的验收勾选**未提交**，留在工作区 | `git status`：M issues/36、M issues/42、M issues/43 | 验收记录不在 git（易丢） | 是否代为提交 |
| **P-5** | 波内**堆叠**（违反「互不堆叠」）：36 栈于 43 上、37 栈于 42 上 | but status 实物栈形；两票报告已自报 D-37a 与栈序说明 | 合流顺序受限；并行度下降 | 是否接受（自报理由：真实文件依赖） |
| **P-6** | 票 37 报告以 **but 变更 ID `mno` 充当 commit**，未给 git sha | 报告原文「commit mno」；git cat-file mno=MISSING；真实 sha=`13ec60ff` | 证据锚点不可直接复现 | 建议修报告措辞（不改代码） |

## §6 frontier 重算 + 下一波

| 票 | 覆盖 | 状态 | 阻塞是否清 | 波次 |
|----|------|------|-----------|------|
| 36 | A-014/015/020 | ✅ 复核通过（A-020 跨票） | 清 | W1 |
| 37 | A-012/013 | ⚠️ 实现属实、**CI 证据缺失** | 清（待 push） | W1 |
| 40 | A-017 | ✅ 复核通过 | 清 | W1 |
| 42 | A-019 | ✅ 复核通过（含 R1） | 清 | W1 |
| 43 | A-021 | ✅ 复核通过（提交信息缺陷另计） | 清 | W1 |
| 44 | A-022/023 | ⚠️ 实现属实、**CI 证据缺失** | 清（待 push） | W1 |

**frontier（重算）**：W1 六票**实现层全部通过**（无源码返工），但 37/44 的 CI 证据链待补。
→ **W2 可开工：票 38（←36 ✅）、票 39（←40 ✅）**。W3（41）待 W2 完成；W4（45）待 41。

## §7 返工判定

**无源码层面问题需返工**：6 票的实现声明均经实物验证属实，12 个门 + 全量 E2E 94/94 全绿，未发现功能缺陷。
因此**不重发修复版启动器**；需处置的是证据/过程项（P-1…P-6），均属授权或记账层面，非代码。

## §8 下一波开工指引

- **票 38** `prompts/38-distribution-last-mile.md`（←36 ✅）
- **票 39** `prompts/39-real-site-enablement.md`（←40 ✅）
两票可并行开窗。注意：38/39 各含需用户授权的动作（GF 侧设置/发版；真实站点目标启用）。
