# 2026-09-18-audit-handoff.md —— 交给独立审计窗口

> **用途**：将本窗口（Cycle-8 T-01…T-08 落地 + T-09 四问采纳落地）交由**独立审计窗口**复核。**不复制工件正文**，只给「审计什么 + 去哪找 + 可复跑命令 + 我主动标注的高风险面」。
> **不变量**：分支 `cch/17-cycle8-grill`（GitButler）｜基线 `origin/main` = `d075f01a`｜**未 land／未 push**
> **路径惯例说明**：本仓不采用「handoff 写 OS 临时目录」的默认（ADR-0013 决策 3），故写在受管区。

---

## 0. 审计对象一句话

两个子窗口的产物：**①** T-01…T-08 治理收口（`.scratch/` 受管区 + 防误吞门禁 + LF 清账）；**②** T-09 四问采纳落地（3 个新 ADR + 2 个带日期注记 + 2 个零依赖脚本 + CI 挂接）。
工作区 **干净**；本地验收全绿（含 E2E 149-0）；**无 CI run**（未 push）。

---

## 1. 必读（按序）

1. **`.scratch/cycle8-grill/reports/2026-09-18-report.md`** —— T-01…T-08 实施报告（逐任务证据 + 隔离重建对照 + 硬边界声明）。
2. **`.scratch/cycle8-grill/reports/2026-09-18-t09-adoption-report.md`** —— T-09 采纳落地报告（**含两处数值修正**）。
3. **`.scratch/cycle8-grill/decision-ledger.md`** —— D-001…D-011（**11 条 current**）；重点看「T-09 四问深度调研与编排侧对撞」与「T-09 四问采纳落地」两段。
4. **`.scratch/evidence/findings-register.md`** —— FR-01…FR-11（open）· FC-01…FC-08（closed）· FN-01…FN-02（closed）。
5. **`.scratch/README.md`** —— 受管区边界图（分区 / 判据 / 白名单 / CI 消费面 / 忽略边界）。
6. **`docs/adr/0014` · `0015` · `0016`** ＋ `0005` / `0006` 的**带日期注记**。
7. 四份行业对标存档：`.scratch/cycle8-grill/research/q{3,5,6,7}-*.md`。

---

## 2. ⚠️ 我主动标注的审计关注点（高风险面）

> 以下是我**自己认为最容易被驳倒或最容易被忽略**的地方，请优先查。

| # | 关注点 | 为何高风险 | 建议核验方式 |
|---|---|---|---|
| **A1** | **`50-site-threshold-plan.mjs` 的统计实现**（Lanczos log-gamma / 二项 CDF / Wilson / OC 二分求解） | 数值代码最容易“看着对、实际偏”。我在自检里**已修正过 3 处自己写错的期望值** | 手工复算 `wilsonUpper(0, 3838)` 与 `binomCdf(5, 4636, 0.002)`；用 R/Python 的 `binom.test` / `pbinom` 交叉验证 |
| **A2** | **两处对调研的数值修正**（Wilson 3838 而非 3000；OC (3000,2) 不满足 AQL） | 这是**推翻外部结论**的声明，必须可独立复现 | `node tests/scripts/50-site-threshold-plan.mjs` 与调研存档 `q5-*.md` 逐字对照 |
| **A3** | **T-1 / T-2 的「有意偏离」** | 「接受偏离」很容易成为挡箭牌；请判断偏离是否**真的不可避免** | T-1：核查 GitButler 是否真无 squash-on-land；T-2：核查库外归档是否真有必要（能否只收子集入库） |
| **A4** | **`revised` = 0 的判定** | 我判定「无任何 D-xxx 被推翻」；若你发现某条实际已被推翻而我未改标，则属**漏报** | 逐条重做 D-001…D-011 与四份调研的对撞；特别是 **D-003 / D-005** 与 T-2 |
| **A5** | **LF 清账（T-08）的副作用** | 121 文件工作区归一后，git/GitButler 曾报 121 条**内容零差异的 `M`**；我用 `but discard` 清掉并逐路径校验 hash 不变 | `git ls-files --eol` 应全 `i/lf w/lf`；`git hash-object -- <f>` 应等于 `git rev-parse HEAD:<f>`；见 FN-02 |
| **A6** | **`engine-gates.yml` 的 CI 挂接** | 新增 2 step 是否真能跑、是否引入受管区路径字面量 | `python -c "import yaml;..."` 解 YAML；`grep -rl '\\.scratch/' .github/workflows/` 应为 0 |
| **A7** | **「无 CI run」下的验收强度** | 全部证据为**本地同口径复跑**；不得被读成「CI 闭环」 | 看是否每处声明都标了“本地”；ADR-0014 已把口径写死 |

---

## 3. 可复现命令（审计侧最小集）

