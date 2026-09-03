# 窗口实施报告：01 — 模块化工程骨架迁移

> 子窗口（fresh context）实施 | 日期：2026-09-03 | 分支：cch/01-modular-skeleton
> 开工复述：本票无阻塞（issue 声明 Blocked by: None，为波次首票，已由 but status 确认工作区无其他票分支堆叠）；必读清单已按序读全（prompt → issue → handoff → spec → WORKFLOW → src 基准 → release.yml → infra-patterns）。

## 1. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| package.json | 新增（vite + vite-plugin-monkey + typescript + playwright devDeps，build/dev 脚本） | 工程化入口，vite-plugin-monkey 为 infra-patterns 选型标准 |
| package-lock.json | 新增 | 可复现安装（单独 commit） |
| tsconfig.json | 新增（ES2020/ESNext/Bundler/noEmit） | TS 工程基础 |
| vite.config.ts | 新增（monkey 插件，元数据与 v1.3.4 头部逐字段一致） | 构建单 .user.js |
| .gitignore | 追加 node_modules/ dist/ | 构建产物不入库 |
| src/config.ts | 新增（SELECT_KW/SELECT_EXCLUDE_KW/INPUT_KW/LABEL_PHRASES/OWN_ROOT_ID/WRAPPER_CLASS 常量） | 原单文件 CONFIG 区块 |
| src/i18n.ts | 新增（LANG/MSG/t） | 原 I18N 区块 |
| src/data/countries.ts | 新增（COUNTRIES/ISO2_MAP） | 原 COUNTRY DATA 区块（国家数据逐行保留） |
| src/store/index.ts | 新增（createStore 工厂，原 Store 对象体逐行保留） | 原 STORAGE 区块；GM 存储/跨标签同步 |
| src/detect/index.ts | 新增（createDetect(UI) 工厂，原 Detect 对象体逐行保留） | 原 DETECTION 区块；仅入口接口对 UI 注入 |
| src/fill/index.ts | 新增（createFill(UI) 工厂，原 Fill 对象体逐行保留） | 原 FILL 区块；toast 经注入的 UI |
| src/ui/index.ts | 新增（createUI(Store, deps) 工厂，原 UI 对象体逐行保留；Fill.run 改为 deps.Fill.run） | 原 UI 区块；跨模块经入口接口 |
| src/rules/index.ts | 新增（createRules 最小占位：isExcluded()=>false） | spec 模块边界含 rules；行为等价期不引入站点规则逻辑 |
| src/main.ts | 新增（IIFE 外壳装配 5 个工厂 + observe/init 逐行保留） | 入口装配，行为与基线一致 |

迁移策略：以 src/Find-Your-Country-Code.js（v1.3.4，986 行）为唯一事实源，程序化按区块边界切片；除「工厂化包装 + 模块化导入 + 跨模块经入口」外零行为改动，未顺手修改任何检测/填充逻辑（02/03 票范畴）。

## 2. 验收命令与退出码与关键输出

### 验收 1：构建产物为单个 .user.js，头部元数据与 v1.3.4 一致（通过）
- 命令：npm run build → exit 0，关键输出：dist/find-your-country-code.user.js 43.95 kB（gzip 13.88 kB），10 modules transformed；dist 目录仅此一个 .user.js。
- 比对脚本（node）：逐字段比对 src 头部 14 个字段（name / name:zh-CN / namespace / version / description / description:zh-CN / author / license / homepageURL / supportURL / downloadURL / updateURL / match / run-at）与 3 个 grant（GM_setValue / GM_getValue / GM_addValueChangeListener）→ 全部 eq=true，无缺失无多余。期间发现并修复 1 处描述差异（description:zh-CN 少「快速选择面板并自动填充区号」片段），修复后复跑构建 exit 0 且逐字段一致。

### 验收 2：test/ 三页场景 A–E 行为与 v1.3.4 一致（通过）
- 命令：node .scratch/architecture-recovery/research/scripts/behavior-compare.mjs → exit 0（Playwright chromium headless + 本地静态服务器 + GM stub，旧 src 直注 vs 新 dist 注入，逐页对照按钮数/面板开合/搜索行数/填充终值/动态注入按钮数）。
- 关键输出：
  - test-page.html：old {buttons:3, panel:1, search:1, value:"+86"} vs new 相同 → diff: []
  - cch-test-page.html：old {buttons:8, panel:1, search:1, value:"+86", dynamic:9} vs new 相同 → diff: []
  - cch-test-page2.html：old {buttons:8, panel:1, search:1, value:"+86"} vs new 相同 → diff: []
  - 末尾：RESULT: ALL PASS
