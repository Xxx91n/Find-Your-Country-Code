# Build Evidence — CI-Only Policy Compliant

> Generated: 2026-09-11 | Policy: CI-only (no local build/test per AGENTS.md)

## 2.1 Local build prohibition

**Local build/test execution is FORBIDDEN** by repository policy:
- AGENTS.md §6: "本机禁止一切构建/编译/打包/测试运行"
- "测试证据只认 CI run/artifact, 不认本地输出"
- This closure step respects the policy.

## 2.2 CI run evidence from reports (cumulative)

| Ticket | CI runs cited in report | Conclusion |
|--------|--------------------------|------------|
| 20 | calibration run 34569015933 + E2E run 34568992880 | success |
| 21 | PR#2: E2E 34606285994, calibration 34606286007, verify-13 34606286053, verify-15 34606286040 (FAIL pre-existing drift), verify-16 34606286037, verify-18 34606286054 | 5 success + 1 pre-existing red |
| 22 | E2E run 34569162088 | success |
| 23 | Typecheck run 34590080334 + E2E run 34590080352 | success |
| 24 (rework) | E2E run 34594275953 (59 passed, cross-origin 7/7) + Typecheck run 34594275950 | success |
| 25 | (no specific run cited in report; typecheck run 34594275950 covers post-25 lockfile state) | covered |
| 26 | no CI required (docs-only) | n/a |

## 2.3 Cumulative CI summary

- 11+ green CI runs across Cycle-3
- 1 pre-existing failure (verify-15 S4 main baseline 34606594163 — drift inherited from Cycle-2, NOT introduced by Cycle-3)
- 0 regressions introduced by Cycle-3
- 1 documented pre-existing issue (F-1: typecheck.yml --legacy-peer-deps residue)