```bash
cd "D:/Aworker/mozilla/choose-your-country"

# ⓪ 工作区应干净
git status --porcelain && echo "(clean)"

# ① 编译 / 打包 / 启动测活
npm run typecheck
npm run build && sha256sum dist/find-your-country-code.user.js   # 期望 171172 / c324c47a481e…
npm run e2e                                                       # 期望 149 passed

# ② 新增脚本（含自检）
node tests/scripts/50-site-threshold-plan.mjs --self-test
node tests/scripts/50-site-threshold-plan.mjs
node tests/scripts/51-release-readiness.mjs --self-test
node tests/scripts/51-release-readiness.mjs

# ③ 门禁总账
node tests/scripts/verify-ticket-runner.mjs --audit
for t in $(node tests/scripts/verify-ticket-runner.mjs --list); do node tests/scripts/verify-ticket-runner.mjs --run "$t"; done
node tests/scripts/14-calibration-harness.mjs --out D:/tmp/cal.md --json D:/tmp/cal.json
node tests/scripts/32-real-site-corpus.mjs --out D:/tmp/rs.md --json D:/tmp/rs.json
node tests/scripts/doc-facts.mjs
node tests/scripts/issue-checkbox-audit.mjs
node tests/scripts/corpus-exemption-lint.mjs
node tests/scripts/check-ignore-guard.mjs --self-test
node tests/scripts/scratch-draft-clean.mjs --self-test

# ④ 隔离重建（避免脏工作区干扰）
TMP=$(mktemp -d); git archive HEAD | tar -x -C "$TMP"
ln -s "$PWD/node_modules" "$TMP/node_modules"
mkdir -p "$TMP/tests/vendor/react19"; ln -s "$PWD/tests/vendor/react19/node_modules" "$TMP/tests/vendor/react19/node_modules"
(cd "$TMP" && node node_modules/vite/bin/vite.js build && sha256sum dist/find-your-country-code.user.js)

# ⑤ 卫生
git diff --check
git ls-files | grep -vE '\\.(bat|ps1|cmd|png|ico|icns|jpg|jpeg|gif|webp|exe|dll|node|pdb|msi|so|dylib|bin|zip|gz|tar|7z)$' | xargs -r grep -lU "$(printf '\\r')"   # 期望：无输出
grep -rl '\\.scratch/' .github/workflows/   # 期望：无输出

# ⑥ 账本状态（期望 current=11 pending=0 revised=0）
node -e "const t=require('fs').readFileSync('.scratch/cycle8-grill/decision-ledger.md','utf8');console.log('current='+(t.match(/\\| current \\|/g)||[]).length,'pending='+(t.match(/\\| pending \\|/g)||[]).length,'revised='+(t.match(/\\| revised \\|/g)||[]).length)"
```

> **注意**：产物输出路径请用**无歧义绝对路径**（如 `D:/tmp/...`）—— 本机 bash `/tmp` = `%TEMP%`，而 Node `/tmp` = `D:\\tmp`，二者不同（见 findings register **FN-01**）。

---

## 4. 已知残留（审计勿当缺陷，但需确认是否已如实登记）

- **无 CI run**：未 push ⇒ 证据均为本地；**不得**读作 CI 闭环（FR-05 / ADR-0014）。
- **票 39 基线预存红**：21 票级门 20/21；审计 §2「不能动」（FR-04）。
- **`38-gf-alignment-check.mjs`**：本轮复测为 `INCONCLUSIVE（网络不可达）`，**非**版本判定失败。
- **未清场**：备份 ref `refs/backup/main-pre-rewrite` 仍在（破坏性操作，待用户确认；FR-03）。
- **`src/` 有改动（1 文件 / +12 −1）**：`src/detect/index.ts`，来自 D-002 融合 S-05 的 T-12 缺口 2a/2b；已由 `tests/contenteditable-scan.spec.ts`（3 用例）+ fixture 覆盖、E2E 149-0。**本轮 T-09 自身零 `src/` 改动**。

---

## 5. suggested skills（审计窗口按序加载）

- **`Skill: grill/engineering/code-review`** —— 双轴评审；**必须按 `HEAD` 读文件**，不得读脏工作区（本仓曾因此推翻 2 条误判）。
- **`Skill: gitbutler`** —— 版本控制语义；核验 `but` 唯一入口是否被破（本窗口有一次 **FN-02 用 `but discard` 清幽灵**的处置，请确认未越界）。
- **`Skill: grill/engineering/diagnosing-bugs`** —— 若复现出红，先建**红色反馈环**再猜因（FN-01 的教训）。
- **`Skill: grill/engineering/domain-modeling`** —— 核验 ADR 是否「只追加带日期注记、未改决策」。
- **`Skill: atomcode-research`** —— 若需就 A1/A2 做独立复核调研（同一时刻至多 1 个在途，**禁杀进程**）。
- **`Skill: khazix/neat-freak`** —— 收尾时先做**事实面对账**，再做任务书。
- **`Skill: grill/productivity/handoff`** —— 审计完后再生成下一轮交接（**本仓例外：写受管区**）。

---

## 6. 硬边界（每票适用，无变更）

- 版本控制**唯一入口 `but`**；禁裸 `git` 写操作；**未获授权不得 `but land`／`but push`**。
- **A-010 / WORKFLOW §4.2 的 force-push 例外已用尽**，不得据为先例。
- **本轮不发版**；ADR-0010 发布门不触发。
- **不得降低任何既有门禁**；门禁证据只认 **CI run / artifact**（本轮为本地，已如实标注）。
- 语料先行；禁物理删除语料条目。
- 性能红线（1000 节点 scan < 350ms）不得回退。
- 不得引入**远程网络面**与 **ML / 模型**。
- `.scratch/` 是**受管工件区**；清理**只允许触 `draft/`**；决策账本不得置于被忽略目录。
- 4 个**反向断言门**（`verify-ticket-07` G4v · `10` G7e · `11` G7 · `12` G7e）**不得移除或削弱**。
