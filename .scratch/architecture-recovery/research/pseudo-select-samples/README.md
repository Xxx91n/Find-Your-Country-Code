# 伪 select 视觉样本库（票 17 取证）

> 生成: 2026-09-05 | 票 17 | 探针: `research/scripts/17-pseudo-select-probe.mjs`
> 性质: 静态样本页 + 真实渲染取证产物。样本页用 CDN 固定版本加载真实组件库，探针用 Playwright Chromium 真实打开、点击、键盘导航并抓取 aria snapshot 与结构化 DOM/ARIA 事实。

## 复现方法

```bash
node .scratch/architecture-recovery/research/scripts/17-pseudo-select-probe.mjs
# 可选参数: [pagesDir] [outDir]，默认即本目录
```

前置: `npm i`（仓库 devDependencies 含 playwright 1.62）+ 本地 Chromium（ms-playwright）+ 外网可达 unpkg.com / esm.sh。探针只读仓库代码之外的 CDN 样本页，不 import 任何仓库源码，不产生构建产物。

## 样本页与版本锁定

| 样本页 | 组件库 | 固定版本 | 加载方式 |
|---|---|---|---|
| pages/mui.html | @mui/material | 5.16.7 | unpkg UMD（v6 起 MUI 停发 UMD，404 实测） |
| pages/antd.html | antd | 5.27.4 | unpkg UMD（+ dayjs 1.11.13） |
| pages/element-plus.html | element-plus | 2.9.3 | unpkg full + index.css（+ vue 3.5.13 global） |
| pages/react-select.html | react-select | 5.10.0 | esm.sh ESM importmap（unpkg dist 404 实测） |
| pages/radix.html | @radix-ui/react-select | 2.2.2 | esm.sh ESM importmap |

公共样本数据: 6 国（US/GB/CA/AU/DE/JP，含共享区号 +1/+44 的 US/CA 与 GB），value 均为 ISO2，`name=country`，各库用其惯用 label 关联方式（MUI InputLabel+labelId / antd Form.Item label / EP el-form-item label / react-select label+inputId / Radix label htmlFor=trigger id）。

## 探针每次运行产出

- `snapshots/<lib>--closed.yml | --open.yml | --selected.yml`：closed / 展开选中 / 选择后三态整页 aria snapshot（Playwright ariaSnapshot）。
- `facts/<lib>.json`：触发器/弹出层/选项/焦点/值承载元素的结构化事实 + 页面错误清单 + role 普查。
- 本次运行: 2026-09-05，Playwright 1.62.1，Chromium 1234，5/5 库完整捕获（探针 exit 0）。

## 已知取样偏差（诚实登记）

- MUI UMD 只有 v5；v6/v7 的 DOM 结构变化未在本样本库覆盖（探测信号 core 预计稳定，标注 candidate）。
- antd 虚拟滚动: 6 个选项仅渲染 2 个（首个屏幕内），展开态 option 枚举不完整是真实行为不是探针缺陷。
- Radix 未包 form 时未观察到隐藏原生 select 兜底（`name` 已传）；是否需要 form 上下文标注 candidate。
