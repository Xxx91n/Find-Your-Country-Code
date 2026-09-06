# Wave 2 修复票复核报告(首脑,2026-09-06)

> 方法: 不信自述。修复报告每项声明回仓库实物验证(脚本复跑 / rg / git show --stat / gh API / but status 分支落位)。

## 1. 逐票「声明 -> 证据 -> 结论」

### 11-fix(verify-ticket-11 EOL 口径)
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| 动手前再质检 6 项全复现 | 报告再质检表 + 本脑复跑: exit=1/EOL-FAIL 复现过(上一轮),修复后 exit 0 | 属实 |
| EOL 检查改 blob 口径 | 脚本实测含 git cat-file -p HEAD:CONTEXT.md 判 CRLF,工作树断言已删,BOM 检查保留 | 属实 |
| 修复后 exit 0 | 本脑复跑: PATH/PRESENCE/AVOID/EOL 四 OK + RESULT: PASS,exit 0 | 属实 |
| CONTEXT.md 0 改动 / issue 勾选 0 改动 | git status CONTEXT.md 空(clean);issues/11 实测 4 [x] / 0 [ ] | 属实 |
| 分支落位 | but status: cch/11-mental-model-docs 追加 ywy fix 提交(循 03fix/07fix 先例);未推送(任务书无 CI 要求) | 属实 |

### 12-fix(e2e.yml install 口径)
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| 再质检 3 项全复现(ERESOLVE 红噪/verify-15 先例/污染实锤) | 报告逐条命令+输出;本脑上一轮已独立实证三项 | 属实 |
| 恰 1 行修复 | git show --stat 539d9a5: 1 file changed, 1 insertion(+), 1 deletion(-),仅 .github/workflows/e2e.yml | 属实 |
| --legacy-peer-deps 落地且其余步骤原样 | e2e.yml 实测: 裸 npm ci 不存在、CRLF 守卫与 cch/** 触发器原样在 | 属实 |
| CI 红转绿 | gh run view 34012116800: success, head 539d9a5(与 origin ref 一致) | 属实 |

### 16-fix(校准重测 + residual 判定)
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| 再质检 7 项全复现 + 补充发现 | 报告再质检表;本脑复跑各条结论一致 | 属实 |
| harness 镜像同步(删 100/auto 模拟,走 scoreElement) | 14-lib-engine.mjs 实测: iti-short-circuit 镜像不存在,scoreElement 通道在 | 属实 |
| src/ 与 manifest 零改动 | git log --stat: d9f142f 仅 14-lib-engine.mjs(4+/6-);manifest mm2-neg-itires knownResidual=true 原样 | 属实 |
| CI 重测 | gh run view 34012435513: success, head d9f142f;origin 6aa3af2 = 报告+post16 证据副本追加(clean) | 属实 |
| residual 判定: 仍不通过 -> 不翻转 | CI 实测 mm2-neg-itires score=60 tier=lowkey 注入,expect=none;按 appendOnly 保持 true,如实报告 | 属实 |
| 分支落位 | but status: cch/16-fix-calibration-mirror above cch/15(快照含 16 引擎+14 语料+12 帧治理+15 probe) | 属实 |

## 2. 新发现(源码层,移交 13 票)

- ITI_CONTAINER_SCORE=60 单独存在(无任何其它正信号)的 .iti 容器内 input -> score 60 >= 35 -> lowkey 档注入(低调图标)。16 原报告 §6 风险2 写「60 分 none」为笔误,16-fix 以 CI 实测更正为 lowkey。
- 定性: 误报面已收窄(原无条件 100/auto -> 现 60/lowkey 且可被 L1 本地固话 -30 / L4 排除 -70 压制)但未闭合;已并入 13 票 delta(检查点四),防线三选一或组合见 16-fix 报告 §5,落地后 dispatch 校准 workflow 重测并按 appendOnly 翻转。

## 3. 过程违规

- 无违规。三窗口均先独立再质检首脑结论、确认属实后才动手(任务书硬要求)。
- 16-fix 修改 14-lib-engine.mjs(票 14 工件)超出任务书字面范围: 属测量有效性的必要口径同步(不修则重测数字模拟已删除代码),已声明、有 CI 证据、未改语料语义——记为「声明内偏离」,不追认为违规,建议 WORKFLOW §5 登记「镜像型 harness 需随引擎语义变更同步」防再犯。

## 4. frontier 结论

- 11 / 12 / 16 三票全闭环(实施+复核+修复+复核通过)。
- Wave 2 = 13 可开工(唯一阻塞 16 已全闭环)。
- 13 新增检查点四(iti 容器唯一证据防线);18 待 13;19 收口(含 workflow 触发面/install 口径全量统一)。
