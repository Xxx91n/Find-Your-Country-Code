# Cycle-5 决策摘要 — 送达、可见、可信（2026-09-14）

> 沉淀自 `.scratch/architecture-recovery/decision-ledger.md` 台账（A-011…A-025 = 15/15 implemented）。

> 上游：`research/cycle5-investigation.md`（架构大脑调查）+ `cycle4-closure/03-backlog-and-merge-state.md`（B-1…B-10）。

> 本轮 10 票（issues/36–45）全部复核通过；账本随 `.scratch` 一并归档。

## 一、送达（A-011）

- **决策**：GF 分发链采用「**拉取模型**」——GF 侧开启 Sync from external URL 指向 GitHub Release 固定链；CI 侧只新增**版本一致性闸门**（tag = package.json = 产物 `@version`），**不设计任何 CI→GF 的 POST**。

- **依据**：GF 无写入 API（官方文档 + greasyfork#1288/#1499）；`dist/` 不入 main，故 raw 路径不可用；`/releases/latest/download/<asset>` 是 GitHub 官方固定链。

- **落地**：`38-version-consistency.mjs`（15 断言，反向用例 exit 1）+ `38-gf-alignment-check.mjs`（只读 GET，advisory，`--strict` 可升红）+ `docs/greasyfork-sync-setup.md`；README 双语改 `releases/latest`；版本真源收敛到 `package.json`。

- **结果**：GF 侧已由维护者手动开通；送达链闭合。

## 二、可见（A-012 / A-013）

- **决策**：提供**与字段分数无关的全局入口**（GM 菜单「打开面板」直达 `UI.open(null,null,null)`），破除「低置信页面无图标→无面板→无召唤」的自锁；lowkey 图标移入**字段右缘盒内**（`top:50%;right:6px`）以规避祖先 `overflow` 裁剪，同时降广告特征。

- **R1 返工（关键决策）**：CI 出现 `pseudo-select.spec.ts:46` 点击被面板拦截。根因为**面板横向锚定方式与盒内锚点不匹配**（锚点左缘左移 ≈18px，余量降至 ≈11px，属**字体度量敏感**量：本地 Windows 绿 / Linux CI 红）。修法：`_pos()` 中盒内锚点改锚到**字段右缘 + 8px**（余量恢复 ≈47px），盒外 auto 路径零改动。

- **教训**：几何余量不得设计在字体度量敏感区；CI-only 失败必须沉淀为本地可复现断言（已新增 `tests/fixtures/lowkey-occlusion.html` + `entry-access.spec.ts` 用例）。

## 三、可信（A-014 / A-015 / A-016 / A-020）

- **A-014 门禁完整性**：四个门（09/13/15/18）统一改用现成 TS 安全装载器（`stripTypeScriptTypes`）；workflow node 升 22；语料规模断言改动态（`>= 41`）。→ 恢复 **10/10 票级门可执行**。

- **A-015 门禁碎片**：票级私有 E2E 作业并回统一 `e2e.yml`；`verify-16.yml` 整文件删除（其唯一职责即 e2e 复刻）。

- **A-016 真实站点层**：`enabled` 由 0 → **2**（CodePen Pen 渲染域 `srcdoc` + 编辑器页 `cdpn.io`）；harness 增嵌套帧求值 + `pageerror` 断言 + 有头 xvfb（无 `DISPLAY` 回退 headless）；**反检测红线：不采 UA 伪造 / stealth / 反自动化开关**（有头真实 Chrome 天然满足）。保持 advisory，不进 `pull_request`。

- **A-020 元数据债**：`.npmrc` 删除、lockfile 根 version 同步、`--legacy-peer-deps` 全 workflow 清零（由票 43 承载）。

## 四、静默失败与卫生（A-017 / A-018 / A-019 / A-021 / A-022 / A-023 / A-024 / A-025）

- **A-017 帧治理**：`isEmbeddedFrame` 改**双相递归**（浏览上下文树跨域枚举 + open shadowRoot DOM 穿透），校验失败降级为**可见 toast**（不再静默 return）；票 24 的 origin/source 双校验语义不放松。

- **A-018 过程证据出仓**：`.scratch` 受跟踪文件 **397 → 210**（仓库外归档 199 文件 + SHA-256 清单，逐件 199/199 匹配）；**WORKFLOW §4.5 升塔纪律**（先沉淀 fixture 再修脚本；真实站点用例只升不降）。

- **A-019 语言切换**：去 `LANG` 死导出，改为**可切换语言**（优先级 显式选择 > 浏览器语言 > zh），经 `UI_PREFS_KEY` 持久化且与收藏/规则键解耦。

- **A-021 依赖根修**：React 19 拆到**独立安装根**（`workspaces: tests/vendor/react19`），消除 `react@18`/`react-dom19` 硬 ERESOLVE；裸 `npm ci` 干净可复现。

- **A-022 同证据档位裁决**：用户裁决 **方案 C「显式建模差异」**（不统一）——承认 L3 按证据量单调计分为有意设计；ADR-0009 留档 + `verify-02` G10 负控锁定。**零引擎改动、零档位变更**（禁借补分越线）。

- **A-023 contenteditable 语料先行**：append 3 例（1 正 2 负），corpus 48 → **51**，precision/recall 不回退；**不改检测代码**（无地基不立检测改动）。

- **A-024 远端清理**：实物核验后**清理集为 ∅**——远端 9 支 `cch/*` 全未合并（0/9 MERGED），台账登记的 Cycle-4 「11 支」经逐名实测 **11/11 已 ABSENT**（登记前提 stale）。**零删除**——若照字面盲删将不可逆摧毁在途交付。

- **A-025 证据边界条款化**：**WORKFLOW §8** 新增 §8.1 CI-only 政策（5 条）+ §8.2 本地硬验收（审计型）边界（5 条）；总原则「行为面验收证据只认 CI run/artifact」**不可放松**。

## 五、本轮沉淀的新 ADR

- **ADR-0009 — 证据量档位边界**（`docs/adr/0009-evidence-quantity-tier-boundary.md`）：同证据类型下，按证据量单调计分导致的档位差异是**有意设计**，不视为缺陷；如需改变需独立变更 + 语料标定，禁借补分越线。

## 六、遗留（见 backlog，待用户决定是否立票）

详见本轮归档 handoff 的 backlog 节。
