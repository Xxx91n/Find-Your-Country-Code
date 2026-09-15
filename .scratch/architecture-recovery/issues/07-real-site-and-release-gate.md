# 07: 真实站点层全阶梯 + 发布门

**What to build:** 让真实站点层跑全阶梯但不阻断合入，并把「绿」绑到真正要紧的关口（发版）。

**Blocked by:** 票 06（形态语料）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-029


- [ ] 真实站点层按全阶梯（含 L4）运行
- [ ] 仅 schedule + workflow_dispatch 触发，不进 pull_request
- [ ] 失败只告警不阻断合入
- [ ] release.yml 加发布门：真实站点层最近一次运行必须为绿，或失败已显式 ack 并立票，否则不出包
- [ ] observe 挂账强制携带非空 reason + ticket
- [ ] 声明本票覆盖的 A-xxx：A-029
