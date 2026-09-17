# 形态语料（Form Corpus）— 三层架构

> Cycle-6 票 06 | 覆盖 **A-030** | 生成 2026-09-16
> 上游：`spec.md` S-05 · `.scratch/cycle6-grill/decision-ledger.md`（D-008 / D-009 / D-014）· `decision-ledger.md`（A-030）
> 下游：票 07（真实站点层全阶梯 + 发布门）· 票 08（阶段 B：失效驱动修复）

---

## 0 定位与命名

**形态语料** = 把「指定网页」落成可维护的自有语料，让「工具是否在指定页面上生效」可被 CI 证明。

**命名纪律（D-009）**：「形态语料」与既有**校准语料**在语义轴上**正交**，不得混用：

| | 形态语料（本目录） | 校准语料（`tests/corpus/manifest.json`） |
|---|---|---|
| 管什么 | **表单形态**（真实页冻结快照 → 自有断言面） | **阈值标定**（mock DOM 正/负例，precision/recall 基线） |
| 载体 | 镜像页 + 结构骨架 + 库外原始快照 | 声明式用例（`el`/`labels`/`ctx`） |
| 断言层 | 真 Chromium + 出厂产物（L0–L4） | mock DOM 引擎 harness |
| 改动纪律 | append-only；**绝不为修绿而盲目更新快照** | append-only（`appendOnlyRule`） |

---

## 1 三层架构（D-008）

| 层 | 入库 | 职责 | 位置 |
|---|---|---|---|
| ① **镜像页** | ✅ 入 git | **测试主力**：去品牌 / 去追踪 / 内容替换，断言确定性最高 | `mirrors/*.html` |
| ② **结构骨架** | ✅ 入 git | **长期结构断言基线**：内容无关的归一化结构树，供确定性结构 diff | `skeletons/*.json` |
| ③ **原始快照** | ❌ **库外** | 保真档案（raw HTML + 渲染后 DOM + 截图）；库内只留 **SHA-256 指纹与元数据** | 仓库外 archive（见 §4） |

**为什么原始快照不入库**：含品牌内容与版权暴露（ADR-0006「冻结基准不入库」）；截图 / 二进制不入 git 历史（D-008 负向需求）。

**不引入对象存储 / S3**：复用既有**仓库外 archive 模式**（`D:\Aworker\mozilla\choose-your-country-evidence-archive\`，票 41 建立）。

**单一 `tests/` 根**（ADR-0006 条款 5）：本目录位于 `tests/corpus/forms/`，**不新增顶层 `corpus/`**。

---

## 2 目录结构

```
tests/corpus/forms/
├── README.md           # 本文件：约定 + 合规 + 退化回路
├── sources.json        # 候选指定页输入清单（hand-maintained）
├── manifest.json       # 指纹与元数据清单（generated：06-manifest.mjs）
├── mirrors/            # ① 镜像页（入 git，测试主力）
│   ├── iti-v29.html                    # iti v29（.iti + 内部搜索框，A-031 误报面）
│   ├── rpn-input.html                  # 原生 select，value 恰为 ISO2
│   ├── codepen-iti-v17.html            # 外层壳 + 嵌套预览帧
│   ├── codepen-iti-v17-child.html      #   └ 子帧（iti v17 系类名/属性名）
│   ├── mui-autocomplete.html           # 伪下拉（可编辑型：非 readonly INPUT 触发器）
│   ├── element-plus-select.html        # 伪下拉（select-only 型：readonly 触发器）
│   ├── antd-select.html                # 伪下拉（select-only 型，另一类名族）
│   ├── chosen-select.html              # 视觉替换型隐藏 select（display:none，A-032 子形态 B）
│   └── heroku-signup.html              # 真实注册页原生 select（value = 国名）
└── skeletons/          # ② 结构骨架（入 git）
    └── <id>.json
