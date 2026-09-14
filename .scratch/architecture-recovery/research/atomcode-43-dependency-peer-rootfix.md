# atomcode 深度调研 — 票 43（A-021）npm 单项目内双 React 大版本 peer 冲突根修

> 来源：atomcode CLI 无头运行（`atomcode -p <prompt> -C <repo> --output-format text`），串行护栏：同一时刻仅 1 个在途。
> 调研日期：2026-09-14（Asia/Singapore）。下方“执行叙述”为 atomcode 过程输出（未经删改，保留审计痕迹）；结论从 `# npm 10.x 单项目双 React 大版本...` 一级标题起。
> 对本票的作用：独立于本窗口 12 组对照实验，给出同向结论（单安装根结构性不可满足；根修唯一成熟路线 = 拆树）。

---
我将按照研究专精模式执行这次调研：先检索知识库，再用三引擎多角度搜索，最后定点核验原文。知识库命中本仓库自身的现场（react18 + react19 别名、CI 用 --legacy-peer-deps 的登记债）。继续三引擎扩展搜索：workspaces 方案、peerDependenciesMeta、多 install root 先例。继续定点深挖：核验 npm 官方文档（overrides 语法、workspaces 布局）、关键 npm/cli issue（4557 workspaces 双 react、overrides 对根 peer 的限制），以及 Stack Overflow 实例。继续定点深挖：npm 官方 package-json 文档（overrides 语法、peerDependenciesMeta）、workspaces 文档，以及真实开源先例。官方 package-json 文档已抓到但 overrides 段被截断（已存 artifact）。现在并行：读回 artifact 的 overrides/peerDependenciesMeta 段、核验 react-dom@19 的 peerDependencies 原文、深挖 npm/cli#8688、找真实仓库先例与 npm 11 回归修复动态。核心官方语法已拿到（overrides 完整语法、EOVERRIDE 限制、peerDependenciesMeta、workspaces）。还差三件事要核验：① react-dom@19.2.8 的 peerDependencies 原文（刚才被截断）；② overrides 是否对 peer 边生效的官方/issue 证据；③ 真实开源仓库用 `npm:react-dom@19` 别名的先例 + SO 74149752 原文。材料已基本齐备。补最后一批原文核验：npm workspaces 官方文档（布局语义）、npm/cli#5914 全文（嵌套 overrides 不受支持的官方定论）、真实双 React 先例（single-spa 博客）。材料已基本齐备。最后补两块：本地仓库中 react19/react-dom19 的实际用法（决定推荐方案能否保住运行时语义），以及两个关键行为（别名包 peer 按真名解析、npm ci 对 legacy 锁文件的行为）的交叉验证。网络检索已饱和（Exa/Tavily 后两查均网络失败，但配额已达成）。关键发现：本仓库自身已完成该根修（票 43），本地 lockfile 就是活证据。最后读取本地两个 package.json 以精确还原推荐方案。Sufficiency Gate: searches: 11（Exa 5 + Tavily 3 + AnySearch 3，末段两查询遇引擎网络故障已放弃重试）| angles: Official（docs.npmjs.com、registry）+ Criticism（npm/cli#8688/#5914/#4834 回归与限制）+ Currency（npm 11 overrides 回归修复 2025-11）+ Community（SO/Medium/博客，摘要级）| full reads: 7 篇原文（npm package-json、npm workspaces、npm/cli#4557、#5914、#8688、registry react-dom@19.2.8、tiberriver256 博客；SO 74149752 返回 403 未读）| gaps: 「别名不重定向 peer 边」无官方文档直接佐证（由实测+registry 数据推证）；pnpm/yarn 替代路线未深挖（超出 npm 范围）。

---

# npm 10.x 单项目双 React 大版本 peer 冲突：根修方案调研报告

## 1) 执行摘要（Tl;dr）

