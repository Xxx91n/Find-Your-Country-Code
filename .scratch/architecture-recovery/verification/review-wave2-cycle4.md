# Wave-2 首脑复核 — Cycle-4（票 34 R1/R2 返工 + 27 / 28 / 29）

> 复核人：大脑 Agent | 2026-09-12 | 方法：不信报告自述——rg 源码抽查 / 工作流实读 / but status 分支落位 / gh run 只读核验 / CI log 与 jobs 实取
> 报告源：`research/window-reports/{34,27,28,29}-*-report.md`（34 返工轮按约定**追加**在原报告内：R1 §95 / R2 §131，未覆盖原记录 ✓）

## 票 34 — 门禁减肥返工轮 R1+R2（A-008 收尾）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| 联① verify-ticket-02 + misdetect-repro-v2 装载 stripTypes | 两文件实读：`verify-ticket-02.mjs` 先 `stripTypes(bundle)` 再拼 return（同 14-lib-engine 心智）；`misdetect-repro-v2.mjs:11,32` 同法；engine-gates.yml node 22 | ✅ |
| 联② lockfile 云端再生 | `.github/workflows/lockfile-regen.yml` 存在；run 34693757830 **success**；artifact 落地后 `cch/34-lockfile-land`(srn) 入库 | ✅ |
| 联③ e2e/typecheck 安装面修复 | e2e.yml:37 `npm install --legacy-peer-deps`；typecheck.yml 同族 | ✅ |
| 三红全部转绿 | Engine Gates 34694435559 @47a6995e **success** / E2E 34694435571 @47a6995e **success** / Typecheck 34695478812 + 34698250826 **success** | ✅ A-008 弱化解除（61 例统一载体可用） |
| 报告追加不覆盖 | grep `^## 返工轮次` → R1(§95)、R2(§131) 两节追加于原报告 | ✅ 合规 |
| 瑕疵 | typecheck.yml 注释称「回迁 npm ci」实际命令 `npm install`（注释与代码不一致）；cch/34-docs-r2 当前头 Typecheck 红因=**Install dependencies 步**（安装阶段，非类型失败） | ⚠️ 文档债，登记 |

## 票 27 — 检测覆盖率下限补强（A-001）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| L1_ATTR_PHRASE_SCORE=8 属性强短语证据面 | `src/config.ts:32` + `src/detect/index.ts:422` 消费；与 label 强短语同词表、低一档权重 | ✅ |
| 弱信号 30(none)→38(lowkey)，SCORE_AUTO/SCORE_LOWKEY/L1_STRONG_KW_SCORE 未动 | 三常量 config 实读未变；改法标定脚本 `27-weak-signal-calibration.mjs` 存在 | ✅ |
| precision 1.0 不回退、recall 恢复 | Calibration run 34695252905（前 41 / 后 48 例 precision 1.0000、**recall 1.0000**）；report 锚 1052f3c → run 34697148462 绿 | ✅（全语料恢复 1.0，28 的 0.9130 为中间态） |
| 负例零抬升（固话/语言前缀/areacode） | verify-ticket-27 G4/G8 断言（22 例负例逐例不变）；run 34697124610 @1052f3c0 **success**（门 81/81 + E2E 作业 3 passed） | ✅ |
| issue 5/5 勾销 | grep 0/5 | ✅ |

**账本 A-001**：实现到位（SCORE_AUTO 不动约束守住；32 探针 baseline.preFix 契约同步）。

## 票 28 — ISO2-value 下拉区号证据补全（A-002）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| parenDial 移出 plusDial 门 | `src/detect/index.ts:438`（独立 `if (st.parenDial > 0)`）+ :476（pseudo 侧 pseudoOptionStats 同步去前置） | ✅ 代码实证 |
| 分值复用 L3 常量无新魔法数 | 438-439 用 L3_PLUS_PAREN_SCORE/L3_DIAL_CAP | ✅ |
| 14(none)→38(lowkey)，recall 0.8696→0.9130 | verify-28 G1/G6 断言；run 34693074675 @7714dc3e **success**（19/19） | ✅ |
| 护栏：纯 ISO2 国家选择器仍 none + suppress 留痕；+1 消歧不回退 | G3/G4 断言（F2/F8 用例 + Canada 落点） | ✅ |
| **AC5 `CI calibration 绿 + E2E 绿`** | issue 标 **`[~]`**（部分完成）：Calibration 绿有实证（34692755555 两步绿）；E2E 共享面红（安装阶段跨分支共因），**间接 CI 证据**=verify-29 绿 run 34696053977 @388b674f 的全量 E2E 作业 **70 passed**——该栈（32→27→28→29）含 28 全部改动+spec 四条 | ⚠️ 验收字面未闭合，以间接证据补位；合入 main 后共享 E2E 转绿即闭合 |

