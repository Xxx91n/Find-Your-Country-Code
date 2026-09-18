# ADR-0008: 真实站点语料分层测试与 CDP Autofill 不采用

日期：2026-09-12 ｜ 状态：accepted ｜ 来源：Cycle-4 票 32（A-006）+ 票 27 R1 证据去重裁决

## 背景

A-006：CI 绿全部来自手工合成 fixture（0 真实站点），「出厂都是幻觉」的机制性根因。工业参照（atomcode 两轮）：Bitwarden `test-the-web` / Mozilla `form-fill-examples` 的模式库范式 + 低频真实站点冒烟 + 弱断言 + 可跳过白名单。

## 决策

1. **三层测试塔**：
   - 第一层 密封 E2E + 确定性模式库（corpus + calibration，PR 阻断，零外网）——语义不变（扩展 ADR-0006 密封 E2E）。
   - 第二层 真实站点低频冒烟（`tests/live/` + `real-site-smoke.yml`）：仅 `schedule`（周）+ `workflow_dispatch`，**永不进入 `pull_request` 触发面**，弱断言 + 可跳过白名单强制 `reason`+`ticket`，失败 advisory 不阻断。
2. **CDP `Autofill.trigger` NOT-ADOPTED**（被否路线）：其事件/字段只反映浏览器原生 AutofillManager 的分类与填充；userscript 注入不经过该管线（规范语义 + 本地实测 `Autofill.enable/setAddresses/trigger` 不可达、`addressFormFilled` 事件数 0 双证同向）。保留 opt-in 评估工具，不接入断言面。
3. **证据同源去重（floor≠ceiling）**：属性短语与 L3 区号内容证据同源时不重复计分（票 27 R1）——覆盖率补强只抬下限、不抬既有档位上限；P8 回归 68/lowkey，全部既有档位逐例不变。
4. 语料改动 append-only；修复票必须同步 `realSiteForms[].baseline`（preFix 留存），漂移即 CI 红——**这是设计意图，不是噪声**。

## 后果

- 正：CI 绿首次具备「真实形态代表性」；A-001/A-002/A-003 三形态以量化 recall（0.87→1.0）闭环。
- 负：~~`--legacy-peer-deps` 因 react@18/react-dom19 双 peer 冲突残留于安装面（根因修复后移除）。~~ **已消除（票 43 / A-021，2026-09-14）**：React 18 与 React 19 分居两个 install root（npm workspaces），安装面不再需要该 flag（见 ADR-0006 §决策4 / §后果 2）。

## 反证条件

- Chrome `autofill` DOM 事件（OT）或 CDP 面开放出可断言脚本注入的通道时重评第 2 条。
- 真实站点层若需进 PR 门控，须先解决外网供给与 flaky 预算，属新一轮决策。

## Notes（2026-09-18 · D-006 B⑩：`verdict`↔`expect` 联动语义登记）

> 形式：**追加**，不改动上方背景 / 决策 / 后果 / 反证条件 / 参考各节（D-011 纪律：只追加带日期注记）。

### 语义（登记，非新决策）

`realSiteForms[]` 的 `baseline.verdict` 与 `corpusCases[].expect` / `corpusCases[].knownResidual` 之间存在**联动约束**，属决策 1（三层测试塔）与决策 4（语料 append-only）的**既有意图**，此前未显式成文：

| `verdict` | 含义 | `expect` 必须 | `knownResidual` 必须 |
|---|---|---|---|
| `MISS` | 修前漏检 / 豁免中 | `inject` | `true` |
| `FIXED` | 修复已落地 | `inject` | `false` |
| `COVERED` | 负例已覆盖 | `none` | `false` |

### 机器校验（本仓已具备，领先业界基线）

该联动**已由 CI 机器校验**，不是靠人工维护：`tests/scripts/32-real-site-corpus.mjs` **:193–201** 逐例断言——

- `:193–196` `knownResidual` 与 `verdict === 'MISS'` 必须一致，否则 push 违规项；
- `:199–201` `expect` 必须等于 `verdict === 'COVERED' ? 'none' : 'inject'`，否则 push 违规项；
- 违规汇总后由 `--json` 的 `gate` 字段与非零退出码暴露（`calibration-baseline.yml` 跑该脚本）。

### 登记结论

- **不新立 ADR**（依 D-006 B⑩）：本条**不改任何决策**，只把既有联动语义与机器校验落文，避免「谓词变更是否需 ADR 追加」反复成为悬置问题。
- 参照：业界镜像（dotnet `Known Issues`）要求联动约束**代码化**；本仓**已满足**，剩余缺口仅为**文档化**，即本条。
- 若日后改动该谓词（`verdict` 取值域、`expect` 映射或 `knownResidual` 口径）——属**决策变更**，须**新立 ADR**，不得只改本注记。
## 参考

- 票 32 报告（§5 前后对照 / §7 适配度评估）+ `research/cycle4-atomcode-findings.md`。
- 票 27 R1 报告（§3 路线 B 裁决 + §2 影响面普查）。
