# 窗口实施报告 — 票 13（可见性闸门与 L3 内容验证加码）

> 实施窗口 | 2026-09-06 | 分支 cch/13-visibility-l3-hardening（above cch/16-fix-calibration-mirror，祖先链含 01/02/04/05/07/09/12/14/15/16 全部依赖）
> 输入: prompts/13-visibility-l3-hardening.md（任务书）+ 必读清单 10 项 + 16-fix 报告 §5（检查点四防线输入）
> 版本控制遵循 WORKFLOW §4.2；证据只认 CI run（CI-only 政策）。

## 0. 开工门槛确认

- Blocked by 16: 已解除。证据 = 16 两份窗口报告落盘 + cch/mmv2-tickets 提交 kks（wave2-fix review 复核通过，gh CI 2 绿实证，README 状态「13 可开工」）。
- 必读清单 10 项全部读毕（issue/handoff/spec/WORKFLOW/atomcode×2/宏观报告/detect/config/误报根因）。

## 1. 变更清单与理由

### src/detect/index.ts（核心）
| 变更 | 理由 |
|---|---|
| 新增 `_hiddenByStyle(el)` 可见性判定（display:none / visibility:hidden\|collapse / opacity<0.01 / content-visibility:hidden / clip rect(0,0,0,0) / clip-path 全裁剪形态 / 宽高同为 0 零尺寸） | [AM 结论4] Bitwarden dom-element-visibility / KeePassXC #2184 教训；spec US4 |
| 闸门在 _process 评分/规则覆盖之后降档：tier → none + `VIS gate:visibility-hidden` 0 分信号；**分数与 signals 原样保留**，走 none 分支既有 `rememberLow` 登记 | 检查点一：闸门只改「注入档位」不改「检测登记」；隐藏承值 select 仍可面板召唤填充（E2E 验收2） |
| `el.getBoundingClientRect/getComputedStyle` 不可用时 fail-open（视为可见） | 防误杀优先（宁漏闸不误杀）；mock/异构宿主零破坏 |
| 可见性判定入 `_fingerprint`（'v0'/'v1'） | 显隐翻转（SPA 路由/tab 切换）触发重评，补挂/撤挂双向 |
| 召唤豁免：UI.attach force 路径打 `data-cch-summon` 标记；闸门与 none 分支 detach 均不回拆召唤图标 | 用户显式行为压过启发式（KeePassXC Site Preferences 同心智） |
| L3 ISO2 成员测试改 `ISO2_SET`（数据全集键集），替换 `/^[a-z]{2}$/` 形态学预筛 | issue 验收3 / SP US8 / whatwg#8597（select 语义由选项内容裁决）；文本↔国家名互证保留 |
| L3 占位首项剔除：`isPlaceholderOpt`（首项 + 占位词表命中 + 值无区号/ISO2 证据）→ 不进 total 与各分布分母 | issue 验收5；剔除仅作用计分域，填充侧独立枚举 options 不受影响（检查点二） |
| 检查点四防线（= 16-fix §5 方案①）：iti 容器分结算移至 L1 之后——存在最低佐证（type=tel / autocomplete tel 系 / inputmode=tel / 任一正向 L1）才入账 60 分；否则 `iti:container-unattested` 0 分留痕 | 关闭 mm2-neg-itires（.iti 容器唯一证据 input 60/lowkey 误注入）；真 iti 字段 60+10=70 auto 口径不变（CI 复测实证） |
| 删除重复的 `res = this.scoreElement(el)`（4a1cf7c 意外引入，纯函数二次调用，行为等价但浪费） | 顺手修正；zero behavior change |
| 吸收工作区 unassigned 的票 16 L3 独立叠加 hunk（else-if → 独立 if + 注释） | 16 窗口的 re-QC 以工作树为准（其报告/CI 实证均基于此形态），但分支 tip 未含该 hunk；本票基于其意图落地并如实记录 |

### src/fill/index.ts
- 共享区号消歧（issue 验收4）：`fillSelect` 三级匹配改为「值命中 + 选项文本含国家名」双证据优先，退回纯值命中 → data-attr → 文本；`_inject` 增 `opts.selectedIndex` 校正——共享值（+1）下值 setter 只命中首个同值 option，消歧落点经 selectedIndex 传递（自定义下拉站点读 selectedIndex 渲染选中态）。
- 裸值下拉（无文本证据）行为不变（首值命中），零回归。

