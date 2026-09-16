调研问题（verbatim）：

一个 Playwright 测试仓库里存在两个 harness，需要「收敛为同一份交互原语」：

H1（密封层）：跑在 playwright/test 测试运行器下，规格文件是 TypeScript（.spec.ts），断言用 expect / expect.soft，页面由 addInitScript 注入构建产物（userscript），零外网。
H2（live 层）：一个独立 node 脚本（.mjs），自己 chromium.launch() 打开第三方真实站点，没有测试运行器，没有 expect，自己收集结果并 process.exit。

两者都需要同一套「交互原语」：安装注入（GM_* 替身，其中 GM_registerMenuCommand 要记录 {title, fn} 且 fn 可调用）、开面板、在面板搜索框输入、点击国家行、读回宿主字段 value、读取填充反馈（toast）。

请调研工业级成熟做法并回答：
1. 交互原语层（interaction primitives / page object / test helper library）应该放在哪里、如何分层，才能在两个不同 runtime（测试运行器内 vs 独立脚本）之间共享同一份实现而不新造第二套？
2. 共享层应该包含什么、不应该包含什么（尤其：驱动/读取 vs 断言 的边界该划在哪里）？
3. 两个 runtime 断言风格不同（expect.soft vs 自建软收集器）时，业界如何处理「一次收全量」而不重复实现？
4. 语言/模块形态选型：共享层写成 .mjs（两个 runtime 都能直接 import）还是 .ts（live 侧用 node 的 type stripping 加载）？各自代价与风险。
5. 常见反模式（例如把断言写进共享层、让 live 层 import 测试运行器、复制粘贴第二套 stub）。

请给出推荐与理由、替代方案与取舍，并给出可核验的来源（官方文档 / 成熟项目代码 / 工程博客）。