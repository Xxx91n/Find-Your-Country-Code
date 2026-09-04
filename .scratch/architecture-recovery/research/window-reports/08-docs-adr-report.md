# 窗口实施报告：08 — 文档与决策记录（CONTEXT.md / ADR / 用户文档）

> 日期：2026-09-04 | 分支：`cch/08-docs-adr`（GitButler，commit `zmp` / git sha `efaecf9` + 本报告提交）
> 阻塞确认：Blocked by 02、05 —— 已核实 `research/window-reports/02-scoring-engine-report.md` 与 `05-site-rules-engine-report.md` 均已落盘，两票闭环，开工前置满足。

## 1. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| `CONTEXT.md`（新建） | 领域词汇表：检测 / 注入与填充 / 用户干预 三组 16 术语 | issue 验收 1；词汇唯一上游为 spec.md |
| `docs/adr/0001-scoring-engine-replaces-boolean-detection.md`（新建） | 评分制取代布尔制 | issue 指定不可逆决策 ①；含被否决路线 3 条（布尔+黑名单 / ML / L2 孤立字段显式减分） |
| `docs/adr/0002-vite-plugin-monkey-modularization.md`（新建） | vite-plugin-monkey 工程化 | 不可逆决策 ②；含被否决路线 3 条（单文件 / 多产物 / 手写构建）；后果记录 release.yml 适配归票 10 |
| `docs/adr/0003-site-rules-engine.md`（新建） | 站点规则引擎引入 | 不可逆决策 ③；含被否决路线 3 条（零误报自动检测 / 云规则 / 仅重映射已注入档） |
| `docs/adr/0004-pseudo-select-recognition-deferred.md`（新建） | C6 组件库伪-select 降级缓议（status: deferred） | prompt 检查点要求的被否决路线 C6；被否决理由=证据不足，违反"候选不升格 confirmed"纪律 |
| `README.md` / `README_EN.md` | 功能特性更新为评分引擎行为；安装节移除过时 CDN 链接、手动安装改源码构建 | issue 验收 3 |
| `greasyfork/GREADME.md` / `GREADME_EN.md` | 功能特性同步更新 | 同上 |
| `.gitignore` | `docs/` → `docs/*` + `!docs/adr/` | **必要修正**：原整目录忽略会静默吞掉本票交付 `docs/adr/`（详见 §5 教训与 §4 偏离点 3） |
| `.scratch/.../WORKFLOW.md` §5 | 补记 1 条教训（2026-09-04 票08） | issue 验收 4 |
| `.scratch/.../research/scripts/{digest-ticket08-facts,probe-ticket08-src,probe-ticket08-src2,verify-ticket-08}.mjs`（新建） | 本票事实收集与验收脚本（WORKFLOW §2.6 node 约定） | 证据可复跑 |

## 2. CONTEXT.md 术语表（摘要）

三组 16 术语，与 spec 用词逐一对齐：

- **检测组**：区号字段（select/input/iti 三形态）、主号锚（`input[type=tel]`，锚→目标关联互证）、置信度（score+signals，非布尔）、信号层（L0–L4 五层瀑布）、分级行动（auto/lowkey/none，阈值可配置）、低调注入、手动召唤、重评（属性指纹快照，非终态化）
- **注入与填充组**：图标注入、面板、填充（iti/select/input 三策略）、iti 适配层（v16–v29 能力探测）、原生事件序列（原生 setter + input→change→blur）
- **用户干预组**：站点规则（`cch_site_rules_v1`，检测入口前匹配）、豁免域名、强制选择器、分档覆盖（显式压过启发式）、负反馈（记 none 档）

格式遵循 domain-modeling 的 CONTEXT-FORMAT（术语+1–2 句定义+_Avoid_ 行）；纯词汇表，无实现细节。规避词已按 spec 修正（如避免用"国家字段"指代区号字段）。

## 3. ADR 索引

| 编号 | 决策 | 状态 | 被否决路线数 |
|---|---|---|---|
| 0001 | 多信号加权评分取代布尔命中 | accepted | 3 |
| 0002 | vite-plugin-monkey 模块化、产物单 .user.js | accepted | 3 |
| 0003 | 站点规则引擎：检测+兜底 | accepted | 3 |
| 0004 | 组件库伪-select 识别（C6） | deferred | 1 |

## 4. 用户文档 diff 摘要与过时表述清零

