# Wave-1 首脑复核 — Cycle-4（票 30 / 31 / 32 / 34）

> 复核人：大脑 Agent | 2026-09-12 | 方法：不信报告自述，逐条回仓库实物取证（rg 源码 / test -f 资产 / git log / gh run 只读核验 / CI log 实取）
> 报告源：`research/window-reports/{30,31,32,34}-*-report.md`（goal 所指 `reports/` 目录不存在，实际落盘为 `research/window-reports/`——启动器约定路径）

## 票 30 — 规则分档覆盖收敛到 selector 级（A-004）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| pageTierOverride 仅消费 scope:'page' | `src/rules/index.ts:91-93`（`if (o.scope !== 'page') continue`）；forcedTier `:81` 跳过页面规则 | ✅ 属实 |
| types/store 增量 scope 字段，缺省 element 向后兼容 | `src/types.ts:63,68,79`（`RuleScope = 'element'\|'page'`） | ✅ 属实 |
| ui.matchingOverrides 只清元素级规则 | `src/ui/index.ts:10,427` 存在消费点 | ✅ 属实 |
| 复现红 94/100（6 FAIL 全 A-004 面） | gh run 34687387189 @1e2100eb **failure**，log 实取 6 条 FAIL 全为 S5 A-004 泄漏断言（got="auto" want=null 等） | ✅ 红基线真实且归因精确 |
| 收敛绿 100/100 + E2E 61 + Typecheck | gh run 34687594979 @4b2ab948 **success**（verify-30 三合一） | ✅ 属实 |
| 门迁入 tests/scripts + verify-30.yml 挂接 | test -f `tests/scripts/verify-ticket-05.mjs`、`.github/workflows/verify-30.yml` 均存在 | ✅ 属实 |
| issue 5/5 勾销 | grep：unchecked=0 checked=5 | ✅ |

**账本 A-004**：实现到位（语义收敛 + 显式 scope:'page' + 向后兼容）。偏离 D-30a（CONTEXT.md「分档覆盖」词条冲突）已呈报未擅改——合规，留收口处理。

## 票 31 — 填充结果可观测 + 反馈闭环（A-005）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| 三态 filled/copied/failed + __cchLastFill | `src/fill/index.ts:298 _last`、`src/types.ts:20-23,143,176`（FillStatus/FillResult/run 签名/declare global） | ✅ 属实 |
| _guessFmt 单一来源 + _inputFmtDiff 只读观测 | `src/fill/index.ts:276,282` | ✅ 属实 |
| toast 四档双语 | `src/i18n.ts:4,14`（fmtDiverge/fillFailed zh+en） | ✅ 属实 |
| fixture tests/fixtures/fill-feedback.html | test -f 存在；spec goto '/fixtures/fill-feedback.html' 路径一致（复核之初误报缺失，系我方 shell 工作目录错位，解除） | ✅ 属实 |
| 复现红 4 断言 | run 34684194549（报告留痕，spec 内 test.fail 标记已按维护契约摘除） | ✅ 链条完整 |
| 三门全绿 | gh run 34687532636 @0690f0ca **success**（E2E 67）/ 34687532639 @0690f0ca **success**（verify-31，log 实取 PASS 计数=48）/ 34688668066 push 复验 success | ✅ 属实 |
| 不新增运行时依赖 | diff 面（报告 §8）无 package.json；lockfile 工作区假差异为空 diff（git diff HEAD 空） | ✅ 属实 |

**账本 A-005**：实现到位（三态 + 分歧观测 + 不阻塞分发）。**D-31a 过程呈报见「过程违规与偏离」#1。**

## 票 32 — 真实站点抽样语料 + 覆盖回归（A-006）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| 三类形态入 corpus（append-only） | `tests/corpus/manifest.json` real-site 引用 6 处；脚本 + realSiteForms 元数据段 | ✅ 属实 |
| 27/28/29 复现基线（score=30/14/14，三重缺口） | CI log 实取（run 34682668714）：MISS weak-signal-input / iso2-value-paren-dial-select、UNCOVERED no-aria-custom-dropdown，与报告 §4 逐字一致 | ✅ 属实 |
| calibration 前后对照入 CI | log 实取：前 41 recall=1.0000 / 后 45 recall=0.8696 precision=1.0000 gate=pass；断言步独立复核同一数字 | ✅ 属实 |
| calibration 自 cch-23 起已死 → stripTypes 前置修复 | `tests/scripts/14-lib-engine.mjs:12,68`（stripTypeScriptTypes）+ `calibration-baseline.yml` node-version 22 | ✅ 属实 |
| 红→绿转正 | run 34682530402 @4f7102f8 **success**（cch-23 以来首绿）+ 34682668714 @081bea8b **success** | ✅ 属实 |
| 冒烟 advisory 红线（无 PR 触发面） | real-site-smoke.yml 无 pull_request 键（rg 实证，仅注释提及）；tests/live/ 四资产存在 | ✅ 属实 |
| CDP 判定 NOT-ADOPTED | tests/live/cdp-autofill-fitness.mjs 存在（opt-in 评估工具）；规范+实测双证据（报告 §7） | ✅ 判定有据 |
| issue 5/5 勾销 | grep：0/5 | ✅ |

