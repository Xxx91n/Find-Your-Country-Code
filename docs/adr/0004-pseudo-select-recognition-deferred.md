# 0004 — 组件库伪-select 识别（C6）降级缓议，不入本周期

状态：deferred（缓议） | 日期：2026-09-04 | 来源：架构恢复 C6（report/architecture-review.md）

## 决策

MUI / AntD / Element-Plus 等组件库伪 select（`role=listbox` / `role=combobox` + aria 结构）的识别**明确 out-of-scope**，本周期不实现，也不预留半成品；若未来立项，必须先做一轮 atomcode 专项调研（各库 DOM 结构与 aria 模式逐库取证）。

## 被否决路线与理由

- **直接按 role=listbox/aria 结构实现**：现有调研证据仅覆盖"原生 select 之外存在该形态"（observed 缺口），未做各库 DOM 结构调研——证据不足即实现会引入新误报面，违反本仓库"候选不升格为 confirmed"的证据纪律（WORKFLOW §2.5）。

## 后果

该形态的漏检在本周期接受（误报治理优先于该类漏检补齐）；如遇具体站点投诉，可先用强制选择器（ADR 0003）做站点级兜底，无需改引擎。
