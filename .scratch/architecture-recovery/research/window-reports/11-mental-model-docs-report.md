# 票 11 实施报告：心智模型文档化沉淀

> 实施窗口（fresh context）| 2026-09-05 | GitButler 分支：`cch/11-mental-model-docs`
> 开工复述已执行：本票 `Blocked by: None`（Wave 1，依据 issues/11 头部字段 + WORKFLOW §4.3 波次只由 Blocked by 推导）；必读清单 10 份按序读全（issues/11、handoffs/11、spec.md、WORKFLOW.md、research/atomcode-mental-model-v2.md、.scratch/mental-model-v2/report.md、research/industry-models.md、research/misdetection-root-causes.md、docs/adr/0001、CONTEXT.md）后动手。

## 一、变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| `CONTEXT.md` | ① 简介补一句指向新章；② 检测节新增 帧治理 / 可见性闸门 / ARIA 语义层 / 校准语料 四术语；③ 注入与填充节新增 伪 select（组件库下拉）；④ 文末新增「行业心智模型对照」章（检测骨架三支柱 + 工程支柱三件 + 对标结论，每个论断一行、证据出处附仓库相对路径） | 验收项 1/2；遵循 handoff delta「只做对照与引用，不复制调研全文」 |
| `.scratch/architecture-recovery/issues/11-mental-model-docs.md` | 4 条验收项 `- [ ]` → `- [x]` | handoff 完成定义要求验收清单全部勾选 |
| `.scratch/architecture-recovery/research/scripts/verify-ticket-11.mjs` | 新增票级机检脚本 | 检查点要求「检查脚本与方法写进报告」（WORKFLOW §2.6 node 防嵌套） |
| `.scratch/architecture-recovery/research/window-reports/11-mental-model-docs-report.md` | 本报告 | handoff 收尾必做 |

未修改任何业务代码；未新增 ADR（ADR-0005 归 17 票）。

## 二、验收证据（issue 4 条逐项）

| # | 验收项 | 证据 |
|---|---|---|
| 1 | 对照章：三支柱骨架 + 三工程支柱，每条标注证据出处 | CONTEXT.md 文末新增章；机检 `PRESENCE-OK: 对照章(3 小节)与五个新术语全部就位`；6 份证据文件路径全部机检存在 |
| 2 | 五个新术语入词汇表，每条含定义与 Avoid，格式对齐既有条目 | 机检 `PRESENCE-OK` + `AVOID-OK`；`_Avoid_` 计数 17→22（恰 +5）；格式与既有条目同构（`**术语**：`/定义行/`_Avoid_: `） |
| 3 | 交叉引用真实可解析 | `node .scratch/architecture-recovery/research/scripts/verify-ticket-11.mjs` → `PATH-OK: 6 个文内路径全部存在` + `RESULT: PASS`（exit 0） |
| 4 | 不新增 ADR、不修改业务代码 | 变更仅上表 4 个文件；`docs/adr/` 无新增（0001–0004 原状） |

CI 说明：本票为纯文档变更，无构建/测试面，CI-only 政策（构建/编译/打包/测试证据）不适用；验收证据 = fs 存在性机检输出 + `git diff`。未推送 CI 验证分支、未开 PR（未被要求）。

### 检查方法（检查点要求落档）

- 脚本：`.scratch/architecture-recovery/research/scripts/verify-ticket-11.mjs`（可复跑）。
- 方法：提取 CONTEXT.md 全文反引号内「含 `/` 且以 `.md` 结尾」的 token（排除 URL/含空格项），以仓库根为基准逐一 `fs.existsSync`；同脚本机检对照章 3 小节标题、五个术语头、每条新术语后最近 `_Avoid_: ` 存在、无 BOM、无 CRLF。
- 自证护栏（WORKFLOW §5 教训「验收工具先自证」）：断言本票引用的 6 份证据文件必须全部出现在提取结果中，防止正则漏提取造成「0 检查全过」假绿。

### 关键输出（原样）

```
PATH-OK: 6 个文内路径全部存在 -> .scratch/architecture-recovery/research/industry-models.md | docs/adr/0001-scoring-engine-replaces-boolean-detection.md | .scratch/architecture-recovery/research/atomcode-mental-model-v2.md | .scratch/architecture-recovery/research/misdetection-root-causes.md | .scratch/mental-model-v2/report.md | docs/adr/0004-pseudo-select-recognition-deferred.md
PRESENCE-OK: 对照章(3 小节)与五个新术语全部就位
AVOID-OK: 五条新术语均含 _Avoid_ 项
RESULT: PASS
```

字节/编码验证：CONTEXT.md 无 BOM（首字节 `23 20 46 69` = `# Find`）；`git diff --stat` = 2 files changed, 47 insertions(+), 5 deletions(-)（最小 diff，非整文件重写）。

## 三、偏离点

1. **ctx 工具回退**：本窗口无 ctx 工具（宿主未暴露），按任务书预设回退——读取走内置 Read，批量编辑与程序化验收走 node 脚本（WORKFLOW §2.6 即为此设计；编辑脚本为 OS temp 一次性脚本，用后已删，不入库）。
2. **CONTEXT.md 行尾归一**：worktree 原为 CRLF（历史写入产物，索引 blob 为 LF），编辑统一写回 LF 对齐索引，消除 mixed-EOL 隐患；diff 统计证实未产生整文件噪音。
3. **证据路径选择**：「伪 select 先取证不仓促注入」论断引用已存在的 `docs/adr/0004-pseudo-select-recognition-deferred.md` 而非 spec.md（周期归档后 spec 路径会漂移，避免给 CONTEXT.md 埋死链）。
4. **分支堆叠（非波次内并行）**：首次 `but commit` 原子失败，报告两处依赖——issues/11 文件本体建在 `cch/mmv2-tickets`，CONTEXT.md 正文建在 `cch/08-docs-adr`。按 WORKFLOW §4.2「确有依赖按堆叠」规则，`but branch new cch/11-mental-model-docs --above cch/mmv2-tickets`（该栈已含 08-docs-adr）后重提成功；未触碰其他窗口的未提交文件。大脑收口时注意：本分支在栈内位于 mmv2-tickets 之上，非独立并行分支。

## 四、未完成/未验证项

- 术语定义措辞与对照章论断的**表述质量**为人写，机检只覆盖存在性/格式/路径三类硬约束；建议大脑收口（S8）时人工过目一遍。
- 分支未推送、未开 PR（任务书与 WORKFLOW §4.2 均未要求；推 CI 对纯文档票无意义）。

## 五、给大脑的风险提示

- **ADR-0005 落地后的回写点**：17 票裁决后，「伪 select」词条与对照章对标结论第三条「实现与否由 ADR 裁决」两处措辞需随裁决更新（现按"待裁决"表述，与 ADR-0004 deferred 状态一致）。
- **.scratch 依赖**：对照章引用 `.scratch/mental-model-v2/report.md` 与 `research/` 三份资产；未来若清理/归档 .scratch，需先复跑 `verify-ticket-11.mjs` 核对路径，避免 CONTEXT.md 出现死链。
- **并行窗口**：本票只动了上述 4 个文件，未触碰其他票的产物与分支；工作区其余脏文件属其他窗口/大脑，未纳入本票提交。
