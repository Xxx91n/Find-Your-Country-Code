# 12: 规则上限强制点裁定 + BC 替身克隆保真度修复

**What to build:** 处置票 10 §6.1/§6.2 挖出的**门保真度缺口**（源码层面）：(a) 裁定 `RULES_MAX_OVERRIDES`（500）的**强制点**属**写路径**还是**读路径**并据此实现；(b) 补齐 `tests/scripts/verify-ticket-05.mjs` 的 BroadcastChannel 替身**结构化克隆保真度**，使 S4「上限生效」断言反映**真实保证**而非替身别名旁路。

**Blocked by:** 票 10（srcdoc origin 修复）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-036

- [ ] 裁定「上限强制点」：写路径（`upsertOverride` → `_writeRules`）还是读路径（`_normRulesDoc`）；裁定须给出依据（工业界语义 / 本仓既有语义）
- [ ] 按裁定实现强制点（当前事实：只在 `_normRulesDoc` 内截断，本地写路径不截断，内存文档可超 500）
- [ ] 补齐 `verify-ticket-05.mjs` 的 BC 替身**克隆保真度**（真实 BC 按结构化克隆投递，替身当前按引用 ⇒ 接收方就地改写会污染发送方 `_rulesCache`）
- [ ] 复现证据入报告：**同一门文本、仅替身保真度不同**的 A/B 对照（补克隆后 S4 应反映真实保证，而不是 `got=513` 复红）
- [ ] 不得以「保留假绿」方式回避（不得靠替身别名旁路维持 S4 绿）；不得放宽或删除任何既有断言
- [ ] `verify-05`（100/100 基线）、`verify-05-harness`（59/0）、全量 E2E 均不回归
- [ ] 声明本票覆盖的 A-xxx：A-036
