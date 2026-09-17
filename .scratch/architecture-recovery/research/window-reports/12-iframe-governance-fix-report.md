# 窗口实施报告：12-fix — e2e.yml install 口径修复（复核后修复）

> 复核修复窗口（fresh context）| 日期：2026-09-06 | 分支：cch/12-iframe-governance（commit smn @ 539d9a5，已推送）
> 任务书：prompts/12-iframe-governance-fix.md | 首脑定位：review-mmv2-wave1.md §2-2
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 cch/12-iframe-governance 追加 commit）

## 1. 独立再质检记录（动手前，逐条实证首脑结论）

| # | 首脑结论 | 验证命令 | 实测输出 | 判定 |
|---|---|---|---|---|
| V1 | 裸 npm ci 在含 react19 别名树上 ERESOLVE 恒红（红噪 run 33980929467） | gh run view 33980929467 --log-failed | X Install dependencies；npm error code ERESOLVE / peer react@"^19.2.8" from react-dom19@19.2.8 / Conflicting peer dependency: react@19.2.8 | 属实 |
| V2 | verify-15.yml 用 --legacy-peer-deps 才绿（52 例） | gh run view 33981972381 + --log | 双 job success；52 passed (22.9s) | 属实 |
| V3 | 票 12 越权带入票 15 半成品 react19Esm v1 且报告未披露（§3-1） | git show origin/cch/12-iframe-governance:tests/server.mjs 后 grep react19 | 第 29/31/43/51 行含 /gen/react19 路由与 react19Esm v1 | 属实 |

三条全属实，按任务书授权动手。V3 根因自证：票 12 窗口 amend 修复 server.mjs 孤儿引用时 hunk 重算，把当时工作树中票 15 的行吞进修复 hunk；报告触达面未披露该带入。接受首脑「不追认」判定并登记教训：amend 吞 hunk 是并行窗口共享工作树下的真实风险面，后续 amend 必须重读完整 hunk 内容再提交，触达面声明以最终 commit 的 git show --stat 为准。

## 2. 修复 diff 说明

文件：.github/workflows/e2e.yml，恰 1 行：
- 修改前：run: npm ci
- 修改后：run: npm ci --legacy-peer-deps

与 verify-15.yml 的 Install dependencies 步骤口径一致（先例核对）。其余步骤逐一回读验证原样：CRLF 守卫（Line-ending guard）、Setup Node（node 20 + cache npm）、Install Playwright browsers、Build userscript、Run E2E、触发器（workflow_dispatch + push cch/**）均未改动。本票修复不触碰任何其他文件。

## 3. 「声明 -> 证据 -> 结论」对照表（对照 README.md 完成定义 + issue 12 每条验收项）

issue 12 验收项（原始票据，实施票已闭环，本 fix 票复核其 CI 载体有效性）：

| issue 12 验收项 | 声明（原实施） | 证据（实物/CI） | 结论 |
|---|---|---|---|
| 1 元数据显式全帧 + GM_registerMenuCommand 入 grant | vite.config grant 四项 + 无 @noframes + 帧策略注释 | E2E 产物头断言绿（spec:19，历次 run 含 34012116800） | 维持属实 |
| 2 顶层/子帧分工 | IS_TOP_FRAME 分流 + postMessage 协议 + 面板宿主仅顶层 | E2E 同源/跨域两例绿（spec:29）；子帧无 #cch-root/#cch-pop | 维持属实 |
| 3 跨帧存储一致性（复用既有通道） | GM + BroadcastChannel + GM_addValueChangeListener 原样复用 | E2E spec:61 绿（顶层收藏→子帧面板可见） | 维持属实 |
| 4 iframe fixture 同源+跨域 + E2E 子帧检出/填充 | fixture x3 + spec 7 例 | E2E 全绿（49 passed = 基线 42 + 本票 7） | 维持属实 |
| 5 顶层无回归（既有 E2E CI 全绿） | 既有 42 例全量在 e2e.yml 跑 | 本 fix run 34012116800：49 passed (20.4s) | 维持属实，且 CI 载体修复后可复现 |

本 fix 票自身验收（任务书 delta 三条）：

| 任务书验收 | 声明 | 证据 | 结论 |
|---|---|---|---|
| install 统一 npm ci --legacy-peer-deps（与 verify-15 口径一致） | e2e.yml install 行已改，恰 1 行 diff | 本地回读（bare npm ci 不存在 + 其余步骤原样）；CI 日志 Run npm ci --legacy-peer-deps / added 91 packages | 完成 |
| 推送分支触发 e2e.yml，CI 红转绿，run id 留档 | push 539d9a5 触发 run 34012116800 | gh run list：success，1m6s，49 passed (20.4s)；红前置证据 = 首脑红噪 run 33980929467 + V1 复证 | 完成（红转绿实证） |
| 不改动 e2e.yml 其它任何步骤 | 仅 install 行 diff | 回读逐段断言（guard/setup-node/playwright-install/build/test/trigger 原样） | 完成 |

README.md 完成定义对照：票据状态随窗口报告落盘更新（本报告即 fix 落盘件）；报告路径 research/window-reports/12-iframe-governance-fix-report.md 符合任务书要求。handoff 完成定义（issue 全勾 + 报告落盘）：issue 12 五条在原实施票已闭环且本次复核维持；本 fix 报告落盘即完成定义满足（以修复后证据为准）。

## 4. 验收证据（CI-only，只认 CI run）

- 修复后绿 run：https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34012116800（success，1m6s，head 539d9a5）：
  - Install dependencies 步骤日志：npm ci --legacy-peer-deps → added 91 packages, and audited 92 packages in 3s（ERESOLVE 消失）
  - Run E2E：49 passed (20.4s)
- 红前置（首脑证据 + 本窗口复证）：run 33980929467（X Install dependencies，ERESOLVE：react-dom19@19.2.8 peer react@^19.2.8 与 react@18.3.1 冲突）

## 5. 偏离点与风险提示（给大脑）

1. 无授权级偏离；修复范围严格限于任务书 delta 三条。
2. 首脑 §4 已指出的收口项（不属本 fix 票）：e2e.yml / calibration-baseline.yml / verify-15 / verify-16 的 install 口径统一需在 19 票收口时全量对齐——本票只修 e2e.yml（任务书范围）；calibration-baseline.yml 若也裸 npm ci，其 push 触发面（cch/14 分支）在合并树后同样会红，建议 19 收口一并核对。
3. V3 教训已在本报告 §1 登记自证，供 WORKFLOW §5 采纳（amend 吞 hunk 风险 + 触达面以 git show --stat 终态为准）。

## 6. 本票文件触达面（以 git show --stat smn 终态为准）

仅 .github/workflows/e2e.yml（1 行）。报告与证据文件落盘于 .scratch/architecture-recovery/（未跟踪目录，不入库）。