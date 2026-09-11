# Spec：Find-Your-Country-Code 心智模型 v2 周期（覆盖与误报再收敛）

> 依据 to-spec(综合既有调研,不再访谈)| 日期: 2026-09-05 | 周期: 心智模型 v2
> 输入: .scratch/mental-model-v2/report.md(宏观调查报告)+ research/ 既有七份调研 + atomcode 决策调研(本周期,会话 7cc6d6cd-0e62-4cc1-a9b5-eb1fbc183398,存档 research/atomcode-mental-model-v2.md)
> 上一周期(v1.4.0 架构恢复,票 01-10)spec 已归档: spec-cycle-v1.4.0-2026-09.md
> 测试缝: 复用最高缝「检测入口(DOM 进 → 评分出)」与「填充入口(字段+国家 → 行为出)」;本周期不新增跨模块 seam,新增逻辑全部落在既有模块入口内部(可见性闸门、ARIA 语义层均并入检测管线;能力探测并入填充管线)。

## Problem Statement

用户在任意网页填手机号时,脚本识别「电话国家区号」字段的两大痛点仍有残余: 其一,现代站点大量使用组件库伪下拉(MUI/AntD/Element/react-select/Radix)与 iframe 拆分表单,这些字段检测不到;其二,隐藏/装饰性字段(clip-path、content-visibility、遮挡、零尺寸)仍可能被挂图标,共享区号(+1/+44)与占位选项也干扰内容验证。上一周期已把检测升级为五层加权评分并修复 7 类误报,但发布脱节(线上仍是 v1.3.4)与上述残余意味着用户真实体验尚未兑现。

## Solution

维持「Chromium 分层预测 + Fathom 连续评分 + 密码管理器降级兜底」骨架不动,补齐三个工程支柱(atomcode 决策调研结论): ① 可见性正确性——注入档位增加几何/样式闸门,隐藏字段只登记不注入;② 数据驱动校准——fixtures 固化为正负例语料,precision/recall 基线 + 阈值标定脚本;③ 覆盖补全——iframe 帧治理、L3 内容验证加码、组件库伪 select 两阶段(先取证+ADR 裁决,再端到端实现)、React 19 填充兜底、评分一致性收尾。完成后发布并把发布链接恢复。

## User Stories

1. 作为在字段拆进子 iframe 的支付/注册站用户,我希望脚本在每个帧内都检测区号字段,这样跨帧表单不漏检。
2. 作为顶层页面用户,我希望选择面板只在顶层出现、子帧不重复弹面板,这样界面干净且多帧表单只出现一个入口。
3. 作为多帧页面用户,我希望收藏与站点规则在所有帧读同一份存储,这样行为跨帧一致。
4. 作为被 clip-path/content-visibility 或遮挡隐藏的字段页面用户,我不希望隐藏字段上出现图标(登记与手动召唤保留),这样误报不再发生。
5. 作为视觉替换型自定义下拉站点用户(隐藏原生 select 承载值),我希望该 select 仍可被检测、经面板填充,这样老式自定义下拉仍可用。
6. 作为共享区号(+1/+44)下拉用户,我希望选项消歧后填充仍准确,这样多国共享区号不错选。
7. 作为下拉带「请选择」占位首项的用户,我希望占位项不参与内容验证计分,这样计分不被占位文本污染。
8. 作为自定义选项值域站点用户,我希望 ISO2 判定改为数据全集成员测试而非形态学猜测,这样合法字段不被误杀、假两字母不撞库。
9. 作为 React 19 受控组件站点用户,我希望填充经能力探测走兜底强制 diff,这样提交值真实同步。
10. 作为 intl-tel-input 站点用户,我希望 iti 识别并入评分与分级(不再无条件最高分注入),这样 iti 容器内无关字段不再无条件挂图标。
11. 作为维护者,我希望全部阈值/罚分常量集中在配置单一来源且罚分独立叠加,这样评分行为可审计、可标定。
12. 作为维护者,我希望正负例语料有 manifest 与 CI 回归基线(precision/recall),这样任何改动不悄悄引入回归。
13. 作为维护者,我希望阈值与权重可由语料标定脚本重新标定,这样分数有数据依据而非人工拍定。
14. 作为 MUI/AntD/Element/react-select/Radix 组件库站点用户,我希望脚本先以取证+探测策略识别这些下拉(登记+手动召唤),这样覆盖扩大的同时不产生新误报。
15. 作为决策记录者,我希望 ADR-0005 以取证证据明确裁决伪 select 实现与否,这样该议题不再悬置。
16. 作为组件库站点用户(若 ADR-0005 裁决实现),我希望两形态 combobox(可编辑型/select-only 型)端到端识别并填充,这样现代组件库表单可用。
17. 作为新窗口协作者,我希望 CONTEXT.md 有行业心智模型对照章与本周期新术语,这样不再重复调研。
18. 作为用户,我希望新版本发布后 README 与 GreasyFork 下载链接真实可达,这样安装路径不断链。