### src/ui/index.ts
- `attach`：wrapper display 继承改为 `none → inline-block`（隐藏字段召唤后图标可达）；force 路径打 `data-cch-summon` 标记。
- 其余 UI 面板/召唤/偏好逻辑零改动。

### 测试与语料
- 新增 `tests/fixtures/visibility.html`（五形态隐藏字段 + 隐藏承值 select + 可见对照）与 `tests/visibility.spec.ts`（验收1/2 E2E 四例）。
- 新增 `.scratch/architecture-recovery/research/scripts/verify-ticket-13.mjs`：28 断言验收门（41 例语料回归 + itires 翻转 + iti 佐证 + L3 两项 + fill 消歧/selectedIndex 落点 + 可见性 fail-open + 静态落点 9 项）。
- 语料 appendOnly：追加 mm2-pos-shared-dial / mm2-pos-placeholder-dial（39→41）；mm2-neg-itires `knownResidual` true→false 状态位翻转（_meta 规则允许的状态位表达，无删除/重写）。
- 门脚本 mock 保真同步：verify-ticket-02.mjs / misdetect-repro-v2.mjs 的 El 构造器把 props.type 暴露给 getAttribute（此前丢弃 → 防线后 P4 断言以 mock 盲区失败；对齐真实 DOM 与 14-lib-engine 口径，16-fix「镜像口径同步」先例）。P4 标定期望分 78→88。

## 2. 验收证据（CI run，只认 CI）

| issue 验收项 | 证据 run（全部 success） | 关键输出 |
|---|---|---|
| 验收1 可见性闸门（五形态不注入+登记保留） | verify-13 run [34017329606](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34017329606)（验收门 28 PASS/0 FAIL + E2E）；E2E run [34017329604](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34017329604) **56 passed**（含 visibility.spec 四例） | `[CORPUS] cases=41 TP=20 FP=0 TN=21 FN=0 precision=1 recall=1 f1=1`；`verify-ticket-13: 28 PASS, 0 FAIL` |
| 验收2 隐藏承值 select 不误杀（面板填充） | 同上 E2E 34017329604 | visibility.spec 验收2：召唤 → 图标 → 面板选 Canada → `#vis-hidden-carrier` value=CA |
| 验收3 ISO2 全集成员测试 | 34017329606（语料+静态落点）；既有门 verify-ticket-02 36/36、misdetect-repro-v2 25/25 | P2（ISO 值+EN 名）inject 不回归；F 系误报全 none |
| 验收4 共享区号消歧 | 34017329606（fill 引擎级断言：+1 共享下拉选 Canada → selectedIndex=1 落点 Canada 选项；反向 US 落首值）+ E2E | `PASS 验收4 fill 消歧`×2 + 裸值退回旧行为 |
| 验收5 占位首项剔除 | 34017329606（语料 mm2-pos-placeholder-dial inject + 填充不受伤断言） | `PASS 验收5`×2 |
| 验收6 回归红线（CI 全量） | verify-13 34017329606（28+36+25 全绿）+ E2E 34017329604（56 passed 含既有全部 spec） | FP=0 / FN=0 / mismatch=0 |
| 检查点四 iti 防线 + appendOnly 翻转 | 校准 dispatch run [34017498607](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34017498607)（ref 589ff31 与分支头一致） | `[PASS] mm2-neg-itires negative expect=none got=none score=0`；`precision=1.0000 (TP=20, FP=0)`；`回归门禁: PASS`；knownResidual 列表为空 |

- 基线数字（票 14 原基线 run 33973341795 precision 0.9474 / 16-fix run 34012435513 同值）→ 本票 **1.0000**（itires 由 FP 转 TN，precision 分母 -1 分子不变）。
- append-only 证据副本（票 14 原件未动）：`research/calibration/baseline-summary-post13.json` + `baseline-report-post13.md`（evidenceRun/ref/headSha 内嵌）。
- 修复轨迹透明：第一轮 CI 红（verify-13 验收门 node20 navigator 缺失 + E2E 2 例）→ 第二轮 55 passed/1 failed（openPanel import 遗漏）→ 第三轮全绿。红→绿各步均以 CI 复跑实证，未本地自证。

## 3. 偏离点（如实呈报）

