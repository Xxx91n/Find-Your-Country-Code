# 票 16 实施报告 — 检测评分一致性收尾

> 子窗口 | 2026-09-05 | 分支 cch/16-scoring-consistency（堆叠 cch/07-ui-upgrade 栈顶）
> 开工复述：Blocked by: None（Wave 1）——issue 头部声明 + .scratch/architecture-recovery/README.md 第二周期波次表「| 1 | 16 | 无 |」双证据确认。必读 9 份按序读全。
> 版本控制遵循 WORKFLOW §4.2；完成定义遵循 handoff 16（issue 4 条验收全真实执行 + 本报告落盘）。

## 1. 变更清单与理由

### 1.1 iti 识别并入评分路径（issue 验收 1）
- src/detect/index.ts _process：删除 `else if (this._isIti(el)) res = { score: 100, tier: 'auto' }` 评分外短路（US10 唯一双轨判定残留面，.scratch/mental-model-v2/report.md §2.3 定位 detect:465-467）。
- src/detect/index.ts scoreElement：INPUT 且 _isIti(el) → L0 'iti:container' 信号加分（新常量 ITI_CONTAINER_SCORE=60）。容器证据计入评分而非直接定档——误报防线（L1 词表罚分 / L4 排除 -70 / L3 gate）对 iti 路径同等生效（handoff 检查点一）。
- kind 分发保留：_process 末尾 kind = INPUT ? (_isIti ? 'iti' : 'input')，iti 字段仍走适配层 Fill.run 三策略，不回落 input 策略（票 04 教训：枚举 kind 全部消费方 UI.attach / UI.rememberLow / Fill.run 后再改）。
- 容器信号置于 input 类型闸门（hidden/email/search…永非区号）之后：闸门先序排除不被 iti 加分绕过。

### 1.2 L3 罚分独立叠加（issue 验收 2）
- src/detect/index.ts scoreElement：数字占比罚分 else-if → 独立 if（原 detect:212「存在区号选项时数字占比再高也不罚」互斥短路）。区号加分与数字罚分共存，交由总分与分档裁决。
- 既有误报防御零放松：F1–F9 / N0a–N0g 全部维持 none（CI 证据见 §3）；plusDial>0 且 numeric≥60% 的样本罚 -40 后仍需达到注入档，反向情形（高区号占比下拉）不受影响（L3_NUMERIC_MIN_RATE 判定基于 numeric/total，未改口径）。

### 1.3 常量集中配置（issue 验收 3）
- src/config.ts 新增：ITI_CONTAINER_SCORE=60、ITI_LOW_REGISTER_SCORE=25（自 detect/index.ts:487 收编魔法数 25，语义 none 档 rememberLow 登记召唤门槛，值不变）。
- detect/index.ts import 补齐两个新常量并替换魔法数。
- **常量迁移只搬不调**：两个新常量均为新增定义或搬运既有值；未调任何既有常量数值。取值标定语料依据（写入 config 内注释）：E2E cch-test-page2 场景 C 实际形态为 input[type=tel] + label「Phone (intl-tel-input)」+ 同页多个 tel 锚 → 60+10+18=88 auto；无锚 60+10=70 恰达 auto；L4 排除(-70)可完全压过容器分 → 防线对 iti 同等生效。

### 1.4 测试资产与 CI（issue 验收 4 支撑）
- .gitignore：test/ → !test/（票 08 细粒度放行先例）。test/ 三个手工测试页是 E2E webServer 健康检查（playwright.config.ts url=/test/test-page.html）与 iti/分档场景依赖；此前被忽略导致 CI 无 E2E 可能。test-results/、playwright-report/ 运行产物仍忽略。
- .github/workflows/verify-16.yml（票 10 ticket-scoped workflow 先例）：push 本分支触发，两个 job——engine-gates（verify-ticket-02.mjs + misdetect-repro-v2.mjs）与 e2e（npm ci → build → playwright install chromium → 全量 playwright test + dist 产物上传）。
- 门禁脚本 P4 用例通道切换：verify-ticket-02.mjs / misdetect-repro-v2.mjs 的 iti 用例从 `_isIti 直判` 改为与普通用例同走 scoreElement（iti 并入评分后门禁口径同步；mock 无锚 P4 = 容器 60 + 锚 18 = 78 auto）。

## 2. 验收证据（CI run，CI-only 政策）

Run: https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/33975761519（commit 3e06b3e，workflow verify-16.yml，全 job success）

