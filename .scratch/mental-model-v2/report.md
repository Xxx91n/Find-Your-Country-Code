# 心智模型 v2 宏观调查报告

> 大脑 Agent | 2026-09-05 | 只调查不修改,零代码改动、零本地构建(CI-only 政策)
> 证据链: 交接文档 + 上轮 8 份调研资产 + codegraph(797 节点/58 文件) + 2 个 Explore 子代理实码核实 + atomcode 深度调研x3(串行) + anysearch batch_searchx4 + GreasyFork 实抓

---

## 0. 一句话结论

**代码里已经修好了,但修复从未发布。** 用户看到的「误检测 + 大部分网站不生效」全部来自线上仍在跑的 v1.3.4(布尔检测旧版);本地 v1.4.0(五层评分引擎 + Shadow DOM/SPA + iti 适配层)完整存在且门禁历史全绿,但 origin 落后 30 commit、GreasyFork 线上 @version=1.3.4(2026-09-05 实抓 install URL 元数据块)。心智模型本身已按行业工业级共识重建,残余的"乱"是发布脱节 + 几个架构残留点 + 组件库伪 select(B1)未做。

## 1. 现状盘点(证据)

| 项 | 状态 | 证据 |
|---|---|---|
| 本地 main | 6c23720,含 v1.4.0 全部(104 文件) | git log |
| origin/main | 8c5e266,落后 30 commit,**从未 push** | git log origin/main + 交接文档 |
| GreasyFork 线上版本 | **1.3.4** | 实抓 update.greasyfork.org/scripts/573755 元数据块 |
| GitHub Release | 无 v1.4.0(未 push 未触发 release.yml) | 交接文档 |
| 五层评分引擎 | 真实实现 | 子代理实码核实 src/detect/index.ts:138-261 |
| 平台层 | 大体对齐,4 项差距 | 子代理平台审计(见 3.3) |
| 上轮门禁 | 9 道全绿 + repro-v2 25/25 + E2E 42 例 | 交接文档(CI/历史证据,本机未复跑) |
| codegraph | 本轮重建索引:797 nodes / 1,997 edges / 58 files | codegraph init |

## 2. 痛点归因

### 2.1 误检测(非选区号也有图标)
v1.3.4 的 7 条误报路径 -> v1.4.0 逐一防御(子代理逐条对照,25/25 回归覆盖 8 个误报样本全不注入):

| 老版本路径 | v1.4.0 防御点 |
|---|---|
| prefix 歧义词 | 降权组 7 分(config.ts:19) |
| 裸词「区号」 | 守卫 detect/index.ts:181-184 |
| 纯数字 option | L3 -40 罚分(config.ts:36-37) |
| 国家 select 混同 | country 语义 suppress(detect:254-258) |
| ISO2 撞库(mr/ms) | 国家名关联双证据门(optStats 78-82) |
| hidden->idd 撞库 | matchLatin 长度护栏(40-42) |
| EXCLUDE 误杀「国家/地区区号」 | 词边界 + compound 白名单 |

### 2.2 大部分网站不生效
v1.3.4 三大盲区 -> v1.4.0 修复: Shadow DOM 完全盲区 -> BFS open-root 穿透 + per-root observer; _done WeakSet 终态 -> 指纹重评; autocomplete/inputmode 不读 -> L0 100 分强信号; iti 中间版本断链 -> v16-v29 适配层(getInstance 稳锚)。**但用户浏览器仍跑 1.3.4,症状在真实世界依旧——这是「修复了一轮,现在不知道什么情况」的第一解释。**

### 2.3 v1.4.0 自身残留风险(非完美,供立票)
- _isIti 短路: 任意 .iti 容器内 input 直接 score:100 auto,绕过评分(detect:465-467)——唯一评分外误检残留面
- L3 数字罚分为 else-if: 存在区号选项时数字占比再高也不罚(detect:212)
- 魔法数 25 未入 config(detect:487)
- B1 组件库伪 select 未做(ADR-0004 deferred)
- B2 shadow 内 L2 锚不穿透; B4 React 19 未实测核验(本轮调研确认 _valueTracker 机制仍在,现有原生 setter 手法有效,需能力探测兜底)
- iframe 完全无治理(无 @noframes/@all-frames); closed shadow root out-of-scope
- GM_registerMenuCommand 未入 grant(main.ts:8,38)

## 3. 心智模型盘点

