# Wave 1 复核报告(首脑,2026-09-05)

> 方法: 不信自述。每条关键声明回仓库实物验证(工件存在性 + rg 代码抽查 + gh API 核 CI run + git log --stat 文件范围审计)。
> CI 证据: gh run view 4 次(12/14/15/16),全部 success 且 headSha 与报告一致。

## 1. 逐票「声明 -> 证据 -> 结论」

### 11 心智模型文档化
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| CONTEXT.md 对照章 + 5 术语 | 文件实测含「行业心智模型对照」章与 帧治理/可见性闸门/校准语料/伪 select/ARIA 语义层 五词 | 属实 |
| verify-ticket-11.mjs PASS | 本地复跑 exit 1: PATH-OK/PRESENCE-OK/AVOID-OK 全过,但 EOL-FAIL(CRLF 122/123 行) | 部分属实: 内容门过、EOL 门环境脆(见 §2-1) |
| issue 4 条 [x] | issues/11 实测 4 条全部 [x] | 属实(窗口代勾 S8 动作,见 §3-2) |
| 无新增 ADR | docs/adr/ 无 0006 | 属实 |

### 12 iframe 帧治理
| 声明 | 证据 | 结论 |
|---|---|---|
| 元数据 grant + 帧策略注释 | vite.config.ts 实测 GM_registerMenuCommand 在 grant;@noframes 仅出现于注释(报告描述精确) | 属实 |
| 顶层/子帧分工 | config.ts IS_TOP_FRAME/FRAME_TAG/FRAME_OPEN/FRAME_FILL/FEEDBACK_MSG + main.ts 分流 + ui _requestRemoteOpen 实测在码 | 属实 |
| fixture x3 + spec + 双端口 server | 4 文件实测存在 | 属实 |
| CI run 33978323212 绿 | gh run view: success, head 341a3904 | 属实 |
| e2e.yml 载体 | 实测 run: npm ci(裸) | 属实但埋缺陷(见 §2-2) |
| 未触达他人文件 | git log --stat(cch/12 --not cch/14): 13 文件全在本票清单;但 server.mjs 内带入票 15 半成品 react19Esm v1(origin 实测含 /gen/react19) | 触达面声明不完整(见 §3-1) |

### 14 校准语料
| 声明 | 证据 | 结论 |
|---|---|---|
| manifest 39 例 | JSON 解析: cases 数组恰 39,_meta.appendOnlyRule 在 | 属实 |
| 3 个脚本 + workflow + 证据副本 | 6 文件实测存在 | 属实 |
| CI run 33973341795 基线数字 | gh: success, head 4a1e5a8b;副本 baseline-summary.json 落盘 | 属实 |
| 零 src/ 变更 | git log --stat(cch/14 --not cch/16): 9 文件无 src/ | 属实 |
| 风险1 交接(mm2-neg-itires 待 16 翻转) | 16 未执行翻转(16 issue 未含此项) | 遗留,转修复票 16-fix |

### 15 React 19 填充兜底
| 声明 | 证据 | 结论 |
|---|---|---|
| fill +45 行 _probe/forceDiff | src/fill/index.ts 实测两符号在码 | 属实 |
| react19 hermetic fixture | framework-react19.html + spec + server.mjs /gen/react19 路由实测在 | 属实 |
| package 别名 + 版本隔离 | package.json 含 react19/react-dom19;cch/15 分支树 version=1.3.4(未吞 lkq 的 1.4.0) | 属实 |
| CI run 33981972381 绿(52 例) | gh: success, head 158ac65c | 属实 |
| 偏离4: e2e.yml 裸 npm ci 红噪 | gh run view 33980929467: failure(workflow E2E) | 属实(即 §2-2) |

### 16 评分一致性
| 声明 | 证据 | 结论 |
|---|---|---|
| 短路摘除 | detect/index.ts 无 score:100 形态;ITI_CONTAINER_SCORE 进入评分路径 | 属实 |
| L3 罚分独立叠加 | 实测独立 if(st.numeric/st.total >= L3_NUMERIC_MIN_RATE)+ 注释标注票 16,非 else-if | 属实 |
| 常量集中 | config.ts ITI_CONTAINER_SCORE/ITI_LOW_REGISTER_SCORE 实测在,值 60/25 | 属实 |
| .gitignore test/ 放行 | 实测 !test/ + test-results/playwright-report 仍忽略 | 属实(偏离已申报) |
| CI run 33975761519 绿 | gh: success, head 3e06b3e | 属实 |
| 文件范围 | git log --stat(cch/16 --not cch/07): 11 文件全在本票圈内 | 属实 |

