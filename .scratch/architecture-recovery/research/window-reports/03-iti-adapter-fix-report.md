# 窗口修复报告：03 — intl-tel-input 适配层（真实站点断链复核修复）

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/03-iti-adapter（同票返工，未新开分支）
> 开工复述：大脑第 2 波复核（review-wave2.md）确认 03 适配层在真实 v18.2.1 环境主路径断链，双根因 confirmed；必读 7 份清单（verification/review-wave2 → issues/03 → handoffs/03 → atomcode 矩阵 → src/iti-adapter/index.ts → probe-iti-fill.mjs + brain-probe-iti-sync.mjs → WORKFLOW §2/§4.2）全部读全，并先完成独立复现、再动手修复。

## 1. 独立复现结果（先质疑大脑，自建探针核对数据）

复现探针：`research/scripts/repro-03-fix.mjs`（复用 06 票 hermetic tests/server.mjs，注入 dist）

实测数据（observed）：
- `typeof window.intlTelInput = "function"`，`window.intlTelInput.getInstance = undefined`（factory 形态无 getInstance）
- `typeof intlTelInputGlobals = "object"`，`globals.getInstance = function`（唯一 getInstance 稳锚）
- **根因 1 复现成立**：旧 `_global()` 返回值 `window.intlTelInput || window.intlTelInputGlobals` 命中 function 形态 → `currentFirst_hasGetInstance=false` → 层1/层2 全跳过。
- **根因 2 复现成立**：v18.2.1 真实 DOM `.iti__selected-flag`（click 绑于此），无 `.iti__selected-country`、无 `.selected-flag`；旧选择器先命中父容器 `.iti__flag-container`，listener 不触发。
- **反事实验证通过（与大脑结论一致）**：点 `.iti__selected-flag` → ul 打开（hideBefore=true → hideAfter=false）→ 点 `li[data-country-code="jp"]` → 实例 iso2 变 jp；直调 `globals.getInstance(el).setNumber('+81')` → iso2 即刻 jp。

**结论：大脑双根因判定与独立复现完全一致，无矛盾；修复方案成立。**

## 2. 修复 diff 摘要

文件：`src/iti-adapter/index.ts`

1. **_global() 判定重写**（根因 1）：优先返回 `window.intlTelInputGlobals`（对象形态，持 getInstance）；factory（`window.intlTelInput`）仅在自身暴露 `getInstance` 时才作为备选返回；任何入口都先过 `_isFn(g,'getInstance')` 才可用——层1/层2 不再被 function 形态跳过。
2. **dataset id 实例表双源探测**：`globals.instances[id]` 与 `factory.instances[id]` 都查，杜绝 getInstance 不存在时实例表丢失。
3. **层3 触发器选择器矩阵补 v18 代**（根因 2）：触发序列改为 `.iti__selected-country`（v29）→ `.iti__selected-flag`（v17–v27，含 v18.2.1）→ `.selected-flag`（v16 前）→ `.iti__flag-container`（最后手段）；li 选择器补 `li[data-country-code]`，保留 `.iti__country` 与 `.country`；"先开下拉 → 点 li → 120ms 兜底"时序保持。
4. **验收升级**（`research/scripts/iti-adapter-verify.mjs`）：场景 C 选 Japan 前后各读一次实例选中态，断言 `beforeIso=cn → afterState.iso2=jp && dialCode=81`（杜绝用初始态 +86 冒充联动成功）。
5. **E2E 摘标**（`tests/fp-regression.spec.ts`）：iti v18.2.1 缺口用例的 `test.fail()` 已按 06 报告 §6-2 维护契约摘除，标题改为「iti v18.2.1 填充联动（票 03 适配层修复，已转绿）」。

## 3. 升级后验收命令、退出码与关键输出

### 3.1 iti 适配层专项回归（场景 C 真实联动）
- 命令：`node .scratch/architecture-recovery/research/scripts/iti-adapter-verify.mjs`
- 退出码：`0`，9/9 全 PASS
- 关键输出：
```
PASS dataset id + instances path — {"ok":true,"calls":["cn"]}
PASS v29 DOM .iti__selected-country fallback — {"ok":true,"opened":1,"selectedCount":1}
PASS v16 DOM .iti__flag-container/.selected-flag fallback — {"ok":true,"opened":1,"selectedCount":1}
PASS 场景 C iti@18.2.1 injection + fill linkage — {"pluginReady":true,"itiInputs":3,"buttons":3,"beforeIso":"cn","afterState":{"iso2":"jp","dialCode":"81","inputValue":""},"errors":[]}
{"total":9,"passed":9,"failed":[]}
```

