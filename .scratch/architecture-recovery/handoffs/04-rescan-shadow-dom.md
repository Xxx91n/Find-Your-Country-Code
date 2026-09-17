# Handoff：04 — 可重评估扫描 + Shadow DOM 穿透

**给谁**：领取 04 号票的子窗口（fresh context）。
**焦点**：扫描机制升级：穿透、重评、路由感知。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\04-rescan-shadow-dom.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md` §3.1/3.2/3.7（盲区证据）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md` 结论 10（Shadow DOM 穿透工业实践）与 `research\industry-models.md` M8（穿透与 observer 细节）
4. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Implementation Decisions 的扫描机制节）
5. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 Detect.scan / _done / observe()（现状）
6. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- 每个 shadow root 单独 observer；重扫必须防抖（现状 350ms 防抖心智保留）。
- 指纹快照方案先在票内小范围评审（报告里写设计再实现），避免过度工程——Ponytail full。
- 性能基线（1000 节点防抖窗口）必须实测写入报告。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\04-rescan-shadow-dom-report.md`：穿透与重评设计、fixture 断言结果、性能实测数字、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd`）；版本控制遵循 WORKFLOW §4.2。
