# 窗口实施报告 — 票 18: 伪 select 端到端识别与填充

> 实施窗口 | 2026-09-06 | 分支 cch/18-pseudo-select-e2e（堆叠 cch/13-visibility-l3-hardening，祖先链含 16-fix/15/12/14/16/07/05/09/04/02/03/06/01 全部 src 依赖）
> 版本控制遵循 WORKFLOW §4.2；证据只认 CI run（CI-only 政策）。

## 0. 开工门槛复述

- Blocked by 13/16/17: 全部解除。证据 = 三份窗口报告落盘（13-visibility-l3-hardening-report.md / 16-scoring-consistency-report.md 与 16-scoring-consistency-fix-report.md / 17-pseudo-select-forensics-report.md）+ 工作区 src 基座含 13/16 全部改动（可见性闸门/ISO2_SET/占位剔除/iti 佐证防线实读确认）。
- **检查点一: ADR-0005 已读，裁决 = accepted（实现）**，实现范围 = 登记 + 手动召唤，不自动注入图标、不自动填充；端到端实现由本票承接并**受该档位约束**。本票未取消、未硬做自动注入。
- 必读 9 份 + 17 票取证报告/探测策略/样本事实全部按序读毕。

## 1. 变更清单与理由

### src/detect/index.ts（核心：ARIA combobox 语义层入评分）

| 变更 | 理由 |
|---|---|
| 模块级新增 comboboxEvidence/pseudoOptionStats/pseudoNameHit/resolveAriaIds | [17 票取证 observed] 触发器三形态 DIV/INPUT/BUTTON[role=combobox]；aria-expanded 判属性存在性（EP closed 态空串容忍）；弹出层 4/5 库 portal 到 body → 必须 aria-controls/owns id 解引用（rootNode + ownerDocument），不得子树搜索 |
| scoreElement 新增 ARIA 层（SELECT 之外）：结构组合信号 +L2 "pseudo:combobox"(20) + 内容验证沿用 L3 口径（plus-dial/paren/numeric-enum/country-identity 全部复用 L3_* 常量与门槛，含 options<2 gate） | 检查点二：内容验证复用 L3 口径，不为新控件类型开误报后门；ISO2 判定同走数据全集成员测试 + 国家名互证（文本/aria-label 双面，antd observed 文本=ISO2） |
| 否决组：aria-autocomplete=list 或 both 且选项内容国家证据全零 → "pseudo:veto:search-typeahead" 整体判 0 | [17 票策略 §2] 站内搜索补全否决；react-select（同 autocomplete=list 但选项有国家证据）不误杀 |
| 输入类型闸门豁免：type=search + readonly + role=combobox（antd 形态 observed）放行进 ARIA 层 | antd 触发器 type=search 会被既有闸门误杀；豁免后有否决组 + 档位 cap 兜底 |
| aria-hidden input 硬排除（gate:aria-hidden） | MUI/react-select 隐藏承值 native input 形态不进检测登记面（防凭 name=country 之类混入召唤面） |
| _process：readonly 闸门对 combobox 触发器豁免（select-only 形态常态）；res.pseudo 档位 cap 强制 none + "gate:adr-0005-register-only" 留痕（分数保留 ≥25 走 rememberLow 登记）；kind 分发 res.pseudo → "pseudo"（含 forced 规则路径） | ADR-0005 档位约束：只登记 + 手动召唤；票 04 教训先枚举 kind 消费方（UI.attach/rememberLow/Fill.run/_applyLowkeyMode）再改分发 |
| _fingerprint/OBSERVED_ATTRS 增加 role/aria-expanded/aria-controls/aria-owns | 面板开合触发重评：关闭态悬空 id 静态证据、展开态 option 内容证据（17 票 §1.2 口径） |
| SCAN_SELECTORS 增加 [role="combobox"] | DIV/BUTTON 触发器不被既有 input 选择器覆盖（MUI/Radix 完全漏扫） |

### src/config.ts

- 新增 ARIA_COMBO_STRUCT_SCORE = 20（唯一新常量）：单独 20 < 登记线 25（无国家语义上下文不登记，站内搜索框不进召唤面）；+L1 country kw(14)=34、+label phrase(26)=46 稳过线。内容验证分值全部复用 L3 既有常量（口径单一来源，零新阈值）。

### src/fill/index.ts（fillPseudo 两形态策略）

| 变更 | 理由 |
|---|---|
| _carrier：承值探测只在结构容器（form + 5 层祖先）内，候选 = 隐藏 native input（type=hidden 或 aria-hidden=true 且带 name），现值护栏 = 空或 2 字母 ISO2 形态 | [17 票 §1.5 值承载三分天下] MUI/react-select 有 DOM 承载；不上溯 document 全域防误写 csrf/token 类隐藏域 |
| fillPseudo 可编辑型（非 readonly INPUT 触发器）→ _inject(carrier, country.iso)：原生 setter + input→change→blur（复用票 09/15 注入安全层） | issue 验收2 原文：可编辑型走隐藏输入原生 setter + 事件 |
| _pseudoFillByListbox：aria-controls/owns 解引用 listbox → _pseudoOptMatch（data-value/value + text/aria-label 双面、ISO2/EN/CN 全匹配、aria-disabled 跳过）→ 未挂载先点触发器展开再找 → option click | issue 验收2：select-only 型走开面板 + 点击选值；[17 票] 5/5 库选值无原生 change/input 事件 → 唯一通路是驱动组件自身 UI |
| _pseudoFillByKeys：focus → ArrowDown 展开 → 逐项导航 → Enter（键盘回退） | issue 验收2"键盘/点击"之键盘路径；点击优先，键盘 best-effort |
| run() 增加 pseudo 分支 | 票 04 kind 消费方枚举 |

