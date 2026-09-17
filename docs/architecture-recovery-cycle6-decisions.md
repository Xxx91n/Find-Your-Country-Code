# Cycle-6 决策摘要 — 可配置、可解释、可证明（2026-09-17）

> 沉淀自 `.scratch/architecture-recovery/decision-ledger.md` 台账（**A-026…A-036 = 11/11 implemented**，deferred 0 · stale 0）。
> 上游：`report/architecture-review-cycle6.html`（架构大脑调查）+ `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016 = 16/16 implemented）。
> 本轮 12 票（`issues/01`–`issues/12`）全部复核通过；账本随 `.scratch` 一并归档。

## 一、可配置（A-026 / A-027）

- **决策**：面板「设置」获得**零置信度一级入口**——GM 菜单新增「设置」命令（稳定 id `cch-menu-settings`），打开面板并**显式切到设置所在视图**（`data-cch-view` / `data-cch-section` 稳定标识符深链），入口做**滚入可见区 + 高亮衰减**；**不新建独立设置视图**、不重排设置顺序。语言控件由「循环按钮」改为**三选一显式控件**（自动 / 中文 / English 并列，`role=radiogroup`，旧 `#cch-locale-tg` 删除并加回归钉）；面板文案改**字典化全量重渲染**（`[data-i18n*]` 标记族统一刷新，图标 `title`/`aria-label`、收藏行 `title`、空态文案零漏刷），删除手工逐项刷新 `_applyLocaleText`。
- **依据**：可达性失败而非能力缺失——语言能力早已存在但埋在第 3 层点击深度且**无任何零置信度入口**（Cycle-6 调查 CONFIRMED）。
- **落地**：`src/main.ts`（4 条菜单命令 + 稳定 id）、`src/ui/index.ts`（`openSettings` / `_revealSection` / `_i18n` / `_refreshIconLabels` / `_setLocale`）、`tests/settings-surface.spec.ts`（8 例）、`verify-ticket-02-settings.mjs`（33 断言）。
- **结果**：设置面可达性闭合；CI `Verify Ticket 02` 通过。

## 二、可解释（A-028）

- **决策**：建**一份结构化诊断事件流作唯一事实来源**（`src/diag/index.ts`），两个 serializer（面板视图 + 机器可读导出）读同一份 `records()/snapshot()/checks()`；四层判定（tool / inject / logic / write）**分级门控**（`error`/`warn`/计数器恒开，`trace` 可关且惰性构造）；环形缓冲容量 200（溢出丢最旧并计数）；独立诊断视图与既有界面摘要条同源。
- **依据**：「可解释」要求故障可归因到层；双写（面板一套 / JSON 一套）会漂移，故收敛为单采集源双出口。
- **落地**：`src/diag/index.ts` + `src/config.ts`（`DIAG_LAYERS` / `DIAG_CAPACITY` / `DIAG_REASON` 闭集）+ 诊断视图；`verify-ticket-03.mjs`（58 断言）。
- **结果**：诊断面闭合；单采集路径经代码级证实。

## 三、可证明（A-029 / A-030 / A-031 / A-032 / A-034 / A-035 / A-036）

