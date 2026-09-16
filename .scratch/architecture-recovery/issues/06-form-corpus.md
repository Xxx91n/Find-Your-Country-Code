# 06: 形态语料三层架构

**What to build:** 把「指定网页」落成可维护的自有语料：镜像页作断言主力、结构骨架作长期结构基线、原始快照出仓归档。

**Blocked by:** 票 05（交互原语）

**Status:** done（子窗口自证完成，待大脑复核）

**覆盖 A-xxx:** A-030


- [x] 镜像页入库作测试主力（去品牌 / 去追踪 / 内容替换），落于单一 tests/ 根下 — `tests/corpus/forms/mirrors/` **9 件**（8 主 + 1 子帧）：`iti-v29` / `rpn-input` / `codepen-iti-v17` + `-child` / `mui-autocomplete` / `element-plus-select` / `antd-select` / `chosen-select` / `heroku-signup`；hermetic（零外部 src/href、零追踪 token）；结构门 S3 逐件钉住「可见正文零品牌 token（13 词表）+ provenance 四键齐备」。验证 `git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms | grep mirrors` = **9 行**；`npx playwright test tests/corpus-forms.spec.ts` = **18 passed**；`npm run e2e` = **135 passed**（117 存量零回归）
- [x] 结构骨架入库作长期结构断言基线 — `tests/corpus/forms/skeletons/` **8 件**（内容无关归一化树：class 排序 + 去 CSS-in-JS 哈希类 / id 丢弃 / style·srcdoc·src 丢弃 / 文本 → 形状令牌 / **重复兄弟折叠** `repeat:N`）。验证 `git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms/skeletons` = **8 行**；结构门 S7「同源两次派生哈希一致」+ S2「内部树哈希自校验」通过；节点数 `iti-v29` 36 / `codepen-iti-v17` 39 / `rpn-input` 15 / `mui-autocomplete` 12 / `element-plus-select` 11 / `antd-select` 7 / `chosen-select` 4 / `heroku-signup` 3
- [x] 原始快照不入库，归到仓库外 archive；库内只留指纹与元数据清单 — 库内 20 件 = 镜像页 9 + 骨架 8 + `manifest.json` + `sources.json` + `README.md`；原始快照落**仓库外** `D:\Aworker\mozilla\choose-your-country-evidence-archive\corpus-forms\`（raw HTML 8 + 渲染后 DOM 9 + 截图 8 + `CAPTURE-MANIFEST.json`）。验证 `git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms | grep -Ec 'raw|dom|\.png'` = **0**；结构门 S4 归档实物指纹复核 **23/23 匹配、0 失配**（本地硬验收，§8.2 例外登记：不可 CI 化因原始快照按合规口径不得入库 → CI 内显式 SKIP）
- [x] 不引入对象存储/S3；不新增顶层 corpus/ 目录 — 验证 `ls corpus` → `No such file or directory`；结构门 S1：语料位于单一 `tests/` 根（ADR-0006 条款 5），`s3://` / `amazonaws.com` / `@aws-sdk` / `minio` / `r2` / `b2` **6 token 零命中**，复用票 41 既有仓库外 archive 模式
- [x] 退化回路成文：定期重捕 → 确定性结构 diff → 分级 bump 版本 → 回放自检 — 成文 `tests/corpus/forms/README.md` §4 + `manifest.json._meta.degradationLoop`；工具链 `tests/scripts/06-capture-forms.mjs`（重捕 → 库外 archive）· `06-skeleton.mjs`（派生骨架）· `06-structural-diff.mjs`（**非像素**分级 `none/patch/minor/major`）· `06-manifest.mjs`（清单生成）。验证 `node tests/scripts/06-structural-diff.mjs --id iti-v29` → `tier: NONE (bump: none) changes: 0`；人工注入三类差异 → `PATCH`/`MINOR`/`MAJOR` 各正确命中（临时样本已清理）；结构门 S5 钉住四步 + 纪律句
- [x] 合规口径落地：只采公开页 / 剥离品牌内容 / 标 source_url + captured_at / 不含真实 PII — `manifest.json._meta.compliance` 四条款 + 每条 entry 的 `source_url` / `captured_at` / `mirror_of` / `license_note`；抓取脚本仅 GET + 渲染，不登录、不提交表单；结构门 S3 逐件钉住 provenance 四键 + 去品牌 + 去追踪
- [x] 声明本票覆盖的 A-xxx：A-030 — 本文件头 + `tests/corpus/forms/README.md` + `sources.json` + `tests/corpus-forms.spec.ts` + `manifest.json` + 提交信息（结构门 S8 钉住）

