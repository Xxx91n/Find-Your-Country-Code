# 启动器与票据自检报告(心智模型 v2 周期)

> 生成: 2026-09-05 | 自检脚本: research/scripts/mmv2-selfcheck.mjs(可重复运行,node 执行)
[OK]   prompt 11-mental-model-docs: 30 lines (<=60)
[OK]   prompt 11-mental-model-docs paths resolvable: 10 checked
[OK]   prompt 11-mental-model-docs: no acceptance restatement
[OK]   prompt 12-iframe-governance: 30 lines (<=60)
[OK]   prompt 12-iframe-governance paths resolvable: 10 checked
[OK]   prompt 12-iframe-governance: no acceptance restatement
[OK]   prompt 13-visibility-l3-hardening: 30 lines (<=60)
[OK]   prompt 13-visibility-l3-hardening paths resolvable: 10 checked
[OK]   prompt 13-visibility-l3-hardening: no acceptance restatement
[OK]   prompt 14-calibration-corpus: 29 lines (<=60)
[OK]   prompt 14-calibration-corpus paths resolvable: 9 checked
[OK]   prompt 14-calibration-corpus: no acceptance restatement
[OK]   prompt 15-react19-fill-probe: 29 lines (<=60)
[OK]   prompt 15-react19-fill-probe paths resolvable: 9 checked
[OK]   prompt 15-react19-fill-probe: no acceptance restatement
[OK]   prompt 16-scoring-consistency: 29 lines (<=60)
[OK]   prompt 16-scoring-consistency paths resolvable: 9 checked
[OK]   prompt 16-scoring-consistency: no acceptance restatement
[OK]   prompt 17-pseudo-select-forensics: 28 lines (<=60)
[OK]   prompt 17-pseudo-select-forensics paths resolvable: 8 checked
[OK]   prompt 17-pseudo-select-forensics: no acceptance restatement
[OK]   prompt 18-pseudo-select-e2e: 29 lines (<=60)
[OK]   prompt 18-pseudo-select-e2e paths resolvable: 9 checked
[OK]   prompt 18-pseudo-select-e2e: no acceptance restatement
[OK]   prompt 19-release-links: 30 lines (<=60)
[OK]   prompt 19-release-links paths resolvable: 9 checked
[OK]   prompt 19-release-links: no acceptance restatement
[OK]   handoff 11-mental-model-docs read-zone paths resolvable: 9 checked
[OK]   handoff 12-iframe-governance read-zone paths resolvable: 9 checked
[OK]   handoff 13-visibility-l3-hardening read-zone paths resolvable: 9 checked
[OK]   handoff 14-calibration-corpus read-zone paths resolvable: 8 checked
[OK]   handoff 15-react19-fill-probe read-zone paths resolvable: 8 checked
[OK]   handoff 16-scoring-consistency read-zone paths resolvable: 8 checked
[OK]   handoff 17-pseudo-select-forensics read-zone paths resolvable: 7 checked
[OK]   handoff 18-pseudo-select-e2e read-zone paths resolvable: 8 checked
[OK]   handoff 19-release-links read-zone paths resolvable: 8 checked
[OK]   triplet consistency: 9 tickets x 3 dirs
[INFO] 11-mental-model-docs blocked by: (none)
[INFO] 12-iframe-governance blocked by: (none)
[INFO] 13-visibility-l3-hardening blocked by: 16-scoring-consistency
[INFO] 14-calibration-corpus blocked by: (none)
[INFO] 15-react19-fill-probe blocked by: (none)
[INFO] 16-scoring-consistency blocked by: (none)
[INFO] 17-pseudo-select-forensics blocked by: (none)
[INFO] 18-pseudo-select-e2e blocked by: 13-visibility-l3-hardening, 16-scoring-consistency, 17-pseudo-select-forensics
[INFO] 19-release-links blocked by: 12-iframe-governance, 13-visibility-l3-hardening, 14-calibration-corpus, 15-react19-fill-probe, 16-scoring-consistency, 18-pseudo-select-e2e
[OK]   wave derivation from Blocked by: W1=[11,12,14,15,16,17] W2=[13] W3=[18] W4=[19]
[OK]   spec.md exists, 4146B
[OK]   spec reference exists: atomcode-mental-model-v2.md
[OK]   spec reference exists: report.md
[OK]   spec reference exists: spec-cycle-v1.4.0-2026-09.md
[OK]   wave table regenerated in .scratch/architecture-recovery/README.md
