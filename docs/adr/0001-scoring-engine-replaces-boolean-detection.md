# 0001 — 检测采用多信号加权评分，取代布尔命中

状态：accepted | 日期：2026-09-04 | 来源：架构恢复 C1（report/architecture-review.md）

## 决策

检测核心为纯函数 `scoreElement(el, ctx) → {score, tier, signals}`：L0–L4 五层信号加权（autocomplete/inputmode token → 词表/label 加权 → 锚→目标关联 → 下拉选项内容验证 → 排除词负分），按阈值（SCORE_AUTO=70 / SCORE_LOWKEY=35）映射 auto/lowkey/none 三档分级行动。

## 被否决路线与理由

- **维持布尔命中 + 扩充黑名单**（v1.3.4 现状）：命中即注入导致误报靠黑名单穷举，每个新误报形态都要单独补丁；autocomplete/inputmode/锚关联三大强信号全盲，无法量化权衡信号强弱。
- **ML/AI 字段识别**：需模型或服务端，不符合单文件油猴约束（spec Out of Scope）。
- **L2 对孤立字段显式减分**（spec 原文"孤立字段减分"）：实施期发现会把单字段页面与懒渲染场景的真区号字段压出低置信档，改为"锚存在才加分"，隔离效果等价（票 02 偏离点）。

## 后果

检测信号分值与阈值成为行为契约，调整必须过误报回归组（Playwright harness）；`signals` 明细使每次注入决策可观测、可归因。行业同构依据：Chromium 分类优先级链 / Bitwarden-KeePassXC 三段式（research/industry-models.md）。