四份文档功能列表从"布尔检测时代"更新为评分引擎行为：多信号加权识别 + 三档分级行动（自动注入/低调注入/不注入+手动召唤）、autocomplete 标准信号与下拉内容验证、误报治理声明（称呼前缀/固话本地区号/纯数字枚举）、动态页面（SPA 重扫 + open Shadow DOM 穿透）、iti v16–v29 适配、React/Vue 原生事件序列同步。

过时表述清理（2 处，README 系）：
1. **移除 Jsdelivr CDN 链接**（原指向 `src/Find-Your-Country-Code.js@main`）——该文件已冻结为 v1.3.4 行为基准（票 01 报告），CDN 会永远供给旧布尔引擎，属过时表述；票 10 适配 release.yml 后再以 dist 产物路径恢复 CDN。
2. **手动安装改为源码构建指引**（`npm install && npm run build` → `dist/find-your-country-code.user.js`）——`dist/` 在 .gitignore 内，原计划的 `./dist/...` 相对链接对仓库读者是死链；指向旧单文件的"复制安装"同样过时。

GreasyFork 安装链接保留（唯一 git 无关且持续可达的官方渠道）。安装/发布链的最终改向归票 10，本票不越界。

## 5. 验收证据（issue 内 4 条，全部真实执行）

1. **CONTEXT.md 词汇表建立且与 spec 用词一致** ✅ — 落盘 + `node .scratch/architecture-recovery/research/scripts/verify-ticket-08.mjs` → **exit 0，ALL-PASS**（10 文件：BOM 缺席、关键片段齐全、代码围栏配对）。术语直接取自 spec 原文：区号字段/主号锚/置信度/分级行动/站点规则五簇全覆盖。
2. **至少 3 条 ADR 落 docs/adr/（编号起始 0001，含被否决路线与理由）** ✅ — 实落 4 条（0001–0004），每条设「被否决路线与理由」节；`git show --stat efaecf9` 证据：4 个 ADR 文件均入库。
3. **README.md / README_EN.md / greasyfork/GREADME*.md 行为描述更新，无过时表述** ✅ — 四文件功能列表已更新（verify 脚本断言新特征片段存在）；2 处过时表述清理见 §4。**如实性核查**：面板负反馈/站点规则管理入口属票 07（`src/ui/index.ts` 无接线，i18n `ruleNoneRemembered` 等 key 无消费者——probe-ticket08-src2.mjs 核实），文档未宣传该入口，无超前表述。
4. **教训登记簿如本周期有新增教训则同步补记** ✅ — 补记 1 条：`.gitignore` 的 `docs/` 整目录忽略静默吞掉 `docs/adr/`（文件落盘≠可入库）；`dist/` 忽略使 README 相对链接成死链。防再犯：文档交付落盘后必跑 `git check-ignore` + `git status` 核验可提交性。

提交证据：`but commit -b cch/08-docs-adr` → commit `zmp`（分支 cch/08-docs-adr 新建）；`git show --stat` 确认 11 文件、无并行窗口 src 改动混入。

## 6. 偏离点

1. **ctx 工具不可用，回退内置文件读取**：本窗口无 `ctx_*` 工具，按 goal 授权回退（同 WORKFLOW §6 D1 先例）；批量读写仍守 §2.6 node 脚本约定。
2. **安装链接处置**（见 §4）：移除 CDN 链接 + 手动安装改构建指引，属"无过时表述"验收项的必要推论；CDN 恢复方案移交票 10。
3. **修改了 .gitignore**：超出"纯文档"字面范围，但为交付物可入库的硬前置（原规则下 `docs/adr/` 永远无法提交）；已最小化（仅放行 `docs/adr/`，`docs/superpowers/` 保持忽略），并记 §5 教训。
4. **greasyfork/Glog*.md 未动**：不在 issue 四文件清单内，更新日志随发版由票 10 处理。
5. **提交严格限本票文件**：工作区存在并行窗口的 `src/{config,i18n,main,ui}` 未提交改动，本票两个 commit 均未触碰。

## 7. 给大脑的风险提示

1. **README 新描述与 GreasyFork 线上版本的时间差**：线上仍为 v1.3.4 布尔引擎，README 描述将在票 10 发版后与实际一致；建议票 10 前不提前在站外宣传新特性。
2. **票 07 合入后需回补用户文档**：站点规则面板入口（负反馈按钮/豁免设置）上线时，README/GREADME 需增补对应功能行（本票有意未写，避免超前表述）；CONTEXT.md 术语已预置，无需改。
3. **`src/Find-Your-Country-Code.js` 冻结基准的去留**（ADR 0002 已记）：票 10 需决定其移除/保留与 README 引用策略。
