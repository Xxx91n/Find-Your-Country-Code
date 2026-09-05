# 窗口实施报告：12 — iframe 帧治理与平台元数据收尾

> 子窗口（fresh context）实施 | 日期：2026-09-05 | 分支：cch/12-iframe-governance（commit ykn @ 341a390，已推送）
> 开工复述：本票 Wave 1、Blocked by: None —— 确认方式：issue 12 头部字段原文 + README 第二周期波次表「Wave 1 / 12 / 无」。必读 10 文件按序读全（issue → handoff → spec → WORKFLOW → atomcode 调研存档 → mental-model-v2 report → main.ts → store → vite.config → misdetection-root-causes §3.7）。
> 版本控制遵循 WORKFLOW §4.2（GitButler）。分支落位：非堆叠提交被拒（6 处 hunk 依赖 cch/01/06/07 未应用内容）——按 §4.2「确有依赖按堆叠」与 §5 教训（票 10 分支快照缺工程文件），but branch new --above cch/14-calibration-corpus（依赖栈顶）后提交。

## 1. 变更清单与理由

| 文件 | 变更 | 理由（对齐验收项） |
|---|---|---|
| vite.config.ts | grant 补 GM_registerMenuCommand；@match 保持 *://*/*；帧策略以注释显式声明 | 验收 1（grant）+ 检查点三。userscript 元数据**无正向 all-frames 键**（TM 文档核实：帧相关元数据仅有 @noframes），@match 命中 + 不设 @noframes = 全帧注入 |
| src/config.ts | IS_TOP_FRAME（self===window.top，跨域取 top 抛异常安全降级 false）、FRAME_TAG='cch-frame-v1'、FRAME_OPEN/FILL/FEEDBACK_MSG | postMessage 协议常量单一来源；降级方向安全（按子帧处理，面板只在顶层） |
| src/ui/index.ts | open() 增加 opts 与子帧分流；_remoteSource 远程面板状态；_pos() 空锚居中；行点击/负反馈远程分支 postMessage 回子帧；_requestRemoteOpen | 验收 2：面板宿主仅顶层渲染，子帧不重复注入 |
| src/main.ts | IS_TOP_FRAME 分流：顶层监听 OPEN 代开远程面板；子帧监听 FILL/FEEDBACK 对 pending 字段执行 Fill.run/负反馈；菜单命令仅顶层注册 | 验收 2/检查点二：每帧各自检测与填充（行为同源），填充在子帧本地执行 |
| tests/fixtures/iframe-child.html（新增） | 子帧表单：1 select（+NN 选项）+ 1 input(dialCode) + tel 锚 + __seq 记录器 | 同源/跨域父页共用子页 |
| tests/fixtures/iframe-same-origin.html（新增） | 顶层字段 + 同源 iframe | 验收 4 同源 fixture |
| tests/fixtures/iframe-cross-origin.html（新增） | 同上，子帧 src 指向本机 PORT+1（端口不同 = 不同 origin） | 验收 4 跨域 fixture；hermetic 无外网 |
| tests/server.mjs | handler 提取 + 双端口监听（PORT 与 PORT+1 同 handler） | 跨域 origin 的服务端前提 |
| tests/helpers/userscript.ts | GM stub 补 GM_registerMenuCommand 记录器（__cchMenuCount） | 验收 1 运行时断言（仅顶层注册） |
| tests/iframe.e2e.spec.ts（新增） | 7 例：元数据头断言、同源/跨域×（检出+宿主分工、子帧填充值+事件序列）、跨帧收藏一致、菜单命令仅顶层 | 验收 1/2/3/4 全覆盖 |
| .github/workflows/e2e.yml（新增） | push cch/** 触发：CRLF 守卫（tracked 文本无 \r，排除二进制/CRLF 白名单后缀）+ build + 全量 Playwright | CI-only 政策；验收 5 载体 |

## 2. 检查点核验

- **检查点一（复用既有同步通道，不新造第二套）**：跨帧存储一致性零新增同步代码——GM 存储 + BroadcastChannel（cch-favs-sync-v1 / RULES_BROADCAST）+ GM_addValueChangeListener 三通道原样复用。同源帧 GM 存储天然同份（E2E：顶层收藏 → 子帧面板 favs 区可见）。**跨域子帧 GM 存储同份由 TM 宿主保证**（GM_* API 由扩展 background 承载，cited：TM 文档 GM_values 节），CI 内无法验证宿主行为——见 §6 风险 2。postMessage 帧协议只承载「开面板/填充/负反馈」控制指令，不承载存储数据。
- **检查点二（子帧不渲染面板宿主；检测填充与顶层同源）**：E2E 逐帧断言子帧文档 #cch-root/#cch-pop count=0；子帧检测/评分/注入路径与顶层同代码（同一 IIFE 全帧注入），填充经 Fill.run 在子帧本地执行（值 +26 与 __seq=[input,change,blur] 在子帧记录）。
- **检查点三（跨域 fixture 覆盖 @match 命中即注入）**：跨域子帧 URL 为 http://127.0.0.1:4274（PORT+1），被 @match *://*/* 命中——E2E 断言跨域子帧内有 .cch-wrapper（注入事实=前提成立），另有产物头静态断言（@match 存在 + 无 @noframes）。

