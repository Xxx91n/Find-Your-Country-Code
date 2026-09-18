# `.scratch/evidence/` —— 证据区（不可再生，永不清理）

> 上级边界图：`.scratch/README.md`（§1 分区 · §2 判据）｜依据：`docs/adr/0013-governed-artifact-area-and-evidence-trail.md` 决策 2。

## 本区放什么

**不可再生的证据**：

- 外部输入的**留痕台账**（SHA-256 + 来源 + 抓取日期）—— 见 `external-inputs-ledger.md`；
- **findings register**（审计发现与残留的统一登记册，带日期与复核期限）—— 见 `findings-register.md`；
- 治理边界文档、判定口径、对账记录。

## 本区不放什么

- 工具可再生成的产物（构建/测试/浏览器报告、缓存）⇒ 走 CI artifacts 或被忽略目录；
- 临时草稿、一次性探针 ⇒ `.scratch/draft/`；
- 项目文档正文 ⇒ `docs/`（本区只放**证据与台账**，不放第二份真相）。

## 清理

**永不清理。** 清理脚本的白名单**不含**本区：`tests/scripts/scratch-draft-clean.mjs` 对任何不在 `.scratch/draft/` 之下的路径一律拒绝执行。

## 写入纪律

1. 写入即 Git 跟踪（`.scratch/` 未被忽略）；
2. 外部输入入库时**当场**记 SHA-256 + 来源 + 日期，不留到事后补；
3. 台账条目**只增不改**；更正以**追加带日期条目**的方式表达（保留原条目）。
