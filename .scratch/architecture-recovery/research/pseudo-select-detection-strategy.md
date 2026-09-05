# 伪 select 探测策略设计（票 17）——登记 + 手动召唤，不含注入

> 生成: 2026-09-05 | 票 17 | 级别硬约束: 只登记（记录候选与证据）+ 手动召唤（用户菜单/快捷键按需展开面板）；**不自动注入图标、不做自动填充**。自动注入与否及实现归 18 票（以 ADR-0005 裁决为准）。
> 证据源: `research/pseudo-select-forensics.md`（observed）+ spec.md 伪 select 两阶段决策。

## 1. 候选发现（signal collection，只读不动 DOM）

探测入口并入既有检测管线（检测入口缝: DOM 进 → 评分出），伪 select 作为新信号源登记，不新增跨模块 seam:

1. **触发器普查**: `document.querySelectorAll('[role=combobox]')`（含 shadow 穿透，复用既有 open-root BFS）。
   - 5/5 库 observed 全部带 `aria-expanded`（EP closed 态为空串，判定用 `getAttribute(...) !== null` 而非真值检查）。
   - `aria-haspopup` 只能作加分不作门槛: MUI/antd/EP=listbox、react-select=true、Radix=无。
2. **弹出层解引用**: 读 `aria-controls`（5/5 库都有）+ `aria-owns`（antd 额外），沿 id 在 `document.getElementById` 与 shadow root 内解引用；**不得**在触发器子树内找列表（4/5 库 portal 到 body）。
   - 关闭态 target 可能未挂载（MUI observed 悬空 id）→ 此时触发器文本作为静态证据，展开时再复评。
3. **选项语义**: 弹出层内 `[role=option]`; 候选国名匹配同时吃 `textContent` 与 `aria-label`（antd observed 文本=ISO2、国名在 aria-label）；`aria-selected`、`data-value`、`data-highlighted` 逐属性取证。antd 虚拟化提醒: 展开态只对可见 option 断言，不要求全量枚举。
4. **label 语义**: combobox 可访问名计算（aria-labelledby → aria-label → 关联 label）→ 进 L1 词表加权（「国家/地区/区号」类）。
5. **值承载探测（填充前置检查）**: 依序找 隐藏 native input（MUI/react-select: 容器内 `input[name][aria-hidden=true]` / `input[type=hidden][name]`）→ 触发器可见文本 → 展开态 option[aria-selected]。三分天下（2 库有 DOM 承载 / 3 库 state 承载）决定了「读值可多级回退、写值必须逐库策略」——后者归 18 票。

## 2. 打分与分级（并入五层瀑布，不另立体系）

- role=combobox + aria-expanded + aria-controls 可解出 role=listbox 且含 option → 组合信号加分（相当于 L2 锚-目标关联层）。
- 可访问名命中国家词表 → L1 加权; option 文本/aria-label 命中国名或 ISO2 全集成员 → L3 内容验证加分（复用 14 票语料阈值体系标定，不手工拍权重）。
- **降权/否决组**: 搜索型 combobox（`aria-autocomplete=list|both` 且可编辑、无 aria-selected option 结构，如站内搜索补全）; role=listbox 出现在非选择控件（单选按钮组、多选 tag 列表）。
- 行动档位: 命中 → **登记 + 手动召唤**（低配图标或仅菜单列出候选）; 不自动注入是本票硬边界。

## 3. 手动召唤交互（复用既有面板协议）

登记候选后，用户经既有菜单/快捷键召唤面板: 面板列出候选 combobox 及其展开态选项，用户点选后由 18 票的填充策略执行（select-only 型: 开面板+键盘/点击选值; 可编辑型: 隐藏 input 原生 setter+事件——均为 18 票范围，本票不实现）。

## 4. 明确排除（本策略不做）

- 不注入图标到第三方 DOM（登记档不挂图标，隐藏字段档位先例）。
- 不监听第三方组件内部事件（observed: 5/5 库选值无原生 change/input 事件，事件监听路线无效）。
- 不做内容验证事件驱动化; 只在登记/召唤时点态快照。
- 不穿透 closed shadow root（B10 维持 out-of-scope）。
- 不在 MutationObserver 高频路径做全文档 combobox 普查（性能护栏: 普查节流 + 仅对新增顶层容器做一次）。

## 5. 验收映射

- issue 验收③「探测策略设计: role=combobox/listbox + aria-expanded/controls/activedescendant + label 语义 + shadow 内列表文本; 级别登记+手动召唤，不含注入」→ 本文件 §1/§2/§4 全覆盖（activedescendant 实测仅 3/5 库使用，故设计为加分项而非门槛，逐库证据见取证报告）。
- shadow 内列表文本: 触发器普查与 id 解引用均走既有 open-root BFS 穿透路径（§1.1/§1.2）。
