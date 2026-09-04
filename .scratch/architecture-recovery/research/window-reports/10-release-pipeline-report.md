# 窗口实施报告：10 — 发布链路与版本策略适配

> 子窗口（fresh context）实施 | 日期：2026-09-05 | 分支：`cch/10-release-pipeline`（GitButler，commits `mys`/`nuq`/`lkq`，堆叠于 `cch/07-ui-upgrade` 之上，远端 `92e9e83`）
> 开工复述：Blocked by 01、09、07 —— 三票 window-report 均已落盘（01/09/07+07fix），git log 显示 07 闭环（73/73、e2e 42 passed、wave 5 unlocked）、09 闭环（36/36、e2e 33 passed），前置满足。必读 5 份（prompt → issue → handoff → release.yml → 01 报告 → WORKFLOW，另补读 handoff 指定的 Glog.md/Glog_EN.md/GREADME×2）按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler；`but commit -b` 建分支、`but move --above` 堆叠、`but push` 推送）。

## 1. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| `.github/workflows/release.yml` | 重写（保留原有结构：tag 判重、Glog 双语 changelog、softprops/action-gh-release@v2） | issue 验收 1：从构建产物提取 @version 并发布 |
| `.github/workflows/release-dry-run.yml` | 新增 | 验收 1 的 dry-run 载体：与发布链路相同的构建+提取逻辑，永不创建 Release；workflow_dispatch（合入 main 后可手动触发）+ `cch/10-release-pipeline` 分支 push 触发（本票自举验证通道） |
| `CONTRIBUTING.md` / `CONTRIBUTING_EN.md` | 新增（双语，对齐仓库 README/README_EN 惯例） | 验收 2 + 3：发版流程、Glog/Glog_EN 更新流程、下载链接验证方法、beta 人工确认边界 |
| `.scratch/.../research/scripts/verify-ticket-10.mjs` | 新增 | WORKFLOW §2.6 node 脚本约定：静态结构门（25 项）+ `--links` 在线链接验证（5 链接） |
| `WORKFLOW.md` §5 | 补记 1 条教训 | 教训机制（见 §7） |

## 2. release.yml diff 说明（验收 1）

| 点 | 旧 | 新 |
|---|---|---|
| 触发 | push main + paths `src/Find-Your-Country-Code.js` | push main + paths `src/**`、`vite.config.ts`、`package.json`、`package-lock.json`（旧单文件已冻结，从触发中移除） |
| 构建 | 无（直接读 src） | `setup-node@v4`（node 20 + npm cache）→ `npm ci` → `npm run build` |
| 版本提取 | `grep -m1 '// @version' src/Find-Your-Country-Code.js` | `grep -m1 '// @version' dist/find-your-country-code.user.js`，加空版本防护（`[ -z "$VERSION" ]` → error + exit 1，消除 01 报告警示的静默失效） |
| 附件 | `files: src/Find-Your-Country-Code.js` | `files: dist/find-your-country-code.user.js` |
| tag 判重 / Glog 双语 / Release body | 保留不变 | 保留不变 |

## 3. dry-run 证据（验收 1：真实 CI 执行）

- **绿 run**：`Release Dry Run` #33898006260 → **success**（20s），https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/33898006260 ，headSha `16b6f0e`，2026-09-04T16:58:08Z。关键日志：
  - `node: v20.20.2` → `##[group]Run npm ci` → `##[group]Run npm run build`（干净环境构建通过）
  - `artifact=1.3.4 vite.config.ts=1.3.4 package.json=1.3.4`（产物 @version 提取 + 三源一致性校验通过）
  - `Tag v1.3.4 already exists - a push-to-main run would skip the release (tag dedup)`（tag 判重逻辑在线上真实 tag 上验证；dry-run 确认不创建 Release）
  - `actions/upload-artifact@v4` 产物上传留证（artifact 名 `find-your-country-code-1.3.4-dry-run`）
- **红 run（反证）**：#33897576545 → failure（15s），`Dependencies lock file is not found`。根因：首次推送时 `cch/10` 未堆叠，远端快照 = common base(8c5e266) + 本票 4 文件，缺 `package-lock.json`。依 09 票先例按 §4.2 `but move cch/10-release-pipeline --above cch/07-ui-upgrade` 堆叠修复后复推即绿。红 run 本身证明 dry-run 管道能捕获坏的分支快照。
- **未验证项**：GitHub Release 创建 step（softprops action）未实际执行 —— dry-run 设计上在 workflow_dispatch/push 下永不触发 release step（tag 判重输出已验证其输入正确性）；真实发布归用户确认后。

## 4. 下载链接验证方法与结果（验收 2/3）

方法已文档化于 `CONTRIBUTING.md`「下载链接验证方法」表（curl 命令 + 预期），EN 镜像同步；脚本化于 `verify-ticket-10.mjs --links`。本次实测（2026-09-05）：

| 链接 | 结果 |
|---|---|
| GreasyFork 安装链 `update.greasyfork.org/scripts/573755/...user.js` | HTTP 200，`@version=1.3.4`（线上当前版，与仓库一致） |
| GreasyFork meta `...meta.js` | HTTP 200，`@version=1.3.4` |
| GreasyFork 脚本页 | HTTP 200 |
| JsDelivr 截图 `main1.png` / `main2.png`（GREADME 引用） | HTTP 200 ×2 |