**结论（Confidence：高）**：npm 的树模型中 `node_modules/react` 是**每安装根唯一一个槽位**，而 react-dom@18 的 peer 要 `react@^18`、react-dom@19 的 peer 要 `react@^19`（registry 原文已核验：react-dom@19.2.8 声明 `"peerDependencies": {"react": "^19.2.8"}`）——两个互斥约束落在同一槽位上，**在任何单一安装根内都无解**。因此「保住 `node_modules/react19` + `node_modules/react-dom19` 精确路径」与「消除硬 ERESOLVE 且不用 `--legacy-peer-deps`/`--force`」在 npm 10 中**逻辑上不可兼得**；根修的唯一成熟路线是**把 React 19 拆到独立的依赖树**（npm workspaces vendor 包，单 lockfile；或子目录独立 package.json + lockfile 多安装根）。本仓库（choose-your-country）**票 43 已按 workspace 方案落地**，`tests/server.mjs:42-44` 注释明言「根项目的 react@18 与本 vendor 根的 react@19 分居两棵安装树，peerDependencies 各自自洽，因此安装面不再需要 --legacy-peer-deps」。

---

## 2) 关键事实核验（每条 ≥2 独立信源）

| # | 结论 | 信源 1 | 信源 2 |
|---|------|--------|--------|
| F1 | react-dom@19 的 peer 是 `react@^19.2.8`（按 react-dom 具体版本浮动） | registry.npmjs.org react-dom/19.2.8 原文（本次直接抓取） | 本仓库 package-lock.json `tests/vendor/react19/node_modules/react-dom` 节点 `"peerDependencies": {"react": "^19.2.8"}` |
| F2 | overrides **只作用于根 package.json**，且**不允许覆盖根项目直接依赖**（spec 不完全一致时抛 EOVERRIDE） | npm 官方文档 package-json#overrides（原文已读）：“You may not set an override for a package that you directly depend on unless both the dependency and the override itself share the exact same spec" | npm/cli#5914 官方回复原文引用同一段文档；npm/cli#4834（workspaces 下 overrides 亦不一致生效） |
| F3 | 裸 install 对「根直接依赖包的 peer 边冲突」报硬 ERESOLVE，overrides 救不了；对**传递依赖**的 peer 边冲突 overrides 可压制为 warning | 你的实测（现状 3） | npm/cli#8688 / #4834 的 ERESOLVE 现场输出；Medium/OneUptime 汇总文（摘要级） |
| F4 | workspaces 下子包可各自声明不同 React 版本、分树安装，peer 各自自洽；npm 官方文档确认 `npm ci` 等命令尊重 workspace 配置 | npm 官方 workspaces 文档（原文已读）：“other installing commands such as uninstall, ci, etc will also respect the provided workspace configuration" | 本仓库 lockfile：根 `workspaces: ["tests/vendor/react19"]`，React 19 三件套嵌套在 `tests/vendor/react19/node_modules/` 下，与根 `node_modules/react@18` 分离 |
| F5 | npm 11.2–11.6.3 存在 overrides 回归（误判冲突 → ERESOLVE/崩溃），11.6.4 修复；**不使用 overrides 的方案不受影响** | npm/cli#8688（2025-10-21） | npm/cli PR #8689（2025-11-18 merged，fixes #8688）+ PR #8760/#8762（release 11.6.4，fixes #8757） |

---

## 3) (a) 成熟方案清单 + (b) node_modules 路径布局影响 —— 对比矩阵

