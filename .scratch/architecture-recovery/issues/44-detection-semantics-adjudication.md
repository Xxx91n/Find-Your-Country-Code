# 44: 检测语义裁决与语料先行

**What to build:** 同证据档位不一致得到一次显式裁决；contenteditable 先有语料地基。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-022, A-023

- [x] P1/P8「同证据不同档位」给出裁决（统一 or 显式建模差异）并留档；须用户裁决 —— **用户裁决 2026-09-14：方案 C「显式建模差异」**（零档位变更）；留档 = ADR-0009 + CONTEXT.md 分级行动词条 + decision-ledger A-022=done；CI 锁定 = verify-ticket-02 G10（负控实测：L3_PLUS_DIAL_SCORE 4→5 时 exit 1）
- [x] contenteditable 区号形态沉淀进校准语料（至少 1 正例 + 1 负例）—— 已 append 3 例（`ce-dial-positive` 56/lowkey 正例，knownResidual=扫描层非评分层；`ce-neg-richtext` 0/none；`ce-neg-country` 14/none）；零 src/ 检测代码改动
- [x] precision/recall 基线不回退 —— 语料 48→51 例，precision/recall/f1 恒 1.0000（TP=27, FP=0, FN=0）；回归门禁 PASS（14-calibration-harness / verify-ticket-02 36/36+G10 5/5 / verify-ticket-27 / verify-ticket-28 / 32-real-site-corpus 硬门禁）