**账本 A-006**：实现到位（测量地基复活 + 真实形态量化 + advisory 分层）。D7（real-site-smoke 无 CI run ID——workflow 需先入默认分支）如实呈报，**合入 main 后须补跑首次 dispatch**。

## 票 34 — 门禁减肥（A-008 / A-009）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| engine-gates.yml 统一跑 verify-02(36)+misdetect(25) | 文件实读：两步骤 + 触发面 pull_request/push(main,cch/**)/dispatch | ✅ 属实 |
| verify-13/16/18 引擎门 job 已删、专属保留 | rg：三文件 engine-gates 仅剩头注释；（专属 job 保留未逐行复核，与报告对照表一致） | ✅ 属实 |
| e2e.yml 补 push: main | `.github/workflows/e2e.yml:7-8` branches: [main, 'cch/**'] | ✅ 属实（A-009 达成） |
| 新触发面生效 + 同红对照 | run 34682819555 @a2196405 **failure**（Engine Gates 执行到脚本层 SyntaxError）vs main 内嵌同红 34618604428 @4d35c887 | ✅ 抽取行为实证；红为预存 |
| 零业务代码改动 | 5 文件全 workflow YAML（报告变更表；未逐 sha 复核，风险低） | ✅ 采信 |
| issue 5/5 勾销 | grep：0/5 | ✅ |

**账本 A-008**：结构达成（61 例 ×3→×1）。**但验收④「全 workflow 绿」不成立**：main 预存红三联（verify-ticket-02 裸求值 src/detect TS 注解 SyntaxError / lockfile 失同步 EUSAGE / e2e ERESOLVE）——报告以「同红对照」替代全绿并完整归因（git log -S 定位 cch-23 引入点、main 与分支逐字同错、docs-only 对照提交爆同三红）。**这是验收标准降级而非隐瞒，且修复面恰是票 34 自身域**（票 32 明让、票 31 D-31c 明让）→ 依 goal 发返工轮启动器。

## 账本核对总表（A-xxx 逐条）

| A-xxx | 票 | 实现证据 | 缺失/弱化/跑偏 |
|---|---|---|---|
| A-004 | 30 | rules/ui/types/store 收敛 + 红绿双 run | 无 |
| A-005 | 31 | 三态 + fmtDiff + 测试钩子 + 48 断言门 | 无（反馈不阻塞约束成立） |
| A-006 | 32 | 语料 + 基线硬锁 + calibration 复活 + advisory 层 | 弱化项：真实站点层未启用（D1，白名单机制就位）；smoke 无 CI run（D7，合入后补）——均已呈报，不判跑偏 |
| A-008 | 34 | 61 例 ×3→×1（engine-gates.yml） | **弱化**：统一载体当前红（verify-02 裸求值），A-008 的「跑一遍」尚不可用 → 返工轮 |
| A-009 | 34 | e2e push:main 落 YAML | 无（同受预存红影响，触发面本身达成） |

## 过程违规与偏离（单列呈报，不追认）

1. **票 31 D-31a 越票面改动共享安装面**：新增根 `.npmrc`（legacy-peer-deps=true）+ `typecheck.yml` `npm ci`→`npm install`。动机成立（main 预存红使一切分支 E2E/Typecheck 不可得）、已主动呈报、未触票 34 域，但 typecheck.yml 属共享 workflow、超出票 31 授权面（票面=fill 观测）。**待用户/收口确认；若确认，归并入票 34 返工轮统一处置 lockfile 与 npm ci 回迁。**
2. **票 34 验收④降级解释**：「全 workflow 绿」实际以同红对照替代——归因链完整、无隐瞒，但属验收口径变更，用户应知情。
3. **票 32 D7**：real-site-smoke.yml 本轮无 CI run ID（404 on default branch）——已呈报，合入 main 后补首跑。
4. **未发现越权提交他人改动**：四分支提交面与各自票域吻合；工作区未提交残留均为大脑工件；`package-lock.json` 为空 diff 假差异（非真实改动）；`research/ctx-write-probe.tmp` 为本会话早前 ctx 掉线探针残留（1 字节，大脑自查自清）。
5. atomcode 串行护栏：四票各 1 调研在途声明一致，未见并行调研证据。

## 结论与 frontier

- **30 / 31 / 32：done（复核通过）**。**34：done（复核通过，带返工轮）**——A-008 统一载体可用性依赖返修。
- **返工启动器**：`prompts/34-gate-slimming-fix.md`（同红三联修复：verify-02 装载 stripTypes 化 + lockfile 再生 + npm ci 回迁；报告追加原文件标「返工轮次」）。
- **frontier**：W1 ✅（30/31/32/34）→ **W2 可开工：票 27 / 28 / 29**（blocked by 32 ✅）。
- 33 仍被 27-32 阻塞；35 被 33 阻塞。票 34 返工轮与 W2 并行（不同文件面，冲突低；返工轮合入先于 33 收口）。
