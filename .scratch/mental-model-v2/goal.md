# Goal — 心智模型 v2 周期(防丢失锚点)

> 创建: 2026-09-05 | 身份: 架构大脑 Agent(只调查,不直接改代码)
> 无预算限制。步骤以 message 方式在 TodoWrite 中推进;本文件为跨会话锚点。

## 目标(Goal)
诊断 choose-your-country 油猴脚本的「心智模型混乱」问题,并给出重建路线:
1. 摸清行业成熟心智模型/模板/轮子(用户脚本领域 + 电话号码输入检测领域),调研优先复用而非重复开发。
2. 定位两大症状根因:
   - 适配率低(大部分网站脚本不生效)
   - 误检测(非选区号也出图标)
3. 输出宏观调查报告 + 路线图(不动代码)。

## 硬约束
- 大脑 Agent 只做宏观调查,不直接修改任何源码;细小问题派子代理。
- 心智模型路线细节必须走 atomcode-research 深度调研(串行:同一时间最多一个 atomcode run 在途,失败续跑不重开)。
- 版本控制用 but;与其它分支并行,互不影响。
- ponytail full 模式:不做幻觉推理,证据优先,最懒可用解。
- CI-only 构建政策:本机禁止构建/测试运行,证据只认 CI。

## 关键路径
- 交接文档: %TEMP%/CLOSING-HANDOFF-Find-Your-Country-Code.md(已读:上轮 10/10 闭环,v1.4.0 就绪未推送)
- 上轮调研资产: .scratch/architecture-recovery/research/(industry-models / misdetection-root-causes / repo-survey)
- 领域词汇: CONTEXT.md | ADR: docs/adr/0001-0004
- 上轮总结: docs/architecture-recovery-2026-09.md(§6 backlog B1-B10)

## 调查步骤(message)
1. [done] 读交接文档 + 全部 skills
2. [done] goal 落盘
3. [done] 读 CONTEXT.md + 上轮调研资产
4. [done] codegraph CLI 探索仓库(797 节点索引重建)
5. [done] 派子代理细问调研(检测引擎核实 / 平台层审计)
6. [done] atomcode 串行深度调研x3(伪select / 油猴工程化 / 2026框架+iframe)
7. [done] anysearch MCP 广泛搜索(1mcp 网关重启恢复后 batch_searchx4)
8. [done] 输出宏观调查报告 -> report.md(本目录)
9. [done] 票据化: atomcode 决策调研#4 -> spec v2 + issues 11-19 + handoffs x9 + prompts x9
10. [done] 自检 0 FAIL(mm v2 自检脚本可重复运行)+ 波次表(W1-W4)写入 .scratch README
11. [done] but 提交(cch/mmv2-tickets, 堆叠 cch/10)
12. [wait] push: 待全部票据实施完成(用户排定: 票据做完再 push)
