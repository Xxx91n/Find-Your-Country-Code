# 03 — intl-tel-input 适配层独立化

**What to build:** 把 fillIti 的五层 fallback 重构为独立 iti 适配层：getInstance 稳锚优先 → 能力探测（方法双名 setSelectedCountry/setCountry、实例属性、dataset id、jQuery、DOM 点击双代类名）→ 兜底赋值；优先走 setNumber 官方推荐路径（号码自带区号自动同步国家）。覆盖 v16–v29 版本矩阵（依据 research/atomcode-industry-models.md 版本矩阵）。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] setNumber 优先路径生效（能拿到实例时）
- [ ] 方法名双名探测：先试新名 setSelectedCountry，未命中再试旧名 setCountry（或按探测到的能力面选择）
- [ ] DOM 点击兜底兼容两代类名体系（v29 系 .iti__selected-country 与 v16 系 .iti__flag-container / .selected-flag）
- [ ] test/cch-test-page2.html 场景 C（iti@18.2.1）注入与填充联动全绿
- [ ] 报告附 v16/v18/v25/v26/v27/v28/v29 各版本覆盖依据清单（对照 atomcode 矩阵，缺口如实标注）
