# `.scratch/draft/` —— 草稿区（真可抛弃，允许清理）

> 上级边界图：`.scratch/README.md`（§1 分区 · §2 判据 · §3 清理白名单）｜依据：`docs/adr/0013-governed-artifact-area-and-evidence-trail.md` 决策 2。

## 本区放什么

**真可抛弃物**——同时满足：

1. **工具可再生成**或**零引用**（全仓无任何文件引用其文件名）；
2. **不被任何 CI 门禁读取**。

已迁入：`probes/`（9 个零引用探针脚本，来源与判据见 `.scratch/README.md` §4）。

## 本区不放什么

- 被 CI 门禁读取的文件 —— **被消费即自动升级为受管**，即使它「看起来像探针」（如 `06-probe-*` / `10-probe-srcdoc-origin` / `12-ab-cap-fidelity`，它们留在原路径）；
- 被报告/票据引用为**结论出处**的探针 —— 它是**证据的溯源面**，不是草稿；
- 决策账本、审计报告、外部输入、findings register ⇒ 一律 `.scratch/evidence/` 或原周期目录。

## 清理（硬约束）

```
node tests/scripts/scratch-draft-clean.mjs            # 默认 dry-run：只列出候选，不删
node tests/scripts/scratch-draft-clean.mjs --apply    # 真删（仅限本区）
node tests/scripts/scratch-draft-clean.mjs --self-test # 白名单自检（含阴性对照）
```

- 脚本对目标做**硬白名单**：解析后不在 `.scratch/draft/` 之下的路径**一律拒绝**（非零退出）；
- 本文件（`README.md`）**永不在删除候选内**；
- 清理**不产生提交**（本区为 Git 跟踪，删除须走正常提交流程）。
