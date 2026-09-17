# 43 依赖根修 — 窗口报告

> Cycle-5 W1 | 票: `issues/43-dependency-peer-rootfix.md` | 覆盖 A-021
> 分支: `cch/43-dependency-peer-rootfix` | commit: **898340d6**（GitButler 变更 ID `lxs`）
> CI 基线（均 head `898340d6` 且 success）：E2E **34826911474** / Typecheck **34826911801** / Lockfile Regen **34826912150** / Engine Gates **34826911946**
> 日期: 2026-09-14（Asia/Singapore）

## 0 开工门槛复述

- **阻塞项：无**（issue `Blocked by: None`）。A-021 的唯一上游是 ADR-0008 §后果登记的负后果。
- **必读清单（7 份，开工前逐份读完）**：handoffs/43、issues/43、spec.md、WORKFLOW.md、decision-ledger.md、docs/adr/0006-ci-hygiene-policy.md、docs/adr/0008-real-site-testing-layers.md。
- **本票 delta**：① 不改测试语义；② 不引入新依赖；③ 若根修需改变测试用 react 版本，须先呈报。

## 1 根因（结构性，不是配置问题）

1. `react-dom@19.2.8` 声明 `peerDependencies: { react: "^19.2.8" }`（registry 原文 + 本地 `node_modules/react-dom19/package.json` 原文双证）。
2. npm 的 `node_modules/react` 在**单个安装根内是唯一槽位**；根项目钉 `react@^18.3.1`。
3. 两条互斥约束（`^18` / `^19`）落在同一槽位 → 无交集 → 必然硬 ERESOLVE。
4. **结论**：在单一安装根内，「保住 `node_modules/react19` + `node_modules/react-dom19` 精确路径」与「消除硬 ERESOLVE 且不用 `--legacy-peer-deps`」**逻辑上不可兼得**；根修的唯一成熟路线是把 React 19 拆到独立依赖树。

## 2 调研依据

### 2.1 atomcode 深度调研（串行护栏内 1 次在途）

- 落盘：`research/atomcode-43-dependency-peer-rootfix.md`（18.2 KB；含 F1–F5 双源闭环表 + 12 条来源清单 + 4 条缺口）。
- 关键结论（与本窗口独立实验同向）：overrides 救不了（F2/F3）；别名不参与 peer 匹配（F3）；`file:` 包装包会嵌套、破坏路径；**推荐 npm workspaces vendor 根**（F4），与本次实施形态一致。
- Currency 提示：npm 11.2–11.6.3 有 overrides 回归（#8688 / #8757），本方案不用 overrides，不受影响；仍建议 CI 钉 npm 版本。
- 如实登记缺口：①「别名不重定向 peer 边」无官方文档一句明文（由实测 + registry 推证）；② 若某下游工具**硬编码**根 `node_modules/react19` 路径，npm 内无 flag-free 解法（本仓库供给已改为 `/gen/react19/*` URL，约束已解除）；③ pnpm/yarn 路线未深挖（超范围）；④ 末段两查遇搜索引擎网络故障。

### 2.2 本窗口对照实验（12 组，全部在 OS 临时目录，不污染仓库）

| 组 | 假设 | 实测结果 |
|---|---|---|
| A | 现状（无 flag、无 .npmrc） | ERESOLVE（Found react@18.3.1 / peer react@^19.3.0 from react-dom19） |
| B/C/D | `overrides` 三种 key/value 写法 | 全 ERESOLVE |
| P9/P10/P11 | `overrides` 版本限定 key / `"."` 自指 / 同 spec 直依赖 | 全 ERESOLVE |
| P12 | 覆盖根直接依赖 `react` | `EOVERRIDE`（官方限制，与 F2 一致） |
| P1 | 传递依赖的 peer 边 + overrides | 仅降级为 **warning**，且**不安装**嵌套 react@19 |
| P7/P8 | `file:` 包装包把 react-dom19 变传递依赖 | 装成，但 react-dom19 落入 `<包装包>/node_modules/`，**精确路径破坏** |
| P13 | workspaces + 别名 | 装成且裸 `npm ci` 通过；但 `react19` 被 hoist 到根、`react-dom19` 嵌到 workspace，布局混杂 |
| **P14** | **workspaces + 真名** | **装成且裸 `npm ci` 通过；React 19 三件套（react / react-dom / scheduler）完整落在 `tests/vendor/react19/node_modules/`，布局统一确定** |

