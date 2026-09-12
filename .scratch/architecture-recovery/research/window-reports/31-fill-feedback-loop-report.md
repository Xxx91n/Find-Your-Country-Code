# 窗口报告 — 票 31 · 填充结果可观测 + 失败反馈闭环（Cycle-4 W1）

> 窗口身份：Cycle-4 实施窗口，票 `31-fill-feedback-loop`，覆盖 A-005（decision-ledger 台账）。
> GitButler 分支：`cch/31-fill-feedback-loop`（基线 = main @ `7dbc6fc`，波次内不堆叠，与其他分支并行）。
> 阻塞关系：Blocked by: None — 立即开工。
> 版本控制：全程 `but`（WORKFLOW §4.2），分支与票同名互不堆叠。
> 生成：2026-09-12

## 0. 结论速览

`Fill.run` 的布尔结果升级为三态 `filled/copied/failed`（+ input 策略的 `fmtDiff` 格式分歧观测旗标），
用户面 toast 文案分四档（成功/分歧/降级复制/失败），测试面唯一钩子 `window.__cchLastFill` + `run()`
返回值（同一 FillResult 对象，不造第二套）。三策略正确路径（iti 联动 / select 消歧 / input 格式推断）
逐字节不变，由「基线不变式组」E2E 与 verify-31 静态守卫双钉。issue 五项验收全勾销，各附 sha + CI run ID。

## 1. 调研（动手前，handoff 通用要求 1/2）

- atomcode 深度调研（本窗口唯一在途，串行护栏）：「密码管理器/自动填充库的填充结果反馈设计」。
  四条采用结论：
  1. **降级阶梯心智**（KeePassXC 剪贴板降级 10s 清除 + Bitwarden quick-copy「Clear clipboard 5min」
     产品化降级）：三态不是并列 toast 而是能力阶梯 filled → copied → manual-failed。
  2. **状态即结构化结果**（Chromium `ActorFormFillingError` 枚举 `kSuccess/kOther/kNoForm/kNoSuggestions`
     持久化 UMA）：观测信号做成返回值/钩子对象，文案只是投影。
  3. **格式分歧检测：声明式元数据 > placeholder 猜测**（libphonenumber `isPossibleNumber` 双级校验、
     MDN autocomplete token、Chromium ML 预测取代启发式）：`fmtDiff` 判定吃 `pattern`/`inputmode`/`type=number`。
  4. **约束校验 API 对 JS 赋值不生效**（MDN Constraint Validation：约束校验 "not if you set value via
     JavaScript"）：分歧必须由填充方（本脚本）自行检测，浏览器不会兜底报警。
- `docs/adr/0001–0006` + `CONTEXT.md` 回顾：不动评分档位（ADR-0001/0005）、反馈走既有 toast 通道
  （CONTEXT「填充/面板」术语）、CI 脚本入 `tests/scripts/` + 非发版 workflow PR 门控（ADR-0006）——verify-31.yml 遵循。

## 2. 复现（先留证据，issue 验收 1）

复现 spec：`tests/fill-feedback.spec.ts` 新行为四断言按 fp-regression §6.2 维护契约标 `test.fail()`
默认红 + 「基线不变式组」4 条（两版本恒绿，钉死正确路径）。fixture：`tests/fill-feedback.html`
（select 命中/无匹配、input plus 撞数字约束、input digits 对照）。

| 项 | commit | CI 证据 |
|----|--------|---------|
| 复现基线落盘 | `ceea6ae` | 该 sha 的 run 被 main 预存安装面红吞掉（E2E `34683540581` ERESOLVE /
|              |         | Typecheck `34683540547` lockfile 红）→ 安装面修复后同 spec 于 `8b58861` 生效，见下行与 D-31a |
| 复现生效 run | `8b58861` | **E2E run `34684194549`：67 tests，基线不变式 4 ✓ 全绿；①②③④ 四条
|              |         | 新行为断言 ✘ expected-fail（默认红 = 复现成功）；Typecheck run `34684194532` ✓** |