| 方案 | 机制 | ERESOLVE 是否根除 | 能否保住 `node_modules/react19` + `node_modules/react-dom19` 精确路径 | lockfile | 备注/来源 |
|------|------|------|------|------|------|
| **① npm workspaces（vendor 工作区）** ✅ 推荐 | React 19 + react-dom@19 作为独立 workspace 包的直接依赖，与根树分离；两棵树 peer 各自自洽 | ✅ 根除（无需任何 flag） | ❌ 不保住。实际布局：`tests/vendor/react19/node_modules/react{,-dom}` + 根 `node_modules/@cch/react19-vendor` 软链 | **单根 lockfile**，`npm ci` 原生支持 | npm workspaces 官方文档；本仓库 package.json/lockfile 实证 |
| **② 多安装根（子目录独立 package.json + 独立 lockfile）** ✅ 可行 | 子目录自己 `npm install`，与根完全隔离 | ✅ 根除 | ❌ 不保住。布局：`tests/vendor/react19/node_modules/react{,-dom}`，根 node_modules 无 react19 | **两个 lockfile**（需各自提交、各自 `npm ci`） | npm 官方 Local Paths 文档明确 file: 包的依赖不在根安装时装（需进子目录安装）；本仓库票 43 前身即「独立安装根」 |
| **③ npm: 别名（`react19: npm:react@^19`）** ⚠️ 无法独立成修 | 别名安装到 `node_modules/react19`，路径本身精确 | ❌ 不根除——react-dom19 的 peer 边按包名 `react` 解析，命中根 `react@18`，仍硬 ERESOLVE（见 F3 + 下文推证） | ✅ 路径精确，但装不上 | 单 | npm 官方文档别名语法 `npm:@scope/pkg@version`；你的实测 2/3 |
| **④ npm overrides** ❌ 不适用 | 强制改写树中包版本 | ❌ 对根直接依赖的 peer 边不生效（EOVERRIDE/硬错误，见 F2/F3） | — | 单 | 官方文档语法：支持**版本限定 key**（`"bar@2.0.0": {...}`）、嵌套任意深度、`.` 自指、`$ref` 引用直接依赖；但全部救不了本场景的互斥 peer |
| **⑤ peerDependenciesMeta** ❌ 不适用 | 把 peer 标记为 optional（npm 不自动装、缺了不报错） | ❌ 消费方**无法**修改上游 react-dom 的 peer 声明；该字段只对**自己拥有**的包有效 | — | 单 | npm 官方 package-json#peerDependenciesMeta 原文 |
| **⑥ file: 包装包把 react-dom19 变传递依赖** ❌ 反而破坏路径 | 传递化后 overrides 可压制 peer warning | ⚠️ 仅降级为 warning | ❌ npm 会把 react-dom19 **嵌套进包装包的 node_modules**（你的实测），根路径破坏 | 单 | 你的实测 3；与 npm/cli#5914 场景同理 |
| **⑦ `--legacy-peer-deps` / `--force`** ❌ 排除 | 跳过 peer 校验 | 假性消除（树仍坏，`npm ls` 报 invalid） | ✅ | 单 | 官方 ERESOLVE 报错文本明言二者是「接受错误树」的逃生门；仓库 ADR 0006 已定为待清偿债务 |
| **⑧ 换包管理器（pnpm/yarn）** ecosystem 备注 | pnpm 的 `.pnpm` 布局天然多版本共存 + `pnpm.peerDependencyRules` | ✅ | 路径模型完全不同（symlink 布局） | pnpm-lock | **本次未抓原文核验**，仅搜索摘要级信号；如考虑跨工具链迁移需另行调研 |

**为什么别名 + overrides 的所有组合都救不了（推证，Confidence：高）**：单一安装根内，`react-dom@18`（根直接依赖）的 peer 边要求槽位 `node_modules/react` 满足 `^18`；`react-dom19`（别名本质仍是 react-dom@19）的 peer 边按**包名 `react`** 查找同一槽位，要求 `^19`。npm 解析器要求一个版本同时满足两条 → 无交集 → 必然 ERESOLVE。别名 `react19` 不参与 peer 匹配（peer 边引用字面量包名），overrides 又碰不到根直接依赖的 peer 边。**结论：这不是配置问题，是 npm 单树单槽位模型的结构性不可满足**。escape hatch 只有 legacy/force（跳过校验）或拆树（让两条 peer 边不再共槽）。

---

## 4) (c) 推荐方案：npm workspaces vendor 根（本仓库已实证的形态）

### 4.1 目录结构