## 3 变更清单（18 文件，commit 898340d6）

| 文件 | 变更 |
|---|---|
| `package.json` | 删除 `react19` / `react-dom19` 两个 `npm:` 别名 devDep；新增 `workspaces: ["tests/vendor/react19"]` |
| `tests/vendor/react19/package.json` | **新增**（workspace 安装根）：`react` / `react-dom` 精确钉 `19.2.8` |
| `.npmrc` | **删除**（原仅承载 `legacy-peer-deps=true`，票 31 D-31a 产物） |
| `package-lock.json` | 重生成：含 workspace 节点；根 version 由 1.4.0 自然同步为 1.5.0 |
| `tests/server.mjs` | `REACT19_FILES` 改为指向 `REACT19_ROOT = tests/vendor/react19/node_modules`；`readFile` 基底路径随之切换（**转译逻辑逐字未改**） |
| `tests/fixtures/framework-react19.html` | 仅注释更新（别名包 → 独立安装根） |
| `tests/framework-react19.spec.ts` | 仅注释更新（同上） |
| `.github/workflows/{e2e,typecheck,release-dry-run,lockfile-regen,real-site-smoke,verify-27,verify-29,verify-30}.yml` | 安装步去 `--legacy-peer-deps`；`npm install` → `npm ci`；理由注释重写 |
| `CONTEXT.md` | 「依赖钉死」词条：补充两安装根自洽机制 |
| `docs/adr/0006-ci-hygiene-policy.md` | §决策4 括注 + §后果 2 登记例外**清偿** |
| `docs/adr/0008-real-site-testing-layers.md` | §后果 负项**消除** |

**测试语义零改动**：fixture、断言、spec 逻辑、评分引擎均未动；`framework-react19.html` / `framework-react19.spec.ts` 只改注释。
**不引入新依赖**：vendor 根的两个包（`react` / `react-dom`）均为既有依赖，仅迁移安装根；`workspaces` 是 package.json 字段而非依赖。

## 4 验收清单逐条证据

### 4.1 issue 验收项

| # | 验收项 | 只读验证命令 | 输出摘要 | 锚定 |
|---|---|---|---|---|
| 1 | 别名冲突根修，workflow 中 `--legacy-peer-deps` 残留清零 | `grep -rn 'legacy-peer-deps' .github/workflows/` | **零命中**；`ls .npmrc` → No such file | commit `898340d6` |
| 2 | `npm ci` 干净环境可复现成功 | CI run **34826911474** 作业 `e2e` 步 `Install dependencies` | `##[group]Run npm ci`（**无 flag**）→ `added 74 packages, and audited 76 packages in 3s` / `found 0 vulnerabilities` | head `898340d6` |
| 3 | 依赖范围为显式 semver（禁 latest） | `package.json` / `tests/vendor/react19/package.json` | 根 `^18.3.1`；vendor `19.2.8`（精确）；无 `latest` | commit `898340d6` |

### 4.2 附带 CI 证据（同 head `898340d6`，均 success）

| run | 名称 | 关键输出 |
|---|---|---|
| 34826911474 | E2E | 8/8 步绿；`npm ci` → added 74；`Run E2E` → **80 passed (31.2s)** |
| 34826911801 | Typecheck | `npm ci` → added 74 → `npm run typecheck` 绿 |
| 34826912150 | Lockfile Regen | `npm install`（无 flag）→ added 74；断言步 `npm ci --dry-run` 通过（lockfile 与 package.json 同步） |
| 34826911946 | Engine Gates | `verify-ticket-02.mjs` **36/36 pass** + harness 绿 |

