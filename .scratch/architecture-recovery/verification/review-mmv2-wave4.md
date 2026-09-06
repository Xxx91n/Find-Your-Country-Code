# Wave 4 复核报告:票 18(首脑,2026-09-06)

> 方法: 不信自述。报告每项声明回仓库实物验证(代码抽查 / verify-ticket-18 复跑 / gh API 核 CI / 语料比对 / 分支落位与文件范围)。

## 1. 逐票「声明 -> 证据 -> 结论」

### 18 伪 select 端到端识别与填充
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| ARIA 层入评分(comboboxEvidence/pseudoOptionStats/pseudoNameHit/resolveAriaIds) | src/detect/index.ts 全 grep 实证 | 闭合 |
| 结构组合信号 pseudo:combobox + L3 口径复用 | gate 1.2/1.3 PASS(country-identity 信号复用 L3 常量) | 闭合 |
| 否决组(报告写 pseudo:veto:search-typeahead) | 代码为运行时拼接 veto=search-typeahead + name=pseudo:veto:+combo.veto,grep 字面量不中但语义实证;gate 3.x veto 4 断言 PASS | 闭合(报告命名准确) |
| ADR-0005 档位约束(登记+手动召唤,不自动注入) | gate:adr-0005-register-only 留痕 + gate 1.5/1.7 PASS(none 分支登记 + attach 未调用) | 闭合 |
| aria-hidden 硬排除 / antd 豁免 / fingerprint 补 aria 属性 / SCAN_SELECTORS combobox | 全 grep 实证 | 闭合 |
| ARIA_COMBO_STRUCT_SCORE=20 唯一新常量 | config.ts 实测值 20 | 闭合 |
| fill 两形态策略(fillPseudo/_carrier/_pseudoFillByListbox/_pseudoFillByKeys + run() pseudo 分支) | src/fill/index.ts 全 grep 实证 | 闭合 |
| ui _applyLowkeyMode pseudo 推导 | src/ui/index.ts grep 实证 | 闭合 |
| fixtures 两形态+否决组 + spec 3 例 + verify-18.yml + verify-ticket-18.mjs | 全部实测存在 | 闭合 |
| verify-ticket-18 35 断言 | 本脑复跑 exit 0,35 PASS 0 FAIL(含 7a-7d 填充策略断言) | 闭合 |
| 语料 41 例零扰动 | manifest 实测仍 41;gate 6.x mismatch=0 precision=1.0 recall=1.0 | 闭合 |
| CI 证据 | gh API 双 run success: verify-18 34029969317 + E2E 34029969338(59 passed=基线 56+3),head b1c2864 一致 | 闭合 |
| 分支落位与文件范围 | but status: ps[cch/18] 直接堆叠 vi[cch/13] 之上;git log --stat 三提交(b18dab4 src 4 文件 / b1c2864 test 6 文件 / f5562ab 报告 1 文件)全在票圈 | 闭合 |

## 2. 源码层问题(需修复)

- 无。

## 3. 过程违规(单列,不追认)

- 无违规。首推因双栈结构被拒 -> 误锚 A 栈(cch/17)-> but move --above cch/13 纠正至 src 栈顶: 全程 but 操作、已如实披露,最终落位正确。
- 申报内偏离: hermetic 复刻 fixture(非真实 CDN 库)依仓库无外网原则,结构与 17 票五库探针 observed 逐属性对齐;搜索型否决组关闭态仅靠 20<25 登记线兜底;承值护栏拒绝区号形态现值;本地门禁干跑(研究工具口径,最终证据只认 CI)。
- 未做项(如实登记): antd 虚拟化滚动加载、键盘回退起点假设、真实库实站冒烟(建议发布后用户实测)、17 票遗留的 atomcode 交叉验证轮(串行护栏两度让位,大脑可选补跑)。

## 4. frontier 结论

- Wave 4 = 18 复核通过;issue 18 验收 1-5 + 检查点一/二/三全部闭合(验收 5 因 ADR 裁决=实现而不适用)。
- **全部实施票 11-18 + 三个修复票 = 全闭环。下一波 = 19(发版与发布链接恢复),由大脑/用户执行。**
- 19 检查单: 版本决策(三处一致 + CI dry-run)-> 发布动作(WORKFLOW §4.2)-> Release 产物核验 -> GreasyFork 同步核对 + README 链接更新 -> 链接 200 -> 波次表勾销 + 周期总结;另加 wave1 复核 §4 收口检查点(workflow 触发面/install 口径统一、双栈合流顺序、lkq 裁决)。