```

---

## 3 合规口径（D-008 / issue 验收项 6）

| 条款 | 落地方式 |
|---|---|
| **只采公开页** | 候选均为公开可访问页面；不登录、不提交表单、不抓取 PII（`06-capture-forms.mjs` 只做 GET + 渲染） |
| **剥离品牌内容** | 镜像页去产品名 / logo / 文案（如 iti 的 "International Telephone Input" 一律不出现） |
| **去追踪** | 镜像页零外链 / 零分析脚本，hermetic（E2E 零外部网络依赖） |
| **内容替换** | 页面正文替换为自拟文案；仅保留**公开表单形态**（DOM 结构 + 类名/属性 + 交互行为） |
| **标 `source_url` + `captured_at`** | `manifest.json` 每条 entry 均有；镜像页头注释同步标注 |
| **不含真实 PII** | 镜像页无任何真实用户数据；原始快照只采公开页首屏（未登录态） |

---

## 4 退化回路（issue 验收项 5；D-008）

站点改版必须被**探测**，而不是被用户发现。四步闭环：

```
① 定期重捕            ② 派生结构骨架           ③ 确定性结构 diff        ④ 回放自检
06-capture-forms.mjs → 06-skeleton.mjs   →   06-structural-diff.mjs →  npm run e2e
（→ 仓库外 archive）    （内容无关结构树）        （分级 bump 判定）        （owned 镜像页 L0–L4）
```

**分级判定**（`06-structural-diff.mjs`，**非像素 diff**）：

| tier | 触发 | bump 建议 |
|---|---|---|
| `none` | 无结构差异（内容替换不触发） | 不 bump |
| `patch` | 仅文本**形状类别**微变（如 `+86` ↔ `CN`） | patch |
| `minor` | 属性 / 重复计数变化（选项增减、role 增补） | minor |
| `major` | 标签 / class / 子节点数变化（结构改版） | major |

**纪律（硬约束）**：**绝不为修绿而盲目更新快照**。`tier ≠ none` 时，**先归因**——① 站点真实改版；② 抓取环境差异（UA / 地区 / A-B 实验）；③ 归一化缺陷——归因结论落 `research/window-reports/` 后才决定 bump 与镜像页更新。把「更新基线」当作消除红灯的手段，等于把退化探测能力本身退化掉。

**命令**：

```bash
# ① 重捕（显式动作；不进 CI pull_request 门）
node tests/scripts/06-capture-forms.mjs                 # 全部候选
node tests/scripts/06-capture-forms.mjs --id iti-v29    # 单个
# ② 派生骨架
node tests/scripts/06-skeleton.mjs --id iti-v29 --from archive
# ③ 结构 diff（退出码 1 = minor/major，供 cron / 人工升级）
node tests/scripts/06-structural-diff.mjs --id iti-v29
# ④ 回放自检（owned 镜像页 L0–L4）
npm run e2e -- tests/corpus-forms.spec.ts
# 清单重生成
node tests/scripts/06-manifest.mjs
# CI 结构门（离线；指纹 / 合规 / 目录纪律）
node tests/scripts/verify-ticket-06.mjs
```

---

## 5 结构骨架格式（`skeletons/<id>.json`）

```jsonc
{
  "id": "iti-v29",
  "skeleton_version": 1,
  "source": "archive",                 // archive（真实页基线）| mirror（离线自检）
  "source_url": "https://intl-tel-input.com/",
  "root_selector": ".iti",
  "node_count": 36,
  "sha256": "…",                       // 归一化树的规范序列化哈希（自校验）
  "tree": { "tag": "div", "class": ["iti", …], "attrs": {…}, "text": "+##", "children": […] }
}
```

**归一化规则**（`06-skeleton.mjs`，唯一定义处）：

- 保留：`tag` · `class`（排序 + 去 CSS-in-JS 哈希类）· `role`/`type`/`name`/`aria-*`/`data-*`/`placeholder`/`required`/`readonly` 等结构属性；
- 丢弃：`id`（易变）· `style`/`srcdoc`/`src`/`value`/`href`（内容）· `aria-expanded`/`aria-selected`（状态位）；
- `aria-controls`/`aria-owns`/`aria-labelledby`/`aria-describedby` → 只留存在性 `"ref"`（值含易变序号）；
- 文本 → **形状令牌**（`#` 数字 / `a` 字母 / `+` 加号 …，≤40 字符）：内容替换与文案改动**不触发** diff，而 `+86` ↔ `CN` 这类**值域形态变化会触发**；
- **重复兄弟折叠**：≥3 个同签名兄弟收敛为「1 代表 + `repeat: N`」——选项列表由 N 行噪声变为 1 行结构语义；列表条数变化仍触发 diff，单项文案替换不触发。

---

## 6 与既有约定的关系

- **ADR-0006 条款 5**：单一 `tests/` 根；本目录不新增顶层 `corpus/`（条款 5 不重开）。
- **ADR-0008 第二层**：真实站点层仍 advisory、不进 `pull_request`（不重开）；本目录的**镜像页是 owned 可控页**，跑 L0–L4 并进 PR 门（票 01 `tests/ACCEPTANCE-SURFACE.md` §4.2）。
- **WORKFLOW §4.5 升塔纪律**：真实站点暴露的、塔身未覆盖的形态，先沉淀为 fixture / 镜像页再修脚本。
- **CONTEXT.md**：术语「形态语料」「结构骨架」「镜像页」以 `CONTEXT.md` 为准（票 04 入库）。