脚本退出码 0：静态门 25/25 + 链接 5/5 = **30/30 全绿**。边界结论已写入贡献说明：JsDelivr 只服务 git 内文件（`dist/` 不入 git），脚本本体分发走 GreasyFork（主）+ GitHub Release 附件（镜像），旧 README CDN 链接（指向冻结旧单文件）维持 08 票的移除状态。

## 5. 版本号跳跃策略建议（供用户决策，未擅自定版）

**决策记录（2026-09-05）：用户确认发 `v1.4.0`，不走 beta 预演。版本已 bump（vite.config.ts + package.json，commit `lkq`），Glog 双语 v1.4.0 小节已写入；dry-run run #33899481655 验证三源一致 `1.4.0` 且 `v1.4.0` tag 不存在（合入 main 后自动发版）。以下为原始取舍分析。**

- **建议 `v2.0.0`**：自 v1.3.4 起累计了模块化重建（ADR 0002）、布尔检测 → 五层加权评分引擎（ADR 0001）、站点规则引擎（ADR 0003）、iti v16–v29 适配、框架受控组件注入加固（React/Vue）、UI 升级与负反馈。检测引擎整体换代意味着边界场景行为可见变化（部分旧误报消失、极端场景判定可能不同），语义化版本主位跳跃能给用户明确的换代信号，且避免 1.3.x 线上旧版与新版 changelog 混淆。
- **备选 `v1.4.0`**：若更看重 GreasyFork 用户的连续升级体验（自动更新无感升级），可低调处理；代价是版本号无法传达行为换代的分量。
- 无论哪个号，发布链路均可用（tag 由产物 @version 提取）；决策点仅是数字本身。**beta 预演选项**：可先 bump `2.0.0-beta.1` 走一次真实 push→main 链路，验证后删 tag/Release 回滚版本号——该动作属于外发动作，需用户点头。

## 6. 待办与状态（用户已确认 v1.4.0，2026-09-05）

1. ✅ 版本号已定：`v1.4.0`（用户决策，不走 beta 预演）；vite.config.ts + package.json 已 bump（commit `lkq`），Glog 双语 v1.4.0 小节已写入。
2. ✅ dry-run 就绪验证：run #33899481655 success —— `artifact=1.4.0 vite.config.ts=1.4.0 package.json=1.4.0`；`v1.4.0` tag 不存在（合入 main 后将创建 Release v1.4.0，正文以 Glog v1.4.0 小节开头）。
3. ⏳ 收口合并：`cch/*` 并行分支由大脑在 S8 收口合入 `main`；合入后 push main 触发发布（tag 判重防重，v1.4.0 将创建）。
4. ⏳ GreasyFork 站内同步（手动，发布后）：粘贴 dist 产物到 GreasyFork 编辑器，保持版本一致。
5. ⏳ 发布后按 CONTRIBUTING 验证清单核对链接（`verify-ticket-10.mjs --links` 的 @version 应变为 1.4.0）。

## 7. 偏离点

1. **新增 `release-dry-run.yml` 与双语 CONTRIBUTING**：issue 未逐字要求该文件名/双语，但它是验收 1「dry-run 验证」的可复跑载体与验收 2/3 的文档落点；CONTRIBUTING 双语对齐仓库 README/README_EN 惯例。
2. **首次推送红灯（33897576545）**：建分支时未预判「远端快照 = 分支自身祖先链」，未先堆叠即推送。修复照 09 票先例（`but move --above cch/07-ui-upgrade`）。教训已写回 WORKFLOW §5。
3. **push 副作用呈报**：GitButler `but push <branch>` 语义为「推选中分支及其祖先」，本次推送将 cch/01/06/03/02/04/09/05/07/10 共 9 个分支镜像到 origin（均无 PR、未动 main、未动 tag）。属可逆操作（收口后可删远端分支）。
4. **不越界项**：未 bump 版本号（不擅自定版）；未改 issues 勾选与 README 波次表（大脑 S8 收口范畴）；未动 greasyfrog/Glog 内容（随实际发版由用户确认后更新）。
5. **本窗口 ctx 工具可用**，未触发回退；文件写入走 ctx（heredoc），批量验证走 node 脚本（§2.6）。

## 8. 给大脑的风险提示

1. **main 上仍是旧 release.yml**：合入前若有人向 main 推送触碰旧触发路径（src/Find-Your-Country-Code.js）的提交，旧 workflow 会静默失效（01 报告已警示）。建议本票在 S8 优先合入。
2. `release-dry-run.yml` 的 push 触发器绑定 `cch/10-release-pipeline`：分支删除后该触发器休眠（无害）；合入 main 后 workflow_dispatch 即可手动使用，可作为今后发版前 dry-run。
3. origin 上已镜像 9 个 `cch/*` 远端分支：收口合入 main 后建议清理（`but` 或 GitHub 界面），避免分支表膨胀。
4. `package.json` version 与 `vite.config.ts` userscript.version 双处维护：dry-run 的一致性校验对 vite 不一致是 error、对 package.json 仅 warning（有意宽松，避免双改硬门槛）；如需硬门槛可改为 error（一行改动）。
5. Release body 为 Glog 全文（现状行为保留）：历史版本小节会全部出现在 Release 说明里；若希望只取顶部小节，需后续改 workflow（本票未越界）。
