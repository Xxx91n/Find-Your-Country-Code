# 02 — 多信号加权评分检测引擎

**What to build:** 把"关键词命中即注入"的布尔检测升级为五层信号瀑布评分引擎：L0 autocomplete/inputmode 标准信号（tel-country-code / country / country-name / tel）→ L1 词表/label/placeholder/name/id 加权（歧义词如 prefix、裸词"区号"降权组）→ L2 锚→目标关联（同表单邻域 tel 主号与已识别国家字段互证加分，孤立字段减分）→ L3 select options 内容验证（+数字/00数字/ISO2/国家名占比）→ L4 排除词负分。输出 评分+信号明细，并接分级行动：高置信自动注入 / 中置信低调注入 / 低置信不注入（面板可手动召唤）。这是消灭误检测与提升检出率的核心票。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] 评分核心为纯函数（DOM 元素进 → 分数与信号明细出），不依赖 UI/存储
- [ ] 误报样本（research/misdetection-root-causes.md §2 全部 5 类）评分落在"不自动注入"档
- [ ] 复现 harness 全绿化：`node research/scripts/misdetect-repro.mjs` 的 8 例 FP 样本在新引擎判定下全部不注入（harness 保留为新引擎的回归基准，含 N1 误杀与 N2 多 id 两例 FN）
- [ ] autocomplete="tel-country-code" 与 "country" 的字段获得强信号评分（本地 fixture 验证）
- [ ] 歧义词进入降权组而非常规词表；排除词以负分制生效
- [ ] 三档分级行为接线完成：高/中/低置信的注入样式与可召唤入口
- [ ] L1–L4 各层权重与阈值为显式常量，出处（调研文件）在报告中注明