### src/ui/index.ts

- _applyLowkeyMode kind 推导补 role=combobox → pseudo（低调样式迁移不再把伪 select 回落 input 走错填充策略）。

### 测试资产

| 资产 | 内容 |
|---|---|
| tests/fixtures/pseudo-mui.html | select-only 型 hermetic 复刻（DIV 触发器 + aria-labelledby + 隐藏承值 native input + portal listbox；库自己写承值、无原生事件——全按 17 票 observed） |
| tests/fixtures/pseudo-react-select.html | 可编辑型 hermetic 复刻（可编辑 INPUT + aria-haspopup=true + aria-autocomplete=list + 无 aria-selected option + form 内 type=hidden 承值） |
| tests/fixtures/pseudo-negative.html | 否决组负例（搜索型 typeahead + 无国家上下文通用 combobox）+ anchor 正样本 |
| tests/pseudo-select.spec.ts | 3 例 E2E：select-only 端到端 / 可编辑型端到端（含 input/change 事件断言）/ 否决组不登记不注入 |
| research/scripts/verify-ticket-18.mjs | 35 断言验收门：两形态评分/否决组/antd 豁免/aria-hidden gate/41 例语料回归/填充策略引擎级断言/静态落点 |
| .github/workflows/verify-18.yml | 票 13/16 同款 ticket-scoped workflow：acceptance-gate + engine-gates(02+repro-v2) + 全量 E2E |

## 2. 验收证据（CI run，只认 CI）

| issue 验收项 | 证据 run（全部 success） | 关键输出 |
|---|---|---|
| 验收1 ARIA 语义层接入评分（两形态 + L3 口径 + 误报防线同等生效） | verify-18 run [34029969317](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34029969317) acceptance-gate job | verify-ticket-18: 35 PASS, 0 FAIL（1.x select-only 结构/L3 复用信号/cap；2.x 可编辑型；3.x veto；4.x antd 豁免+aria-label 互证 isoName=4/4；5.x aria-hidden gate；6.x 语料回归；8.x 静态落点） |
| 验收1 误报防线同等生效（语料零扰动） | 同上 6.x | 41 例语料 mismatch=0，precision=1.0 recall=1.0；引擎门 36/36 + harness 25/25 保持（票 16 后基线不变） |
| 验收2 填充策略（两形态 + 既有策略不破坏） | 34029969317 gate 7a-7d + E2E | 7a 可编辑型承值 CA + input/change/blur 事件；7b MUI US→CA 覆写；7c select-only 点击选值命中；7d 键盘回退失败安全 false |
| 验收3 每形态 ≥1 组件库 fixture 端到端绿 | E2E run [34029969338](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34029969338) | pseudo-select.spec 3 passed（select-only 端到端 US→CA + 触发器文本 Canada；可编辑型承值 CA + data-events=input,change,；否决组零注入零登记） |
| 验收4 既有全量 E2E 无回归（CI 证据） | 同上 | **59 passed (25.0s)** = 13 票基线 56 + 本票 3，全绿 |
| 验收5 ADR 裁决非缓议 | ADR-0005 status=accepted（实现）已读 | 本票按裁决执行，未取消 |

- 提交：urz（feat src）+ uym（test 资产/门/workflow），push b1c2864；两 run 同 commit 全绿。

## 3. 检查点核验

| 检查点 | 结论 | 证据 |
|---|---|---|
| 一：开工先读 ADR-0005，缓议则取消 | 裁决=实现，本票执行且档位受限（cap 强制 none） | docs/adr/0005 实读 + gate 1.5/1.7 断言（rememberLow 登记且 attach 未调用） |
| 二：ARIA 层复用 L3 口径，无新误报后门 | 分值常量全部复用 L3_*；否决组 + aria-hidden 硬排除 + 登记线 25 兜底；语料 41 例零扰动 | gate 1.3/3.x/5.x/6.x + config 注释 |
| 三：基于 13/16 最新基座 | 分支堆叠 above cch/13-visibility-l3-hardening（链含 16-fix）；检测基座改动零冲突 | but 分支操作日志 + CI 快照构建成功 |

## 4. 偏离点（如实呈报）