复现的两条静默面（红断言即规格）：① `fillSelect` 无匹配 → 字段未写入但 toast 与真成功同等无害
（「已复制」不区分「填了/没填」），测试面 `__cchLastFill` 不可读；② `fillInput` 对 `pattern="[0-9]{1,3}"`
字段按 placeholder 猜成 plus 写 `+86`，格式分歧零信号。

## 3. 实现（issue 验收 2）

| 改动 | 文件 | 要点 |
|------|------|------|
| 三态信号 + 测试钩子 | `src/fill/index.ts` | `run()` 返回 `Promise<FillResult>`（`status/kind/iso/code/fmtDiff`）并落 `window.__cchLastFill`（唯一钩子，`__cchPerfHook` 同族探针心智）；成功档同步定态，`copied/failed` 经剪贴板 promise 异步定态——填充与事件派发全部先行完成，**反馈不阻塞分发**（A-005 显式约束） |
| 失败态真化 | 同上 | 旧代码 try 包 writeText 吞掉同步异常但对 rejection 无感——剪贴板实际不可用仍报「已复制」；现 rejection/缺对象 → `failed` |
| toast 四档分层 | `src/i18n.ts` | `ok`(不变)/`fmtDiverge`(新)/`copied`(文案改「未匹配到选项，已复制」，保留旧词根「已复制/Copied」使基线不变式跨版本恒绿)/`fillFailed`(新)；zh/en 双语同步，无新运行时依赖 |
| 格式分歧只读观测 | `src/fill/index.ts` | `_guessFmt` 自 `fillInput` **逐字抽取**为单一来源（零行为变更）；`_inputFmtDiff` 按声明式数字约束（`type=number` / `inputmode=numeric|digit` / `pattern` 纯数字字符类且不容 `+`）判分歧，仅 input 策略；异常一律静默判 false（观测不引入新失败面） |
| 类型契约 | `src/types.ts` | `FillStatus/FillResult` 导出；`CchFill.run` 签名改 `Promise<FillResult>`；`Window.__cchLastFill?` 入 `declare global` |
| 引擎门 | `tests/scripts/verify-ticket-31.mjs` + `.github/workflows/verify-31.yml` | node22 `module.stripTypeScriptTypes` 装载（14-lib-engine/票 32 先例技法），48 断言：S(select 三态×文案档位)/I(iti setNumber)/F(input fmtDiff 七形态)/P(pseudo 承值冒烟)/T(正确路径静态守卫：三分支关键字、消歧双证据、`_guessFmt` 判据逐字、注入表达式未动)/L(i18n 运行时 MSG 双语键集一致)。workflow 触发面 = pull_request + 本票分支 push + dispatch（ADR-0006 PR 门控） |

**正确路径不变**（issue 验收 3 的前置）：`fillIti/fillSelect/fillPseudo` 一字未动；`fillInput` 唯一变化是
`_guessFmt(el)` 取值替换三行同逻辑内联代码；`run()` 的 ok 分发次序与 if/else 结构保留（verify-18 静态串 kind === 'pseudo' 兼容）。

## 4. 验收对照（issue 31 五项，各附 sha + CI run ID）

最终 head：`0690f0c`（三门全绿 run 均挂此 sha）。

- [x] **1 复现**（fillInput 期望 digits 得 plus + 填充失败静默）：spec `ceea6ae`，生效 run `8b58861`：E2E `34684194549`（4 ✘ 默认红 + 不变式 4 ✓）
- [x] **2 信号可被测试与用户感知**：实施 `682e599`；E2E run `34687532636`（67 passed，摘标后 ①②③④ 全绿）+ verify-31 run `34687532639`（48 PASS 0 FAIL：S/I/F/P 状态断言 + 四档文案）
- [x] **3 三策略正确路径不回退**：全量密封 E2E（含 iti v18.2.1 联动、select 消歧、input 格式、react19、pseudo 各既有 spec）run `34687532636` 67/67 + Typecheck run `34687532613` + verify-31 T1–T5 静态守卫；既有 verify-13/15/16/18 门在 main 与本票分支**等价红**（SyntaxError: Unexpected token——装载器不剥 TS 标注的预存红，main 对照 run `34685926684`/`34685929220`/`34685931483`/`34685933965` vs 本票 head `34687674178`/`34687676035`/`34687678103`/`34687680278`），非本票引入、属票 34 门禁重建域
- [x] **4 不新增运行时依赖**：`package.json`/`package-lock.json` 零改动（全链 diff 无该文件）
- [x] **5 证据锚 commit sha + CI run ID**：本表即锚点；复验中途红 run 全部留痕（§6）