### 4.3 delta 检查点

| delta | 结论 | 证据 |
|---|---|---|
| 不改测试语义 | 满足 | 断言/fixture/spec 逻辑零改动；E2E CI 80 passed 与改前同量 |
| 不引入新依赖 | 满足 | 依赖集合不变（react@18 族 + react@19 族），仅安装根位置变化 |
| 若需改变测试用 react 版本须先呈报 | **未触发** | 实证发现 `^19.2.8` 会漂移到 19.3.0（会构成版本变更）→ 改**精确钉 `19.2.8`**，与旧 lockfile 锁定值一致，测试版本零漂移 |

## 5 被否决路线（呈报）

1. **npm overrides**（任意语法）——实测全败（ERESOLVE / EOVERIDE），与 atomcode F2/F3 一致。
2. **`file:` 包装包**——能装，但破坏 `node_modules/react-dom19` 精确路径（P7/P8）。
3. **保留 `--legacy-peer-deps`（含仅留在 `.npmrc`）**——与 issue「What to build」直接冲突。
4. **`^19.2.8` 范围**（保持仓库 caret 惯例）——会使测试用 React 19 由 19.2.8 漂到 19.3.0，触发 delta 呈报要求，故改精确钉。
5. **换包管理器（pnpm/yarn）**——超本票范围，ADR-0006 已钉 npm。
6. **新增独立 ADR**——为避免与并行票的编号竞态，本票不开新号，决策已写入 ADR-0006 §决策4/§后果2 与 ADR-0008 §后果（详见 §8）。

## 6 与并行票的重叠面（协调提示）

- **票 36（A-014 / A-015 / A-020）同属 W1 并行**，重叠：`typecheck.yml`（本票将 run 由 `npm install` 改为 `npm ci` 并重写注释，已实质完成 A-020 的 typecheck 注释/命令一致性项）、`package-lock.json` 根 version（重生成后自然同步为 1.5.0，亦属 A-020）、`e2e.yml`（票 36 拟将票级 E2E 并回）。**合入时需按 WORKFLOW §4.2 的 `but resolve` 流程处理 hunk 冲突**。
- 本地观察到票 36 正在修改 `tests/scripts/verify-ticket-09/13/15.mjs`。
- 本票未触碰任何他票文件；提交仅含本票 18 个文件（`but status` 中他窗 hunk 已排除）。

## 7 本地硬验收（含污染说明）

- 干净环境（删 `node_modules` + vendor `node_modules`，无 `.npmrc`）：`npm ci` → **exit 0，added 74 packages**。
- `npm run build` ✓；`npm run typecheck` ✓（exit 0）。
- 单 spec 验证：`framework-react19.spec.ts` **3 passed**；`rules-ui + rescan + iframe` **26 passed**。
- 全量（`npx playwright test`）：**86 passed / 3 failed**；3 个失败全部落在**并行窗口的未跟踪 WIP 文件**（`tests/_debug40.spec.ts`、`tests/iframe-nested.e2e.spec.ts`，属票 40），与本票无因果。
- 十门：`verify-ticket-02` 36/36、`05` 100/100、`09` 36/36、`13` exit 0、`15` exit 1、`18` exit 1、`27/28/29/31/42` exit 0；calibration `keep-current`（SCORE_AUTO 70 / SCORE_LOWKEY 35）。`15/18` 为 A-014 预存缺陷，归票 36。
- ⚠️ **污染声明**：本工作区为多窗口共享工作树，本地跑 E2E 期间他窗正在实时修改 `src/i18n.ts`、`src/main.ts`、`src/ui/index.ts`、`tests/helpers/userscript.ts`（票 37/40/42/44）。首次全量跑出现 21 失败，隔离重跑后仅余他窗 WIP 的 3 个——**本地 E2E 不作本票证据，证据一律以分支 CI 为准**（符合「证据只认 CI run/artifact」）。

