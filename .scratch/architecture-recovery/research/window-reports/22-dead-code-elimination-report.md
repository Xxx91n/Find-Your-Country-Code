# 窗口报告 22 — Dead Code Elimination

> 子窗口实施报告 | 2026-09-11 | 票: issues/22 | 分支: `cch/22-dead-code-elimination`（未堆叠，与 cch/20、gb/cch-25 并行）
> 提交: `ylz` refactor(cch-22) + docs(cch-22) | CI: E2E run 34569162088 **success**

## 检查点逐项结论

| # | 检查点 | 结果 |
|---|---|---|
| 1 | 删除 src/Find-Your-Country-Code.js | ✅ 985 行 / 41,948 B 整文件删除 |
| 2 | rg -rn "Find-Your-Country-Code" src/ == 0 | ✅ rc=1 无输出（删除后） |
| 3 | CONTRIBUTING.md 冻结基准表述改指 git 历史 | ✅ zh + en 双语同步 |
| 4 | 删除 L3_PLUS_LIKE_MIN_RATE（config.ts） | ✅ 0 引用，删 1 行 |
| 5 | 删除死订阅函数 _notifySubs / subscribe | ✅ 死代码实际位于 rules/index.ts（见偏离点 D-22a/b），删 9 行；store 侧 subscribe 有存活调用，保留 |
| 6 | 清理 tierOf 引用 | ✅ 唯一定义（0 调用者）实际位于 detect/index.ts（见偏离点 D-22c），删 5 行 |
| 7 | CI 构建验证通过 | ✅ run 34569162088 success（npm ci + npm run build + Playwright E2E + line-ending guard，job e2e 11 steps 全绿） |

## (a) 删除项明细与零引用证据

证据工具说明：ctx 沙盒 execSync 默认 shell 为 cmd.exe，首轮 rg 单引号 glob 被字面化导致假"零匹配"（工具误报，先自证后采信，对齐 §5 票07 教训）；改用 Node 全仓遍历（等价正则，排除 node_modules/.git/dist）+ 删除后以 Git Bash 显式 `rg -n` 复核双轨取证。

