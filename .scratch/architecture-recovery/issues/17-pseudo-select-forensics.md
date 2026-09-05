# 17 — 组件库伪 select 取证与 ADR-0005

**What to build:** 对 MUI/AntD/Element-Plus/react-select/Radix 逐库取证 DOM/ARIA 结构(附 aria snapshot 样本),形成视觉样本库与探测策略设计(只登记不注入),输出 ADR-0005 明确裁决「实现(交 18 票)」或「继续缓议」。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 逐库取证报告: 每库触发器/弹出层/选项的 DOM+ARIA 结构、焦点管理、值承载方式,附 aria snapshot 样本
- [ ] 视觉样本库落 research/ 且可复现(探针脚本或静态样本页)
- [ ] 探测策略设计: role=combobox/listbox + aria-expanded/controls/activedescendant + label 语义 + shadow 内列表文本;输出级别为「登记+手动召唤」,不含注入
- [ ] ADR-0005 落盘 docs/adr/: 依据取证证据二选一明确裁决,并写明反证条件
- [ ] 本票不修改业务代码(纯取证+决策记录)
