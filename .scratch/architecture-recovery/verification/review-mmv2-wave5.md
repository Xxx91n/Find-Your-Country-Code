# Wave 5 复核报告:票 19(首脑,2026-09-06)

> 方法: 不信自述。报告每项声明回仓库/gh/CI 实物验证(版本三处一致 + dry-run + Release + 链接 200 + workflow 状态 + but land 拓扑)。

## 1. 逐票「声明 -> 证据 -> 结论」

### 19 发版与发布链接恢复

| 声明 | 证据(实物) | 结论 |
|---|---|---|
| 版本三处一致(1.4.0) | package.json version=1.4.0;vite.config.ts 第 6 行 version: 1.4.0(grep 实测);Glog/EN 双语 v1.4.0 章节各含 12 条 mmv2 增补 | 闭合 |
| CI dry-run 通过 | gh run view 34035726335: success, headBranch cch/19-release-links, workflowName Release Dry Run | 闭合 |
| 发布动作完成 + Release v1.4.0 Latest 存在 | gh run view 34035951623: success, headBranch main;gh release list: v1.4.0 Latest 2026-09-06T13:23:45Z, 附件 find-your-country-code.user.js | 闭合 |
| README 更新(v1.4.0 直达 + 移除 JsDelivr) | README.md 实测含 releases/download/v1.4.0/... 与 update.greasyfork.org/... 双链并列, 不再有 jsdelivr 引用 | 闭合 |
| 四条链接 200 | curl -sI 本会话实测: README raw 200 + GF page 200 + Release page 200 + GF install 200 | 闭合 |
| workflow 触发面 + install 口径统一 | release.yml / release-dry-run.yml / e2e.yml / verify-16.yml 都改 npm ci --legacy-peer-deps;calibration-baseline.yml 注释明示「harness 零依赖 node 脚本,无需 npm ci」——口径本就一致(误凝已澄清) | 闭合 |
| but land 合流 + 双栈落 main | git log origin/main: 43 commits 领先本地 main (3ccfee2);origin/main head 0759913 含 cch/15 的 8d87173 react19 feat(react19 别名包已落 main);但 status: origin 已无 cch/* 分支(land 自动删除) | 闭合 |
| GreasyFork 同步 | GF meta 实抓 @version=1.3.4(报告自述未同步, 需维护者手动);本会话无可代为;Release 直达作为已可达分发路径 | 闭合(申报内偏离) |
| issue 19 勾选 5/0 | issues/19 实测 5 [x] / 0 [ ] | 闭合 |
| 周期总结落盘 | .scratch README 第二周期 + 本报告 + 复核链五份 | 闭合 |

## 2. 源码层问题(需修复)

- 无。calibration-baseline.yml 注释明示零依赖,口径本就统一(报告 §2.2 未明示该注释, 但 19-fix 提交 4544a72 已将其触发面扩 main, 行为正确)。

## 3. 过程违规(单列不追认)

- 无违规。全部为申报内偏离: but land 是 but 标准合流命令 (WORKFLOW 4.2);双栈顺序由 19 票定;lkq 冲突自愈路径走「先落实现栈再 reconcile」未改写冲突内容;dispatch 触发 vs push 触发已说明;归档旧周期产物(commit 2460c88 修复 Glog v1.4.0 mmv2 增补)对齐票 11 先例;issue 勾选对齐票 11 先例。
- 本地 main ref 与 origin/main 偏差(本地 3ccfee2, origin 0759913, 43 提交差)已在报告 §6.1 披露。

## 4. frontier 结论(本周期收官)

- 所有波次(11-18 + 三修复票 + 19)全闭环。Wave 5 = 19 通过, Release v1.4.0 真实发布(GitHub Releases + GreasyFork 待人工同步)。
- frontier = 本周期收官。后续动作: 维护者手动同步 GreasyFork(报告 §6.5);本机 main ref 对齐(GUI 「Set main to origin/main」);17 票遗留 atomcode 交叉验证轮(可选, 大脑);CRLF 卫生 + e-branch-1 清理(卫生票)。

## 5. 最终周期统计

- 实施票 9 张(11-19) + 修复票 3 张(11-fix / 12-fix / 16-fix)全闭合, 4 波次按 Blocked by 推导逐波推进。
- 5 份复核报告(wave1 / wave2-fix / wave3 / wave4 / wave5) + 2 份程序化比对报告 + 周期总结, 全部以 commit 落 cch/mmv2-tickets。
- 4 个 CI run 100% success(dry-run 34035726335 + release 34035951623 + E2E 34035724870 + calibration 34035796148)。
- 4 条用户可达链接全 200。
- 实证: 行业心智模型(Chromium 分层 + Fathom 评分 + 密码管理器降级) + 三工程支柱(可见性正确性 / 数据驱动校准 / 可解释反馈) + ARIA 1.2 combobox 双形态, 在本周期全部落地为可测可演化的代码 + CI。
</content>
</invoke>