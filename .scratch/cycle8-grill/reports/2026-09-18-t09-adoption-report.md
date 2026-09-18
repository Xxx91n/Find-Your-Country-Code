# 2026-09-18 T-09 四问采纳落地报告

> **呈报对象**：用户 ｜ **交接对象**：独立审计窗口（见 `handoffs/2026-09-18-audit-handoff.md`）
> **分支**：`cch/17-cycle8-grill`（GitButler，**未 land／未 push**）｜**基线**：`origin/main` = `d075f01a`
> **触发**：用户 2026-09-18 指令「**采纳**，把内容全部做好，并记录报告，最终交给审计窗口」
> **口径**：每条声明均附**可复跑命令**；不引入账本以外的结论。

---

## 0. 一句话结论

**D-008…D-011 四问全部从 `pending` 转为 `current` 并已落地**；3 处张力与 1 处控制点替代**均已裁定并写入 ADR**；新增 **3 个 ADR + 2 处带日期注记 + 2 个零依赖可跑脚本（均带自检并已挂进 CI）**。
**账本现状：D-001…D-011 全部 `current`（11 条）｜`pending` 0｜`revised` 0**。
实现过程中**复算出调研的两处数值错误**（已写入 ADR，见 §3）——这是本轮最有价值的实质产出。
**未获授权的事（push/land、建站点级语料、main 分支保护）一律未做**，已登记为 FR-08…FR-11。

---

## 1. 采纳落地清单

| ID | 迁移 | 落地载体 |
|---|---|---|
| **D-008** CI 闭环形态 | `pending` → `current` | `docs/adr/0014-ci-evidence-loop-and-landing-model.md` |
| **D-009** 门槛②可测化 | `pending` → `current` | `docs/adr/0015-site-level-quality-threshold-measurability.md` · `tests/scripts/50-site-threshold-plan.mjs` · ADR-0005 带日期注记 |
| **D-010** GF sync 确认 | `pending` → `current` | `docs/adr/0006-ci-hygiene-policy.md`「monitor 例外的控制点修订」带日期注记 |
| **D-011** 交付单位 | `pending` → `current` | `docs/adr/0016-release-cadence-policy.md` · `tests/scripts/51-release-readiness.mjs` |

---

## 2. 张力与控制点裁定

| 项 | 裁定 | 为何如此选 |
|---|---|---|
| **T-1** landing 模型 | **有意识偏离**：接受「revert 单元 = 发版单元 = 证据单元」在 GitButler 下不完全重合；用「一逻辑单元一提交 + 每发版点打 tag」兜住 | 调研主张 squash 单提交，但**硬边界要求 `but` 为唯一版本控制入口**⇒ 不能为凑 squash 语义改用裸 `git` |
| **T-2** 语料承载面 | **库外归档 + 指针 + SHA-256**（复用票 41/A-018 先例）；镜像页只收被断言形态 | 避免触发 ADR-0013 反证条件 1（`.scratch/` 体量）与 D-003 修订；代价已如实登记为 FR-09 |
| **T-3** 安全 patch 豁免 | Cycle-7 D-018 的「本轮不发版」是**本轮一次性**；其永久化形态 = ADR-0016 且**附加补丁豁免** | 是**扩展**非推翻（D-018 原文未含豁免） |
| **Q6 控制点** | **主控制点 → 仓库侧版本门**（release 分支/tag + `@version` 变更）；站内人工确认降为**验证步** | 原残留结论（确认前不得声称闭合）**不变**；该记录属**残留登记**而非 D-xxx，故**未改标任何 D-xxx** |

---

## 3. 对调研的两处数值修正（辩证性处置）

调研结论**未被全盘采纳**。实现时用可跑脚本复算，**推翻了两处数字**：

```
$ node tests/scripts/50-site-threshold-plan.mjs
门槛 = 0.001（1.00‰）
零事件上界反推抽样量（k=0，95%）：
  rule of three（快速口径）  n ≥ 3000
  精确 Clopper-Pearson(k=0)  n ≥ 2995
  Wilson 守口径              n ≥ 3838   ← 取此值为准
OC 双点（AQL=0.0005 α=5% / LTPD=0.002 β=10%）：n=4636, c=5（实测 α=0.0309, β=0.0999）
  对照（调研存档引用的 n=3000, c=2）：P(接受|AQL)=0.8089（需 ≥0.95）  P(接受|LTPD)=0.0618（需 ≤0.10）  ⇒ **不满足**
```

1. **抽样量：调研的 3000 是 rule-of-three（3/n）口径，不是守口径**。调研自己主张「小样本必须用 Wilson 族」，但 k=0 处却用了 `3/n`。实算 **Wilson 守口径 = 3838**（k=0 时 Wilson 上界约 `z²/n`）。⇒ 操作值取 **3838**（比 3000 高 28%）。
2. **OC 计划：调研引用的 (n=3000, c=2) 不满足其自定的 AQL 约束**（`P(接受|AQL) = 0.8089 < 0.95`）。⇒ 实算最小可行计划 = **n 4636 / c 5**（比 3000 高 55%）。

> 这两处修正说明：调研给出的“可照搬数字”必须**过一遍自己的统计口径**再采信。

---

## 4. 新增交付物