- 期间发现并修复 1 处运行时缺陷：构建产物报 WRAPPER_CLASS is not defined（原单文件闭包共享常量，切片后 OWN_ROOT_ID/WRAPPER_CLASS 未导入）→ 移入 config.ts 统一导出，修复后复跑 exit 0 全通过。

### 验收 3：release.yml 发布链路影响评估（通过，仅评估不改动；实际适配归票 10）
- 现状（observed）：workflow 触发路径 src/Find-Your-Country-Code.js；版本提取 grep -m1 '// @version' src/Find-Your-Country-Code.js；Release 附件 files: src/Find-Your-Country-Code.js；changelog 读取 greasyfork/Glog.md / Glog_EN.md。
- 模块化后影响：a) 版本元数据已迁移到 vite.config.ts 的 userscript.version（构建产物头部仍含 @version 1.3.4），旧 grep 路径找不到版本 → 需改为从 vite.config.ts（或产物 dist/*.user.js）提取；b) 发布附件路径需从 src/Find-Your-Country-Code.js 改为 dist/find-your-country-code.user.js，且应在 checkout 后先跑 npm ci && npm run build；c) 触发路径需加入 src/** 或 vite.config.ts/package.json 变更。结论：需要适配，属票 10「release-pipeline」收口范围，本票不改动 workflow。

### 验收 4：模块职责边界（跨模块只走入口接口）（通过）
- 命令：node 检查 9 个模块文件 imports/exports → 输出：detect 只导入 config/data；fill 只导入 i18n；ui 只导入 i18n/config/data；main 只导入 5 个 create 工厂；无任何模块直接 import 其他模块的内部文件路径；无内部符号跨模块直引（UI→Fill 经 deps 注入、Detect/UI 经工厂参数注入）。rules 为最小占位工厂（行为等价期不承载规则）。

## 3. 偏离点

- 验收 2 采用一次性 Playwright 脚本（行为等价要求「本地静态测试页对照」，handoff 未指定工具）：复用 infra-patterns 的 E2E 心智模型；脚本落盘 research/scripts/behavior-compare.mjs 与 diag-new.mjs（WORKFLOW §2.6 node 脚本约定）。Playwright 完整测试基建属票 06（Wave 2），本票未引入 test runner 配置。
- store/fill 未做 GM_ 严格 stub 的跨标签测试：behavior-compare 以同步 stub 覆盖 GM_getValue/setValue/addValueChangeListener；BroadcastChannel 跨标签同步属原逻辑，未在 headless 下覆盖（非本票行为 delta）。
- rules 模块为占位：spec 规定模块边界含 rules，但本票约束「不引入任何行为变更」，故仅建工厂骨架；站点规则引擎属票 05。

## 4. 未完成/未验证项

- release.yml 的路径/版本提取适配：只评估未改（验收 3 结论明确需要适配，动作归票 10）。当前 main 分支 release workflow 若触发会因路径/版本提取失效而失败 —— 已列入给大脑的风险提示。
- iti 真实版本矩阵（v16–v29）联动行为：本票仅验证 test-page2 的 iti@18.2.1 场景（buttons 一致），全矩阵适配属票 03。
- Firefox/Tampermonkey 手工安装冒烟：未执行（本票以 headless Chromium 行为对照为验收证据；spec Out of Scope 声明 Firefox 专项兼容不在当前范围）。

## 5. 给大脑的风险提示

1. release.yml 需要适配（票 10 前置信号）：当前 workflow 会因版本提取/产物路径失效；在票 10 落地前，main 分支上 src/Find-Your-Country-Code.js 不再变动，workflow 触发条件也不会满足，风险是「静默失效」而非「立即失败」。
2. src/Find-Your-Country-Code.js 已成为只读基准：后续票（02+）应从 src/main.ts 出发；任何对旧单文件的修改都会破坏「基准对照」语义，建议大脑在 README/票表标注。
3. 行为等价证据强度：Playwright headless + GM stub 覆盖了按钮注入/面板/搜索/收藏/填充/动态注入的核心路径；未覆盖真实油猴运行时（GM 存储跨标签、run-at 时序差异）。若票 02 引入评分引擎，建议先落 Playwright fixture（票 06）再动 detect。
4. 仓库基建补充：新增了 node_modules/dist 忽略与 package-lock.json；.gitattributes 与 CRLF 规范化未做（本票文件均为 LF/CRLF 混合继承自原文件，构建产物为 LF）——建议大脑决定是否纳入后续卫生票。
5. GitButler 注册：本次执行了 but setup 将仓库接入 GitButler（工作区分支模型），属可逆操作（but teardown 可回退）；后续所有票的版本控制均可在 GitButler 下进行。
