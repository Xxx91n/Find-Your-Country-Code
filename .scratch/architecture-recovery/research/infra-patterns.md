# 油猴脚本工程化基础设施调研（大脑 Agent 自查板块）

> 日期：2026-09-03 | 作者：AutoCoder（大脑 Agent）
> 证据状态：本文件所有外部事实均为 **cited**（来源：web_search 结果，未逐条打开原文核对细节的标 [未核]）；本地事实为 **observed**
> 与子代理的分工：子代理T1=行业字段识别心智模型；子代理T2=误检测/漏检根因；本文件=工程化基建（构建/测试/发布模式）

## 1. 构建与工程化（cited）

- **vite-plugin-monkey**（github.com/lisonge/vite-plugin-monkey）：油猴脚本领域的标准 Vite 插件，支持 TM/VM/GM/ScriptCat 四引擎，dev 模式热重载，TS 支持。社区口碑：Reddit r/typescript 推荐"复杂项目用 vite-plugin-monkey"（[未核] 细节）。
- **vite-plugin-tm-userscript**（github.com/asadahimeka/vite-plugin-tm-userscript）：轻量替代，主 TM。
- 对本项目映射：src/ 单文件 → 迁移到 vite-plugin-monkey 多模块 TS 工程，输出仍是单 .user.js。**这是油猴脚本从"手写单文件"到"工程化"的主流成熟心智模型**。

## 2. 测试基建（cited）

- **Playwright**（playwright.dev）：E2E 事实标准。最佳实践官方明确："Test user-visible behavior, avoid implementation details"——与 to-spec 的测试决策要求同构。
- 油猴脚本测试模式：本地起静态测试页服务器 + Playwright `page.addInitScript()` 注入脚本 + 断言 DOM 行为（🌐按钮出现/面板打开/填充值正确）。
- Playwright 原生支持 Shadow DOM pierce（`>>` / auto-piercing locators）——测试基建不构成采用 Shadow DOM 穿透方案的阻力。
- jsdom 不适用于本项目（getComputedStyle/BroadcastChannel/iti 真实 DOM 行为覆盖不全），**E2E 优先**。

## 3. intl-tel-input 版本矩阵（cited）

- 官方仓库 github.com/jackocnr/intl-tel-input：已提供 vanilla/React/Vue/Angular/Svelte 组件。
- npm 最新版本 **29.2.3**（搜索结果页面显示 "Latest version: 29.2.3"，[未核] 发布日期）——说明 v17→v29 跨度极大，脚本内置的 v18 时代 DOM 类名（`.iti__selected-country` 等）与 jQuery 兼容路径需要版本矩阵适配层。
- 官网 intl-tel-input.com 仍以 setCountry 为公开 API（[未核] 各版本签名差异）。

## 4. 字段识别行业心智模型——初步信号（cited，深度验证归子代理T1+atomcode）

- 浏览器原生：autocomplete token 体系（web.dev sign-in-form-best-practices 明确 autocomplete 是浏览器与密码管理器的识别主通道）。
- 密码管理器：启发式 + autocomplete + 多信号（Reddit/webmasters.SE 讨论证实"扫描相邻输入对 + 启发式"是通行做法；学术侧有 Leaky Autofill 等实证研究 PDF）。
- 共性（初步，待 atomcode 深研确认）：**多信号融合 + 置信度 + 保守失败**（宁可漏不误报 vs 宁可误报不漏，两种策略取向需本项目决策）。

## 5. 对本项目的映射建议（candidate，供 spec 阶段决策）

1. 工程化：vite-plugin-monkey + TS + 模块化（detect/fill/ui/store 分模块），构建产物仍单文件发布 GreasyFork。
2. 测试：本地 fixture 服务器 + Playwright E2E，复用/扩展 test/ 现有 3 个测试页为 fixture 集；检测器（detect 模块）抽成纯函数（DOM→评分/判定），可用 Playwright 组件测试或轻量 DOM 库做单元级验证。
3. iti 适配：把 fillIti 的 5 层 fallback 重组为"版本探测 → 能力接口"适配层，整理 v16–v29 版本矩阵。
4. 检测模型：多信号评分制（autocomplete token 为最强信号、label/placeholder/name/aria 次之、选项形态学再次之）+ 置信度阈值 + 两级 UI（低置信度不自动插按钮，改为 hover 提示）——具体阈值与分级策略由子代理T1+atomcode 调研后定。

## 6. 调研缺口

- Chrome autofill 内部评分细节（Chromium 源码 autofill component 的具体信号权重）未检索——atomcode 深研补充。
- GreasyFork 同类脚本竞品分析未做——atomcode 补充。
- vite-plugin-monkey 与 GreasyFork 发布流水线（CI 自动发版）细节未核。
