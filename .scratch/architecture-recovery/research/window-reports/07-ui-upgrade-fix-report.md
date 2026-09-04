# 窗口实施报告：07-fix — 负反馈主路径失效修复

> 修复窗口（fresh context）| 日期：2026-09-04 | 分支：cch/07-ui-upgrade 续提交（WORKFLOW §4.2，不新开分支）
> 启动器：prompts/07-ui-upgrade-fix.md | 复核依据：verification/review-wave4.md + research/scripts/brain-probe-07-fb.mjs
> 开工复述：大脑双根因（rules._own wrapper 检查致负反馈 100% 失效 + 门禁 mock closest 盲区）与反事实证据链已复述；必读 7 文件按序读全。

## 1. 独立复现结果：与大脑一致（非矛盾）

- 复现命令：`node .scratch/architecture-recovery/research/scripts/brain-probe-07-fb.mjs`（修复前，buggy 源码 + 既有 dist）→ **exit 0**：
  `STATE1={"btns":2,"ccStrongWrapped":true}` → `POP_OPEN=true` → `RESULT={"toast":"请先点击目标字段","overrides":"no-doc","wrappedAfter":true}` → `PAGEERR=[]`
  与大脑取证逐项一致：toast=needTarget、GM 无规则写入、图标未拆、无 pageerror。
- 独立实读差异确认：`rules._own`（含 `el.closest('.' + WRAPPER_CLASS)`）vs `detect._own`（04 版，无该检查、含 cch-si/cch-btn 面）——04 报告 §1.3 附带修复 1 只同步了 detect 层、rules 层遗漏，不一致真实存在。

## 2. _own 新旧语义 diff（src/rules/index.ts）

```diff
     _own(el) {
+      // 票 04 语义（07-fix 同步到 rules 层，04 报告 §1.3 附带修复 1 的遗漏面）：移除
+      // closest('.cch-wrapper') 检查 —— wrapper 是脚本自建的包裹层，字段本身不是 UI；
+      // 按包裹判定会把全部已挂图标字段挡在负反馈之外（brain-probe-07-fb 取证 confirmed）。
       if (!el || typeof el.closest !== 'function') return true;
       return !!el.closest('#' + OWN_ROOT_ID) ||
-             !!el.closest('.' + WRAPPER_CLASS) ||
-             el.id === 'cch-search';
+             el.id === 'cch-search' || el.id === 'cch-si' ||
+             !!(el.classList && el.classList.contains && el.classList.contains('cch-btn'));
     },
```
- 拦截面收敛为与 Detect._own 完全同语义：#cch-root 内元素 / cch-search / cch-si / cch-btn。
- 自检三项通过：① 真正脚本 UI 全部仍被拦截（S3b 后 4 断言）；② 05 票 forcedTier 自身 UI 守卫不受影响（_own 前置位置未动，S2/S3 既有断言全绿）；③ 02 评分路径零触及（scoreElement 无改动，repro-v2 25/25 复跑证实）。
- 顺手清理：WRAPPER_CLASS 在 rules 层仅剩 unused import，已从 import 语句移除。

## 3. 门禁 S3b 红→绿证据（TDD 留痕）

- 门禁改动：verify-ticket-07.mjs ① mock El 补 `classList` getter（对齐真实 DOM，修复盲区的 mock 侧）② 新增 S3b 节：mock 元素带 .cch-wrapper 祖先（= attach 后真实页面形态）断言 rememberNone 成功 + forcedTier 穿 wrapper 命中 + 自身 UI 四面（cch-btn/cch-si/#cch-root 内/——cch-search 由既有语义覆盖）不可登记。
- 红基线（S3b 落库后、_own 修复前）：`node verify-ticket-07.mjs` → **exit 1，total 73 | pass 68 | fail 5**（3 例预期红：wrapper 拦截致登记失败/forcedTier null/规则未落盘；**另 2 例是红基线额外暴露的旧实现反向缺口**——旧 _own 缺 cch-btn/cch-si 面，两者竟可被登记，修复后一并转绿）。存档：verification/07-fix-red-baseline.txt。
- 修复后：**exit 0，total 73 | pass 73 | fail 0**（任务书预期 67+新增 S3b=68 实际为 73：大脑修正版基线计数与 S3b 增量按实际断言数核算，5 例 S3b 全绿）。存档：verification/07-fix-gates.txt。