1. **场景矩阵基线改写**（scenarios.e2e.spec.ts 场景 A/B/C/E 测试）：cch-test-page2 的 5 个 tab 除激活者外均 display:none——旧口径「load 即 13 图标」把隐藏 tab 里的不可见图标计入注入基线，恰是本票闸门消除的形态。按闸门语义改写为「激活 tab 注入（A:3/B:4/C:3/E:3），切 tab 后指纹重评补挂」。属行为语义演进（不是回归），测试改写与实现同票落盘。
2. **门脚本 mock 保真同步**（verify-02/repro-v2 构造器一行 + P4 注释 78→88）：非 src/ 代码，但影响既有门数字口径，按 16-fix 先例记录。
3. **吸收 16 孤儿 hunk**：票 16 的「L3 罚分独立叠加」在分支 tip 缺失（仅在工作区 unassigned），本票落地时一并吸收；16 的报告与 CI 证据本就以该形态为准，实质无偏差。
4. **遮挡（overlay elementFromPoint）探测未实现**：Bitwarden 亦未采用（shadow DOM/动态浮层下误杀率高）；以零尺寸+全裁剪形态近似覆盖，登记为未做项（见 §4）。

## 4. 未完成/未验证项

- 遮挡判定（elementFromPoint overlay 探测）未实现——设计取舍而非遗漏，理由见 §3.4；如需补齐建议独立小票。
- verify-13.yml 的 E2E job 与 e2e.yml 全量 E2E 双跑（本票验证分支同时触发两个 workflow）——验证窗口内冗余但无害；票合并后自然只剩 e2e.yml。
- threshold-calibration「标定宇宙 39 例」的排除名单仍含旧注（排除 iti 短路 P4）——P4 现已走评分通道，名单文字未更新，不影响数字正确性（39 例口径与 14/16-fix 一致）。

## 5. 给大脑的风险提示

1. **场景矩阵新基线**：任何后续票若在 cch-test-page2 上断言「总图标数」，必须用激活 tab 口径（A:3/B:4/C:3/E:3/D:3），旧的 13/总计数断言已失效。
2. **可见性闸门 fail-open 面**：getComputedStyle/getBoundingClientRect 皆不可用的宿主不降档（测试 mock 场景）；真实浏览器双 API 恒在，风险仅限异构测试环境。
3. **IS0 3166-1 数据全集依赖**：ISO2_SET 与国家数据同源，若后续扩充 COUNTRIES（如票 14 后评估 libphonenumber 元数据），ISO2 判定域自动跟随，无需改引擎。
4. **占位词表为白名单制**（please select/select/choose/请选择/选择/…）：未收录形态的实义首项不会被剔除（fail-safe 方向正确）；「请选择」类新写法可按需增补 PLACEHOLDER_TEXT_RE。
5. **共享区号消歧的 submit 值语义**：共享值下拉填充后 el.value 仍是共享值（+1），站点若直接读 value 而非 selectedIndex 会拿到歧义值——这是 select 原生语义的物理上限，消歧已把 selectedIndex/selectedOptions 推到正确落点。
6. 工作区仍有其他窗口的 unassigned 产物（wave3/4 复核文档、19 票 docs 等），本票提交严格限定本票文件，未触碰。

## 6. 声明 → 证据 → 结论对照（完成定义审计）

| 声明 | 证据 | 结论 |
|---|---|---|
| issue 13 验收 1（闸门作用于注入档位，登记保留） | verify-13 34017329606 28 PASS + E2E 34017329604 visibility.spec | 闭合 |
| issue 13 验收 2（隐藏承值 select 面板填充） | E2E 34017329604 验收2 绿 | 闭合 |
| issue 13 验收 3（ISO2 全集成员测试） | 34017329606 语料+静态；36/36 + 25/25 | 闭合 |
| issue 13 验收 4（共享区号消歧） | 34017329606 fill 断言 + E2E | 闭合 |
| issue 13 验收 5（占位首项剔除） | 34017329606 语料+fill 不受伤 | 闭合 |
| issue 13 验收 6（误报不注入+正样本不回归，CI 证据） | 34017329606（FP=0/FN=0）+ 34017329604（56 passed） | 闭合 |
| 检查点一（只改档位不改登记） | 孪生 mock 断言 + E2E 验收2 + 信号明细 gate:visibility-hidden 0 分留痕 | 闭合 |
| 检查点二（剔除仅作用计分） | fill 不受伤断言 + mm2-pos-placeholder-dial inject | 闭合 |
| 检查点三（基于 16 基座，冲突走 §4.2） | 分支堆叠 above 16-fix；工作区无并写冲突 | 闭合 |
| 检查点四（iti 容器唯一证据防线 + 翻转） | 校准 run 34017498607（score=0/none）+ manifest 状态位翻转 + post13 证据副本 | 闭合 |
| 报告落盘 | 本文件 | 完成 |
