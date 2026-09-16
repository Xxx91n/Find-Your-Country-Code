# 10: 修复 `about:srcdoc` 帧跨帧 origin 校验误判

**What to build:** 修复「跨帧填充指令在 `about:srcdoc` 帧被**静默丢弃**」的真实缺陷（票 07 真实站点层首次全阶梯运行暴露）。修法方向：origin 比对改用 `window.origin`（srcdoc 帧下为继承的真实 origin），或对 `location.origin === "null"` 回退到 `window.origin`。

**Blocked by:** 票 07（真实站点层与发布门）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-034

- [ ] 修复 `src/main.ts:134`：`if (isTopFrameSameOrigin() && e.origin !== location.origin) return;` 在 srcdoc 帧判真并丢弃顶层 `FRAME_FILL_MSG`
- [ ] 同面排查并修复 `src/main.ts:120` 与 `src/store/index.ts:67` / `:97`（BroadcastChannel 同源校验）
- [ ] 复现证据入报告：修复前后 srcdoc 帧 `location.origin` vs `window.origin` 的实测对照（探针脚本）
- [ ] 真实站点层 `live-codepen-pen-fullpage` 的 L3/L4 转绿（以 CI run 证据为准）
- [ ] 密封 E2E 135 例、`verify-37`、`verify-42`、`verify-39` 均不回归
- [ ] 声明本票覆盖的 A-xxx：A-034
