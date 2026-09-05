# atomcode 决策调研存档：心智模型 v2 周期

> 运行: 2026-09-05 | 大脑 Agent | 会话 ID: 7cc6d6cd-0e62-4cc1-a9b5-eb1fbc183398(可 atomcode --resume 复查)
> 用途: 本周期全部调研级决断的证据源 + 子窗口调研的标准提示词模板(串行护栏: 同一工作区任意时刻至多 1 个 atomcode 在途)

## 一、标准调研提示词(完整版,子窗口直接复制使用)

决策型全景调研: 一个浏览器油猴脚本在任意网页检测「电话国家区号」字段并注入选择面板,其当前心智模型是: (1) 检测 = Chromium 分层预测(autocomplete token 最高优先 → 启发式加权 → 内容验证 rationalization)+ Fathom 式连续评分 + 密码管理器「识别不了就人工兜底」的降级哲学,落地为五层信号瀑布(L0 autocomplete/inputmode → L1 词表加权含歧义词降权组 → L2 锚-目标关联 → L3 下拉选项内容验证 → L4 排除词负分)+ auto/lowkey/none 三档分级行动; (2) 平台 = 油猴工程化(vite-plugin-monkey、最小权限 @grant、GM_* 存储、MutationObserver SPA 模式、attachShadow 抢注、tag→CI→托管站发布); (3) 控件适配 = 原生 select/input/intl-tel-input 三形态 + getInstance 稳锚 + 原生 setter+合成事件,组件库伪 select 尚未覆盖。请给出: (1) 从学术与工业两个背景审视该模型是否为最优解、存在哪些被忽视的成熟范式或风险; (2) 当前工业级已落地生产的心智模型与开源轮子盘点,标出可直接复用与仅可借模型的; (3) 在「通用网页覆盖 / 误报控制 / 可维护性」三维度上该模型还缺什么及优先级; (4) 最适合本项目的最终心智模型形态与分步演进路径。多角度覆盖,所有结论标注来源。

> 用法: 复制上段为 atomcode -p 参数;调研题不同时只替换第 (3) 问的维度词,骨架与四问结构不动。

## 二、本轮结论要点(证据摘要,全文在 ctx 知识库 source: atomcode)

1. 结构判定: 本模型 = Chromium 分层 × Fathom 评分 × 密码管理器降级三方交集,方向正确,已被两套生产实现独立验证。
2. 被忽视的范式与风险: 误报成本是正确性问题而非体验问题(CCS-20 Fill in the Blanks / ACSAC-24 Leaky Autofill: clip-path 与 content-visibility 隐藏字段全部密码管理器中招)——可见性闸门是行业标配; whatwg#8597 佐证「属性(L0)只是强先验,select 语义必须由选项内容(L3)裁决」,并点名共享区号集合需文本消歧 + ISO2 值域成员测试; Firefox FormAutofillHeuristics 有跨 iframe 合并表单的行业设计(本脚本唯一没抄的标配); Fathom 批评: 别用人工拍权重,用语料标定; AI 填表(MLLM)benchmark <5% 精度,不等待。
3. 三维缺口优先级: P0 = iframe 策略 / 可见性可达性闸门 / 校准语料与回归基线; P1 = L3 内容验证加码 / 伪 select 取证策略(先取证不仓促注入)/ 可解释出口 / 国家词表单一数据源; P2 = FACE/ElementInternals 观望、autofill 事件 OT 观望、closed shadow 确认 out-of-scope。
4. 最终心智模型: 骨架不动,补三工程支柱(数据驱动校准、可见性正确性、可解释与反馈回路);演进 S1 工程底座 → S2 L3 元数据化 → S3 站点规则 2.0 → S4 伪 select 取证立项 → S5 校准与可解释 → S6 前瞻接入。
5. 一句话收束: 本模型的问题不是「够不够好」,而是「能不能自证够好」——补齐可见性闸门、iframe、校准语料后,即为油猴约束下该细分最接近 Chromium 工程水平的答案。

## 三、可直接复用 vs 仅借模型(轮子速查)

| 轮子 | 判定 |
|---|---|
| WHATWG autocomplete token 表 | 直接复用(已实现 L0) |
| libphonenumber-js 元数据 | 直接复用(构建期提取,待 14 票语料体系后评估) |
| intl-tel-input getInstance/setNumber | 直接复用(宿主协议,已实现适配层) |
| query-selector-shadow-dom 算法 | 直接复用(已手写等价 BFS) |
| Chromium 分层预测 / Firefox FormAutofillHeuristics | 借模型(iframe 跨帧收集为待抄点) |
| Fathom / Bitwarden / KeePassXC / 1Password | 借模型(评分形式/词表设计/可见性闸门教训/信号面核对表) |
| ai-form-assistant | 借模型(低置信=预览确认,印证分级行动) |
| MLLM 填表代理 | 仅观望(<5% 精度) |
| ElementInternals/FACE | 借模型(前瞻,标准未成熟) |

## 四、来源清单说明

本轮 17 次搜索(Exa×7/Tavily×5/AnySearch×5)+ 8 次原文全读,16 条来源含: Chromium autofill README 与 form_structure.cc、Firefox FormAutofillHeuristics.sys.mjs 源码、Fathom 官方文档、Bitwarden 架构文档、1Password 字段规范、whatwg/html#8597、CCS-20 与 ACSAC-24 论文、FormFactory(arXiv 2506.01520)、WebKit/MDN ElementInternals、Chrome autofill 事件文档等。逐条 URL 在 atomcode 会话原始输出,可 --resume 复查。