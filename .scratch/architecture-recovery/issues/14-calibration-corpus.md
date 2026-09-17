# 14 — 校准语料与回归基线

**What to build:** fixtures 固化为正负例语料 manifest,新增 precision/recall harness 与阈值标定脚本,CI 产出数字基线;此后权重/阈值改动有数据依据,告别人工拍定。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 语料 manifest: 现有 fixtures + 误报样本 + 新周期样本,每例标注正/负标签与来源文件
- [ ] precision/recall harness 在 CI 可运行并产出数字基线报告(首次基线必须跑出)
- [ ] 阈值标定脚本: 语料→最优 auto/lowkey 阈值与 L1 权重建议,输出标定报告;可重复运行
- [ ] CI workflow 接线完成(扩展既有验证链),证据只认 CI run
- [ ] 本票不改检测行为: 仅基线/标定/语料,参数变更需经 16 票或独立批准