---

**验收证据**：逐项只读验证命令与输出摘要见 `.scratch/architecture-recovery/research/window-reports/06-form-corpus-report.md` §1（Delta 检查点见 §2；关键发现见 §3）。
**提交锚点**：`cch/06-form-corpus` @ `4a9b3187`（Change-ID `pxk`，32 文件 / +4144）
**文档提交**：`3596390a`（Change-ID `xku`，报告 + issue 勾销 + 偏离点）
**基线**：common base `85990d2f`（origin/main = v1.6.0）；本票 issue / handoff / spec 属 `cch/48` 产物
**报告**：`.scratch/architecture-recovery/research/window-reports/06-form-corpus-report.md`
**atomcode 调研**：`.scratch/architecture-recovery/research/atomcode-06-form-corpus.md`（问题 verbatim 在 `.scratch/architecture-recovery/research/prompt-06-atomcode.md`；三引擎 5 角度 + 原文核验 ≥6，Confidence 高）
**本地自证**：`node tests/scripts/verify-ticket-06.mjs` → **187 PASS, 0 FAIL**；`npx playwright test tests/corpus-forms.spec.ts` → `18 passed`；`npm run e2e` → `135 passed`；`npm run typecheck` → exit 0；结构 diff → `tier: NONE`
**关键发现（阶段 B 输入）**：真实页形态上工具仅注入 **2/8**（`iti-v29` tier=auto score=88 · `codepen-iti-v17` 子帧 tier=auto）；镜像页与真实页**同口径探测 8/8 一致** —— 该结果是真实形态的测量而非镜像伪影。本周期**不预先修**（D-016）；失效清单交票 08
**状态**：子窗口自证完成，**待大脑复核**（WORKFLOW §4.3）；**CI 证据缺位**（未 push，见报告 §4 E-6）
**返工轮次 R1**：主 Agent 复核发现「双探测未控同口径」（`06-probe-mirrors.mjs` 无 UA 且等待序列与 `06-probe-real.mjs` 不同）→ 已提取唯一口径模块 `06-probe-common.mjs`（UA + settle + scanWrappers 单一定义）并受控重跑双探测：**一致性仍为 8/8**（§3.1 headline 成立，但此前陈述了未持有的控制）；门新增 **S9 口径同源防回归锁**（强化，未削弱既有断言）；次要补正：报告 §1「渲染后 DOM 9」实为 **15**（8 主 + 7 帧）、本文件 `prompt-06-atomcode.md` 补全前缀。详见报告 `## 返工轮次 R1`
**CI 证据（R1 闭合 E-6）**：`cch/06-form-corpus` 已推送（7 支含祖先）；`Verify Ticket 06 (form corpus)` **绿**（run `35089360445` / `35089479043`）· `Typecheck` 绿 · `Engine Gates` 绿 · `Lockfile Regen` 绿；`E2E` 红两处——① 本票 `corpus-forms.spec.ts:145` 跨帧异步竞态（**已修**：改 web-first 等待 + 轮询，本地 spec 18 passed / 门 209-0 / E2E 135 passed）；② `entry-access.spec.ts:42`（票 37 面板居中）**非本票引入**，首个测试级红出现在 `cch/03-diagnostics-surface` run `35089332673`（47/48 均绿），本票仅为继承者，按边界不修并呈报立修复票。归因见报告 `### R1-10`
