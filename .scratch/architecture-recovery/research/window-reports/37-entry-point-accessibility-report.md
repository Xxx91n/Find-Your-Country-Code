# 窗口报告 — 票 37 · 入口可达性（Cycle-5 W1）

> 窗口身份：Cycle-5 实施子窗口，票 `37-entry-point-accessibility`，覆盖 **A-012 / A-013**（decision-ledger 台账）。
> GitButler 分支：`cch/37-entry-point-accessibility`（堆叠于 `cch/42-locale-switch` 之上——i18n.ts 改动区域依赖票 42 已提交的语言切换重构，见 §6 D-37a）。
> 阻塞关系：Blocked by: None — 立即开工。
> 版本控制：全程 `but`（WORKFLOW §4.2）。
> 生成：2026-09-14

## 0. 结论速览

破除「入口自锁」：新增第二条 `GM_registerMenuCommand`「打开面板」直达 `UI.open(null,null,null)`
（复用既有 anchor=null 居中路径），任何页面——包括整页无图标的低置信页——都能开面板并召唤
已登记字段补挂图标。lowkey 图标从 wrapper 盒外（top:-12px/right:-12px）移入字段右缘盒内
（top:50%/right:6px），祖先 `overflow:hidden` 不再裁剪；与高置信角标的视觉分层语义与悬停
恢复行为保留。issue 五项验收全勾销（本地密封断言 + verify-37 门；CI run 待推送后回链）。

## 1. 调研（动手前，handoff 通用要求）

- **atomcode 深度调研**（本窗口唯一在途，串行护栏）：「GM_registerMenuCommand 全局入口 +
  低置信度字段图标的可发现性设计」。采用结论：
  1. **A1/U4**：GM_registerMenuCommand 是三代管理器公认的全局入口标准 API；命令文案用动词
     短语；Tampermonkey 跨帧同名注册会合并——本脚本本就只在 `IS_TOP_FRAME` 注册，天然兼容。
     accessKey/autoClose 选项面不引入（autoClose 默认 true 恰符合「菜单关、面板开」）。
  2. **板块 B / U2（NN/g 横幅盲区）**：杠杆在位置与相关性而非视觉重量——降广告特征
     （去重阴影/高饱和）、提信息气味（静止态可感知灰度），不做高饱和/动画。
  3. **板块 B / U5（字段内悬浮 + 兄弟锚点）**：正确做法是挂到字段旁兄弟定位锚点——
     移入 wrapper 盒内字段右缘即规避祖先 `overflow:hidden` 裁剪（图标随字段盒，不被盒外定位裁掉）；
     比 `position:fixed` 逃逸方案更简单且天然随滚动同步（YAGNI 取最小实现）。
  4. **U3 渐进式披露**：L0 字段内小图标 → L1 面板 → L2 规则视图，层级不变。
- 回顾 `docs/adr/0001–0008` + `CONTEXT.md`：三档注入语义（auto/lowkey/none）、帧治理
  （面板仅顶层渲染）、PR 门控（ADR-0006 → verify-37.yml 带 pull_request 触发）。

## 2. 复现（先红后绿）

密封断言先行：`tests/entry-access.spec.ts`（5 例）+ fixtures `entry-access.html`（best score 26
的纯登记页，零图标）+ `lowkey-clip.html`（overflow:hidden 祖先内 lowkey 字段 + auto 对照）。
红证据（改前产物）：`menuCount=1`（期望 2，「打开面板」命令不存在）→ 三条 A-012 用例红；
裁剪用例同为红（盒外定位包围盒越出 .clip 容器）。A-013 分层/悬停用例改前即绿
（保留语义的对照钉）。

## 3. 实现