## 4. 四门禁 + 真实页面反事实 + E2E 全量（退出码）

| 命令 | 结果 | 存档 |
|---|---|---|
| `node verify-ticket-07.mjs` | **exit 0，73/73** | 07-fix-gates.txt |
| `node verify-ticket-02.mjs` | **exit 0，36/36** | 07-fix-gates.txt |
| `node misdetect-repro-v2.mjs` | **exit 0，25/25，FP 全家桶不注入 YES** | 07-fix-gates.txt |
| `node verify-ticket-05.mjs`（补充回归） | **exit 0，79/79** | 07-fix-gates.txt |
| `npm run build` | **exit 0**（79.55 kB，11 modules；dist 内 wrapper 检查已消失、cch-si 面在场） | — |
| 探针（修复后 rebuild） | **exit 0**：`RESULT={"toast":"已记住：本页此字段不再提示","overrides":1,"wrappedAfter":false}`、PAGEERR=[] —— 与大脑反事实结果一致（验收 2 全链路恢复） | 07-fix-probe-after.txt |
| `npx playwright test`（= e2e 全量） | **exit 0，42 passed**（56.1s；rules-ui 9/9 全绿含验收 1/2/3 五个原失败用例 + 既有 33 回归零破坏） | 07-fix-e2e.txt |

## 5. E2E 脚手架修正（偏离点）

首跑 38 passed / 4 failed，取证（test-results error-context）证实 **4 个失败全是 rules-ui.spec.ts 脚手架自身缺陷、非产品代码**（产品修复已被门禁+探针证明）：
1. **种子回灌/洗桶**：boot() 的 addInitScript 每次导航都重跑——无种子用例 reload 时把空桶覆写回去（洗掉测试内写入的负反馈/豁免）；带种子用例 reload 时把删除前的种子规则回灌。修正：种子一次性标记 `__cch_seed_done__`（localStorage，随测试上下文隔离），种子只在首次导航生效。
2. **低调切换用例时序**：面板开着时 openPanel 对同 anchor 再点=切换关闭。修正：先点 h1 关面板再重开。
两处均只动测试脚手架，断言语义零改动；修正后 42 passed exit 0。

## 6. 其他偏离点

1. **CI-only 令执行顺序**：本票任务书 3-5 条明确指令本地跑探针/门禁/e2e/build，按新近任务书为该票显式覆盖既有 CI-only 令执行；全部输出落盘 verification/07-fix-{red-baseline,gates,probe-after,e2e}.txt，退出码以存档为准。
2. **任务书计数校正**：S3b 增量断言 5 例（含自身 UI 四面收敛面），修复后总数 73/73 而非 68/68；门禁总数以实际断言数为准，无断言删减。
3. **红基线多暴露 2 红**（旧 _own 缺 cch-btn/cch-si 拦截面）：属修复语义的严格化收益，非测试污染。

## 7. 遗留风险（给大脑）

1. **rules-ui.spec.ts 种子机制**依赖 `__cch_seed_done__` 标记，若后续票复用该 helper 请保持「种子只灌一次」语义（reload 类用例都受此影响）。
2. **探针只覆盖 #cc-strong（id 路径负反馈）**：name/tag 路径选择器生成（rememberNone 三态）由单元门 S3 覆盖、真实页面未单独取证——置信度充分但非真实页面级。
3. **e2e 42 例基线**：09 票基线 33 + 本票 9；后续票增删用例时注意同步更新「总 passed」预期数字。
4. dist 为本机构建产物（CI-only 令下由任务书明示的 build 步骤产生），未入库（.gitignore 已排除），无回收登记必要。

## 8. 收尾

- 分支 cch/07-ui-upgrade 现共 3 commit：rol feat / opu docs / pmx fix。本 fix 提交范围：src/rules/index.ts + verify-ticket-07.mjs + tests/rules-ui.spec.ts + 4 份 verification 存档，未触碰其他窗口文件。
- **票 07 闭环 → 通知大脑重算 frontier：Wave 5 收口（10 号票发布链路，blocked-by 01,09,07）解锁。**