| 类型 | 文件 | 内容 |
|---|---|---|
| ADR | `docs/adr/0014-…md`（4,673 B） | CI 闭环口径（`push ≠ 落地`、main run 为权威锚点、run ID 入账、分支保护、squash、无 merge queue）+ landing 偏离 |
| ADR | `docs/adr/0015-…md`（6,023 B） | 站点级门槛可测化（零事件上界 / 分层 Wilson / OC 双点 / 燃烧率 / auto 档 / Goodhart 配套 / pilot / 语料承载面） |
| ADR | `docs/adr/0016-…md`（4,828 B） | 发版节奏（双周–月度批量 + 补丁豁免 + 积累上限 + breaking 归位 + 消费者边界） |
| 注记 | `docs/adr/0006-…md`（→13,926 B） | monitor 例外控制点修订（原文保留） |
| 注记 | `docs/adr/0005-…md`（→10,668 B） | 门槛②口径指向 ADR-0015（门槛数值未变） |
| 脚本 | `tests/scripts/50-site-threshold-plan.mjs`（11,854 B） | rule-of-three / 精确 CP / Wilson 反推 · OC 双点求解 · 燃烧率分级 · Neyman 配额；`--self-test` |
| 脚本 | `tests/scripts/51-release-readiness.mjs`（7,554 B） | Conventional Commits 分类 · breaking/security 检测 · 积累上限 · 收割建议；advisory；`--self-test` |
| CI | `.github/workflows/engine-gates.yml` | 新增 2 step 跑两脚本自检（**workflow 内零受管区路径字面量**） |
| 账本 | `.scratch/cycle8-grill/decision-ledger.md` | 追加「T-09 四问采纳落地」段（状态迁移 + 张力裁定 + 数值修正 + 覆盖率） |
| 登记册 | `.scratch/evidence/findings-register.md` | 新增 §七 FR-08…FR-11 |

---

## 5. 验收（编译 / 打包 / 启动测活 / 每平台闭环）

| 验收项 | 证据 |
|---|---|
| **编译通过** | `npm run typecheck` → **exit 0** |
| **打包通过** | `npm run build` → **171,172 B**，sha256 `c324c47a481e…`（与基线逐字节相同 ⇒ 本轮**零构建回归**） |
| **启动并测活** | `npm run e2e` → **149 passed / 0 failed**（webServer 进程 + Chromium 全链路） |
| **每平台 test 闭环** | 新增两脚本均带 `--self-test`（含阳性 + 阴性对照）**且已挂进 `engine-gates.yml`**；既有 21 票级门 / 引擎门 / 校准 / 真实站点 / E2E 全部保持绿（唯一红 = 票 39 基线预存） |
| **新脚本自检** | `50`: PASS（EXIT 0）；`51`: PASS（EXIT 0） |

---

## 6. 未闭合（需你授权）

| ID | 事项 | 卡在哪 |
|---|---|---|
| **FR-08** | main 分支保护未配置 | **GitHub 后台操作**（仓库内无法表达） |
| **FR-09** | 站点级语料库外归档的持久性依赖 | 有意接受的偏离（T-2） |
| **FR-10** | revert/发版/证据单元不重合 | 有意接受的偏离（T-1） |
| **FR-11** | 门槛②仍不可判定（语料未建） | **建语料为独立票，须授权** |
| — | **push / land 授权** | D-008 的前提；未授权前**不得声称 CI 闭环** |

> 另：`51-release-readiness.mjs` 实测报告 **自 `v1.7.0` 以来 52 提交 / 6604 diff 行 ⇒ 已超积累上限**（ADR-0016 判据 7）⇒ **下一轮应优先收割一个版本**。

---

## 7. 硬边界遵守

| 边界 | 实际 |
|---|---|
| 版本控制唯一入口 `but` | ✅ 全部提交用 `but`；**未执行任何裸 `git` 写操作** |
| 未获授权不得 `land`／`push` | ✅ **未 land、未 push** |
| 本轮不发版（ADR-0010 不触发） | ✅ `package.json` 仍 `1.7.0` |
| 不得降低任何既有门禁 | ✅ 零降级；新增门禁只增不减 |
| 4 个反向断言门不得削弱 | ✅ `grep -rl '\.scratch/' .github/workflows/` → **0** |
| 语料先行 / 禁物理删除语料条目 | ✅ `tests/corpus/manifest.json` 未动 |
| 不引入远程网络面 / ML | ✅ `src/` 零改动（新脚本均为纯计算，无外网） |
| 禁止静默改向 | ✅ 两处数值修正 + 4 项裁定均**显式写入 ADR/账本**；`revised` = 0 |
| 依赖只经显式请求 | ✅ 两脚本**零依赖**；未引入 changesets 等外部工具 |

---

## 8. 复跑清单

```bash
cd "D:/Aworker/mozilla/choose-your-country"
# 新增脚本自检
node tests/scripts/50-site-threshold-plan.mjs --self-test
node tests/scripts/51-release-readiness.mjs --self-test
# 实际计划 / 就绪度
node tests/scripts/50-site-threshold-plan.mjs
node tests/scripts/51-release-readiness.mjs
# 验收四件套
npm run typecheck && npm run build && sha256sum dist/find-your-country-code.user.js && npm run e2e
# 门禁总账
node tests/scripts/verify-ticket-runner.mjs --audit
for t in $(node tests/scripts/verify-ticket-runner.mjs --list); do node tests/scripts/verify-ticket-runner.mjs --run "$t"; done
# 账本状态（期望 current=11 pending=0 revised=0）
node -e "const t=require('fs').readFileSync('.scratch/cycle8-grill/decision-ledger.md','utf8');console.log('current='+(t.match(/\\| current \\|/g)||[]).length,'pending='+(t.match(/\\| pending \\|/g)||[]).length,'revised='+(t.match(/\\| revised \\|/g)||[]).length)"
```
