# 11: 判定 ITI 形态下 L3 的正确可观测判据

**What to build:** 判定 ITI 接管字段在 L3（写后读回）层的**正确可观测判据**，并据实收敛断言。票 07 的 L3 判据（读宿主 `input.value` == 区号）对 `select` / 普通 `input` 成立，但对 ITI 形态不成立——ITI 走官方 `setNumber` / `setSelectedCountry` API，按 ITI 语义切换国家/号码，**不承诺**把区号写进宿主 `input.value`；同帧 L4 toast 却是「已填入: 🇨🇳 +86」（`Fill.run` 自认成功），**L3 与 L4 结论相悖**。

**Blocked by:** 票 07（真实站点层与发布门）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-035

- [ ] 判定 ITI 形态下 L3 的可观测判据（候选：ITI 选中态 `iti__selected-country` / `data-country-code` / 号码输入框值 / 官方 `getNumber()` 回读），给出 ITI 官方语义或工业界依据
- [ ] 依据判定结果收敛 `tests/live/live-smoke.mjs` 的 L3 判据，并写明影响面（哪些目标/形态受影响）
- [ ] 说明为何该收敛**不是**放宽 L3「写后读回」语义（给出对照证据：`mirror-control` 与普通 `input` 路径仍按原判据）
- [ ] 真实站点层 `live-codepen-editor` 的 L3 结论有据（转绿或明确保留为红并说明）
- [ ] 声明本票覆盖的 A-xxx：A-035