1. **fixture 为 hermetic 结构复刻，非真实 CDN 组件库**：CI E2E 沿用仓库"无外部网络依赖"原则（playwright.config 注释 + framework-react/react19 系 fixture 同口径）；复刻结构逐属性对齐 17 票五库探针 observed（trigger 形态/haspopup 差异/option 语义分裂/承值三分天下），真实库证据由 17 票探针（5/5 捕获）承担。若大脑要求真实库 E2E，需评估 CDN 网络依赖进 CI 的稳定性代价。
2. **搜索型否决组仅在选项内容可见时生效**：关闭态无 option 证据 → 无 veto，靠"结构 20 < 登记线 25"兜底；但同页存在 tel 锚时（+18）无标签搜索框可达 38 ≥ 25 进入召唤面（不注入）。召唤面噪音属登记档已知语义（16 票报告 §6.2 同先例）。
3. **承值现值护栏拒绝区号形态**：_carrier 只接受空值或 2 字母 ISO2 现值的承值面（防误写 csrf/token）；区号形态承值（个别站点）不会被采用，fill 落 listbox 交互路径。MUI/react-select observed 形态均为 ISO2/空，不受影响。
4. **本地门禁脚本干跑**：verify-ticket-18/02/repro-v2 在推送前本地 node 干跑自证（research 工具口径，WORKFLOW §2.6；红→修复→35/35 后才推送）；最终证据只认 CI run（§2 表）。
5. **git 状态透明**：首推提交因双栈结构被拒（依赖 cch/01/07）→ 按 but skill 依赖流程 but branch new --anchor cch/17（误锚 A 栈）→ but move --above cch/13 纠正至 src 栈顶后成功；工作区其他窗口的 unassigned 产物（19 票 docs、README/package.json 等）未触碰、未纳入本票提交。

## 5. 未完成 / 未验证项

- **antd 虚拟化滚动渲染**：目标 option 未挂载时（6 项只渲染 2，17 票 observed）点击/枚举不可达；键盘导航可部分缓解但未实现"滚动加载更多"策略——登记为未做项（17 票已预告）。
- **键盘回退的导航起点假设**：_pseudoFillByKeys 假设高亮起点为首个 option；起点不确定的库（记忆高亮形态）可能偏移——best-effort 路径，点击为主通路。
- **真实库实站冒烟**：hermetic 复刻 + 17 票真实库结构证据的组合，未在真实 MUI/antd 站点做人工冒烟（无实站环境）；建议发布后由用户实测反馈校准（对标 13 票后基线口径）。
- **atomcode 交叉验证轮**：17 票遗留的串行护栏让位项，本票未发起（同 17 票偏离点 1，护栏空闲后由大脑补跑，问题模板已备）。

## 6. 给大脑的风险提示

1. **双栈合流顺序**：工作区为两栈——A 栈（docs/chore：17→11→mmv2-tickets、10→08）与 B 栈（src：本票→13→16-fix→15→12→14→16→07→05→09→04→02→03→06→01）。ADR-0005 在 A 栈（cch/17），本票代码在 B 栈。收口合流时两栈都需落 main，顺序由大脑定。
2. **场景矩阵无影响**：新增扫描面 [role=combobox] 在既有 fixtures/测试页零命中（无 combobox 元素），cch-test-page2 图标断言口径（激活 tab A:3/B:4/C:3/E:3/D:3）不受影响——59 passed 实证。
3. **Rules 强制规则可越过 ADR 档位**：用户显式 forced/pageTier 规则命中伪 select 时按规则档注入（kind=pseudo 走 fillPseudo）——KeePassXC Site Preferences"用户干预自担风险"心智，有意保留；ADR cap 只约束启发式路径。
4. **伪 select 召唤面增量**：真实页面上多个伪 select 同时命中会同时进召唤列表（summon 为全量 attach）；如有站点反馈噪音，候选收口方向 = 召唤列表逐项粒度（新票）。
5. **Node20 → 24 deprecation 警告**：CI annotations 提示 actions/checkout@v4、setup-node@v4 目标 Node 20 被强制 Node 24——全仓库 workflow 共有，非本票引入，供大脑统一升级时参考。
6. **工作区仍有其他窗口 unassigned 产物**（19 票 docs、README/package.json 修改、wave 复核文档），本票提交严格限定本票 14 个文件，未触碰。

## 7. 声明 → 证据 → 结论对照（完成定义审计）

| 声明 | 证据 | 结论 |
|---|---|---|
| issue 验收1（ARIA 层接入评分，两形态 + L3 口径 + 防线同等生效） | run 34029969317 acceptance-gate 35 PASS（1.x/2.x/3.x/4.x/5.x/6.x） | 闭合 |
| issue 验收2（填充策略两形态，既有策略不破坏） | 34029969317 gate 7a-7d + 引擎门 36/36 + harness 25/25 + E2E 59 passed | 闭合 |
| issue 验收3（每形态 ≥1 fixture 端到端绿） | run 34029969338 pseudo-select.spec 3 passed | 闭合 |
| issue 验收4（既有全量 E2E 无回归，CI 证据） | 34029969338 59 passed（基线 56 + 3） | 闭合 |
| issue 验收5（ADR 缓议则取消） | ADR-0005 裁决=实现，未取消 | 不适用（按实现执行） |
| 检查点一/二/三 | §3 表 | 全闭合 |
| 报告落盘 | 本文件 | 完成 |