| 改动 | 文件 | 要点 |
|------|------|------|
| GM 菜单第二命令 | `src/main.ts` | `IS_TOP_FRAME` 块内新增 `GM_registerMenuCommand(t('openPanel'), () => UI.open(null,null,null))`——与字段分数无关的全局入口；面板仅顶层渲染不变 |
| 菜单文案双语键 | `src/i18n.ts` | `openPanel` zh/en（源码为 \uXXXX 转义形态，同形态写入） |
| lowkey 盒内定位 | `src/ui/index.ts` css | `.cch-btn-lowkey`：top:50%/right:6px/translateY(-50%) scale(.85)，opacity .38→.62，轻阴影替重阴影（降广告特征）；hover 恢复 opacity:1/scale(1.06) |
| 空目标守卫 ×2 | `src/ui/index.ts` | GM 入口 _target=null：行点击与负反馈均 toast `needTarget` 明示，面板保持打开（修复新增入口暴露的静默崩溃面：Fill.run(null) 会抛 TypeError） |
| GM stub 增强 | `tests/helpers/userscript.ts` | 记录 `{title,fn}` 到 `__cchMenu`（供测试真实调用菜单命令；`__cchMenuCount` 保留） |
| 既有断言更新 | `tests/iframe.e2e.spec.ts` | 顶层注册计数 1→2 + 标题含面板命令 |
| 票级门 | `tests/scripts/verify-ticket-37.mjs` + `.github/workflows/verify-37.yml` | node22 stripTypeScriptTypes 装载；20 断言（G1 菜单/G2 居中路径/G3 i18n 运行时双语/G4 lowkey 定位与横幅盲区禁令/G5 空目标守卫/G6 判定面零改动） |

## 4. 验收对照（issue 37 五项）

实现 commit：`mno`（分支 `cch/37-entry-point-accessibility`，栈于 cch/42 之上）。
CI run ID：未推送（WORKFLOW §4.2 未授权 push）——本地证据如下，推送后由 verify-37/e2e 回链。

- [x] **GM 菜单「打开面板」命令，无图标页面正常渲染（居中）**：entry-access.spec.ts
  「菜单登记「打开面板」命令；无图标页面经菜单开面板且居中」绿——__cchMenu 含面板命令、
  整页 .cch-btn=0、面板 position:fixed 且中心≈视口中心（±30px）。
- [x] **低置信页面（best score <35 但 ≥25）经该入口召唤已登记字段并补挂图标**：
  「菜单开面板 → #cch-summon 可见 → 点击 → wrapper 出现 + data-cch-summon=1 + 图标可再开面板」绿。
- [x] **lowkey 图标在典型 overflow:hidden 祖先容器下不被裁剪**：「overflow:hidden 祖先内
  lowkey 图标不被裁剪」绿——包围盒完全落在 .clip 盒内 + 可点击开面板。
- [x] **视觉分层语义保留；悬停恢复保留**：「lowkey 与 auto 分层语义保留；悬停恢复」绿——
  data-cch-tier 分层、静止态 opacity<1 vs auto=1、hover→1。
- [x] **新增密封断言覆盖两条路径**：entry-access.spec.ts 5 例（A-012 三例 + A-013 两例）
  + verify-ticket-37.mjs 20 断言。

验证输出：`npx playwright test` 全量 **94/94 绿**（含本票 5 例）；`npm run typecheck` 零错；
`node tests/scripts/verify-ticket-37.mjs` **20 PASS 0 FAIL**。

## 5. Delta 约束自查（本票专属检查点）

- 不改评分引擎 / SCORE_AUTO(70) / SCORE_LOWKEY(35) / 注入档位判定——verify-37 G6 静态钉死。
- 面板仍只在顶层帧渲染：菜单注册在既有 `IS_TOP_FRAME` 块内；iframe spec 顶层=2/子帧=0 断言绿。
- 无高饱和/动画：lowkey 无 animation/keyframes、saturate≤1（G4f）。
- 入口不与豁免/负反馈语义冲突：豁免页 scan 早退 + detachAll 清空 _lowFields → 面板可开但
  召唤区自隐（登记为空）；规则视图内仍可解除豁免（与既有 ruleExemptRemoved 菜单同语义）；
  负反馈空目标明示而非静默。

## 6. 偏离点呈报（WORKFLOW §6，待确认）

- **D-37a（栈内依赖）**：i18n.ts 编辑区与票 42（locale-switch，kus）同域——but 依赖检测
  拒绝独立落支，按 §4.2「确有依赖按 but move --above 堆叠」将本票分支锚于 cch/42 之上。
  非新造顺序，属真实文件依赖。