```
choose-your-country/
├── package.json                  # 根：react@18 一族 + workspaces 声明
├── package-lock.json             # 单一 lockfile（覆盖根树 + workspace 树）
├── tests/
│   ├── server.mjs                # 从 tests/vendor/react19/node_modules 读 react19 生产构建转译 ESM
│   └── vendor/
│       └── react19/              # ← React 19 独立安装树（workspace）
│           └── package.json      # 自己的 dependencies，与根无 peer 交集
└── node_modules/
    ├── react@18 …                # 树 1：react 18 全家，peer 自洽
    └── @cch/react19-vendor -> ../tests/vendor/react19   # npm 自动软链
```

安装后 React 19 实际落位（lockfile 实证）：

```
tests/vendor/react19/node_modules/react          19.2.8
tests/vendor/react19/node_modules/react-dom      19.2.8   (peer react@^19.2.8 ✓ 就地满足)
tests/vendor/react19/node_modules/scheduler      0.27.0
```

### 4.2 根 package.json（现状即正确形态，已核验）

```json
{
  "name": "find-your-country-code",
  "version": "1.5.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "tests/vendor/react19"
  ],
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "e2e": "npm run build && playwright test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "intl-tel-input": "^18.2.1",
    "playwright": "^1.62.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.7",
    "vite": "^6.0",
    "vite-plugin-monkey": "^5.0",
    "vue": "^3.5.42"
  }
}
```

### 4.3 workspace 包 package.json（`tests/vendor/react19/package.json`）

```json
{
  "name": "@cch/react19-vendor",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}
```

要点：workspace 包内的 react 与 react-dom **同树同名字**（`react`/`react-dom` 正常命名，不用别名），peer 边在子树内就地满足——这正是它不触发 ERESOLVE 的原因（npm/cli#4557 的反面教材是把不同版本 react 放进**互相共享 peer 的同层 workspace** 导致 hoist 混乱；此处 vendor 根是叶子、无下游消费其 peer，安全）。

### 4.4 CI 安装命令

```bash
npm ci        # 单命令；workspaces 原生尊重，无需任何 flag、无需逐 workspace 安装
```

官方依据：workspaces 文档明言 `npm ci` 等「other installing commands … will also respect the provided workspace configuration」。仓库 ADR 0006 + lockfile 实证该口径已去掉 `--legacy-peer-deps`。

### 4.5 消费方式的变化（方案①的唯一代价）

`node_modules/react19` 路径消失，React 19 改为从 `tests/vendor/react19/node_modules/` 直读。本仓库的落地方式（`tests/server.mjs:45-104`）：测试服务器现场把 react/react-dom 的 npm 生产构建（cjs）转译为 ESM，经 `/gen/react19/*` URL 供给 fixture 页面，hermetic 无 CDN。若你的场景必须在**根 node_modules** 下有 `react19` 物理目录（例如某工具硬编码该路径），则退回方案②（子目录多安装根）同样不满足，**该需求在 npm 内需重新评估**——见 §6 缺口。

### 4.6 npm 版本提示（Currency）

- npm 10.9.x：上述方案无 overrides 依赖，不受 11.x 回归影响。
- 若未来升 npm 11：**避开 11.2–11.6.3**（overrides 误判回归 #8688，11.6.3 还有 #8757 崩溃）；≥11.6.4（PR #8760 修复）可用。本方案不使用 overrides，但 `npm ls` 等 ariborist 行为在同区间也曾受波及，建议 CI 钉死 npm 版本。

---

## 5) (d) 完整来源清单