### 17 伪 select 取证
| 声明 | 证据 | 结论 |
|---|---|---|
| 样本库 5 页 + 15 snapshot + 5 facts | 实测页/yml/json 计数 5/15/5 | 属实 |
| 取证报告 + 探测策略 + ADR-0005 | 3 文件实测在;ADR-0005 含裁决「实现(登记+手动召唤)」+ 4 条反证条件,未预写实现 | 属实 |
| 零业务代码 | 产物全在 .scratch 与 docs/adr | 属实 |
| atomcode 交叉验证轮 | 因串行护栏让位未跑;复核时 atomcode.exe(PID 18392)仍在途,维持挂起 | 遗留(非阻塞,研究补强项) |

## 2. 源码层问题(需修复)

### 2-1 票 11: verify-ticket-11.mjs 的 EOL 检查环境脆(确认)
- 现象: blob=LF(0 CRLF),工作树=CRLF(122 行),git status 干净,core.autocrlf=true 且无 .gitattributes -> autocrlf 物化所致;脚本 exit 1。
- 判定: 内容门真实有效;EOL 门在 autocrlf 宿主上恒红,属检查口径缺陷(非内容缺陷)。修复: EOL 检查改 blob 口径(git cat-file)或去 EOL 断言,BOM 检查保留。

### 2-2 票 12: e2e.yml 裸 npm ci 在合并树必然 ERESOLVE 红(确认)
- 现象: 合并树含 react19 别名包后,裸 npm ci 失败(gh 红 run 33980929467 实证);verify-15.yml 用 --legacy-peer-deps 才绿。
- 影响: 13/18 票 push 触发 cch/** e2e.yml 即红噪;若 19 收口把 e2e.yml 当发布门禁,发版被堵。修复: install 统一为 npm ci --legacy-peer-deps。

### 2-3 票 16 跟进(待 CI): 语料再基线 + knownResidual 翻转
- 16 摘除 iti 短路后,14 语料未重跑(16 只跑了 harness 25 例,非 corpus 39 例);mm2-neg-itires 的 knownResidual 应按 CI 实测翻转并刷新基线数字。

## 3. 过程违规(单列,不追认)

3-1 越权提交(票 12 窗口): 把票 15 的半成品 react19Esm v1(含 2 处缺陷)随 server.mjs 整体状态带入 cch/12 提交(origin 实测含 /gen/react19);票 12 报告「触达面」未披露该带入。已由 15 堆叠在上以 v2 覆盖,终态无缺陷,但该行为不追认,登记教训。
3-2 职权越位(票 11 窗口): 自行勾选本票 issue 复选框(属大脑 S8 收口动作)。内容与已验证验收一致,予以保留,但流程职责按 WORKFLOW 归大脑。
3-3 本地 Playwright(票 17 窗口): 取证探针本地运行。属研究证据工具而非项目构建/测试,与 CI-only 政策边界申报制处理,用户裁决是否接受。
3-4 外发副作用(票 14 窗口): 栈推送连带更新 origin cch/08-docs-adr(624a580)。已在偏离点申报;属镜像同步,无内容风险,记档。

## 4. 拓扑与收口风险(交 19 票)

- Wave1 实施分支挂在旧周期链(15->12->14->16->07->...->01->8c5e266),本地 main(6c23720)不含任何 Wave1 改动;19 收口必须按栈序合并进 main。
- cch/17 独立于 base 之上,docs/adr/0005 的可见性依赖 08 的 .gitignore 放行;合并到 main 无碍,单拎分支有边角风险。
- cch/10 的 lkq{conflicted} 仍在: 任何堆叠于 cch/10 的分支(含 mmv2-tickets 链)推送都会被阻断,需用户裁决(原 §6.3 登记)。
- e2e.yml/calibration-baseline.yml/verify-15/16 触发面与 install 口径需在 19 统一。

## 5. frontier 结论

- Wave 1 = 6/6 复核通过(11/12/14/15/16/17),附 3 个修复启动器(11-fix / 12-fix / 16-fix)。
- 12-fix 必须先落地(解锁 cch/** 的 CI 载体,消除 13 的 CI 红噪);随后 13 与 11-fix / 16-fix 可并行。
- 下一波可开工: 13(前置 16 已复核通过)。