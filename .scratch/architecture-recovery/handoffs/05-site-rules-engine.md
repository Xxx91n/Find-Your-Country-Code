# Handoff：05 — 站点规则引擎

**给谁**：领取 05 号票的子窗口（fresh context）。
**焦点**：站点级规则的存储、匹配、生命周期；给 07 票供数据面。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\05-site-rules-engine.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md` 结论 5（三源后门心智：sites.js / linked field / data-1p-ignore）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Implementation Decisions 的站点规则引擎节）
4. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 Store 区块（GM 存储现状与同步机制）
5. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- 规则数据格式文档是 07 票的接口契约，先定格式再实现，格式写入报告。
- 规则匹配必须发生在检测入口之前（豁免=完全跳过）；对脚本自身 UI 不生效。
- Ponytail full：不做规则导入导出/云同步等未要求能力。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\05-site-rules-engine-report.md`：数据格式文档（增删改查函数边界）、匹配时机说明、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd`）；版本控制遵循 WORKFLOW §4.2。