**账本 A-002**：实现到位。issue 用 `[~]` 自标诚实，登记为待闭合项（非缺陷）。

## 票 29 — 扫描候选集扩展（A-003）

| 声明 | 实物证据 | 结论 |
|---|---|---|
| SCAN_SELECTORS 增可聚焦非表单容器描述符（div/span[tabindex]） | `src/detect/index.ts:144-152`（customDropdownStats 可聚焦闸门）、:262-264（OBSERVED_ATTRS/_fingerprint 同步 tabindex） | ✅ |
| 内容证据只作门槛不作加分（L3 口径） | customDropdownStats 实现注释 + 断言（并 L3 会击穿 SCORE_LOWKEY 架空 ADR-0005——D-29e 论证成立） | ✅ |
| 三重缺口闭合：候选集 + kind 分发 + 登记面（14→34≥25） | 34(none) 保持 ADR-0005 档位上限（期望即 none）；登记面可达断言在 32 探针 | ✅ |
| verify-29 27/27 + E2E 70 passed + 性能 | run 34696053977 @388b674f **success**，jobs 实取两作业全绿（Ticket-29 gate + Ticket-29 E2E）；性能 73ms/14-17ms < 350ms | ✅ |
| issue 5/5 | grep 0/5 | ✅ |
| D-29d contenteditable 未扩 | 呈报：无语料地基（32 语料未含该形态）——**A-003 弱化项登记**，留后续语料驱动 | ⚠️ |

**账本 A-003**：核心达成（无 ARIA 自定义下拉可见+可登记）；contenteditable 弱化呈报（spec 措辞含 contenteditable，实际落地限于自定义下拉——跑偏量：低，且决策有据）。

## 账本核对总表

| A-xxx | 票 | 裁定 | 缺失/弱化/跑偏 |
|---|---|---|---|
| A-001 | 27 | ✅ 无 | — |
| A-002 | 28 | ✅ | AC5 `[~]`（E2E 间接取证，合入后闭合） |
| A-003 | 29 | ✅ | contenteditable 未扩（D-29d，弱化登记） |
| A-008 | 34 R1/R2 | ✅ 弱化解除 | typecheck.yml 注释/命令不一致（文档债） |

## 过程违规与偏离（单列呈报，不追认）

1. **lockfile 双轨重复修复 + 跨票代解（D-27e / nnr / srn）**：29(nn 43a9173) 与 34(srn a7ac6e4/lockfile-land) 各自重生 lockfile 且互斥 32/39 处（npmmirror↔npmjs 域差异）；27 声明「经授权代解」改写 34/29 两票提交的 lockfile 侧——**授权来源未留痕，待用户追认**；最终 srn 版（46 处 npmjs 对齐）在 cch/34-lockfile-land。
2. **多窗口推送竞态连锁（D-29g/D-29i/D-27b）**：docs 推送触发基址重算把 28 rebase 丢 27 依赖致 28/29 Typecheck 红；四次重建堆叠被打回。均自愈+呈报，但 W2 期间远端分支长期处于非全绿态。
3. **当前远端头非全绿（重要）**：28 @25c26769 / 29 @c866b2d2 三门红、27 头 E2E 红（共享安装面）、34-docs-r2 头 Typecheck 红（Install dependencies）——归因栈卫生/安装共因，绿证据定格各票历史头（388b674f/7714dc3e/1052f3c0/47a6995e）。**合入 main 前必须以最终合序栈做一次全绿复核（33 的 dry-run 天然承担）**。
4. **每票私有 E2E 取证作业模式（D-27a/D-29h）**：verify-27/29 内复刻 e2e 步骤绕开共享安装面红——务实但使门禁碎片化，与 A-008 方向部分相悖；34 联③修复共享面后，收口时应把私有作业并回统一 E2E。
5. issue 28 AC5 `[~]` 自标（诚实但字面未闭合）。

## 结论与 frontier

- **27 / 28 / 29：done（复核通过）**；**34：done（R1+R2 复核通过）**——A-008/A-009 全部闭合。
- 账本 current 十项中：A-001…A-009 全部实现闭环 ✅；A-010 待票 35（收口纪律）。
- **frontier（重算）**：W2 ✅ → **W3 可开工：票 33（版本 bump 交付）**——六票 blocked-by 全清。35（W4）被 33 阻塞。
- 33 开工前置提示：合序栈顶全绿复核 + typecheck.yml 注释/命令一致性顺手修正（一行）；lockfile 单一真相版（srn）随栈合入。