## 3. 验收清单逐条证据（issue 内 5 条，CI-only）

1. **元数据显式声明全帧启用 + GM_registerMenuCommand 列入 grant** ✅ — 产物头静态断言（spec:19）+ 运行时断言菜单命令仅顶层注册一次（spec:78）。
2. **顶层/子帧分工** ✅ — 同源+跨域两例（spec:29）：顶层与子帧各自注入图标（顶层 1 + 子帧 2）；面板在顶层文档打开、子帧文档无 #cch-root/#cch-pop。
3. **跨帧存储一致性** ✅ — spec:61 顶层收藏中国 → 子帧远程面板 favs 区出现中国（同份 GM 存储读取）；传播复用既有通道。
4. **iframe fixture（同源+跨域）+ E2E 子帧检出与填充，证据走 CI** ✅ — fixture×3 + 子帧填充断言（值 +86 + 事件序列在子帧记录）；CI run 33978323212 绿。
5. **顶层无回归：既有 E2E 全量在 CI 全绿** ✅ — 同 run：**49 passed（19.4s）**，基线 42 例全量在内，零回归。

**CI 证据**：run https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/33978323212 （success，1m3s，head 341a390）；摘录留档 .scratch/architecture-recovery/verification/12-e2e.txt。红转绿：首跑 33978168355 红灯（§5 教训）。

## 4. 偏离点（无授权级偏离，设计内决策申报）

1. **跨帧面板交互为新增 postMessage 协议而非「子帧无任何交互」**：issue 说「面板 UI 仅顶层渲染」；子帧图标点击后用户仍需选国家。选择：子帧图标点击 → 顶层代开居中远程面板 → 选择后 postMessage 回子帧本地填充。理由：与「每帧各自填充（行为同源）」验收语义一致，面板宿主不进子帧；协议 tag（__cch=cch-frame-v1）+ 方向校验（顶层只收非自身 source，子帧只收 window.top）。
2. **菜单命令注册从「无条件」改为「仅顶层」**：原实现每帧注册会在多帧页面出现重复菜单项；全帧启用后必须收敛，与验收 1「补齐菜单命令权限」合并交付。
3. **远程面板的召唤按钮只作用于顶层已登记字段**：_lowFields 登记在各自帧；负反馈按钮经 postMessage 回子帧对 pending 字段本地执行。多子帧召唤聚合属票 13 交互深化，非本票验收缺口。
4. **e2e.yml 触发器 push cch/**（非仅本票分支）**：与 release-dry-run.yml 触发模式对齐，后续票直接复用作 CI 证据载体。

## 5. 教训（对 WORKFLOW §5 的候选条目）

- **CI-only 政策下静态检查的盲区**：node --check 只查语法不查运行时标识符绑定。本票首跑红灯（run 33978168355）根因：把 const server = http.createServer(...) 改名为 handler 提取时，旧 server.listen 块成了孤儿引用（ReferenceError: server is not defined）。防再犯：改导出/改名且文件是进程入口（server/watcher/worker）时，本地验证升级为「加载即执行」级检查，或依赖 CI 首跑暴露——不依赖裸语法检查下结论。

## 6. 未完成/未验证项与给大脑的风险提示

1. **Tampermonkey 真机跨帧行为未在真实 TM 环境验证**：CI 用 GM stub（localStorage）+ Playwright frame 注入模拟。三个真机前提按文档推定（cited）：无 @noframes 全帧注入、GM 存储全帧同份、GM_addValueChangeListener 跨帧触发。建议发布前用真实支付/注册 iframe 站点冒烟（重点跨域子帧面板代开）。
2. **跨域子帧 GM_addValueChangeListener 传播**：同源帧已由 CI 验证；「同标签页跨域帧间 value change 触发 remote=true」属 TM 宿主内部行为，文档未逐字保证（candidate）。降级面：跨域子帧面板收藏区可能滞后到下次读值——不丢数据（写路径以 GM_setValue 为准），刷新自愈。
3. **低置信召唤远程聚合**：见 §4-3，属票 13 范围。
4. **同文件并行改动面**：ui/index.ts、main.ts、config.ts 在 Wave 1 多票并行下有合并依赖（票 13/15/16 同域）；本票已堆叠在共享栈（above cch/14）之上，后续堆叠顺序由大脑收口统一裁剪。

## 7. 本票文件触达面

新增：tests/fixtures/iframe-{child,same-origin,cross-origin}.html、tests/iframe.e2e.spec.ts、.github/workflows/e2e.yml。
修改：vite.config.ts、src/config.ts、src/ui/index.ts、src/main.ts、tests/server.mjs、tests/helpers/userscript.ts。
未触达（并行票所有物，归属核实后排除在提交外）：src/fill/index.ts、src/detect/index.ts、package.json、package-lock.json、README*。