- **D-37b（附带修复）**：GM 入口暴露的既有静默面——面板 _target=null 时行点击 Fill.run(null)
  会抛 TypeError、负反馈静默 return。以既有 needTarget i18n 键明示化（最小守卫，不扩面）。

## 7. 教训候选（WORKFLOW §5 回写参考）

- src/i18n.ts 全文件为 \uXXXX ASCII 转义形态（非 UTF-8 CJK 字面量）；src/main.ts 存在
  混合行尾（CRLF 为主、菜单注册区为 LF）。跨文件精确串替换前须按字节探明编码形态，
  不能默认「中文=原文字面量 + 全文件单—EOL」。

## CI 证据补录（首脑授权 push 后，2026-09-14）

- 推送远端 head sha：`84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212`（分支 `cch/37-entry-point-accessibility`）
- 证据来源：`gh run list --repo Xxx91n/Find-Your-Country-Code --branch cch/37-entry-point-accessibility`
  轮询至全部 run 达到 terminal（completed）后取终态。
- 事件：全部 5 个 run 均为 `push`（无 `workflow_dispatch`）。

| Run ID | Workflow | Conclusion | headSha | Event |
|--------|----------|------------|---------|-------|
| 34845561263 | Verify Ticket 37 (entry-point-accessibility) | success | 84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212 | push |
| 34845560986 | Engine Gates | success | 84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212 | push |
| 34845561039 | Lockfile Regen | success | 84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212 | push |
| 34845561077 | Typecheck | success | 84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212 | push |
| 34845561008 | E2E | **failure** | 84b8ed7fadff4e72fc4d05aaf6966ca8bef9a212 | push |

**失败定位（不得粉饰）**：run `34845561008`（E2E），失败步骤为 job `e2e` 的 **`Run E2E`**。
失败用例仅 1 条（88 passed / 1 failed）：

- `tests/pseudo-select.spec.ts:34:3 › 伪 select 端到端（票 18） › 验收2/3 可编辑型: 召唤 → 面板选 Canada → 隐藏承值 input 原生 setter + input/change 事件`
- 报错：`locator.click: Test timeout of 30000ms exceeded`，卡在 `tests/helpers/userscript.ts:45`
  （`openPanel` 内 `wrapperFor(page,target).locator('.cch-btn').click()`）；
  Playwright call log 显示目标按钮已 visible/enabled/stable，但 `<div id="cch-sw">…</div>`
  （`#cch-pop` 子树）**intercepts pointer events**——即面板已展开并遮挡字段图标，点击被拦截。
- 归因说明（证据层面，未做代码改动）：本票改动 lowkey 图标定位（盒外→字段右缘盒内）
  与面板遮挡的相对几何关系相关，但该 spec 属票 18，本地 94/94 未复现；此失败究竟是
  本票回归还是 CI 环境下的既有时序/遮挡 flake，**本窗口未做定论**，留待首脑裁决。

**一句话判定**：CI 回链证据已补齐（5 个 run 终态全部落档，headSha 一致），但门禁**未全绿**——
E2E 红（1 failed：票 18 pseudo-select 点击被 `#cch-pop` 子树拦截），故「CI 证据缺口」已闭合、
「CI 绿灯」未达成。

## 返工轮次 R1

> 窗口身份：Cycle-5 票 37 **返工修复窗口（R1）**；上游启动器 `prompts/37-entry-point-accessibility-fix.md`。
> 分支 `cch/37-entry-point-accessibility`；修复 commit GitButler id `luv`，远端 head `0350110f`。
> 版本控制全程 `but`（WORKFLOW §4.2）。生成：2026-09-14。

### R1.1 独立复现（先复现再改码，未凭猜动代码）

1. **本地对 CI 失败用例原样复跑**：`npx playwright test tests/pseudo-select.spec.ts` → **3 passed（绿）**。
   按启动器要求，先归因「为何只在 CI 红」，不得直接改代码。
2. **CI 日志关键事实**（`gh run view 34845561008 --log-failed`）：失败按钮解析为
   `<button class="cch-btn" data-cch-summon="1" data-cch-tier="auto" data-cch-score="108">` ——
   是**盒外 auto 档**图标，并非本票改位的那个 lowkey 图标；但拦截者 `#cch-sw`/`#cch-pop`
   正是**由 `#anchor-cc` 图标开出的面板**（该面板在 :42 开启后未关）。
