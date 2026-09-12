# Prompt 34-fix — 门禁减肥·返工轮（同红三联修复）

身份：Cycle-4 返工窗口，票 34 `gate-slimming` 返工轮（覆盖 A-008 收尾；首轮复核结论见复核报告）。

## 必读文件（开工前完整阅读）

1. 复核报告: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave1-cycle4.md` — 先复核大脑检查结果（预存红三联归因）再动手
2. 首轮报告: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\34-gate-slimming-report.md`
3. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\34-gate-slimming.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\tests\scripts\verify-ticket-02.mjs` / `tests\scripts\misdetect-repro-v2.mjs` — 裸求值装载点
6. `D:\Aworker\mozilla\choose-your-country\tests\scripts\14-lib-engine.mjs` — stripTypeScriptTypes 先例技法（票 32 落地）
7. `D:\Aworker\mozilla\choose-your-country\.github\workflows\engine-gates.yml` / `e2e.yml` / `typecheck.yml`

## 返工 Delta（仅限以下三联，勿扩权）

- ① `verify-ticket-02.mjs` 与 `misdetect-repro-v2.mjs` 装载改 `module.stripTypeScriptTypes`（Node>=22.13，同 14-lib-engine 口径）；engine-gates.yml setup-node 升 22。
- ② lockfile 失同步修复：lockfile 再生走 CI/云端执行（本机禁产生构建产物）；package.json（票 25 钉死版）为真相源。
- ③ `e2e.yml` install 步修复 ERESOLVE（对齐 `.npmrc` 集中口径或等效）；typecheck.yml `npm install` → 回迁 `npm ci`（依赖②完成）。
- 红线：`.npmrc` 为票 31 D-31a 产物，未获用户撤销指令前不移除；verify-13/16/18 专属断言与 e2e job 不动；release 系零接触。

## 验收（重跑首轮同一套标准）

- engine-gates run 全绿（36+25 断言通过，run ID 锚定）；e2e 与 typecheck 在本分支 run 全绿（run ID）。
- 同红对照 reverse：main 上三红在返工分支全数转绿，且无新增 FAIL 面。
- verify-31/verify-30 等既有门回归不受影响（各自最近 run 仍 success）。

## 开工第一句

先复述本票返工范围（三联）+ 大脑复核报告的归因结论 + 上述必读清单，确认后再动手。

## 收尾

完成定义遵循首轮 handoff 内完成定义。**报告追加写入原文件**（不覆盖）：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\34-gate-slimming-report.md`
追加节标题格式：`## 返工轮次 R1（<日期>）`，含三联修复 sha + run ID + 首轮验收④复核结论。