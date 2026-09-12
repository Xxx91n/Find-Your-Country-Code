# 29 — 扫描候选集扩展

**What to build:** 扩展扫描候选集，覆盖无 ARIA 的纯自定义下拉（div 触发器 + ul 选项面板，无 role=combobox）与可编辑 contenteditable 区号面，使这些真实站点形态不再完全不可见。

**覆盖 A-xxx:** A-003

**Blocked by:** 32 — 需 32 先落该形态的真实站点语料正例，作为复现基线。

**Status:** done（5/5 验收销项；第 5 项 E2E 改由本票自有 workflow 取得 CI 证据，见文末 D-29c/D-29h）

**闭环分支:** `cch/29-scan-candidates-expansion`（堆叠于 `cch/28-iso2-dial-evidence`）

**闭环报告:** `.scratch/architecture-recovery/research/window-reports/29-scan-candidates-expansion-report.md`

- [x] 在 corpus 新增无 ARIA 自定义下拉（div+ul，无 role=combobox）正例；记录当前实现不可见的复现基线 —— 正例 `rs-noaria-custom-dropdown` 由票 32 落地（append-only）；本票按门禁要求显式翻转复现基线：`matchedSelectors` [] → `div[tabindex="0"]`、`observed` 14/none → **34/none**、`verdict` UNCOVERED → **COVERED**、`coveredByCandidateSetBaseline` false → **true**，gaps 改写为 closed×3 + residual×2；证据 sha `3e204ca`
- [x] 扩展 SCAN_SELECTORS（或新增探测路径）使该形态可被检测/登记 —— 新增形态描述符 `div[tabindex="0"],span[tabindex="0"]`（只收可聚焦非表单容器，禁裸 `ul li` 与全 div 扫描）+ `customDropdownStats` 结构探测（后代 `[role=option]` 优先、缺失回退 `li`；内容验证复用 L3 口径且**只作门槛不作加分**，防 `L3_ISO_BONUS=30` 击穿低调线）；结构分复用 `ARIA_COMBO_STRUCT_SCORE`(20) 不新造权重；`OBSERVED_ATTRS` 与 `_fingerprint` 同步 `tabindex`；fill 侧补无 `aria-controls` 的 li 回退使召唤后填充可达；证据 sha `3e204ca`，CI run `34693186397`（verify-29 27/27 绿）
- [x] 伪 select 档位仍遵守 ADR-0005（登记不注入）—— 结构命中置 `pseudo=true` → `kind=pseudo`，`_process` cap 强制 `none` + `gate:adr-0005-register-only` 留痕；E2E 验收1 断言不自动注入、验收3 断言负例不登记；本地全量 80 passed
- [x] 性能不回退：1000 节点 scan < 350ms（性能探针实测）—— `__cchPerfHook` 实测 `scans=1 maxMs=73 avgMs=73.00 samples=[73]`（含 50 个可聚焦 div 容器），< `RESCAN_DEBOUNCE_MS` 350ms；E2E 验收4 固化为断言
- [x] E2E 全量绿；证据锚 commit sha + CI run ID —— 本地全量 80 passed（含本票 4 条）；**CI 取证已补齐**：共享 `E2E` workflow 在本票基线仍是裸 `npm install`（ERESOLVE 预存红，run `34693447646`/`34695833031` 均 13s 即红），修复分属 cch/34 内联 `--legacy-peer-deps` 与 cch/31 `.npmrc`，两条均未合流。按票 27 D-27a 先例**不改动共享 workflow**，改在本票自有 `verify-29.yml` 内复刻 E2E 步骤取证：run **34695833032**（sha `3d21a12`）作业 `Ticket-29 E2E` **70 passed（26.4s）**，作业 `Ticket-29 gate` 27/27；同作业输出性能探针 `[cch-29 perf] scans=1 maxMs=14 avgMs=14.00`（1000 节点含 50 可聚焦容器），远低于 350ms 红线。共享 `E2E` workflow 的红为跨分支安装面共因（D-29c），本票已绕开取得等价证据（D-29h）