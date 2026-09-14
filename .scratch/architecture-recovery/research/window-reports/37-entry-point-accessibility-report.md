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