### 3.2 全量 E2E
- 命令：`npm run e2e`
- 退出码：`0`，`20 passed (20.7s)`（含原红标 iti 用例转绿 no.10；shadow DOM 仍是票 04 的预期红）
- `test.fail()` 摘除记录：fp-regression.spec.ts iti v18.2.1 用例 → 已摘，改真断言。

### 3.3 误检测 harness 回归（不得被破坏）
- 命令：`node .scratch/architecture-recovery/research/scripts/misdetect-repro-v2.mjs`
- 退出码：`0`，`合计 25 例，符合预期 25 例`，FP 全家桶（F1–F8）不注入 YES —— 未被 03 修复破坏。

### 3.4 构建
- 命令：`npm run build`
- 退出码：`0`，`dist/find-your-country-code.user.js 50.97 kB │ gzip: 16.20 kB`（11 modules transformed，含新版适配层）

## 4. 版本覆盖矩阵更新（v16–v29）

| 版本 | 命中路径 | 依据 | 证据强度 |
|---|---|---|---|
| v16.x | getInstance（globals）→ setNumber/setCountry；DOM `.selected-flag` 兜底 | atomcode 矩阵 6/7/8；DOM 选择器矩阵 | mock + 反事实 |
| v17.0+ | getInstance → setNumber/setCountry；触发器 `.iti__selected-flag` | getInstance 官方规范、DOM 真实形状 | 反事实 + 真实 DOM |
| **v18.2.1** | **本次修复路径**：globals.getInstance → setNumber（优先）；不可达时层3 `.iti__selected-flag` → li[data-country-code] 点击同步 | **本报告 §3.1 场景 C 实测：beforeIso=cn → afterState.iso2=jp/dialCode=81（observed、reproduced）** | **真实联动全绿** |
| v25.x | getInstance → setNumber/setCountry | 矩阵（仍 setCountry 代） | 能力探测推断 |
| v26.x | getInstance → setNumber → setSelectedCountry（双名先新后旧） | 改名区间 v26–v29（矩阵未锁定断代点，双名探测承接） | 能力探测推断 |
| v27.x | getInstance → setNumber → setSelectedCountry | 同上 | 能力探测推断 |
| v28.x | getInstance → setNumber 优先（separateDialCode 默认 true） | 矩阵 | 能力探测推断 |
| v29.x | getInstance → setNumber → setSelectedCountry；DOM `.iti__selected-country` 兜底 | 矩阵 + DOM 矩阵 | mock + 反事实 |

统一声明：v16/v17/v25–v29 为能力探测路径推断（覆盖逻辑上成立），v18.2.1 为本次真实环境 reproduced 证据；无法逐一拉取各代产物的版本已如实标注证据强度。

## 5. 偏离点与遗留风险

1. **偏离点**：修复探针独立服务 `tests/server.mjs` 在端口 4273（E2E 默认）与脚本自带 local server 并存，避免端口冲突时以 E2E hermetic 为准；未引入任何新工具链。
2. **遗留风险**：
   - v16 前 `.selected-flag` 与 v29 `.iti__selected-country` 代 DOM 无各版本真实页面回归（按证据强度如实标注，mock/反事实覆盖）；
   - 首次 `setNumber` 若 iti 依赖异步 utilsScript 加载，实例可能未就绪；当前层3 兜底 120ms 与 JS 实例优先已覆盖常见时序，极端慢网络未专项覆盖；
   - dist 体积 44.93 kB → 50.97 kB（适配层 + 02 引擎），playwright 无体积门槛，标记观察。

## 6. 通知大脑

修复闭环完成：03 票 issue 验收 4（场景 C 真实联动）已由 `beforeIso=cn → afterState.iso2=jp/dialCode=81` 实测转绿并摘 E2E 红标；请重算 frontier——Wave 3（04 / 05 / 09）解锁，可三窗并行。
