# 30 — 规则分档覆盖收敛到 selector 级

**What to build:** 修复 `pageTierOverride()` 语义泄漏——当前它遍历该 host 全部规则不看 selector，一条「选择器→auto」会把整页无关字段抬到 auto。改为分档覆盖仅作用于命中 selector 的元素。

**覆盖 A-xxx:** A-004

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 复现：单 host 一条「selectorX→auto」强制规则导致整页无关字段被抬 auto（回归基线）——红 run 34687387189 @1e2100e（gate FAIL「元素规则不再抬整页分档 got=auto」「none 字段被抬档注入」；E2E 票30 用例红 @ee54d8a run 34687024566）
- [x] 分档覆盖仅作用于命中 selector 的元素；页面级语义显式建模或移除——scope:'page' 显式规则类型（调研定案，通配 selector 形态落选）；绿 run 34687594979 @4b2ab94（gate 100/100）
- [x] 豁免域名（整站禁用）与负反馈（element→none）语义不变——S5-①②⑤ 断言 + 既有 S1/S2/S3 与 E2E 负反馈/豁免用例全绿（61 passed）；ui.matchingOverrides 显式排除页面规则防负反馈误删
- [x] 既有 rules 引擎门（79/79）与 E2E 不回退——门 79 项断言全数保留（S2/S3 页面用例仅改显式 scope 表达，断言名与数量不变）+21 新增 =100/100 ALL GREEN；E2E 59→61 passed；verify-30.yml Typecheck success
- [x] 证据锚 commit sha + CI run ID——分支 cch/30-rules-tier-scope-fix：c1 bd7ceda / c2(红) 1e2100e / c3(绿) 4b2ab94；红 run 34687387189 / 34687024566，绿 run 34687594979