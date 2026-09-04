# 窗口实施报告：02 — 多信号加权评分检测引擎

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/02-scoring-engine
> 开工复述：Blocked by: 01 —— 已确认解除（`research/window-reports/01-modular-skeleton-report.md` 落盘、验收全过）；必读 7 份（prompt → issue → handoff → misdetection-root-causes → industry-models → atomcode-industry-models → spec → WORKFLOW）已按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 `cch/02-scoring-engine`，与 01/03/06 并行分支不堆叠）。

## 1. 信号层实现说明（L0–L4）

检测核心重写为 `src/detect/index.ts` 的纯函数 `scoreElement(el, ctx)` → `{score, tier, signals}`，UI/存储零依赖（可注入 mock document/锚上下文单测）。`_process` 只消费 tier 做分级行动。蓝图 = industry-models.md §④（Chromium 分层骨架 + Fathom 评分表达 + 密码管理器降级哲学），误报标定 = misdetection-root-causes.md §2 五类。

| 层 | 实现 | 误报/漏检靶点 |
|---|---|---|
| **L0 语义标准层** | `autocomplete` token 解析：`tel-country-code`/`country`/`country-name` 命中即 `L0_TOKEN_SCORE=100`（一票强命中）；`tel` 系 token 与 `type=tel` 给锚语义分 10；`inputmode=tel` 8；`autocomplete=off` 不触发 L0 | autocomplete 三大盲区（§3-5）；WHATWG token [AM 核心结论2] |
| **L1 结构文本层** | 词表显式分组互斥取最高：区号专名组 30 / `country` 裸词 14 / `prefix` 歧义 7 / `npa` 4；label 强短语 26、裸词「区号」单独 8、「固话/本地/local」负 30、复合短语「国家/地区区号」白名单 40 | prefix 称谓误报（§2①）；裸词区号误报（§2②）；N1/N4 漏检 |
| **L2 锚→目标关联** | 同 `closest('form')`（无 form 则全文档）存在另一 `input[type=tel]` → +18；锚分显式负分被否（单字段页/懒渲染真区号字段会被压没，以 fp-regression 正例控件标定） | 孤立字段语义（IM P3）；「prefix 无上下文不注入」的前提 |
| **L3 内容验证** | 选项**值域整体分布**统计：值命中真实区号表（+NN/00NN/裸NN ∈ COUNTRIES 拨号集）每个 +4（cap 45）；文本 `(+NN)` 形态 +8；纯数字枚举占比 ≥60% 负 40；ISO2 值+EN 国家名双证据占比 ≥50% → 国家语义抑制；**关键词↔内容同向锁定**（strong kw 但内容零区号证据 → 撤销 kw 分） | 纯数字选项漏洞（§2③）；国家选择混同（§2④）；ISO2 撞库（§5-0②） |
| **L4 排除层** | 负分制 -70；拉丁词 **camelCase 拆分 + 词边界等值**（≥6 字符才允许子串），CJK 短语包含；复合短语白名单优先于排除 | hidden→idd 子串撞库（§2⑤/F6）；「地区」误杀 N1（§5-0①） |

分级行动：`score ≥ 70` auto（正常图标）→ `≥ 35` lowkey（`.cch-btn-lowkey` 低调样式挂点，opacity .38 + scale .78）→ 其余 none（不注入；score ≥ 25 的登记入 `UI._lowFields`，面板出现「召唤」入口，点击补挂正常图标）。国家选择器语义（ISO 主导且无区号内容证据）无论分数一律不自动注入（US7）。

扫描面扩充：`input[type=number]` 纳入 scan（N3 双重漏）；`_isIti` 增加 `window` 存在性守卫；`_label` 修复 aria-labelledby 多 id 空格分隔解析（N2）；INPUT 类型闸门（hidden/email/search 等永不评分，N6）。**Shadow DOM 穿透未实现（票 04 范畴）**——已留 `_collect(root, sel)` 测试缝，票 04 只需替换该方法。

## 2. 常量表与出处

全部落在 `src/config.ts`，逐条注明调研出处（缩写见文件头注释）：