## 5. 偏离点呈报（WORKFLOW §6，逐条待确认）

- **D-31a（入票范围的最小安装面修复，`8b58861`）**：main 预存红使一切 ticket 分支 E2E/Typecheck 不可得
  （cch-25 钉依赖未再生 lockfile → e2e.yml 裸 `npm install` ERESOLVE、typecheck.yml `npm ci` lockfile
  不同步）。修复：新增根 `.npmrc` `legacy-peer-deps=true`（集中既有 typecheck 内联旗标）+ typecheck.yml
  `npm ci` → `npm install`（**临时**绕开陈旧 lockfile；lockfile 再生与 `npm ci` 回迁建议归票 34 或
  大脑单开 hygiene 轮——CI-only 政策禁本地产生 lockfile 产物）。未触 e2e.yml/verify-13/15/16/18（票 34 重建域）。
- **D-31b（E2E clipboard 权限授予，`8e4c3ac`）**：headless 无 clipboard-write 权限时 writeText 被拒
  ——新代码**如实**判 failed（恰为三态闭环的活证据）；为让 copied 档可测，spec 顶部 test.use 授予权限。
- **D-31c（verify-31 不修复既有 verify-09/13/15/18 装载器）**：它们的 new Function 不剥 TS 标注，
  在 main 上即 SyntaxError 红（非本票可修面，剥法先例在 14-lib-engine/票 32）；本票以**新门**承载
  三策略反馈环断言，既有门等价红双 run ID 呈报（§4.3）。

## 6. 复验链中途红 run（全留痕）

`682e599`：E2E `34685679498`（① copied 被 headless 拒权限判 failed + 读钩子竞态）/ verify-31 `34685679513`
（PRELUDE 被链式 patch 吞行）→ `8e4c3ac`：E2E `34686167336` 1 failed（竞态）/ verify-31 `34686167337`
（顶层 return 对模块语法非法）→ `6ea1fb1`：E2E `34686721921` 1 failed（iso 大小写）/ verify-31 `34686721920`
（CN 常量漏导出）→ `48c33f5`：verify-31 `34687116733`（G5 静态提取被源码噪声污染 1 FAIL）→ `0690f0c` **三门全绿**。

## 7. 教训（建议 §5 登记簿追加）

1. **复现基线必须与安装面修复同分支早段落地**（cch-25 lockfile 漂移使 main push 全红是本轮才暴露的事实）：
   W1 各票都会再踩；D-31a 的 .npmrc 已在票 31 分支，票 34 收编时勿丢。
2. **默认红(test.fail) 的摘除与实施必须同 commit**；copied/failed 这类异步定态信号在 E2E 侧要用
   waitForFunction 等态，不能紧跟点击直读钩子。
3. **引擎门断言的真相源用运行时对象**（i18n MSG 键集 Object.keys），静态正则提取源码会被无关
   冒号污染——本轮 1 个假 FAIL 即出自此。
4. 链式 .replace() 修脚本资产有吞行风险（PRELUDE mk 函数头事故）：命中面大的修复优先整文件重写。

## 8. 收口清单

- 分支：`cch/31-fill-feedback-loop`（7 commits，`ceea6ae..0690f0c`），已 push origin，未开 PR（未获指示）。
- 落盘：本报告 + `tests/{fixtures/fill-feedback.html, fill-feedback.spec.ts, scripts/verify-ticket-31.mjs}` +
  `.github/workflows/verify-31.yml` + `.npmrc` + `src/{types,i18n,fill/index}.ts` + issues/31 勾选。
- 建议票 34 收编：① lockfile 再生 + `npm ci` 回迁；② verify-09/13/15/18 装载器统一 stripTypes；
  ③ decision-ledger A-005 状态可置 done（凭 §4 五锚点）。