| # | 标题 | URL | 角度 | 日期 | 贡献 |
|---|------|-----|------|------|------|
| 1 | npm Docs — package.json（overrides / peerDependencies / peerDependenciesMeta / Local Paths / workspaces 字段全节） | https://docs.npmjs.com/cli/v10/configuring-npm/package-json | Official | 页面标注 2025-04-23 末次编辑 | overrides 完整语法（版本限定 key、嵌套、`.`、`$ref`）、EOVERRIDE 限制原文、peerDependenciesMeta 语义、file: 包依赖不随根安装的注记 |
| 2 | npm Docs — workspaces | https://docs.npmjs.com/cli/v10/using-npm/workspaces | Official | 2024-02-01 | workspace 软链布局、`npm ci` 尊重 workspace 配置 |
| 3 | registry — react-dom@19.2.8 元数据 | https://registry.npmjs.org/react-dom/19.2.8 | Official（一手数据） | 包发布元数据 | `"peerDependencies":{"react":"^19.2.8"}` 原文，F1 定案 |
| 4 | npm/cli#4557 — workspace 与独立仓库行为不一致（双 react 版本 hoist 问题） | https://github.com/npm/cli/issues/4557 | Criticism | 2022-03-12 | workspaces 双 react 的坑位边界：同层 workspace 共享 peer 时会 hoist 混乱 |
| 5 | npm/cli#5914 — 依赖包内的 overrides 顶层不生效 | https://github.com/npm/cli/issues/5914 | Criticism | 2022-12-01 | 官方回复原文：嵌套 overrides 不支持，仅根 package.json 有效 |
| 6 | npm/cli#4834 — overrides + workspaces 不一致生效 | https://github.com/npm/cli/issues/4834 | Criticism | — | overrides 适用面限制的交叉印证（含 ERESOLVE 现场输出） |
| 7 | npm/cli#8688 — npm 11.2+ overrides 回归 | https://github.com/npm/cli/issues/8688 | Currency | 2025-10-21 | overrides 相关 ERESOLVE 回归起点 #8089 |
| 8 | npm/cli PR #8689 — override 冲突检测语义比较修复 | https://github.com/npm/cli/pull/8689 | Currency | merged 2025-11-18 | fixes #8688；npm 11.6.3 后可用性 |
| 9 | npm/cli#8757 + PR #8760/#8762 — 11.6.3 崩溃与 11.6.4 修复 | https://github.com/npm/cli/issues/8757 | Currency | 2025-11 | 「避开 11.2–11.6.3」建议依据 |
| 10 | 本仓库实证（票 43 落地） | `package.json`、`package-lock.json`（L74-77、L1884-1912）、`tests/server.mjs`（L42-51）、`docs/adr/0006-ci-hygiene-policy.md`（L38） | 本地一手证据 | — | workspace vendor 树布局、单 lockfile、移除 --legacy-peer-deps 的完整链路 |
| 11 | tiberriver256 — 单 SPA 下双 React 版本共存 | https://tiberriver256.github.io/web%20development/how-to-run-multiple-react-versions-using-single-spa | Community | — | 双 React 共存的业界先例：react/react-dom 双包体制是冲突根源，需按版本配对隔离 |
| 12 | Medium (Zach Shallbetter) / OneUptime / dev.to(nignijland) — peer 冲突处置综述 | https://medium.com/@zachshallbetter/resolving-react-19-dependency-conflicts-without-downgrading-ee0a808af2eb 等 | Community | 2025-09 / 2026-01 | 别名、overrides、dedupe 的社区通行认知（摘要级，仅作旁证） |

> 未读说明：SO 74149752（workspaces 双 react）返回 403，其摘要（"npm hoists one version, forcing both apps to use the same version"）与 #4557 一致但未计入已读。

---

## 6) 信息缺口（仍不知道什么）

1. **`node_modules/react19` 精确路径是否为硬约束**：若某下游工具硬编码根 node_modules 路径，npm 生态内无 flag-free 解法；需确认约束来源（本仓库现状已改为 `/gen/react19/*` URL 供给，路径约束看起来已解除）。
2. **别名 peer 按真名解析**：peer 边按包名 `react` 查找、别名 `react19` 不参与匹配——由实测（ERESOLVE 现象）+ lockfile 结构推证，未找到官方文档一句话明文；如需定案可查 arborist `place-dep.js` peer 匹配源码。
3. **pnpm/yarn 替代路线**仅搜索摘要级信号，未抓官方文档；如接受换工具链可另开一轮专项调研。
4. Exa/Tavily 在调研末段出现网络故障（web_search 引擎报 unreachable、Tavily TLS 断连），最后两个补强查询未完成；不影响主结论（F1–F5 均已双源闭环）。

