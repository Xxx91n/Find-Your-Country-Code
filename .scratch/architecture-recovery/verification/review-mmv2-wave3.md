# Wave 3 复核报告:票 13(首脑,2026-09-06)

> 方法: 不信自述。报告每项声明回仓库实物验证(代码抽查 / 测试复跑 / gh API 核 CI / manifest 比对 / 分支落位)。

## 1. 逐票「声明 -> 证据 -> 结论」

### 13 可见性闸门与 L3 内容验证加码
| 声明 | 证据(实物) | 结论 |
|---|---|---|
| issue 验收 1 可见性闸门(五形态不注入+登记保留) | verify-13.mjs 本脑复跑 exit 0,PASS ×18;E2E 34017329604 56 passed 含 visibility.spec 4 例 | 闭合 |
| issue 验收 2 隐藏承值 select 不误杀 | 同 E2E 验收 2(spec 收尾断言 vis-hidden-carrier value=CA) | 闭合 |
| issue 验收 3 ISO2 全集成员测试 | verify-13 验收「ISO2 承值下拉可填充(CA)」;既有门 36/36 + 25/25 全绿 | 闭合 |
| issue 验收 4 共享区号消歧 | verify-13 PASS 共享区号(+1/+44)检测 + fill 消歧正反向 + 裸值退回旧行为 | 闭合 |
| issue 验收 5 占位首项剔除 | verify-13 PASS 占位首项不污染 + 占位首项下拉照常注入 + 填充不受伤 | 闭合 |
| issue 验收 6 CI 误报红线 | CI 34017329606 FP=0 FN=0 mismatch=0 | 闭合 |
| 检查点一 只改档位不改登记 | verify-13 隐含「闸门孪生一致 + 隐藏承值可填充」+ signal gate:visibility-hidden 0 分留痕 | 闭合 |
| 检查点二 剔除仅作用计分 | 填充不受伤断言 + 计分分母剔除占位 | 闭合 |
| 检查点三 基于 16 基座冲突走 §4.2 | 分支堆叠 above cch/16-fix-calibration-mirror(but status 实证) | 闭合 |
| 检查点四 iti 容器唯一证据防线 + 翻转 | detect 实证含 iti:container-unattested + manifest mm2-neg-itires knownResidual false + CI 34017498607 precision=1.0 / knownResidual 列表空 | 闭合 |
| src/detect/index.ts 新增 _hiddenByStyle / ISO2_SET / isPlaceholderOpt / gate:visibility-hidden / iti:container-unattested / fingerprint v0+v1 | 全部 grep 实证 | 闭合 |
| src/fill/index.ts selectedIndex + 共享区号消歧 | 实证 selectedIndex + 国家名消歧符号在码 | 闭合 |
| src/ui/index.ts data-cch-summon + inline-block | 实证两符号在码 | 闭合 |
| tests/fixtures/visibility.html + tests/visibility.spec.ts | tests/fixtures/ 列表确认 visibility.html 在;spec.ts 内容引用 /fixtures/visibility.html | 闭合 |
| manifest 39 -> 41(appendOnly)+ mm2-neg-itires knownResidual true -> false | JSON 解析实证: cases=41, mm2-neg-itires.knownResidual=false,2 个 mm2-pos-* 新增 | 闭合 |
| verify-13.yml ticket-scoped workflow | gh run view 34017329606: workflowName .github/workflows/verify-13.yml success | 闭合 |
| CI 3 run 全绿(verify-13/E2E/Calibration) | gh API 全部 success head 589ff316 branch cch/13 | 闭合 |
| threshold-calibration 39/41 评论 vs 动态 | 实测脚本读 manifest.json 动态,数字自动跟随;39/41 为文档注释,不影响结果 | 闭合 |
| 分支落位 | but status: vi [cch/13] 在 cch/16-fix-calibration-mirror 之上;origin 未推送(CI 经 workflow_dispatch 触发,无需 push) | 闭合 |

## 2. 源码层问题(需修复)

- 无。threshold-calibration 的 39/41 评论为文档,脚本实测动态读 manifest.json,新语料自动涵盖(appendOnly 规则一致)。

## 3. 过程违规(单列,不追认)

- 全部为申报内偏离,无违规:
  - 吸收 16 孤儿 hunk(票 16 工作区未提交的 L3 独立叠加):13 工作区原地含此变更,16 的分支 tip 缺该 hunk。13 落地时一并吸收。声明:票 16 报告与 CI 证据本就以该形态为准,实质无偏差。建议 WORKFLOW §5 登记「工作区 hunk 跨窗吸收责任边界」防再犯。
  - 修改 14-lib-engine.mjs(票 14 工件)在 16-fix 已先例同步,本次无新增改动。
  - 修改 verify-ticket-02.mjs / misdetect-repro-v2.mjs(票 02/04 工件)的 mock 构造函数一行(type 暴露):declared,同 16-fix 先例,为 P4 真实引擎 70/auto 测量的 mock 保真必要。
  - 修改 scenarios.e2e.spec.ts 基线(激活 tab 口径):declared,闸门语义必要演进,测试与实现同票落盘。
  - 遮挡判定(elementFromPoint overlay)未实现:declared 为设计取舍(Bitwarden 亦未采用),以零尺寸+全裁剪形态近似覆盖,登记为未做项。

## 4. frontier 结论

- Wave 3 = 13/1 复核通过;issue 13 + 检查点一/二/三/四全部闭合。
- 全部波次(11-17 + 三个修复票 + 13)= 全闭环。
- 下一波 = 18(单票,阻塞 13/16/17 全闭):伪 select 端到端识别与填充,按 ADR-0005「登记+手动召唤」档位受约束,无 18 即硬做(缓议则取消)。
- 之后:19 收口(workflow 触发面/install 口径全量统一 + 栈序合并 + lkq 裁决 + 灰度发布) -> push。