3. **只读几何探针**（`pseudo-react-select.html` 复刻 spec 序列，1280×720，修前产物）：
   - 面板 `#cch-pop`：`left=207.9 / top=114.1 / h=462`；`#rs-input` 召唤图标（auto，盒外 `right:-12px`）
     `right=197.0` → **横向余量仅 10.9px**，纵向完全落在面板内 ⇒ 遮挡与否只由横向余量决定。
   - `#anchor-cc` 图标实测 `data-cch-tier="lowkey"`（score 38 档）。本票把它由盒外
     `right:-12px` 移入盒内 `right:6px`，其包围盒左缘左移 ≈18px；面板按锚点左缘 `l = r.left`
     定位，面板左缘同步左移 ≈18px ⇒ 余量由修前 ≈27px 降至 ≈11px。
   - 余量 = `相邻字段右缘差 − 40.2px`，是**字体度量相关**量：本地 Windows 字体下 10.9px（>0 → 绿），
     Linux CI 字体度量漂移 >11px 即翻负（→ 红）。旁证自洽：修前 lowkey CSS（盒外锚点，余量 ≈27px）
     的 38/44 分支 CI 全绿。

### R1.2 根因

A-013「lowkey 图标移入字段右缘盒内」使面板锚点左移 ≈18px，把「面板左缘 vs 相邻字段图标右缘」的
横向余量压进字体度量敏感区（本地 ≈11px），在 CI 字体度量下越界成遮挡。**既非 flaky，也非 auto 图标被改位**
——是面板横向锚定方式与盒内锚点不匹配。

### R1.3 修复（限定于几何/遮挡，只动面板定位）

`src/ui/index.ts` `_pos()`：锚点为**字段盒内**图标（`anchor.right <= wrapper.right + 1`，即 lowkey 盒内定位）时，
面板左缘改锚到**字段右缘 + 8px**（`wr.right + m`），恢复与盒外锚点等价的横向间距（余量 ≈47px）；
盒外 auto 锚点路径**零改动**（`r.right > wr.right + 1` 不触发）。未改图标定位、未在召唤后关面板、
未削弱/删改任何断言或用例、未改票 18 验收语义、未回退 A-012/A-013 已验收行为。

### R1.4 本地确定性红→绿证据（新增密封回归，不改票 18 文件）

- `tests/fixtures/lowkey-occlusion.html`：上字段 lowkey（盒内图标）+ 下字段 auto（盒外图标），
  两侧均为**显式宽度**，几何与字体度量无关。
- `tests/entry-access.spec.ts`：新增用例「盒内 lowkey 锚开面板不遮挡下一字段图标」。
- **修前产物**：该用例 **1 failed**，call log 与 CI 同象（`#cch-pop` 子树 intercepts pointer events，
  55+ 次重试后 30s 超时）；**修后**：**ok**。

### R1.5 同一套验收复跑（不只跑失败用例）

| 门 | 命令 | 结果 |
|---|---|---|
| 票级门 | `node tests/scripts/verify-ticket-37.mjs` | **20 PASS, 0 FAIL** |
| 全量 E2E | `npx playwright test` | **95 passed**（修前 94；+1 新增回归） |
| 类型检查 | `npm run typecheck` | **0 错** |

### R1.6 新 CI 证据（push 事件，head `0350110f`）

| Run ID | Workflow | Conclusion | 备注 |
|---|---|---|---|
| 34847188053 | E2E | **success** | 90 passed；票 18 `pseudo-select.spec.ts:34:3` ✓（767ms）、新增遮挡回归 ✓ |
| 34847188018 | Verify Ticket 37 (entry-point-accessibility) | success | |
| 34847188135 | Engine Gates | success | |
| 34847188090 | Typecheck | success | |
| 34847188035 | Lockfile Regen | success | |

**一句话判定**：CI 五门全绿；上一轮红的 `pseudo-select.spec.ts:46` 点击超时已消除，票 18 与票 37
全部验收项在 CI 复绿。

