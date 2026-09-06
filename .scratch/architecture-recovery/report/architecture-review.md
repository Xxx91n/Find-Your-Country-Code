# 架构调查报告：Find-Your-Country-Code v1.3.4

> 依据：improve-codebase-architecture 流程（Explore→报告→遴选）| 日期：2026-09-03
> 词汇来源：codebase-design（module/interface/depth/seam/adapter/leverage/locality）；本仓库无 CONTEXT.md/ADR（域词汇从 README+源码提取）
> 调研输入：repo-survey.md / industry-models.md / atomcode-industry-models.md / misdetection-root-causes.md / infra-patterns.md（均在 research/）
> 证据纪律：候选机制标注 evidence 状态；不把 candidate 升格为 confirmed

## 1. 现状一句话

单文件油猴脚本，一个 IIFE 内六个隐藏静态对象（Detect/Fill/UI/Store/COUNTRIES/observer），唯一真实 seam 是 `Detect.scan` 与 `Fill.run`；**无导出、无测试缝、无置信度模型**——interface 即测试面完全不成立（observed）。

## 2. 候选清单（按推荐强度排序）

### C1【Strong】检测引擎重构：布尔命中 → 多信号加权评分 + 分级行动

- **Files**：src/Find-Your-Country-Code.js 的 Detect 区块（CONFIG 词表 + _isSelect/_isInput/_isIti/_process）
- **Problem**：命中即注入（布尔短路），任何一条弱信号单独成立就插图标 → 误检测（用户痛点②）；autocomplete token / inputmode / 锚关联三大强信号全盲 → 漏检（痛点①）。industry-models.md §P1-P4 给出全行业同构蓝图（Chromium/Bitwarden/KeePassXC 独立收敛）。
- **Solution**：L0 autocomplete token（`tel-country-code`/`country` 一票强命中）→ L1 词表/label/placeholder 加权 → L2 锚→目标关联（同 form 内 tel 主号⇄区号字段互证）→ L3 select options 内容验证（现有逻辑改评分）→ L4 排除词负分。输出 score+信号明细；分级行动：高分自动注入 / 中分低视觉权重 / 低分不注入（可配置）。
- **Benefits**：误报率由"黑名单穷举"转为"阈值可控"；信号可观测（对应 Chrome DevTools Autofill 面板心智）；测试面变为纯函数 `scoreElement(el)→{score,signals}`（deletion test：删除该模块复杂度集中到调用侧——正是要的深模块）。
- **证据**：industry-models.md（M1/M2/M4/M5，cited+observed 对照）；misdetection-root-causes.md §2（误报路径①-⑤，observed）。

### C2【Strong】架构拆分与测试基建：单 IIFE → 模块化工程 + Playwright E2E

- **Files**：整个 src/；新增 vite-plugin-monkey 工程 + test/ 扩展
- **Problem**：IIFE 静态对象无导出 → 检测/填充逻辑不可单测；测试只有手工 HTML 页面（observed）；多窗口并行修复（用户工作模式）需要清晰模块边界，否则每票都碰同一个 42KB 文件 → GitButler 冲突。
- **Solution**：vite-plugin-monkey + TS，模块化 `src/detect|fill|ui|store|data|rules`；构建产物仍单 .user.js（GreasyFork 发布链路不变，release.yml 只改产物路径）；test/ 现有 3 页升级为 fixture 集 + Playwright 断言（图标出现/面板开/填充值/误报样本不插图标）。
- **Benefits**：locality（检测决策与词表就近）；每票独立模块 → 并行波次真并行；leverage：检测引擎纯函数化后，一条 Playwright 用例覆盖 N 个站点形态。
- **证据**：infra-patterns.md §1-2（cited）；git 历史显示 src/ 是唯一热区（observed）。

### C3【Worth exploring】iti 适配层独立化：版本矩阵 + 能力探测

- **Files**：Fill.fillIti 5 层 fallback（:470-560）+ Detect._isIti（:368-385）
- **Problem**：5 层降级链是正确工业实践（atomcode 结论7），但 setCountry→setSelectedCountry 改名（v26-v29 区间）、v28 scoped 包、v29 DOM 改名未适配；链条内 5 套路径每次全跑一遍。
- **Solution**：适配层先探测"能力面"（getInstance 稳锚从未断代）再选择填充策略；类名矩阵双代兼容（.iti__selected-country + .iti__flag-container/.selected-flag）；方法名双名尝试（setSelectedCountry→setCountry）。
- **Benefits**：v16-v29 全覆盖（cited 矩阵已备好）；适配层是"两个 adapter 才是真 seam"的真实落地。
- **证据**：atomcode-industry-models.md 版本矩阵+结论6/7/8（cited）。

### C4【Worth exploring】重扫机制：`_done` 终态化 → 可重评估 + Shadow DOM 穿透

- **Files**：Detect._done（:349）、Detect.scan（:456）、observe()（:672）
- **Problem**：WeakSet 终态判定 + body-only observer → 框架复用节点/SPA/Shadow DOM 全部失灵（漏检主根因，misdetection §3.1/3.2）。
- **Solution**：scan 用递归穿透函数收集节点（open shadowRoot 递归 + 每 root 单独 observer）；`_done` 改存"判定快照+指纹"（元素属性指纹变化触发重评）；SPA 路由 hook（pushState/replaceState/popstate）触发定向重扫。
- **Benefits**：动态页面双向（误/漏）收敛；KeePassXC 同款生产心智（TreeWalker+openOrClosedShadowRoot，PR#2360，cited）。
- **证据**：misdetection-root-causes.md §3（observed）；atomcode 结论10（cited）。

### C5【Worth exploring】站点规则引擎 + 用户反馈回路

- **Files**：新增 rules 模块 + Store
- **Problem**："适配所有网站"不可达是结构性的（T1 调研：密码管理器也不做100%自动——都有手动兜底后门）。当前无任何用户干预面。
- **Solution**：GM 存储内加站点规则（豁免域名/强制选择器/置信度覆盖）；面板里加"这里不是区号字段"负反馈入口，误报一键上报+本地记忆。参照 KeePassXC sites.js、Bitwarden linked field、1Password data-1p-ignore（三源收敛，cited）。
- **Benefits**：把不可达的"完美检测"转化为可达的"检测+兜底"；误报痛点的体验出口。
- **证据**：atomcode 结论5（cited）。

### C6【Speculative】组件库伪-select 识别（MUI/AntD/Element-Plus）

- role=listbox/combobox + aria 结构识别。调研证据仅覆盖"原生 select 之外存在该形态"（observed 缺口4），未做各库 DOM 结构调研——列为候选但建议 out-of-scope 或先建 issue 存疑。若要推进，必须先 atomcode 补一轮专项调研。

## 3. Top 推荐

**C1+C2 捆绑为第一波**：评分引擎（修痛点）必须搭测试基建（修验证能力），且两者共同定义了其余票的模块边界——先做它们，C3/C4/C5 各自成为独立模块票。C6 明确降级。

## 4. ADR 冲突检查

无既有 ADR。本报告建议的不可逆决策（评分制取代布尔制 / vite-plugin-monkey 工程化 / 站点规则引擎引入）应在实施期由子窗口按 WORKFLOW §7 记录为 ADR。

## 5. 报告形态说明

按偏离点 D8：本报告为 markdown 摘要；HTML 可视版落 `report/architecture-review.html`（同目录）。二者内容同源，冲突以 markdown 为准（D8 标注：HTML 供人审）。