| 常量 | 值 | 出处 |
|---|---|---|
| `L0_TOKEN_SCORE` | 100 | [AM] Chromium「autocomplete 除 off 外压过一切本地启发式」（form_structure.cc） |
| `L0_TEL_HINT_SCORE` | 10 | [IM] P1 语义标准信号；10 为标定值：使「type=tel + label 强短语」无锚仍达低调档 |
| `L0_INPUTMODE_TEL_SCORE` | 8 | [IM] §④ L0 结构佐证 |
| `L1_STRONG_KW_SCORE` | 30 | [IM] P1 结构文本信号「中」权重上界；与 L3 cap 45 组合成 75 可过 auto |
| `L1_COUNTRY_KW_SCORE` | 14 | [MD] §2④ 国家选择混同 → country 裸词降权（旧引擎与区号专名同权是误报主因之一） |
| `L1_PREFIX_KW_SCORE` | 7 | [MD] §2① prefix 歧义降权组 |
| `L1_NPA_KW_SCORE` | 4 | [MD] §4 harness 撞库类新发现 |
| `L1_LABEL_PHRASE_SCORE` / `L1_BARE_QU_SCORE` | 26 / 8 | [MD] §2② 裸词「区号」单独降权 |
| `L1_LOCAL_FIXED_PENALTY` / `L1_COMPOUND_SCORE` | -30 / 40 | [MD] §2② / §5-0① 复合短语白名单 |
| `L2_ANCHOR_TEL_SCORE` | 18 | [IM] P3 锚→目标；18=标定值：kw+phrase+锚 74 过 auto、phrase+锚 44 lowkey |
| `L3_PLUS_DIAL_SCORE` / `L3_PLUS_PAREN_SCORE` / `L3_DIAL_CAP` | 4 / 8 / 45 | [IM] P4-2 rationalization 复核不单票定案（45 < 70，内容验证单独不可注入） |
| `L3_ISO_BONUS` | 30 | [SP] US7 国家语义分层 |
| `L3_NUMERIC_MIN_RATE` / `L3_NUMERIC_PENALTY` | 0.6 / -40 | [MD] §2③「1-3 个月内有效」 |
| `L4_EXCLUDE_PENALTY` | -70 | [IM] §④ L4 负分制；-70 压过 L1 强组合 |
| `SCORE_AUTO` / `SCORE_LOWKEY` | 70 / 35 | [SP] 分级行动三档；70 留一档给「L1 强组 30 + L3 满 45」内聚命中 |

阈值 70/35 与内容验证 cap 45 的联动是刻意设计：任何单层都无法独立到达 auto 档（L0 一票信号除外——这是 [AM] Chromium 优先级链的直译）。

## 3. 误报样本断言结果（逐条）

**引擎级单测门**（`research/scripts/verify-ticket-02.mjs`，mock DOM 直调真实 `scoreElement`）：**36/36 pass，exit 0**（留档 `verification/02-unit-gate.txt`）。误报 5 类逐条（含信号路径）：

| 样本 | 旧引擎路径 | 新引擎判定 | 关键信号 |
|---|---|---|---|
| F1 称谓前缀 `name="prefix"` mr/ms/mrs | hasAttrKw + hitIso(mr/ms 是合法 ISO2) | **none** (25分) | kw:prefix 7 + ISO 语义抑制（mr/ms 双证据不足 50%） |
| F1b 称谓前缀数字编码 | hasAttrKw + hitCode | **none** (29分) | kw:prefix 7 + numeric-enum -40 |
| F1c label「Phone Prefix」称谓 | hasLabelPhrase | **none** (18分) | 无 label 短语命中 + ISO 抑制 |
| F2 纯国家选择 `name="country"` ISO 值 | hasAttrKw + hitIso≥2 | **none** (62分) | kw:country 14 + ISO 语义抑制（US7 分层） |
| F3 固话本地区号 input「固话区号（不含国家区号）」 | LABEL_PHRASES「区号」 | **none** (14分) | label:local-fixed -30 |
| F4 固话本地区号 select「区号」010/020 | hasLabelPhrase + hitCode | **none** (-14分) | 裸词区号 8 + local-fixed -30 + 010/020 不在区号表 |
| F5 时区 select GMT±X | hitCode(纯数字) + hitPlusLike 40% | **none** (18分) | +8/+9 不在区号表 → 零 plus-dial；numeric 枚举 -40 |
| F6 数量 select class 含 hidden（→idd 子串） | hasAttrKw(idd) + hitCode | **none** (22分) | 词边界匹配 hidden≠idd → 零 kw；numeric -40 |
| F7 父容器 country-form 内称谓 select | 父级类名关键词 | **none** (18分) | 父级类名已移出语料（污染路径根除） |
| F8 label「国家/地区」纯国家 select | harness 未复现（label 单独不触发） | **none** | 「地区」排除词 -70（zh 国家名）/ ISO 语义抑制（EN 变体 48 分仍 none） |

**harness 回归基准**（issue 验收 3）：新引擎装载脚本 `research/scripts/misdetect-repro-v2.mjs`（id 与旧 harness 一一对应）——**25/25 符合预期，exit 0，FP 全家桶 F1–F8 全部不注入**（留档 `verification/02-harness-v2.txt`）。旧引擎基线 `misdetect-repro.mjs` 保留只读（24/25，FP 8 例复现，留档 `verification/02-red-baseline-old-harness.txt` 作 TDD 红证据）。FN 修复组：N1（复合短语白名单）→ auto、N2/N2b（aria-labelledby 多 id 解析）→ lowkey 注入、N3（type=number 纳入 scan + 评分）→ 注入、N4（prefix 降权组在 input 侧 + 锚）→ 注入；N5（react-phone-input-2）/N6（hidden）保持不注入为语义决策（组件自带选择器/隐藏字段不叠加图标）。

## 4. 验收命令与退出码（issue 内 7 条验收项）

1. **评分核心纯函数** ✅ — `scoreElement(el, ctx)` 不触碰 UI/存储（`createDetect(UI)` 仅 `_process` 消费 tier）；单测 mock DOM 直调验证（verify-ticket-02.mjs 36 例）。
   证据：`node .scratch/architecture-recovery/research/scripts/verify-ticket-02.mjs` → **exit 0，36/36 pass**。
