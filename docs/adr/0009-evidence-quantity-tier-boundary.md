# 0009 — 证据量驱动的档位边界（A-022 裁决）

状态：accepted | 日期：2026-09-14 | 来源：Cycle-5 票 44（A-022 独立裁决；用户裁决 = 显式建模差异）

## 决策

L3（下拉选项内容验证）按证据量单调计分——L3_PLUS_DIAL_SCORE = 4 分/选项，L3_DIAL_CAP = 45 封顶——是**有意设计**，不是偶然。

同证据结构下的档位差因此被显式保留：

| 用例 | 证据结构 | L3 区号选项 | 合计 | 档位 |
|---|---|---|---|---|
| P1 | L1 kw:strong 30 + L2 anchor:tel 18 + 属性短语同源去重 0 | 6 × 4 = 24 | **72** | **auto** |
| P8 | 同上（逐项相同） | 5 × 4 = 20 | **68** | **lowkey** |

SCORE_AUTO = 70 恰落在 68 与 72 之间 → 6 选项 auto / 5 选项 lowkey。**该边界保留，不统一。**

## 被否决路线与理由

- **统一 → auto**（抬 P8 至 ≥70，如 L3_PLUS_DIAL_SCORE 4→5）：违反 delta「禁借补分越线 / floor 不抬 ceiling」（ADR-0008）与「既有档位逐例不变」；且波及 P7/P9/P10。
- **统一 → lowkey**（压 P1 至 <70，如 L3_DIAL_CAP 45→21）：降既有 auto 档 = 冻结档位违规 + 覆盖率回退。

两条「统一」路径分别被 floor≠ceiling 与冻结档位封死，故唯一可行解是显式建模差异。

## 与业界对标的有意偏离

Chromium / Firefox / 1Password / Bitwarden 均**不把证据数量建模为分档依据**——数量只作二值门（Chromium kMaxListSize > 512 时整组选项丢弃 → 字段降为「无证据」，而非「更高档」）；Chromium 的打分式回溯解析器（address_field_parser_ng）上线数日即 revert。

本引擎的架构前提不同（ADR-0001：连续评分 → 分级行动），L3 本就是**量化**证据面。故该偏离**有意且显式记录**，不默认偶然——恰是 spec US27「intentional rather than accidental」的要求。

## 后果

- 该边界受 CI 锁定：tests/scripts/verify-ticket-02.mjs 的 G10 组断言 P1 = 72/auto、P8 = 68/lowkey 及边界关系（SCORE_LOWKEY < 68 < SCORE_AUTO ≤ 72）。任何「偶然统一」在 CI 变红。
- 零引擎行为变更、零档位变更；precision / recall 基线不回退（语料 51 例，1.0000 / 1.0000）。
- 复现与调研证据：.scratch/architecture-recovery/research/window-reports/44-detection-semantics-adjudication-report.md
