# 仓库心智模型勘察记录（大脑 Agent）

> 日期：2026-09-03（Asia/Singapore）| 作者：AutoCoder（大脑 Agent，只调查不修改）
> 方法：codegraph init/status + 全文阅读 src/Find-Your-Country-Code.js + test 页标记扫描 + git log 概览
> 证据状态：以下除特别标注外均为 **observed**（直接来自源码/文件/命令输出）

## 1. 仓库形态

- 单文件油猴脚本：`src/Find-Your-Country-Code.js`（41,948 B，v1.3.4，IIFE）
- codegraph：19 nodes / 26 edges / 7 files（索引已建立）
- 无 CONTEXT.md、无 docs/adr/、无独立 config 模块、无 lint/test runner 配置
- 已有文档：docs/superpowers/specs|plans（2026-04-13 UI refresh，已落地为 v1.1.0）
- test/ 下 3 个静态测试页（test-page.html、cch-test-page.html、cch-test-page2.html，含 intl-tel-input@18.2.1 CDN 场景）
- 版本控制：Git 仓库，remote 已配置；`but` CLI 已安装（未在本仓库初始化工作区）
- 未提交内容：仅 `.scratch/`（本研究目录，未跟踪）

## 2. 脚本当前心智模型（源码直读）

单 IIFE 内 6 个区块：CONFIG（关键词表）→ COUNTRY DATA（240 国）→ I18N → STORAGE（Store）→ DETECTION（Detect）→ FILL（Fill）→ UI → OBSERVER & INIT。

### 2.1 检测子系统（痛点核心）

三路检测均为**关键词启发式**（candidate 级机制描述）：

- `_isSelect`：属性关键词命中（SELECT_KW 24 个 + 排除表 SELECT_EXCLUDE_KW）→ 再看选项形态（区号/ISO 值命中率）
- `_isInput`：INPUT_KW 8 个属性关键词 + 标签短语（LABEL_PHRASES）命中即判真
- `_isIti`：`.iti`/`.intl-tel-input` 容器 / dataset / jQuery data 探测

已观察到的结构性缺口（observed，来自源码）：

1. **无置信度分级**：命中即注入图标，没有"可能命中/确认命中"两级
2. **排除表是黑名单制**：省/市/语言等排除词是手工枚举，新场景（如 "country of residence"）必然误报
3. **无 Shadow DOM 穿透**：`root.querySelectorAll` 无法进入 shadowRoot（React/Vue 组件库、Lit、GitHub 等大量使用）
4. **无 SPA 路由感知**：MutationObserver 350ms 防抖 + 500ms×8 轮询，对 SPA 路由切换后新表单无专门处理（依赖通用 observer，勉强覆盖）
5. **无框架组件库适配层**：MUI/AntD/Element-Plus/Nordpool 等 select 组件的真实 value 在 JS state 里，DOM 选项不完整或不存在
6. **标签文本检查只看 label[for]/closest('label')/aria-labelledby**，不看 placeholder 兄弟 span、浮动 label、Material 风格结构
7. **`_done` WeakSet 终态判定**：一旦判定"非目标"后元素被框架复用（React re-render 换 props）不会重新评估

### 2.2 填充子系统

- fillIti：5 层 fallback（全局实例 → el.iti → dataset id → jQuery → DOM 点击模拟），链条长但每种框架版本都可能断
- fillSelect：值匹配 → data-attr → 文本匹配，找不到则失败转剪贴板
- fillInput：placeholder 格式推断（plus/double0/digits）
- 共同问题：对 React 受控组件的 value 设置用原生 setter+dispatch（有 prototype setter 技巧，是好实践），但没有对 Vue/Angular 的响应式触发验证

### 2.3 架构词汇（codebase-design 词汇表对照）

- 唯一真实 seam 是 `Fill.run(el, kind, country)` 和 `Detect.scan`
- Detect/Fill/UI/Store 是 4 个隐藏在闭包里的静态对象，**无导出、无测试缝**——"interface 即测试面"完全不成立
- 深模块标准（大量行为藏在小组接口后面）：IIFE 对外 0 接口，最深的部分（检测决策）不可测
- 删除测试：删除 UI 弹窗功能，复杂度会集中到检测+填充（说明检测+填充才是核心资产）

## 3. 痛点 → 假设树（candidate，待子代理调研验证/证伪）

| # | 痛点 | 候选机制（candidate） | 验证途径 |
|---|------|----------------------|---------|
| H1 | 大部分网站不生效 | 关键词表覆盖不足 + Shadow DOM + 框架 select 无原生 options | 行业方案调研 + 各组件库实测 |
| H2 | 大部分网站不生效 | `_done` WeakSet + 框架复用 DOM 节点导致漏检 | 最小复现实验 |
| H3 | 大部分网站不生效 | iti 5 层 fallback 在 iti v17+（无 jQuery）站点失效 | 实测 + 版本矩阵调研 |
| H4 | 误检测（非区号字段有图标） | 关键词启发式无语义验证、无置信度 | 误报样本收集 + 行业启发式调研 |
| H4' | 误检测 | `prefix` 等高歧义关键词未带语境约束 | 同上 |
| H5 | "适配所有网站"不可达 | 单文件无配置面：无站点规则引擎、无用户反馈回路 | 行业心智模型调研（Form Filler 类脚本架构）） |

## 4. 决策输入（给 to-spec 的素材，大脑视角）

- 本仓库无 CONTEXT.md / ADR，领域词汇从 README + 源码提取：国家区号字段（country-code field）、区号面板（panel）、收藏（favs）、检测（detect）、填充（fill）
- 现有 specs/plans 文档是 UI refresh 的，与本次架构重构无冲突，但命名沿用它：脚本自称 "Country Code Helper"（cch- 前缀）
- 测试资产：test/cch-test-page2.html 已含 intl-tel-input 场景 C；测试页是手工验证工具，非自动化
- 用户核心诉求排序（从目标原文推断）：① 大幅提升检出率（适配所有网站）② 消灭误检测 ③ 建立成熟心智模型（行业对标）④ 流程固化为多窗口协作

## 5. 已完成/未完成

- [x] skills 全量落盘（39 份 → .scratch/architecture-recovery/research/skills/）
- [x] 主脚本全文阅读
- [x] codegraph 索引
- [x] 测试页标记扫描（未逐行精读，见"未完成"）
- [ ] test 页逐场景精读（子代理 T2 顺带核对）
- [ ] 行业方案深度调研（子代理 T1/T2）
- [ ] 误检测最小复现（子代理 T2）
- [ ] atomcode 行业方案直接调研（大脑串行执行，本轮稍后）
- [ ] 架构调查报告（依赖以上）