2. **误报 5 类样本落「不自动注入」档** ✅ — 上述 §3 逐条；E2E fixture 断言 `tests/fp-regression.spec.ts` fp-1..fp-5 全绿。
3. **复现 harness 全绿化** ✅ — `node .scratch/architecture-recovery/research/scripts/misdetect-repro-v2.mjs` → **exit 0，25/25**（含 N1 误杀与 N2 多 id 两例 FN 修复确认；旧 harness 保留为基线）。E2E 全量：`npx playwright test` → **exit 0，20 passed**（fp-1..5 已按 06 报告 §6.2 维护契约摘除 `test.fail` 标记）。
4. **autocomplete 强信号本地 fixture 验证** ✅ — 新增 `tests/fixtures/autocomplete.html` + E2E 断言：`tel-country-code`/`country`/`country-name` 三字段注入（100 分一票），`type=tel` 主号与 `autocomplete=off`/无信号字段不注入（off 字段因 L1 关键词+锚低调注入——KeePassXC 忽略 off 先例，industry-models.md M4）。
5. **歧义词降权组 + 排除词负分** ✅ — L1 四组显式分权（30/14/7/4，组间互斥）+ L4 -70 负分制（词边界 + 复合白名单优先）；F1/F6/N1 证据见 §3。
6. **三档分级行为接线** ✅ — `UI.attach(el, kind, tier, score, signals)`：auto 正常样式 / lowkey `.cch-btn-lowkey` 低调样式（`data-cch-tier` 标记）/ none 不注入 + `rememberLow` 登记 + 面板 `#cch-summon` 召唤入口（i18n 中英文案）。E2E：lowkey 样式类断言 + 召唤入口点击补挂断言（fp-regression.spec.ts 票 02 分级行为组 3 例）。
7. **权重/阈值显式常量 + 出处** ✅ — `src/config.ts` 全常量表逐条注明 [AM]/[IM]/[MD]/[SP] 出处；§2 表为逐条映射。

补充验证：`npx tsc --noEmit` detect 模块 0 错（其余 17 个错误为 01/03 票遗留，非本票引入）；`npm run build` exit 0（dist 50.05 kB，11 modules）。E2E 基线一处升级：cch-test-page2 检测矩阵 12→13 字段——`#phonePrefix` 由漏检（harness N4）转低调注入，属本票修复目标，绿色组已更新计数并加显式断言。

## 5. 偏离点

1. **plusLike「形似值占比」不单独定案**：industry-models 蓝图沿用了旧 hitPlusLike 40% 阈值，但 harness F5 证明 GMT±X 时区正是被它击穿；本实现改为「形似值仅作内容证据之一」，注入必须依赖真实区号表命中或 L1 强信号——对蓝图的有意收紧，依据 [MD] §5-0②「值域整体分布判定而非单值」。
2. **L2 孤立字段不加显式负分**：spec 写「孤立字段减分」，但显式负分会把单字段页面（fp-regression 正例控件无 tel 锚）与懒渲染场景的真区号字段压出低置信档；改为「锚存在才加分」，隔离效果等价（prefix 类孤立字段被歧义降权组压制）。
3. **E2E 基线 12→13 与 off 字段断言方向**：见 §4 补充验证；off 字段保持 L1+L2 生效符合 KeePassXC #2929 行业先例（cited），非遵守 off 的绝对排除。
4. **首版 plus-like-crowd 路径**（形似值占比过半 +30）在自查中发现会单独把 F5 抬到 48 分，已删除该独立加分路径（标定过程记录于单测门 P15 双例）。
5. **tsc 纪律**：本票把 `src/detect/index.ts` 的 8 个 strict 错误清零（jQuery/window 鸭子类型用 `@ts-expect-error` 局部豁免）；fill/store/iti-adapter 的 17 个遗留错误未动（01/03 票范围）。

## 6. 给大脑的风险提示

1. **rules 模块仍未接入**：站点豁免/强制（票 05）落地前，评分引擎对全站无差别生效——若出现新误报形态，暂无用户侧豁免通道（面板负反馈入口属票 05/07）。
2. **`inputmode=tel` 仅单测覆盖**：无 E2E fixture（真实站点多与 type=tel 并存，信号面窄）；票 07 UI 升级时可顺带补页面样本。
3. **召唤入口可见性**：低置信字段登记只在面板打开时可见（`#cch-summon` 在 popup 内）；页面无任何高/中置信字段时用户无面板入口——属票 07 完整 UI 的已知缺口，本票按「UI 只做分档挂点」边界不扩。
4. **Summon 后重扫竞态**：`UI.summon` 直接 attach 不登记 `_done`（用户显式请求优先）；若同元素随后被 `_process` 再次评分，会因 wrapper 已存在而跳过 attach，无重复图标风险（已验证）。
5. ** iti 中间版本/填充链**：本票未触碰 Fill/iti-adapter（票 03 范畴）；检测侧 `_isIti` 行为与 01 基线一致（仅加 window 守卫）。
