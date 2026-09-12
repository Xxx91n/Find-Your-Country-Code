# 28 — ISO2-value 下拉区号证据补全

**What to build:** 让 ISO2 作 value、区号只出现在 option 文本括号里（`<option value="us">United States (+1)</option>`，libphonenumber 推荐的「国家↔区号非单射→ISO2 作 value」形态）的下拉获得 L3 区号证据，识别为区号字段而非被丢弃证据。

**覆盖 A-xxx:** A-002

**Blocked by:** 32 — 需 32 先落该形态的真实站点语料正例，作为复现基线。（已于 2026-09-12 解除：票 32 CI 绿 run 34682668714，corpus 正例 rs-iso2-paren-select 与基线 14/none 已入模式库）

**Status:** done（第 5 项受仓库级安装面破窗限制，部分取证，已呈报 D-28a）

- [x] 在 corpus 新增 ISO2-value + 文本括号区号形态正例；记录当前实现丢 parenDial 证据的复现基线
      — 正例 rs-iso2-paren-select 由票 32 入模式库；本票按门禁「禁止静默漂移」显式更新 realSiteForms[].iso2-value-paren-dial-select.baseline.observed = 38/lowkey/injected（99ce511）
- [x] 把 parenDial（文本括号区号）计分移出 plusDial > 0 门，独立成 L3 正向证据
      — src/detect/index.ts select 侧独立成块、pseudo 侧同口径同步；分值复用 L3_PLUS_PAREN_SCORE=8 / L3_DIAL_CAP=45，无新增魔法数（99ce511；verify-28 G1/G2/G5 run 34692680834）
- [x] 保持「国家选择器≠区号字段」抑制：纯 ISO2-value 无括号区号的 country selector 仍判 none
      — F2(44/none) 与 F8(0/none) 保持 none 且 country-semantic:suppress 留痕；E2E 新增「护栏1」用例（verify-28 G3；本地全量 E2E 73 passed）
- [x] 共享区号（+1/+44 多国）消歧不回退
      — mm2-pos-shared-dial 仍 inject/lowkey score=66；E2E「护栏2」断言 +1 下拉选 Canada 落 selectedIndex===1（verify-28 G4）
- [~] CI calibration baseline 绿 + E2E 绿；证据锚 commit sha + CI run ID
      — 票级门 CI 绿：Verify Ticket 28 run 34692680834（19/19，sha 1f30990）
      — calibration harness CI 绿：run 34692755555 中 Run precision/recall harness 与 Run threshold calibration 两步均通过；Run real-site corpus probe 红，违反项全属票 27/29（呈报 D-28c）
      — E2E / Typecheck CI 未能取证：失败于安装阶段 npm install ERESOLVE（仓库级预存破窗，呈报 D-28a；票 32 报告 3e3b2ac 已登记为「预存安装层债务」）。本地全量 E2E 73 passed / 0 failed、tsc --noEmit clean