### 1. src/Find-Your-Country-Code.js（整文件，985 行 / 41,948 B）
- 删除前：全仓扫描 `Find-Your-Country-Code` 在 src/ 内仅 5 处命中，全部是该文件自身 userscript 头部元数据（:2,:4,:11-13）→ src 内 0 个 import/引用。
- 删除后：`rg -n "Find-Your-Country-Code" src/` → rc=1（0 匹配）✅。
- src/ 外命中（票内允许，不改动）：项目名/仓库 URL（README*、vite.config.ts、CONTEXT.md、.github/ISSUE_TEMPLATE、greasyfork 图链）、历史文档（docs/adr/0002:17、docs/superpowers/plans+specs）、tests/scenarios.e2e.spec.ts:1 注释、test/*.html 标题。

### 2. src/config.ts — export const L3_PLUS_LIKE_MIN_RATE（原 :38，1 行）
- 删除前：全仓 6 命中 = src 内定义行 1 + .scratch 调研文档 5 → 零外部引用。
- 删除后：`rg -n "L3_PLUS_LIKE_MIN_RATE|_notifySubs|tierOf" src/` → rc=1（0 匹配）✅。

### 3. src/rules/index.ts — 死订阅子系统（原 :16、:130-137，共 9 行）
- 删除内容：`_subs: new Set(),` 字段 + `subscribe(fn){...}` + `_notifySubs(){...}` + 注释行。
- 零调用证据：`_notifySubs` 全仓 src 内仅定义行自身；rules 的 `subscribe` 无任何 `Rules.subscribe` 调用（main.ts 中 subscribe 唯一调用方 :28 为 `Store.subscribe`，Store 来自 createStore()，与 createRules 是两个对象）；`this._subs` 在 rules 内仅被这两个死函数使用。
- **store/index.ts 的 `_notify()`/`subscribe` 为存活代码**（main.ts:28 订阅规则变更重扫，_notify 有 7 处内部调用）→ 不删，删除会破坏票 07 订阅收口契约且 CI 必红。

### 4. src/detect/index.ts — tierOf(score)（原 :442-446，5 行）
- 全仓 `tierOf` 仅 1 处 src 命中 = 定义自身 → 0 调用者；档位判定逻辑已内联于 detect:427-428（SCORE_AUTO/SCORE_LOWKEY 直接比较），tierOf 为迁移遗留重复实现。

### 5. 遗留观察（不属本票，登记备查）
- rules/index.ts:12 导入的 `SCORE_AUTO, SCORE_LOWKEY` 在 rules 内实际未使用（票 22 之前就存在的死导入；strict:false 下不报错）。建议票 23（ts strict typecheck）顺带清理或收口时确认。

## (b) CI 构建证据
- 分支 `cch/22-dead-code-elimination` → origin sha `abe98e1`（but push，未堆叠分支 = common base b2a870f + 本票提交）。
- E2E workflow 因 `push: branches: cch/**` 自动触发：run **34569162088** completed / **success**。
- https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34569162088
- job `e2e`：11 steps 全部 success/skipped，含 Line-ending guard、`npm ci`、`npm run build`、`npx playwright test`（场景 A–E 绿色回归组 → 删除未改变任何运行时行为）。
- 本地零构建产物（CI-only 构建红线合规：构建/E2E 证据只认 CI run）。

## (c) CONTRIBUTING 双语文案 diff

```diff
--- CONTRIBUTING.md (zh) ## 边界
- - `src/Find-Your-Country-Code.js` 为 v1.3.4 冻结行为基准，只读不改。
+ - v1.3.4 冻结行为基准原为 `src/Find-Your-Country-Code.js`（票 22 已删除该文件），需要对照旧行为时走 git 历史：`git show v1.3.4:src/Find-Your-Country-Code.js`。
--- CONTRIBUTING_EN.md (en) ## Boundaries
- - `src/Find-Your-Country-Code.js` is the frozen v1.3.4 behavior baseline — read-only.
+ - The frozen v1.3.4 behavior baseline was `src/Find-Your-Country-Code.js` (deleted by ticket 22); to compare against legacy behavior, consult git history: `git show v1.3.4:src/Find-Your-Country-Code.js`.
```

指针有效性实证：`git tag -l` 含 `v1.3.4`（与 `v1.4.0`），`git show v1.3.4:src/Find-Your-Country-Code.js` 可取回冻结基准。

## 偏离点（呈报大脑收口核对）
- **D-22a**：handoff/issue 写"删除 store/index.ts 中的 `_notifySubs` 和 `subscribe`"，实证 `_notifySubs` 位于 rules/index.ts:137，store 中同名物不存在（store 的 `_notify` 存活）；store 的 `subscribe` 有 main.ts:28 存活调用不可删。按 issue 验证条款"zero callers outside own definition"+ spec"verify zero callers via rg"执行：删除 rules 侧死订阅三件套。
- **D-22b**：票 5 的完成定义（CI 构建通过）反向印证上述判断——若按字面删 store.subscribe，`npm run build` 必红。
- **D-22c**：handoff 写"清理 rules/index.ts 中 tierOf 引用"，实证 rules/ 零 tierOf 引用（issue 的"only TODO comment remains"亦未在任何文件出现 tierOf TODO）；唯一定义在 detect/index.ts:442。按符号名（而非错置路径）执行删除。
- **D-22d**：CONTRIBUTING_EN.md:51 含同一条冻结基准表述，超出 handoff 字面（只列 CONTRIBUTING.md），一并修正以防英文文档悬空指向已删文件（docs 双语一致性，票 19/11 先例精神）。
- 版本控制合规：全程 but（status -fv 取证 → commit -b 建新未堆叠分支 → push）；未触碰大脑 .scratch 脏文件与其他票分支；未 push 他人提交。

## issue 验收勾选状态
- issues/22-dead-code-elimination.md 七项 `- [ ]` → `- [x]`（波次表勾销留给大脑 §7 收口）。