### 3.1 行业成熟心智模型(上轮 + 本轮三问调研收敛)
1. **字段语义识别 = Chromium 分层预测 + Fathom 连续评分 + 密码管理器降级兜底**: autocomplete token 最高优先 -> 启发式加权 -> 内容验证(rationalization)-> 识别不了就人工兜底(负反馈/手动召唤)
2. **油猴平台工程化 = 最小权限元数据(@grant 显式、@match 优先、@version 驱动自动更新)+ vite-plugin-monkey 脚手架 + MutationObserver SPA 模式 + attachShadow 抢注 closed root + 类型安全存储包装 + 事件驱动模块 + tag->CI->GreasyFork 同步发布**
3. **现代控件适配(2026)= ARIA 1.2 combobox 双形态(可编辑 input 型 / select-only button 型,值在组件 state 不在 DOM)+ 原生 setter + 冒泡 input 事件(React 16-19 一致,select 用 change)+ 每框架事件表微调(Vue/Svelte 不劫持 setter、Angular 补 blur)+ iframe 跨域硬边界(扩展 all_frames 逐帧注入 / 油猴逐域 @match)**

### 3.2 本项目对齐度
- 检测侧: **模型 1 全形态已实现**(五层瀑布 + 分数 + auto/lowkey/none 分级行动 + 负反馈/手动召唤 = 降级兜底)。术语已沉淀 CONTEXT.md
- 平台侧: 大部分对齐(vite-plugin-monkey、GM_* 版本化键 + BroadcastChannel/监听双通道、SPA hook、shadow 穿透、i18n)
- 控件侧: 原生三形态 + iti 完整,组件库伪 select 缺失(B1)

### 3.3 「乱」的具体定位(诊断)
1. **发布脱节(最大)**: 代码世界观已重建,线上用户仍活旧世界观,同一脚本两套心智并存
2. **双轨判定残留**: _isIti 布尔短路与评分引擎并存
3. **平台层 4 缺口**: frame 策略空缺、菜单命令未入 grant、早期 SPA(document-start)漏渲染、语言不可用户覆盖
4. **治理悬置**: backlog B1-B10 未立票,ADR-0004 悬而未决

## 4. 可复用轮子清单(复用优先,不重复开发)

| 轮子 | 用途 | 状态 |
|---|---|---|
| WHATWG autocomplete token 表 | 检测 L0,零依赖直接实现 | 已实现 |
| query-selector-shadow-dom 算法 | shadow 穿透,内联 | 已实现(自写 BFS) |
| intl-tel-input getInstance/setNumber | iti 互操作唯一稳定锚 | 已实现适配层 |
| libphonenumber-js 元数据 | 区号数据,构建期提取 | 未用(手抄 240 国表,漂移风险) |
| vite-plugin-monkey | 构建脚手架(事实标准) | 已用 |
| GM_config | 配置系统(规则 UI 复杂化时备选) | 未用 |
| waitForKeyElements | SPA 轮询心智(CC0) | 借模型 |
| Testing Library / Playwright getByRole | ARIA 语义查询心智 | 借模型(B1 核心) |
| grant-none-shim / @types/tampermonkey / publish-greasyfork.yml | 权限兜底/类型/GF 发布 CI | 未用 |
| Chromium appearance:base-select | 行业趋势:可样式化原生 select 普及将缩小伪 select 问题面 | 观察 |

**竞品结论**(anysearch + atomcode 双线): 油猴/扩展领域**无成熟同类竞品**,本脚本仍是该细分唯一深度实现;最接近的成熟形态是密码管理器扩展而非 userscript——行业空白区的定位不变。

## 5. 路线图(建议,不动代码)

1. **发版 v1.4.0(解除阻塞)**: 用户确认 -> push origin main -> release.yml 自动发版 -> GreasyFork 同步 -> README 恢复下载链接(B9)-> 用户重装后在真实网站复测,用真实世界反馈校准后续优先级
2. **立票**: B1 组件库伪 select(本轮 ARIA 1.2 调研证据已足,ADR-0004 可重开)+ B4 React 19 实测 fixture + iframe 治理新票
3. **架构深化小票**: _isIti 评分化、L3 else-if、魔法数入 config、frame 策略显式声明、GM_registerMenuCommand 入 grant
4. **心智模型沉淀**: CONTEXT.md 增补「行业心智模型」引用段 + ADR 补录,让新窗口不重新调研

## 6. 待用户决策(阻塞项)

1. **是否 push origin main**(触发 v1.4.0 发版)——唯一外发阻塞,交接文档已在等
2. backlog B1-B10 + iframe 新票是否立票
3. but 残留(lkq conflicted 虚拟分支标记)是否清理

## 7. 本轮操作记录(状态变更透明度)

- 未修改任何仓库源码;未运行任何构建/测试(CI-only 政策)
- codegraph init(重建 .codegraph 索引,分析产物非构建产物)
- 1mcp 网关: 发现 24h 卡在 starting + 端点超时 -> 1mcp --restart 恢复(running,PID 2920)-> anysearch backend 连通并执行 batch_searchx4
- 新增文件: .scratch/mental-model-v2/goal.md + report.md(本文件)