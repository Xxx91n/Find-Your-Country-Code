# 05: harness 交互原语

**What to build:** 让验证能「驱动」而不只是「看见」：从密封层起建可复用交互原语层，并让 GM 替身可驱动。

**Blocked by:** 票 01（阶梯定义）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-029


- [ ] 交互原语可从密封层调用：open → search → select → fill，并读回宿主字段 value
- [ ] 密封与 live 两个 harness 收敛为同一份原语（不新造第二套）
- [ ] GM 替身记录 `{title, fn}` 且可调用
- [ ] 断言改 web-first + `expect.soft` 一次收全量
- [ ] 声明本票覆盖的 A-xxx：A-029
