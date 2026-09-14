# 票 38 窗口报告 — 分发最后一公里（A-011）

> Cycle-5 | 票：`issues/38-distribution-last-mile.md` | 覆盖 A-011
> 分支：`cch/38-distribution-last-mile`（WORKFLOW §4.2：确有依赖，堆叠于 `cch/cycle5-ticketing` 之上） | 提交：`5fd6ef3d`（5fd6ef3dea87968cca09e0a7d41cdc5d7b3ca283）

## 1. 覆盖范围与阻塞项

本票覆盖 A-011（分发最后一公里）。Blocked by：票 36（版本闸门需门禁可执行）。

**Delta 约束遵守情况（逐条自检）**：

| Delta | 遵守 | 说明 |
|---|---|---|
| 禁止设计 CI 主动 POST 到 GF 的步骤 | 是 | 新增两个 workflow 全程只读；`38-gf-alignment-check.mjs` 只发 GET，源码无任何 POST/PUT 写入路径 |
| 不得违反 GF 三条硬规则 | 是 | 由 G4 组断言持续守护：≤2MB（127,133 B）、`@updateURL` 恰好 1 条、产物未 minify（2965 行 / 最长行 270） |
| 发布动作须用户确认；只做到「闸门 + 链接 + 同步配置」 | 是 | 未发版、未建 tag、未推远端；GF 同步只交付配置手册 |
| 版本真源唯一（package.json） | 是 | `vite.config.ts` 改为从 package.json 读取注入，消除第二份手写副本 |

**未触碰（并行窗口在途）**：`tests/live/live-smoke.mjs`、`tests/live/site-manifest.json`、`.scratch/.../issues/36|42|43`、`.scratch/.../research/scripts/39-*`、`live-out/` —— 均属其他票在途改动，本次提交未包含（`git show --stat` 11 文件可核）。

## 2. 行业调研与依据

外部事实一律标注（observed / cited / reproduced / candidate）：

1. **GitHub「最新 Release 资产」固定链** — cited：GitHub Docs《Linking to releases》明确 `/releases/latest/download/asset-name` 形式（<https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases>）；reproduced：本地对该 URL 发起 GET 得 HTTP 200，产物 `@version=1.5.0`。
2. **GF 侧更新为「GF 主动拉取」模型** — cited（二手来源）：GreasyFork 支持由平台从指定外部 URL 抓取脚本内容实现自动更新（<https://deepwiki.com/ChinaGodMan/UserScripts/4.2-webhook-synchronization-and-additional-info-sync>）；本票 delta 亦给定「GF 无写入 API」。**同步入口的确切 UI 文案属 candidate**，须维护者在 GF 编辑页核实（手册已标注）。无论 URL 同步还是 webhook 触发，抓取动作都由 GF 发起；本票不引入任何 CI→GF 的 POST。
3. **断点复现** — reproduced（2026-09-14）：`https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js` 返回 `@version 1.3.4`，而 `package.json` 为 `1.5.0`。

既有心智模型核对：未违背 ADR 0001–0008。ADR-0006 决策 1（CI 脚本入 `tests/scripts/`，上溯 2 级锚定仓库根）与决策 2（非发版 workflow 必须声明 `pull_request`）均已遵守；workflow 内零 `.scratch/` 引用。

## 3. 改动清单（commit 5fd6ef3d，11 文件）

| 文件 | 作用 |
|---|---|
| `tests/scripts/38-version-consistency.mjs`（新，128 行） | 版本一致性闸门：G1 真源唯一 / G2 产物一致 / G3 tag 一致 / G4 GF 硬规则 / G5 分发链接 |
| `tests/scripts/38-gf-alignment-check.mjs`（新，124 行） | GF 上线版本对齐只读校验：GET 线上 meta + GitHub 同步源，比对真源；默认 advisory，`--strict` 漂移即红 |
| `.github/workflows/verify-38.yml`（新） | `pull_request` + `workflow_dispatch` + `push(cch/38-*)`；node 22；`npm ci` → `build` → 闸门 |
| `.github/workflows/gf-alignment-check.yml`（新） | `workflow_dispatch` + 每日 1 次 cron（遵守「更新检查 ≤1 次/天」）；只读 |
| `vite.config.ts` | 版本真源收敛：构建时从 `package.json` 读取并注入 `userscript.version` |
| `README.md` / `README_EN.md` | 安装链 `releases/download/v1.4.0/...` → `releases/latest/download/...` |
| `CONTRIBUTING.md` / `CONTRIBUTING_EN.md` | 版本真源口径改为 package.json；补 GF 同步手册引用 |
| `docs/greasyfork-sync-setup.md`（新，69 行） | GF 同步一次性人工配置手册：步骤、验收、回滚、硬规则表 |
| `.gitignore` | 补 `!docs/greasyfork-sync-setup.md`（既有 `docs/*` 忽略策略会挡住手册入库） |