## 8 风险与给大脑的提示

1. **ADR 编号**：未新开 ADR 以避免与并行票编号竞态；两安装根决策已记入 ADR-0006 §决策4/§后果2 与 ADR-0008 §后果，并在 CONTEXT.md 「依赖钉死」词条固化为机制描述。若收口要求独立 ADR，请在票 45 统一定号。
2. **ADR-0006 §决策5 枚举扩展**：`tests/` 新增 `vendor/` 成员（原枚举：manual / scripts / fixtures+corpus / *.spec.ts），属枚举扩展而非推翻，建议收口时补记。
3. **npm 版本**：npm 11.2–11.6.3 有 overrides 回归（#8688 / #8757）。本方案不用 overrides，不受影响；建议 CI 钉 npm 版本以防未来引入 overrides。
4. **触发面限制**：`verify-27/29/30.yml` 的 `push` 分支过滤器不含 `cch/43-*`，故其 install 行改动**未获 CI 直接验证**；同口径的 `e2e/typecheck/lockfile-regen` 已获绿，且这些行的改动内容与已验证行逐字一致。
5. **服务供给路径变更**：`tests/server.mjs` 的 React 19 读取路径由 `node_modules/react19|react-dom19` 改为 `tests/vendor/react19/node_modules/{react,react-dom,scheduler}`。若后续有其他工具硬编码旧路径，需同步。

## 9 遗留与建议

- 本票无遗留。
- 建议：票 36 合流后复核 `e2e.yml` / `typecheck.yml` 与票级 E2E 作业的安装口径是否已统一为裸 `npm ci`。

## 11 issue 勾销的版本控制限制（呈报）

- 工作树内 `issues/43-dependency-peer-rootfix.md` 的三条验收项**已全部勾销**（各附 commit `898340d6` + CI run），但该文件由 `cch/cycle5-ticketing` 创建，其 hunk 在 GitButler 下显式依赖该分支：
  ```
  Error: Cannot commit: 1 change could not be applied:
    .scratch/architecture-recovery/issues/43-dependency-peer-rootfix.md
      line 7 depends on cch/cycle5-ticketing (rlp)
      lines 11–13 depends on cch/cycle5-ticketing (rlp)
  ```
- 处置：**不堆叠**。按 WORKFLOW §4.2「波次内各票互不堆叠」，且 `but move --above` 会重写已推送并取证的 head（使 `898340d6` 及其四个 CI run 失效）。故与同波票 42/44 一致：issue 勾销内容留在工作树，由票据/收口分支（`cch/cycle5-ticketing`，票 45）承接提交。
- **给大脑：本票完成度以代码+报告的 commit `898340d6` 与四个 CI run 为准；若要求 issue 勾销也入版本库，请在收口时在票据分支上提交该文件的当前工作树内容。**

## 10 教训候选（建议大脑写回 WORKFLOW §5）

1. **多窗口共享工作树时，本地 E2E 不能作为跨票验收证据**：他窗实时修改 `src/` 会污染本地全量跑（本票首跑 21 失败 → 隔离重跑仅余他窗 WIP 3 个）。建议：跨票验收直接以**分支 CI** 取证，本地只做单 spec 隔离验证。
2. **安装面一行改动的「注释重写」会放大并行冲突面**：AC 要求 flag 残留「清零」时，注释里的字面量也会被机械 grep 命中。建议：把「flag 使用」与「注释字面量」在验收口径上分开定义，或约定注释一律用「peer 例外开关」类指代。
3. **`^` 范围会隐藏测试依赖的版本漂移**：`npm:react-dom@^19.2.8` 在旧 lockfile 钉 19.2.8，但 fresh install 会解析到 19.3.0（peer 也随之变 `^19.3.0`）。fixture 依赖应**精确钉**，否则「不改测试语义」无法在安装层得到保证。
