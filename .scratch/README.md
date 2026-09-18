# `.scratch/` —— 受管工件区边界图（Boundary Map）

> **定性**：**受管工件区**，不是可抛弃现场。内容**不可抛弃**、**必须保持 Git 跟踪**、**原地保留**（不迁出）。
> **依据**：`docs/adr/0013-governed-artifact-area-and-evidence-trail.md`（决策 1–6）· `.scratch/cycle8-grill/decision-ledger.md`（D-003 · D-004 · D-005 · D-007）· `.scratch/cycle8-grill/spec.md`（T-01/T-02/T-03/T-04/T-05）。
> **落地**：Cycle-8 T-01（分区）· T-02（留痕三件套）· T-03（防误吞门禁）· T-04（被忽略目录边界收口）· T-05（findings register）。
> 生成：2026-09-18

---

## 1. 分区

| 区 | 路径 | 允许内容 | 清理 |
|---|---|---|---|
| **证据区** | `.scratch/evidence/` | 不可再生证据：外部输入留痕台账、findings register、治理边界文档 | **永不清理** |
| **草稿区** | `.scratch/draft/` | 真可抛弃物：**零引用**的探针脚本、临时草稿 | **允许清理**（仅经白名单脚本，见 §3） |
| **历史布局（原地保留）** | `.scratch/architecture-recovery/` · `.scratch/cycle6-grill/` · `.scratch/cycle7-grill/` · `.scratch/cycle8-grill/` | 既有周期产物；**已被 CI 门禁读取或为人写/裁决产物** ⇒ 按判据归证据 | **不清理**（走正常评审） |

> 历史布局**原地保留**是 D-003 的显式裁定，不是「未完成分区」：其内容按 §2 判据逐类判定后，只有**零引用探针**被迁入 `.scratch/draft/probes/`（见 §4）。

---

## 2. 判据（分类的唯一依据）

判据**不是目录名**，而是两条（ADR-0013 决策 1）：

1. **可再生成性**：内容是**人写/裁决的产物**（⇒ 证据）还是**工具可再生成的产物**（⇒ 可草稿）；
2. **是否被构建/验证链消费**：**被 CI 门禁读取的文件自动升级为受管**（⇒ 证据）。

推论：探针脚本若**被门禁读取**（如 `06-probe-*` / `10-probe-srcdoc-origin` / `12-ab-cap-fidelity`）或**被报告引用为结论出处**，即为**证据**；只有**零引用**的探针才落草稿区。

---

## 3. 清理白名单（硬约束）

- 清理**只允许**通过 `node tests/scripts/scratch-draft-clean.mjs`（**默认 `--dry-run`**，须显式 `--apply` 才删除）。
- 该脚本对目标路径做**硬白名单**：任何解析后不在 `.scratch/draft/` 之下的路径**一律拒绝执行**（非零退出）。
- `draft/README.md` 为区界文档，**永不在删除候选内**。
- **禁止**用 `rm -rf`、`git clean -fdx`、编辑器批量删除等绕过白名单的方式清理 `.scratch/`。
- 决策账本（唯一权威需求面）**不得**置于任何被忽略目录；`.scratch/` 下现有账本均为 Git 跟踪。

---

## 4. 草稿区现状（T-01 分区落盘）

迁入 `.scratch/draft/probes/` 的判据 = **零引用**（全仓 505 个文本文件中，无任何文件引用其文件名或去扩展名主干）且**不被任何 CI 门禁读取**：

| 文件 | 引用数 | 门禁读取 |
|---|---|---|
| `08-probe-dataset.mjs` | 0 | 否 |
| `39-candidates-probe.mjs` | 0 | 否 |
| `39-codepen-probe.mjs` | 0 | 否 |
| `39-headed-probe.mjs` | 0 | 否 |
| `39-inject-probe.mjs` | 0 | 否 |
| `39-matrix-probe.mjs` | 0 | 否 |
| `39-matrix2.mjs` | 0 | 否 |
| `39-selector-probe.mjs` | 0 | 否 |
| `39-viewport-probe.mjs` | 0 | 否 |

**留在原地的探针**（同一目录、但被引用或门禁读取 ⇒ 按 §2 判据升级为证据）：`06-probe-common.mjs` · `06-probe-mirrors.mjs` · `06-probe-real.mjs` · `10-probe-srcdoc-origin.mjs` · `12-ab-cap-fidelity.mjs` · `08-probe-impact/shapes/signals/srcdoc-inert.mjs` · `08-run-gates.mjs` · `12-gates.mjs` · `digest-ticket08-facts.mjs` · `probe-ticket08-src{,2}.mjs` · `verify-ticket-08.mjs` · `verify-ticket-10.mjs`。

---

## 5. 外部输入留痕三件套（T-02）

任何**不可再生**的外部输入（第三方评审、审计报告、外部工具产出、外部调研存档）：

