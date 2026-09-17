# 31 — 填充结果可观测 + 失败反馈闭环

**What to build:** 让填充结果可观测（成功 / 失败 / 格式分歧），使错填不再静默——`Fill.run` 失败目前仅弹「已复制到剪贴板」且 `fillInput` 按 placeholder 猜格式。

**覆盖 A-xxx:** A-005

**Blocked by:** None — can start immediately.

**Status:** done（窗口报告：research/window-reports/31-fill-feedback-loop-report.md）

- [x] 复现：fillInput 目标格式与推测不符（期望 digits 得 plus）+ 填充失败静默（回归基线）
  证据：spec 落盘 `ceea6ae`（其 run 被 main 预存安装面红吞，留痕 `34683540581`/`34683540547`）；生效 run `8b58861` — E2E 34684194549（①②③④ test.fail 默认红 = 复现 + 基线不变式 4 ✓）、Typecheck 34684194532
- [x] 填充结果信号可被测试与用户感知（成功/失败/格式分歧），不阻塞三策略正确路径
  证据：实施 `682e599`；E2E 34687532636（67 passed，摘标后全绿）、verify-ticket-31 门 34687532639（48 PASS 0 FAIL，head `0690f0c`）
- [x] iti/select/input 三策略正确路径不变（引擎门 + E2E 不回退）
  证据：全量密封 E2E 34687532636 + Typecheck 34687532613 + verify-31 S/I/F/T 断言 34687532639；既有 verify-13/15/16/18 与 main 等价红（不剥 TS 标注预存红，main 34685926684/34685929220/34685931483/34685933965 vs 本票 head 34687674178/34687676035/34687678103/34687680278），非本票引入，归票 34 重建域；窗口报告 §4/§5-D-31c
- [x] 不新增运行时依赖
  证据：package.json/package-lock.json 全链 diff 零改动（报告 §4）
- [x] 证据锚 commit sha + CI run ID
  证据：报告 §2/§4/§6 全链（含复验中途红 run 留痕）；最终 head `0690f0c` 三门全绿