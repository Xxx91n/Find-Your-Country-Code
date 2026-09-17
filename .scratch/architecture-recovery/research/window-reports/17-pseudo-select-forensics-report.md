# 窗口报告 — 票 17: 组件库伪 select 取证与 ADR-0005

> 窗口: 票 17 实施窗口 | 完成: 2026-09-05 | 遵循 handoff 完成定义: issue 5 条验收全部真实执行 + 本报告落盘

## 变更清单与理由

全部为 research/docs 产物,零业务代码改动（验收⑤）:

| 产物 | 理由 |
|---|---|
| `research/pseudo-select-samples/pages/{mui,antd,element-plus,react-select,radix}.html` | 验收②视觉样本库: 5 库固定版本 CDN 样本页，真实组件真实渲染 |
| `research/pseudo-select-samples/snapshots/*.yml`（15 个: 每库 closed/open/selected 三态） | 验收①/②: Playwright ariaSnapshot 一手样本 |
| `research/pseudo-select-samples/facts/*.json`（5 个） | 触发器/弹出层/选项/焦点/值承载结构化事实 + role 普查 + 页面错误清单 |
| `research/pseudo-select-samples/README.md` | 样本库复现指引 + 版本锁定表 + 取样偏差诚实登记 |
| `research/scripts/17-pseudo-select-probe.mjs` | 探针脚本（WORKFLOW §2.6 node 承载），一键复现全部证据 |
| `research/scripts/17-cdn-check.mjs` | CDN 版本可用性预检（首轮实测发现 MUI v6 UMD 404、react-select dist 404，据此改 v5 UMD + esm.sh） |
| `research/pseudo-select-forensics.md` | 验收①逐库取证报告: 跨库信号核心矩阵 + 逐库三栏（可识别/不可靠/值承载）+ 焦点管理两模型，全部标 observed/cited/candidate |
| `research/pseudo-select-detection-strategy.md` | 验收③探测策略设计: 登记级信号链、打分并入五层瀑布、降权/否决组、明确排除项 |
| `docs/adr/0005-pseudo-select-recognition-implement.md` | 验收④ ADR-0005: 裁决「实现（登记+手动召唤档）」，4 条反证条件，不预写实现方案（方案归 18 票） |

## 验收证据与关键输出

- 探针实跑输出（2026-09-05, Playwright 1.62.1 + Chromium 1234, exit 0）:
  `summary: 5/5 libs fully captured`（antd/element-plus/mui/radix/react-select 全 OK，触发器/弹出层/选项/承载元素全部识别）。
- 证据路径: `research/pseudo-select-samples/snapshots/`（15 yml）+ `facts/`（5 json）+ `pages/`（5 html）。
- 关键一手结论（observed，支撑 ADR 裁决）:
  1. 信号核心 5/5 库稳定: role=combobox + aria-expanded + aria-controls→role=listbox + role=option; haspopup/activedescendant 只是辅助差异。
  2. 值承载三分天下: 隐藏 native input（MUI/react-select, US→CA 实变）vs 组件 state 无 DOM 痕迹（antd/EP）vs state+触发器文本（Radix 本样本）。
  3. 4/5 库弹出层 portal 到 body（探测必须 id 解引用不能子树搜索）; antd 虚拟化 6 项只渲染 2; antd option 文本=ISO2 国名在 aria-label。
  4. 5/5 库选值无原生 change/input 事件（内容验证不能事件驱动化）。
- 本票无 CI run: 纯取证+决策记录，无业务代码/测试/构建变更，验收证据为本地可复现探针产物路径（CI-only 政策下无对应 workflow 门禁；探针本身可在任何窗口一键复跑）。

## 验收清单逐条核销

1. ✅ 逐库取证报告（三栏+焦点+值承载+snapshot 引用）: `research/pseudo-select-forensics.md`
2. ✅ 视觉样本库可复现: `research/pseudo-select-samples/` + 探针命令（README 复现方法节）
3. ✅ 探测策略设计（登记+手动召唤,不含注入）: `research/pseudo-select-detection-strategy.md`
4. ✅ ADR-0005 落盘 docs/adr/: 二选一明确裁决 + 4 条反证条件,未预写实现方案
5. ✅ 零业务代码改动: 变更清单全为 .scratch 与 docs/adr

## 偏离点

1. **atomcode 深度调研未发起（串行护栏让位）**: 本窗口三次探测均发现工作区有其他窗口的 atomcode.exe 在途（1→2 进程波动），按任务书串行硬护栏不并发发起。本票调研级决断改由一手探针证据承载（取证强度高于 cited 级调研）。遗留动作: 大脑可在护栏空闲后用存档标准提示词补一轮交叉验证，问题模板已备好（见下）。
2. 探针属研究工具（不 import 仓库源码、不产构建产物），按 WORKFLOW §2.6 本地 node 执行;未触碰 CI-only 政策约束的项目构建/测试边界。aria snapshot 与 facts 为研究证据产物,非构建产物。
3. MUI 样本锁 v5.16.7 UMD（v6+ 停发 UMD 实测 404）;v6/v7 结构未覆盖,已在样本库 README 与 ADR 后果节登记。

## 未完成/未验证项

- Radix 隐藏 native select 兜底是否需 form 上下文（candidate,本样本未包 form 未复现）。
- MUI v6/v7 DOM 结构稳定性（candidate,无 UMD 可载）。
- 探测策略的 precision 实测: 归 18 票语料/fixture 体系（本票只设计不实现）。
- atomcode 交叉验证轮: 因串行护栏让位未跑（见偏离点 1）。

## 给大脑的风险提示

1. ADR-0005 已裁决「实现」并解除 ADR-0004 缓议;18 票开工前请确认大脑侧对本裁决无异议（尤其「登记+手动召唤先行、自动注入二次裁决」的范围切分）。
2. 18 票实现时注意三个实测陷阱: 触发器 input 零尺寸不可点（antd/EP,点击要走可视包装层）、EP closed 态 aria-expanded 是空串、react-select 无 aria-selected（选中判定靠隐藏 input/class）。
3. 事件监听路线（监听第三方 change/input 驱动填充/验证）被一手证据否定,18 票不要走该路线。
4. 待补: atomcode 交叉验证轮（问题模板: 复制 research/atomcode-mental-model-v2.md 标准提示词,背景不变,四问改为「(1) 五库 combobox/listbox DOM+ARIA 结构与工业级识别方案 (2) 密码管理器/自动化框架对伪 select 的识别轮子盘点 (3) 通用覆盖/误报控制/可维护性三维度下登记级信号链缺口 (4) 登记+手动召唤裁决的风险与反证」）。
