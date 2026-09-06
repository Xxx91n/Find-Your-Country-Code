# 09 — 框架注入加固

**What to build:** 统一注入安全层：INPUT/SELECT/TEXTAREA 全部走原生 prototype value setter + input→change→blur 事件序列（现有 INPUT 实现推广到 SELECT/TEXTAREA）；验证 React 受控组件、Vue v-model、Angular 表单三种宿主的值同步；select 的 prototype setter 缺口补齐（research/misdetection-root-causes.md §3.6）。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] React 受控 select 与 input 的填充终态正确（fixture 断言值与后续提交内容）
- [ ] Vue v-model 场景值同步（fixture）
- [ ] 三类元素事件序列一致（input→change→blur），行为集中在一个注入函数
- [ ] 事件冒泡与 composed 行为写入报告（跨 shadow 场景依据）