- **A-029 断言阶梯与真实站点全阶梯**：定义 L0–L4 五级阶梯与**逐级层归属**（`tests/ACCEPTANCE-SURFACE.md`），建 harness 交互原语（`tests/helpers/primitives.mjs`，两 harness 收敛为同一份），真实站点层**跑满 L0–L4** 但保持 **advisory**（仅 `schedule` + `workflow_dispatch`，**永不进 `pull_request`**）；发布门（ADR-0010）以「绿 / 显式 ack + 立票」二选一**阻断出包**，PR 不阻断。
- **A-030 形态语料三层架构**：镜像页 9 + 结构骨架 8 + `manifest.json`（SHA-256 指纹 + provenance 元数据），**原始快照出仓**（库外 archive，仓内只留指纹），退化回路用**确定性结构 diff 分级**（非像素），纪律「**绝不为修绿而盲目更新快照**」。
- **A-031 三个新误报面**：iti v29 内部搜索框 / ISO2 值语言下拉 / 无括号区号文本 —— **语料先行**，引擎侧只加 scoped 护栏（无无条件放行）。
- **A-032 视觉替换型隐藏 select**：两子形态（`width:1px+aria-hidden` 与 `display:none`）入语料并据实修正 N7 的机理假设（原文存 `supersededAssumption`）。
- **A-034（P0）跨帧 origin 校验误判**：`about:srcdoc` 帧的 `location.origin` 被序列化为字符串 `"null"`，而 `window.origin` 为继承的真实 origin ⇒ 旧判据在 srcdoc 帧**必然误判并丢弃合法填充指令**。修法：全仓唯一定义 `SELF_ORIGIN`（`window.origin` 优先 + 回退分支），四处操作数统一取用；**不放宽任何来源校验**。结果：真实站点 `live-codepen-pen-fullpage` 由 `L3!/L4!` 转 **L0–L4 全绿**。
- **A-035 ITI 形态 L3 判据**：钉版库全文**仅 1 处 `dispatchEvent`**（只发自定义事件）⇒ 旧「原生 input/change 各 ≥1」对 ITI 目标**确定性不可满足**（假红）。判据按写入口形态分派，普通字段判据**逐字保留**，ITI 分支 fail-closed。
- **A-036 门保真度缺口**：BC 替身缺 `origin` ⇒ origin 守卫从未被真实行使；缺结构化克隆 ⇒ 接收方就地改写污染发送方缓存 ⇒ 上限断言（S4）的绿是**假绿**。裁定 **`RULES_MAX_OVERRIDES` 强制点在写路径**（`src/store/index.ts:273` fail-closed，读路径 slice 保留为第二层防御），立 **ADR-0011**；替身补克隆保真度后 S4 反映**真实保证**。

## 四、域建模（A-033）

- **决策**：为「发布门」立 **ADR-0010**（PR 不阻断 / 发布门阻断的取舍 + 5 条被否路线 + 4 条反证条件）；`CONTEXT.md` 补入 7 条术语（验收阶梯 / 发布门 / 形态语料 / 结构骨架 / 镜像页 / 诊断面 / 判定记录），28→35，零实现细节。
- **落地**：`docs/adr/0010-release-gate.md` + `docs/adr/0011-rule-override-cap-enforcement-point.md` + `CONTEXT.md`。

## 五、本轮确立的关键取舍（过程决策）

1. **R-2 去污染**：票 02 的提交曾把票 03 的诊断面**整层**扫入其 `src/ui/index.ts` 却未带配套 `config/types/main`，致分支**不可构建**（嵌合体）。取径：剔除整层，只保留票 02 自有 delta；**`src/i18n.ts` 刻意保留**那 4 行诊断文案键（cch/03 与该文件同 blob 且其提交未自带该键，删除会致 cch/03 **静默丢失**文案）。
2. **R-3 面板居中**：真因是**三重复合** —— `_pos` 在 `_render` **之前**取 `offsetHeight`（时序，Δh/2 ≈ 19px）+ 面板挂 `body` 致宿主页 `div{margin:12px 0}` 污染定位（+12px）+ 入场动画 transform 浮动（0–7.5px）。修法：面板 `margin:0` + **仅** `anchor===null` 路径在 `_render` 后按最终高度重算一次 `_pos`；**未放宽任何断言**。
3. **栈拓扑修复**：GitButler 无法表达「只从一方移除共属改动」，故用 `git commit-tree` **保树重挂**（tree 与提交信息逐字保留、只改 parent）+ `update-ref` 修复栈；四支重挂后 7 支全部可应用。
4. **门保真度优先于绿**：发现「假绿」时的处置原则是**修实现 + 补保真度**，而非调整断言（A-036 落地）。

## 六、已知红与遗留

- **真实站点层 flaky**：`live-codepen-editor` 在 CI 上出现帧发现阶段失败（第三方页面漂移），advisory 语义下**只告警不阻断**；发版时按 ADR-0010 条款 2 走 ack 流程。
- **`verify-03` 的 G8c 微基准**：门控关时 trace 100000 次 < 50ms —— 本机测量在 50ms 阈值附近浮动（空载 63–71ms / 负载轻时 < 50ms），**CI 上通过** ⇒ **机器性能敏感**，非代码回归；本地跑该门须以 CI 为准。
- **遗留 2 处真实脱节（入 backlog）**：① `tests/ACCEPTANCE-SURFACE.md` 仍引用已删除的 `#cch-locale-tg`；② `gf-alignment-check.yml` 未声明 `pull_request`（违反 ADR-0006 条款 2，未登记例外）。
