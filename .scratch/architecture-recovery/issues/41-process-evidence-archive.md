# 41: 过程证据出仓与升塔纪律

**What to build:** 让工作树只保留现役流程文件；把升塔纪律写入流程。

**Blocked by:** 票 36,37,38,39,40,42,43,44（全部实施票报告落盘后归档）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-018

- [x] 冻结过程证据归档出工作树索引（`git ls-files .scratch` 显著下降，仅剩现役）—— **397 → 209（-47%）**；冻结快照 199 文件（978KB）归档至仓库外 `D:\Aworker\mozilla\choose-your-country-evidence-archive\`（逐文件 SHA-256 199/199 匹配 + 历史副本 `b7b1f0a2`），**188 已移出工作树**；11 文件因由未落地分支（cch/39 / cch/43 / cch/36-cycle5-brain）创建、不在本票基线内而保留待落地后归档（见报告 §5 D-1）；分支 `cch/41-process-evidence-archive` 提交 `fff188b8` + `d7322ae5`
- [x] 现役流程文件（WORKFLOW/spec/decision-ledger/issues/handoffs/prompts）全部可解析 —— 209 项逐文件检查存在/非空/无 BOM = 0 异常；198 现役 = issues 45 + handoffs 46 + prompts 54 + window-reports 49 + 根部 4
- [x] 升塔纪律（先沉淀 fixture 再修脚本）写入 WORKFLOW —— 新增 **§4.5 升塔纪律**（塔分层 + 4 条硬条款：先沉淀再修/只升不降/塔尖弱断言/证据锚定）+ §5 教训行（2026-09-14 S7(票41)）；LF/无 BOM/既有 §5 格式未变
- [x] 无新增宽泛 .gitignore 通配 —— `git diff 9929b8a7 d7322ae5 -- .gitignore` 输出为空（本票零 .gitignore 改动）
