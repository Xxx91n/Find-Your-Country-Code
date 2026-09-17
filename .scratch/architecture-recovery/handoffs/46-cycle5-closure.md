# Handoff 46 — Cycle-5 全周期归档（2026-09-14）

> 下会话用途：Cycle-6 开工 / 常规维护 / backlog 立票。本文只做索引，细节一律读引用路径。

## 1. 终态（一句话）

Cycle-5「送达 + 可见 + 可信」十票（36–45）全部实现并复核通过；**9 支已全部 land 进 origin/main（6 个栈）**，**release v1.6.0 已发布（Latest）**，远端已合并分支已全部清理（仅剩 main）；账本 A-011…A-025 = **15/15 implemented**。

## 2. 发版终态

- **版本**：`package.json` 1.5.0 → **1.6.0**；构建产物 `@version 1.6.0`（127,329 B）实证；版本一致性门 15/15。

- **GitHub Release**：**v1.6.0 = Latest**（2026-09-14T15:03:23Z），资产 `find-your-country-code.user.js`（124KB）已挂。

- **送达链已闭合**：`releases/latest/download/find-your-country-code.user.js` → **HTTP 200 @1.6.0**（实测）；**Greasyfork 线上已由 1.3.4 前进到 1.5.0**（用户手动开通 Sync from external URL 已生效，下个检查周期将达 1.6.0）。

- **双语更新日志**：`greasyfork/Glog.md`（中）+ `Glog_EN.md`（英）已前置 v1.6.0 节；Release body 自动拼接双语。

## 3. 合并与清理

- `but pull`：No new upstream commits。

- **land 6 个栈**（每支 --whole-stack）：

  1. `cch/36-cycle5-brain`（单支）
  2. `cch/45-repo-process-closeout` 栈（5 段：cycle5-ticketing → 38 → 44 → 41 → 45）
  3. `cch/36-gate-integrity-repair` 栈（36 + 43）
  4. `cch/37-entry-point-accessibility` 栈（42 + 37）
  5. `cch/39-real-site-enablement`（单支）
  6. `cch/40-frame-governance-degradation`（单支）
- **origin/main**：`7d5683b5` → 发布后前移；总提交 **201**（Cycle-5 占 36 支提交）；父链完整、零 squash。

- **分支清理**：9 支远端 `cch/*` **删除前先按 patch-id 验证**（`git cherry origin/main origin/cch/<b>` 全部 **unmerged=0**），确认内容均已入 main 后才删；删后 `fetch --prune`，远端仅剩 `main`。

- 回滚命令（如需）：各 land 输出已给出 `git push --force-with-lease origin <sha>:refs/heads/main`；发布前头为 `7d5683b5`。

## 4. 硬验收（审计 Agent 亲跑，非自述）

- **编译/打包**：`npm run build` → ✓ 10 modules，127.33 kB（gzip 37.61 kB）。

- **类型门**：`npm run typecheck` → exit 0。

- **启动测活**：`npx playwright test` → **95 passed**（真浏览器加载出厂产物）。

- **票级门/守卫脚本**：**18/18 全 exit 0**（02=36/36+G10 5/5、05=100/100、09=36/36、13=28、15=28、18=35、27=90、28=19、29=PASS、31=48、37=20、39=28、42=42、38-version=15/15、38-gf=OK、misdetect=25、calibration=PASS、32-corpus=PASS）。

- **CI（main）**：Auto Release success、Engine Gates success、Calibration success、Typecheck success、Lockfile success（E2E 本次会话内运行中）。

## 5. 账本结算

- `decision-ledger.md`：**A-011…A-025 = 15/15 implemented**（A-022…A-025 由 `done` 归一为 `implemented`；**A-024 标注「登记前提 stale」**——登记的 11 支 Cycle-4 支经逐名实测 11/11 已 ABSENT）。

- **决策摘要沉淀**：`docs/architecture-recovery-cycle5-decisions.md`（六节：送达/可见/可信/静默失败与卫生/新 ADR-0009/遗留）。

- **账本已归档**：同步至仓库外归档 `D:\Aworker\mozilla\choose-your-country-evidence-archive\.scratch\architecture-recovery\decision-ledger.md`（sha 一致）。