| 验收项 | 证据 | 关键输出 |
|---|---|---|
| 1. iti 识别改为评分路径 | Engine gate job + E2E job | 引擎门 36/36（P4 经评分通道 auto）；E2E 42 passed 含「场景 A/B/C/E 检测矩阵：13 个字段注入（intl-tel-input…）」「场景 C 填充链路」「场景 D 动态注入：…iti 三种字段自动补挂」全绿 |
| 2. L3 罚分独立叠加 | Engine gate job + Harness job | 引擎门 36/36（N0a 省份 -88、F4 -14 等 none 全保持）；harness「合计 25 例，符合预期 25 例」；「FP 全家桶（F1–F8）不注入： YES」 |
| 3. 常量集中 | commit zom diff（src/config.ts +2 常量，detect 魔法数 25 → ITI_LOW_REGISTER_SCORE） | 既有 15 个 L0–L4/分档常量本票零数值改动 |
| 4. 既有门禁 CI 全绿 | run 33975761519 两 job | 引擎门 36/36 exit 0；harness 25/25 exit 0；E2E「42 passed (17.6s)」exit 0；产物 dist-userscript-verify-16 |

误报样本全不注入复述：F1(25 分)/F1b(29)/F1c(18)/F2(62)/F3(14)/F4(-14)/F5(18)/F6(22)/F7(18)/F8(18) 全 none——F2 62 分是「低置信以下不注入」规则（<35）与 country-semantic suppress 双保险拦截，与本票改动无关、分值未变。

## 3. 提交清单（GitButler §4.2）

分支 cch/16-scoring-consistency（but branch new --above cch/07-ui-upgrade，非堆叠建分支被拒——src 依赖 cch/01/02/04 已提交内容，票 09 同款先例）：
- zom refactor(cch-16): iti 并入评分 + L3 独立叠加 + 魔法数入 config（src/config.ts hunk zr:3 + src/detect/index.ts 全 hunks）
- pzo test(cch-16): .gitignore 放行 test/ + 三测试页入库 + verify-16.yml
- zrm test(cch-16): 门禁脚本 iti 用例切换评分通道
- 推送：3e06b3e（快照核验含 package-lock.json / tests/ 8 files / test/ 3 pages / verify-16.yml / 门禁脚本——票 10 教训前置核验）

## 4. 偏离点（呈报，遵循 WORKFLOW §6）

1. .gitignore test/ 放行：issue 未列此项，但不放行则 CI E2E 物理不可跑（webServer 健康检查 404），验收 4 无法达成。票 08 有同类先例（docs 细粒度放行）。
2. verify-16.yml 新增 workflow：issue 未列；仓库此前无 E2E workflow，而验收要求「既有门禁在 CI 全绿」，故按票 10 ticket-scoped 先例新增（只读本权限、只触发本分支）。
3. 门禁脚本 P4 通道切换：票 02/04 的门禁原直接调 _isIti；iti 并入评分后该口径不再等价，改为同走 scoreElement。这是验收口径更新，非放松（P4 期望 auto 不变，F/N 组全不动）。
4. 手工测试页（test/*.html）首次入库：内容零改动，仅解除忽略。

## 5. 未完成 / 未验证项

- 无本票范围内的未完成项。issue 4 条验收全部真实执行并留 CI 证据（§2）。
- 「_done WeakSet 终态→指纹重评」机制下 iti 字段指纹含 'iti' 标记（_fingerprint 未动），插件晚初始化补挂路径保持。

## 6. 给大脑的风险提示

1. **并行会话工作区隔离**：本窗口实施期间，票 12（iframe 帧治理）窗口在同一 GitButler 工作区有未提交变更（src/ui/index.ts、src/config.ts 帧治理 hunk zr:4、vite.config.ts、package.json/package-lock.json、README*.md）。本票按 hunk 圈定只提交了本票内容（zr:3 而非整文件），票 12 变更全部原样保留在未提交区。票 12 窗口提交时请注意 config.ts/vite.config.ts 与本票无行级冲突，可直接提交。
2. **ITI_CONTAINER_SCORE=60 的语义边界**：.iti 容器内的 search/email 等 input 仍被类型闸门排除；但「容器内无关 text input + 无任何负信号」会得到 60 分 none（低于登记线 25 的反面——60≥25 会登记召唤，不自动注入）。真实误报面收窄为「需用户手动召唤才可见」，与 lowkey 档心智一致。
3. **门禁脚本口径**：P4 断言从「_isIti 直判」改为「评分通道」，未来若再调 ITI_CONTAINER_SCORE 需同步这两个脚本的用例注释。
4. E2E 全量 42 例已在 CI 跑通（本地无 node_modules 不可跑）；本报告引用的全部数字均出自 run 33975761519 日志，未采信本地输出。