## Implementation Decisions

- **帧治理**: 元数据显式声明全帧启用;顶层/子帧分工(每帧各自检测与填充,面板仅顶层渲染);跨帧存储经既有 GM 同步通道一致;菜单命令权限补入声明。
- **可见性闸门**: 只作用于注入档位,不阻断检测登记——display:none/零尺寸/opacity:0/clip-path/content-visibility/遮挡判定的字段降为登记+手动召唤;隐藏但承载值的原生 select(视觉替换型)保持可填充。参考 Bitwarden 可见性服务与 KeePassXC #2184 教训。
- **L3 内容验证加码**: ISO2 判定改为对数据全集成员测试;共享区号选项消歧走文本(+区号)+国家名;占位首项(请选择类)剔除,不参与计分。
- **React 19 填充兜底**: 能力探测(实例级 value setter 补丁 + valueTracker 存在性)→ 兜底路径强制 diff + 既有事件序列;探测失败安全降级为现有路径;textarea/select 各自原型不变。
- **评分一致性**: iti 识别并入评分(容器信号加分,取消无条件最高分短路);L3 数字占比罚分独立叠加;散落常量全部集中配置。
- **校准语料**: fixtures 固化正负例 manifest;precision/recall harness 与阈值标定脚本产出数字基线;CI 执行,证据只认 CI run。
- **伪 select 两阶段**: 阶段一取证(逐库 DOM/ARIA 结构 + aria snapshot 视觉样本 + 探测策略设计,只登记不注入)+ ADR-0005 裁决;阶段二依裁决实现 ARIA 语义信号层(role=combobox/listbox、aria-expanded/controls/activedescendant、label 语义、shadow 内列表文本)与填充策略(select-only 型走开面板+键盘/点击选值;可编辑型走隐藏输入原生 setter+事件)。
- **术语沉淀**: CONTEXT.md 增补行业心智模型对照章 + 新术语(帧治理/可见性闸门/校准语料/伪 select/ARIA 语义层)。
- 模块边界沿用上一周期(detect/fill/ui/store/rules/data/config),不含具体文件路径与代码片段(遵循 to-spec 模板约束)。

## Testing Decisions

- 好测试只测外部行为: 图标出现与否与档位样式、面板行为、填充后的最终值与事件序列;不测内部评分数字(校准基线除外,harness 单独存在)。
- CI-only 政策: 一切构建/测试证据只认 CI run/artifact;窗口推送验证分支触发 workflow,本地不运行项目测试。
- Prior art: 既有 fp-regression、rescan E2E、框架注入 E2E 与票级门禁模式;新增 iframe fixture(同源+跨域)、React 19 hermetic fixture、可见性样本集、伪 select fixture(18 票)、语料 harness(14 票)。
- 回归红线: 既有误报样本全不注入 + 正样本不回归;每票提交前经 CI 全量 E2E 绿。

## Out of Scope

- closed shadow root 穿透(维持观望,B10);ML/服务端识别;FACE/ElementInternals 与 autofill 事件(OT)监听(观察项,待标准成熟);可解释 UI 气泡(延后);站点规则 2.0(负反馈语料回流/规则版本化,延后);GreasyFork 之外的托管平台。

## Further Notes

- 波次只从 issue 的 Blocked by 字段推导,不新造顺序;波次表在 .scratch/architecture-recovery/README.md 第二周期节。
- 发布门禁: 19 票完成 + 用户确认后执行发布动作(遵循 WORKFLOW §4.2);线上当前仍是 v1.3.4(2026-09-05 实抓证据)。
- atomcode 决策调研完整提示词与结论存档: research/atomcode-mental-model-v2.md;子窗口调研级决断复用该提示词,遵守串行护栏。