## 6. 权威文件索引

- 工作流：`.scratch/architecture-recovery/WORKFLOW.md`（**§4.5 升塔纪律** + **§8 证据边界** 为 Cycle-5 新增）
- 账本：`.scratch/architecture-recovery/decision-ledger.md`（已归档同步）
- Spec：`.scratch/architecture-recovery/spec.md`（Cycle-4 spec 归档 `spec-cycle4.md`）
- 票与报告：`issues/36-45-*.md` / `research/window-reports/36-45-*-report.md` / `handoffs/36-45-*.md` / `prompts/36-45-*.md`（含 `37-*-fix.md` 返工轮次）
- 复核报告：`research/cycle5-{reconciliation,audit,wave1,wave2,wave4}-review.md` / `research/launcher-selfcheck.md` / `research/cycle5-investigation.md` / `report/architecture-review-cycle5.html`
- 新 ADR：`docs/adr/0009-evidence-quantity-tier-boundary.md`
- 同步手册：`docs/greasyfork-sync-setup.md`
- 仓库外归档：`D:\Aworker\mozilla\choose-your-country-evidence-archive\`（199 文件 + `ARCHIVE-MANIFEST.json` 逐件 sha256）

## 7. Backlog（待用户决定是否立票）

| # | 项 | 来源 | 建议 |
|---|----|------|------|
| C5-1 | **D-1 残留：11 文件未归档**（`report/architecture-review-cycle5.html`、`research/cycle5-investigation.md`、`research/atomcode-43-*.md`、`research/scripts/39-*.mjs`×8） | 票41 D-1 | 已随 land 进入 main，可补一次归档快照更新 |
| C5-2 | **cch/43 两提交信息为字面量 \uXXXX 转义**（git log 不可读） | 复核 P-2 | 已 land 进 main；如需修需改写已推送历史（需授权） |
| C5-3 | **cch/44 两提交缺 `fix(cch-44):` 前缀** | 复核 P-3 | 同上 |
| C5-4 | **票 41/45 未推送时已 land**，无独立 CI run 证据（纯文档） | 复核 P-11/P-13 | land 后 main 上的 CI 已间接覆盖；可不再追 |
| C5-5 | **报告 37/38/44 内残留「未推送」陈文**与后置 CI 证据节自相矛盾 | 交叉核对 | 文档卫生票（一行级） |
| C5-6 | **README 状态表 41/45 行未标注 CI 证据缺失** | 交叉核对 | 同上 |
| C5-7 | **票 45 堆叠链深达 5 层**（45←41←44←38←cycle5-ticketing） | 复核 P-14 | 已 land，无需动作；下轮避免深栈 |
| C5-8 | 真实站点层仅 CodePen 两个 live 目标；编辑器页受 Cloudflare 托管挑战拦截 | 票39 | 后续可扩真实站点清单（按 enablementRunbook） |
| C5-9 | contenteditable 检测扩展未做（仅入语料） | 票44 A-023 | 有语料地基后可立检测票 |
| C5-10 | `verify-30.yml` 的 typecheck 作业仍为 typecheck.yml 私有复刻 | 票36 §7 | 门禁碎片收口候选 |

## 8. Suggested skills（下会话）

- `$but` — 全部版本控制（land=push main 一体语义）

- `$handoff` — 下轮收口复用

- `$atomcode-research` — 新设计问题调研（串行护栏）

- `$to-spec` / `$to-tickets` / `$implement` — backlog 立票流程

- `$improve-codebase-architecture` — 下一轮架构调查


## 9. 环境备忘

- 远端：`git@github-Xxx91n:Xxx91n/Find-Your-Country-Code.git`；发布链：push main → build → 自动 tag/Release（`release.yml`）

- 版本真源唯一：`package.json`（`vite.config.ts` 从它读取注入 `@version`）；bump 只改一处

- 证据铁律：行为面只认 CI run/artifact（WORKFLOW §8.1）；本地硬验收限于只读闭集（§8.2）

- 归档位置在仓库外：`D:\Aworker\mozilla\choose-your-country-evidence-archive\`（勿删）

- **敏感信息**：本文件不含任何密钥/凭据；GF 侧 Sync 已由维护者手动配置，无需在此记录凭证。
