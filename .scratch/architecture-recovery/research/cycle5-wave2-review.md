# Cycle-5 第 2 波首脑复核报告（W2：票 38 / 39）

> 复核人：大脑 Agent | 2026-09-14 | 方法：**不信报告自述，逐条回仓库实物验证**

## §1 分支落位（but status + ls-remote 实物）

| 分支 | 提交 | 远端 | 结论 |
|------|------|------|------|
| cch/38-distribution-last-mile | zus(fix)+nwn(docs) | **不在远端** | ⚠️ 未推送 → 无 CI 证据 |
| cch/39-real-site-enablement | ptu(fix)+zzx(docs) | ✅ e82ab743 | ✅ 已推送，8 run 全 success |

## §2 声明 → 证据 → 结论 对照表

### 票 38 分发最后一公里（A-011）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| commit 5fd6ef3d | `git cat-file -t` = commit | ✅ 属实 |
| 版本一致性闸门脚本 | `tests/scripts/38-version-consistency.mjs` 存在（129 行） | ✅ 属实 |
| GF 对齐只读校验脚本 | `tests/scripts/38-gf-alignment-check.mjs` 存在（125 行） | ✅ 属实 |
| 两个新 workflow | `verify-38.yml`（PR+dispatch+push）/ `gf-alignment-check.yml`（dispatch+日 cron）均存在 | ✅ 属实 |
| 版本真源收敛到 package.json | rg：`vite.config.ts` 读 package.json | ✅ 属实 |
| README 改 releases/latest | rg：README.md / README_EN.md 均含 `releases/latest`；旧 `download/v1.4.0` **已消失** | ✅ 属实 |
| GF 同步手册 | `docs/greasyfork-sync-setup.md` 存在；`.gitignore` 含放行规则 | ✅ 属实 |
| **delta：零 CI→GF POST** | rg 实读：脚本无 `method: POST/PUT`，仅 GET；gf-alignment workflow `contents: read` | ✅ 属实（强） |
| 闸门本地 15/16 绿 + 反向会红 | 实跑：无 tag = **15 passed, 0 failed**；`--tag v9.9.9` = **exit 1**（反向对照成立） | ✅ 属实 |
| GF 对齐实测漂移 | 报告自述 DRIFT 1.3.4→1.5.0（advisory）；未独立重跑 | ⚠️ 未独立复现（不影响结论） |
| **CI run 证据** | **零 run ID**；`git ls-remote` = 不在远端 | ❌ **缺失（P-1）** |
| AC#1 GF 侧 Sync 开通 | 报告自述「待用户执行」，手册已交 | ⚠️ **未完成**（delta 合规的延后，非违规） |

### 票 39 真实站点层启用（A-016）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| commit bb0e8f1d | `git cat-file -t` = commit；远端 e82ab743 | ✅ 属实 |
| **启用 ≥1 个 live 目标** | site-manifest 实读：`live-codepen-pen-fullpage` enabled=**true**（frame=srcdoc）、`live-codepen-editor` enabled=**true**（frame=cdpn.io）——**启用数由 0 变 2** | ✅ 属实（核心） |
| CodePen 嵌套 preview 断言 | harness 实读含 `waitForChildFrame` 子帧求值 | ✅ 属实 |
| 冒烟只断言存在性 + 无未捕获异常 | harness 含 `pageerror` 断言 | ✅ 属实 |
| 有头启动 + xvfb 回退 | harness `headless:false` + `xvfb`/`DISPLAY` 回退；`.gitignore` 含 `live-out` | ✅ 属实 |
| 反检测对抗红线（不采 UA 伪造） | rg 实读：harness **无** `userAgent:`/stealth/webdriver 开关 | ✅ 属实（delta 强项） |
| 票级隔离门（PR 门控零外网） | `verify-ticket-39.mjs` 存在（~29 断言点）；`verify-39.yml` 含 `pull_request` | ✅ 属实 |
| 真实站点层仍 advisory | site-manifest `_meta` 与 workflow 触发面均未进 pull_request | ✅ 属实 |
| **CI run 证据** | gh 逐条：Real-site smoke **×2**（34837633569 / 34838605363）、E2E 34837619917、Engine Gates 34837619940、Typecheck 34837619936、Verify-39 34837619984、Lockfile 34837619916 —— **全部 success** | ✅ 属实（强） |
| 编辑器页被 Cloudflare 拦截（如实登记） | 报告 §3.2 自报挑战升级为中文面且 34s 未化解 | ✅ 如实披露（加分项） |

## §3 账本维度

| A-ID | 票 | 实现证据 | 判定 |
|------|----|---------|------|
| A-011 | 38 | 闸门 + 链接 + 同步手册 + 零 POST delta 均实物属实；GF 开通待用户；**无 CI 证据** | ⚠️ **部分完成 + 证据弱化** |
| A-016 | 39 | live 目标启用数 0→2（实物）；嵌套帧/异常/有头 harness 均实物；7 run success | ✅ **implemented** |

**缺失/弱化/跑偏单独列出**：A-011 = **部分完成**（GF 侧 Sync 未开通，待用户）+ **证据弱化**（无 CI）。

## §4 过程违规（单独呈报，未代为追认）

| # | 违规 | 实物证据 | 待裁定 |
|---|------|---------|--------|
| **P-1（重复）** | 票 38 分支**不在远端** → 零 CI 证据；新增两个 workflow 从未实跑 | `git ls-remote --heads origin cch/38-…` 空；报告 §7.2 自述未推送 | 是否授权 push |
| **P-8** | 票 38 **堆叠于 cch/cycle5-ticketing**（非独立栈） | but status 栈形；报告 §6.4 自报因 issue 文件依赖 | 是否接受 |
| **P-9** | 未提交记账文件增至 **4 个**（issues/36/39/42/43） | `git status --short` | 是否代为提交（上轮 P-4 未决） |
| **P-10** | 任务书报告路径 `reports/` 与仓库约定 `research/window-reports/` 不一致 | 两票报告均自报按约定落盘 | 已按约定处理（无需动作） |

**未发现**：提交信息缺前缀 / 编码损坏 / 越权改他人文件（本波无此三类）。

## §5 返工判定

**无源码层面问题需返工**：两票实现声明均经实物验证属实；票 38 闸门实跑 15/15 + 反向会红；票 39 核心指标（live 启用数 0→2）实物坐实且 7 run CI 全绿。
→ **不重发修复版启动器**。待处置项：票 38 的 CI 证据（需 push 授权）与 GF 开通（需用户执行）。

## §6 frontier 重算 + 下一波

| 票 | 覆盖 | 状态 | 阻塞 | 波次 |
|----|------|------|------|------|
| 38 | A-011 | ⚠️ 实现属实，CI 证据缺失 + GF 待开通 | 清（←36 ✅） | W2 |
| 39 | A-016 | ✅ 复核通过 | 清（←40 ✅） | W2 |

**W3 = 票 41（过程证据出仓与升塔纪律，A-018）可开工**：其 blockers（36,37,38,39,40,42,43,44）报告均已落盘。
**W4 = 票 45** 待 41。

⚠️ **重要提示**：票 41 的作用是**归档 .scratch 冻结证据**。而票 37/38/44 的 CI 证据尚未补齐（P-1）——**建议先补 push 取 CI，再执行 41 归档**，否则证据链会被归档动作掩盖。

## §7 下一波开工指引

- 票 **41** `prompts/41-process-evidence-archive.md`（←36,37,38,39,40,42,43,44 均已落盘）
- 前置建议：先裁定 P-1（push 授权）与 P-9（记账文件提交），再执行 41。