## 4. 本地验收

环境：node v22.22.2；构建 vite v6.4.3。

**正向**：

```text
$ npm run build && node tests/scripts/38-version-consistency.mjs
PASS G1a … G5b
ticket-38 version consistency: 15 passed, 0 failed    （无 tag 上下文时 G3a SKIP）
GATE EXIT= 0

$ node tests/scripts/38-version-consistency.mjs --tag v1.5.0
ticket-38 version consistency: 16 passed, 0 failed
```

**反向（证明不一致确实会红）**：

```text
$ node tests/scripts/38-version-consistency.mjs --tag v9.9.9
FAIL G3a tag == package.json version（不一致即红，防半发布） :: tag=v9.9.9 package.json=1.5.0
ticket-38 version consistency: 15 passed, 1 failed
EXIT= 1
```

**GF 对齐（只读，实测）**：

```text
$ node tests/scripts/38-gf-alignment-check.mjs
GF 线上 @version:         1.3.4
::warning::GF 线上 1.3.4 ≠ package.json 1.5.0 —— 用户更新检查仍会看到旧版本（A-011 送达断点）
DRIFT: 1.3.4 -> 1.5.0
同步源 HTTP 200，产物 @version=1.5.0
REACHABLE: 同步源可拉取，且返回最新版本产物
RESULT: OK（advisory：存在漂移，已告警）   ADVISORY EXIT= 0

$ node tests/scripts/38-gf-alignment-check.mjs --strict   → STRICT EXIT= 1
```

**回归**：`npm run typecheck` → exit 0；`git diff --check` → clean；两份新 YAML 经 `yaml.safe_load` 解析通过；`npm run e2e` → **94 passed（49.0s）**，证明 `vite.config.ts` 改为从 package.json 注入版本后零运行时行为变更。

## 5. 验收项结论

| issue 验收项 | 状态 | 证据 |
|---|---|---|
| GF 侧开启 Sync from external URL 指向 GitHub raw 产物（人工一次性，须用户执行/确认） | 待用户执行 | 手册已交付 `docs/greasyfork-sync-setup.md`；实际开通是面向真实用户的外发动作，按 delta 不得由本窗口代执行 |
| CI 新增版本一致性闸门：tag = package.json = 产物 version，不一致即红 | 已交付 | `38-version-consistency.mjs` + `verify-38.yml`（5fd6ef3d）；反向用例 exit 1 |
| `README.md` / `README_EN.md` 安装链接改为 `releases/latest` | 已交付 | 两文件链接已改，G5a/G5b 断言守护（5fd6ef3d） |
| 给出「GF 上线版本对齐」的只读校验方式（可人工/CI 校验） | 已交付 | `38-gf-alignment-check.mjs` + `gf-alignment-check.yml`；实测评出 DRIFT 1.3.4→1.5.0（5fd6ef3d） |

## 6. 偏离点（WORKFLOW §6，呈报用户确认）

1. **版本真源由 `vite.config.ts` 改为 `package.json`** —— 与改动前 `CONTRIBUTING.md:18`「`userscript.version`（版本事实源）」表述冲突。本票 delta 明令「版本真源唯一（package.json）」，故按 delta 执行并同步修订 CONTRIBUTING 双语口径。影响：`vite.config.ts` 不再手写版本，bump 只改 `package.json` 一处。
2. **`.gitignore` 新增一条放行规则** `!docs/greasyfork-sync-setup.md` —— 仓库既有 `docs/*` 忽略策略，否则同步手册无法入库。
3. **GF 对齐校验默认 advisory 而非红灯** —— 同步尚未开通，若默认红灯则该 workflow 自落地起持续失败；开通后应切换 `--strict`（手册 §3 已注明）。
4. **分支堆叠**：issue 38 验收项所在文件由 `cch/cycle5-ticketing` 引入，GitButler 判定为依赖并拒绝独立提交，故按 WORKFLOW §4.2 用 `but move --above` 将 `cch/38-distribution-last-mile` 堆叠其上。实现提交 sha 因此由 54fd5b7 变为 5fd6ef3d，报告内引用已同步修正。

## 7. 遗留与下一步

1. 用户在 GF 脚本页开通 Sync from external URL（URL 见手册 §2）；开通后把 `gf-alignment-check.yml` 的调用改为 `--strict`。
2. CI run 证据：本窗口未推送远端，两个新 workflow 的首次 run 需在 PR 产生后取得；本地已给出等价命令与完整输出摘要。
3. 报告路径说明：任务书写 `research/window-reports/`，仓库实际既有约定为 `.scratch/architecture-recovery/research/window-reports/`（无顶层 `research/` 目录），按后者落盘。
