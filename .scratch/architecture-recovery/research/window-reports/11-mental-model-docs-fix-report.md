# 票 11 修复报告（11-fix）：verify-ticket-11 EOL 检查改 blob 口径

> 复核修复窗口（fresh context）| 2026-09-05 | GitButler 分支：`cch/11-mental-model-docs`（追加修复提交，循 03fix/07fix 先例）
> 任务书：`prompts/11-mental-model-docs-fix.md` | 复核依据：`verification/review-mmv2-wave1.md` §1-票11 / §2-1 / §3-2
> 修复范围红线：禁改 CONTEXT.md 正文与 issue 勾选状态——两项均未触碰（编辑脚本只写 verify-ticket-11.mjs 一个文件）。

## 一、再质检记录（先证首脑结论属实才动手）

| # | 首脑声明 | 实际执行的验证命令 | 实测输出 | 判定 |
|---|---|---|---|---|
| 1 | 脚本复跑 exit 1，内容门全过、EOL 门红 | `node .scratch/…/verify-ticket-11.mjs; echo exit=$?` | `PATH-OK/PRESENCE-OK/AVOID-OK` + `EOL-FAIL` → `RESULT: FAIL(1)`，`exit=1` | 属实 |
| 2 | blob=LF（0 CRLF） | `git cat-file -p HEAD:CONTEXT.md \| grep -cU \r` | `0` | 属实 |
| 3 | 工作树=CRLF（122 行） | `grep -cU \r CONTEXT.md`、`wc -l < CONTEXT.md` | `122` / `122` | 属实 |
| 4 | git status 干净 + autocrlf=true + 无 .gitattributes | `git status --short -- CONTEXT.md` / `git config --get core.autocrlf` / `ls .gitattributes` | 空（clean）/ `true` / 不存在 | 属实 |
| 5 | issue 4 条 [x]（§3-2 越位登记） | `grep -c "^- \[x\]"`、`grep -c "^- \[ \]"` issues/11 | `4` / `0` | 属实（勾选按首脑处置保留） |
| 6 | 无新增 ADR（无 0006） | `ls docs/adr/` | 0001–0005（0005 为票 17 产物） | 属实 |

**再质检结论：首脑对票 11 的六项结论全部属实，无一处有误，按 §2-1 处方动手修复。**

## 二、对照表：声明 -> 证据 -> 结论

### 2.1 首脑声明逐条对照（票 11 范围）

| 首脑声明（review-mmv2-wave1） | 本窗口证据 | 修复后结论 |
|---|---|---|
| §1 对照章 + 5 术语属实 | 复跑 `PRESENCE-OK`（章 3 小节 + 五术语头全中） | 通过，无需修复 |
| §1 脚本 PASS 部分属实（内容门过 / EOL 门脆，exit 1） | 复跑 `exit=1` + `EOL-FAIL` 实测 | **已修复**（见 §三），修复后 `exit=0` |
| §1 issue 4 条 [x] 属实（窗口代勾，§3-2 职权越位） | grep 4/0 实测 | 勾选保留；本窗口遵守禁改令未触碰；职责归大脑 S8，不追认 |
| §1 无新增 ADR 属实 | `docs/adr/` 0001–0005，无 0006 | 通过，无需修复 |
| §2-1 EOL 门环境脆（blob=LF / 工作树=CRLF / status 干净 / autocrlf=true / 无 .gitattributes） | 再质检 #2–#4 全部复现 | **按处方修复：EOL 改 blob 口径（git cat-file -p），BOM 检查保留** |
| §3-2 职权越位（代勾 checkbox） | 同 #5 | 不追认，登记在案；本窗口未重复该行为 |

### 2.2 对照 README.md 完成定义 × 原始票据（issue）每条验收项

README 第二周期票务状态表对票 11 的记录：`done(复核通过,附 11-fix)｜对照章/五术语/路径全过;verify-ticket-11 的 EOL 检查口径缺陷转修复`。完成定义（README 产物地图）：**每票完成状态以窗口报告落盘 + 大脑复核为准**。

| issue 验收项 | 票 11 实施报告证据（复核前） | 复核/修复后状态 |
|---|---|---|
| 1 CONTEXT.md 对照章（三支柱 + 三工程支柱 + 证据出处） | 机检 `PRESENCE-OK`，6 证据路径全存在 | 复跑仍过 ✓ |
| 2 五新术语含定义与 Avoid | `PRESENCE-OK` + `AVOID-OK`（_Avoid_ 17→22） | 复跑仍过 ✓ |
| 3 交叉引用真实可解析 | `PATH-OK: 6 个文内路径全部存在` | 复跑仍过 ✓ |
| 4 不新增 ADR、不改业务代码 | `docs/adr/` 无 0006；变更仅 4 文件 | 仍成立 ✓ |

四条验收项内容面在修复前后均成立；唯一缺陷（检查口径）由本修复闭环，报告落盘即新证据。

## 三、修复 diff 说明

`verify-ticket-11.mjs` 三处，其余未动（`git diff` 实测仅此文件）：

1. **+import**：`import { execSync } from 'node:child_process';`
2. **头注 +2 行**：修复出处与理由（review-mmv2-wave1 §2-1；blob 是入库事实，工作树 CRLF 属 autocrlf 物化）。
3. **§4 编码/EOL 卫生段**：删除工作树断言 `text.includes('\r\n')`（autocrlf 宿主恒红），改为 blob 口径 `execSync('git cat-file -p HEAD:CONTEXT.md')` 判 CRLF（try/catch 包裹，读失败计 FAIL）；`EOL-OK` 行注明工作树 CRLF 属物化不入库；**BOM 检查原样保留（工作树口径）**。

禁止项核验：CONTEXT.md 正文 0 字节改动；issues/11 勾选态 0 改动。

## 四、验收证据

- **修复后本地复跑（任务书硬性要求 exit 0）**：
  ```
  PATH-OK: 6 个文内路径全部存在 -> …（6 份证据文件）
  PRESENCE-OK: 对照章(3 小节)与五个新术语全部就位
  AVOID-OK: 五条新术语均含 _Avoid_ 项
  EOL-OK: HEAD:CONTEXT.md blob 为 LF(工作树 CRLF 属 autocrlf 物化,不入库)
  RESULT: PASS
  exit=0
  ```
- **CI 说明**：本修复对象是工件质检脚本（artifact-QC），非项目构建/测试，任务书明示不违反 CI-only 政策；无 CI run 需求。未推分支、未开 PR。
- **版本控制**：遵循 WORKFLOW §4.2，全程 `but`；修复提交追加到票 11 既有分支 `cch/11-mental-model-docs`（循 03fix/07fix 在票分支追加修复提交的先例）。

## 五、偏离点与给大脑的风险提示

- **处方二选一的取舍**：任务书允许「改 blob 口径」或「删 EOL 断言」，取 blob 口径——保留一道 EOL 卫生门（入库事实必须 LF），同时消除环境脆；未选删除是避免丢失该不变量。
- **系统性现象（本票不动，提示归档）**：工作树 CRLF 物化波及多个文件（verify-ticket-11.mjs 自身工作树也被物化成 CRLF，编辑脚本实测 `eol-before=crlf`）；根因是 `core.autocrlf=true` + 无 `.gitattributes`，README 已登记「.gitattributes CRLF 规范化未做，待后续卫生票决策」。其他窗口的同类工作树口径检查可能同样恒红，建议收口时统一按 blob 口径排查。
- 首脑复核状态「附 11-fix」待大脑收口时以本报告勾销。