1. **入库**受管区（`.scratch/`，Git 跟踪）；
2. **台账**记录 **SHA-256 + 来源 + 抓取日期** ⇒ `.scratch/evidence/external-inputs-ledger.md`；
3. **push 到远端**（「证据只存在一份于本地可清理目录且从未 push，等于没有」）。

**禁止**：外部输入落在任何被忽略目录（`.gitignore` 命中处）。已存在的 22 件外部输入已补录哈希台账（见 §6 台账）。

---

## 6. CI 消费面登记（T-01 附则）

`.scratch/` 被以下门禁脚本**真实读取**（缺文件即 `exit 1`）——这些路径**不得移动、不得改名**。路径均相对 `.scratch/architecture-recovery/`：

| 读取方 | 被读路径 |
|---|---|
| `tests/scripts/verify-ticket-06.mjs` | `research/scripts/06-probe-{common,mirrors,real}.mjs` |
| `tests/scripts/verify-ticket-08.mjs` | `issues/08-phase-b-failure-fixes.md` |
| `tests/scripts/verify-ticket-10.mjs` | `research/scripts/10-probe-srcdoc-origin.mjs` · `issues/10-srcdoc-origin-fix.md` |
| `tests/scripts/verify-ticket-12.mjs` | `research/scripts/12-ab-cap-fidelity.mjs` · `issues/12-rules-limit-fidelity.md` · `research/window-reports/12-rules-limit-fidelity-report.md` |
| `tests/scripts/issue-checkbox-audit.mjs` | `issues/*.md` · `research/window-reports/*` |

**反向断言门保持有效**：`.github/workflows/*.yml` **禁止**出现 `.scratch/` 路径引用。**门禁脚本读 `.scratch/` 数据 ≠ workflow 引 `.scratch/` 路径**。4 个反向断言门（`verify-ticket-07` G4v · `verify-ticket-10` G7e · `verify-ticket-11` G7 · `verify-ticket-12` G7e）**不得移除或削弱**。

---

## 7. 被忽略目录边界（T-04 收口结论）

| 目录 | `.gitignore` 行 | 定性 | 依据 |
|---|---|---|---|
| `dist/` | :22 | 构建产物 ⇒ **保持忽略** | 构建产物入库是反模式 |
| `test-results/` | :25 | Playwright 运行产物 ⇒ **保持忽略** | 可再生产物；锐评事故根因见 ADR-0013 事故回溯 |
| `playwright-report/` | :26 | 运行产物 ⇒ **保持忽略** | 同上 |
| `live-out/` | :29 | 真实站点冒烟层**运行产物** ⇒ **保持忽略（复核项关闭）** | 见 §7.1 |
| `docs/*`（宽忽略 + 三行白名单） | :12–15 | **合法形态、不重写** | 落在 gitignore 官方范例形态内；由 §8 门禁兜住 |
| `.codegraph/codegraph.db` | `.codegraph/.gitignore:4` | 工具缓存 ⇒ 保持忽略 | 可再生成 |

### 7.1 `live-out/` 复核结论（关闭 ADR-0013 决策 4 的复核项）

**结论**：`live-out/` 是**纯诊断/运行产物**，**不构成站点行为基准** ⇒ **不晋升入库**，保持忽略。

证据（可复跑）：

- 唯一写入方 = `.github/workflows/real-site-smoke.yml`：`:75–76` 写 `live-out/smoke-summary.json` / `live-out/smoke-report.md`；`:82` 写 `live-out/cdp-fitness.json`；`:115` `path: live-out/` 上传为 **CI artifact**。
- 全仓检索 `live-out` 的**读取方为零**：`grep -rn 'live-out' --include=*.mjs --include=*.ts --include=*.yml --include=*.json tests .github src` 只命中该 workflow 的**写入/上传**行，无任何门禁把它当**输入**。
- 判据落点：该层的放行判据（`gate` / `counts` / 失败清单）由 workflow 在**运行期**从 `smoke-summary.json` 直接读取并写入 step summary + artifact ⇒ **权威证据 = CI run / artifact**，不是磁盘文件。

---

## 8. 防误吞门禁（T-03）

- 门禁 = `node tests/scripts/check-ignore-guard.mjs`：对**关键路径**跑 `git check-ignore -v`，断言**不被忽略**；被忽略时打印「哪一行哪条规则吞了它」。
- 挂接：**折叠进既有 workflow**（`.github/workflows/typecheck.yml`），**不新增 workflow 文件**。
- 关键路径清单**只存在于脚本内** —— workflow 文件里不出现 `.scratch/` 路径字面量（否则会击穿 §6 的反向断言门）。
- 门禁自带**阴性对照**（断言 `dist/`/`test-results/`/`playwright-report/`/`live-out/` **确实被忽略**），证明它真的能区分「被吞」与「没被吞」，而不是恒真。

---

## 9. findings register（T-05）

审计发现与残留**不散落**，统一收进 `.scratch/evidence/findings-register.md`（带**日期**与**复核期限**；例外五要素 = 发现 ID · 理由 · 补偿性控制 · 具名签核 · **到期日（绝不自动续期）**）。
