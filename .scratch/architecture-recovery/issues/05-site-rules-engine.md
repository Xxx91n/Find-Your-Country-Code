# 05 — 站点规则引擎

**What to build:** 站点级规则引擎：GM 存储按站点/域名维度的规则（豁免检测 / 强制选择器注入 / 置信度分档覆盖），规则匹配接入检测入口；规则格式文档化供 UI 票消费。参照行业后门心智（KeePassXC sites.js / Bitwarden linked field / 1Password data-1p-ignore）。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] 规则持久化（GM 存储），刷新与跨标签页生效
- [ ] 豁免域名完全跳过检测；强制选择器按高置信注入；分档覆盖生效
- [ ] 规则对脚本自身面板元素不产生任何效果
- [ ] 规则数据格式文档写入本票报告（供 07 号票 UI 消费），含增删改查函数边界
