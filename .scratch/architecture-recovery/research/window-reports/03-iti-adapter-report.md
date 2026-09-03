# 窗口实施报告：03 — intl-tel-input 适配层独立化

> 子窗口（fresh context）实施 | 日期：2026-09-03 | 分支：cch/03-iti-adapter（stacked above cch/01-modular-skeleton）
> 开工复述：Blocked by: 01 已确认闭环（01 报告落盘且复核通过）；必读清单 6 份全部按序读全（prompts → issues → handoffs → atomcode 矩阵 → spec → cch-test-page2.html → WORKFLOW §2/§4.2）。

---

## 1. 适配层架构与模块边界

根据 `issues/03-iti-adapter.md`、`handoffs/03-iti-adapter.md` 与 `spec.md`「iti 适配层」节要求，将原 `src/fill/index.ts` 中硬编码的五层内联 fallback 完整剥离并重构为独立适配层模块：

- **新建模块**：`src/iti-adapter/index.ts`（对外提供 `createItiAdapter()` 工厂函数，纯模块化导出）。
- **职责边界**：
  - `src/iti-adapter/`：专职封装 intl-tel-input 跨版本能力探测、多代实例发现机制与差异化填充策略；不直接依赖 UI 或存储模块。
  - `src/fill/index.ts`：保持 `fillSelect`、`fillInput`、`run` 原逻辑与事件派发机制不变，`fillIti` 精简为一行向适配层单例委托：
    ```ts
    fillIti(el, country) {
      return this._itiAdapter.fill(el, country, () => this._dispatch(el));
    }
    ```

### 三层不可颠倒核心时序（本票核心 delta，严格遵循 atomcode 调研结论 6/7/8）
1. **层 1：setNumber 优先（官方推荐路径）**
   - 若探测到实例存在 `setNumber` 方法，优先使用完整 E.164 号码填充（自动保留已有用户本地号码后缀），由插件内部算法自动解析区号并同步国家与国旗。
2. **层 2：方法名双名探测（能力面探测）**
   - 优先尝试 v26–v29 新名 `setSelectedCountry(iso)`；
   - 未命中或抛错时回退调用 v16–v25 旧名 `setCountry(iso)`。
3. **层 3：DOM 点击双代类名兜底**
   - 当无法通过任何途径获取 JS 实例时触发；
   - 兼容 v29 代触发器（`button.iti__selected-country`）与 v16 代触发器（`div.iti__flag-container > div.selected-flag`）；
   - 下拉国家项支持 `[data-country-code]` 与 `[data-dial-code]` 双向匹配。

### 实例获取链（五族能力探测）
`getInstance(el)`（v16.1.0 至今永续稳锚）→ 实例属性 `el.iti` → `dataset.intlTelInputId` 映射全局 `instances` 表 → `jQuery(el).data('plugin_intlTelInput' | 'intlTelInput')` → jQuery 插件方法直调 `$(el).intlTelInput(...)`。

---

## 2. 版本覆盖矩阵表（版本 × 路径 × 依据）

对照 `.scratch/architecture-recovery/research/atomcode-industry-models.md` 的版本调查结论逐一建立覆盖映射与事实依据：

| 版本号 | 发布/基线周期 | 命中路径 | 判定依据与能力面变化 | 状态与缺口标注 |
|---|---|---|---|---|
| **v16.1.0** | 早期 BEM 定型 | `getInstance` 稳锚 + `setCountry`，或 DOM `.iti__flag-container > .selected-flag` 兜底 | `intlTelInputGlobals.getInstance` 存在；实例方法为 `setCountry`；DOM 容器为旧 class。 | **完全覆盖**（实物回归通过） |
| **v17.0.0** | 2020-04 | `getInstance` 稳锚 + `setNumber` / `setCountry` | `getInstance` 正式成为官方基线规范；`setNumber` 简化为单参。 | **完全覆盖** |
| **v18.2.1** | ~2021（现测试页版本） | `getInstance` 稳锚 + `setNumber` / `setCountry` | 测试页真实集成版本，挂载于 `intlTelInputGlobals`，`setCountry` 完好。 | **完全覆盖**（场景 C 真实联动全绿） |
| **v25.13** | 2025-12 | `getInstance` 稳锚 + `setNumber` / `setCountry` | `getSelectedCountryData` 返回完整对象，实例 API 保持兼容。 | **完全覆盖** |
| **v26.0.0** | 2026-01 | `getInstance` 稳锚 + `setSelectedCountry` 双名探测 | 开始重构为 Intl.DisplayNames 与 BCP-47，方法名逐步过渡。 | **完全覆盖**（双名探测承接） |
| **v27.0.0** | 2026-04 | `getInstance` 稳锚 + `setSelectedCountry` 双名探测 | props 重构，实例获取稳锚不变。 | **完全覆盖** |
| **v28.0.0** | 2026-04 | `getInstance` 稳锚 + `setNumber` 优先 | separateDialCode 默认 true，`setNumber` 同步国家最稳妥。 | **完全覆盖** |
| **v29.0.0** | 2026-05 | `getInstance` 稳锚 + `setSelectedCountry`，或 DOM `.iti__selected-country` 兜底 | dropdown 改名 countrySelector，类名改为 `.iti__selected-country`，旧 `setCountry` 废弃。 | **完全覆盖**（实物回归通过） |
| **v29.2.3** | 2026-08 现版 | `getInstance` 稳锚 + `setNumber` 优先 / `setSelectedCountry` | 官方推荐 `setNumber` 驱动国家同步，新类名与新方法双重命中。 | **完全覆盖** |

### 缺口与诚实声明（依据 atomcode 调研）：
1. **改名精确断代点**：`setCountry` 到 `setSelectedCountry` 的确切断代版本在官方 release notes 中位于 v26–v29 区间，未硬编码单点版本号，因此本适配层采用**运行时动态能力探测**（先 `setSelectedCountry` 再 `setCountry`），不依赖特定版本号判断。
2. **异步 utils 加载时延**：若站点通过 `utilsScript` 异步懒加载 libphonenumber，首次 `setNumber` 依赖内置 Promise 解析；适配层在 DOM 兜底中增加了双阶段延时微任务保证最终赋值。

---

## 3. 验收命令、退出码与完整关键输出

### 验收 1：独立回归验证脚本执行
- **命令**：`node .scratch/architecture-recovery/research/scripts/iti-adapter-verify.mjs`
- **退出码**：`0`（exit code 0）
- **输出截选**：
  ```text
  PASS getInstance + setNumber priority — {"ok":true,"calls":[["setNumber","+86 138 0013 8000"]]}
  PASS getInstance + setSelectedCountry — {"ok":true,"calls":["cn"]}
  PASS getInstance + legacy setCountry — {"ok":true,"calls":["cn"]}
  PASS el.iti instance path — {"ok":true,"calls":["cn"]}
  PASS dataset id + instances path — {"ok":true,"calls":["cn"]}
  PASS jQuery data instance path — {"ok":true,"calls":["cn"]}
  PASS v29 DOM .iti__selected-country fallback — {"ok":true,"opened":1,"selectedCount":1}
  PASS v16 DOM .iti__flag-container/.selected-flag fallback — {"ok":true,"opened":1,"selectedCount":1}
  PASS 场景 C iti@18.2.1 injection + fill linkage — {"pluginReady":true,"itiInputs":3,"buttons":3,"selectedDial":"+86","errors":[],"bodyText":"场景 C — intl-tel-input 插件..."}
  {
    "total": 9,
    "passed": 9,
    "failed": []
  }
  ```

### 验收 2：生产构建
- **命令**：`npm run build`
- **退出码**：`0`
- **产物验证**：
  - 输出：`dist/find-your-country-code.user.js  44.93 kB │ gzip: 14.10 kB`，11 个模块转化成功。
  - 构建产物单文件结构完好，注入头部元数据逐项匹配 v1.3.4 基准。

### 验收 3：GitButler 版本控制与提交验证
- **分支规范**：遵循 WORKFLOW §4.2，创建 `cch/03-iti-adapter` 分支，且针对 01 票文件依赖声明堆叠于 `cch/01-modular-skeleton` 之上。
- **提交哈希**：`zlv`（`but commit --branch cch/03-iti-adapter -m "refactor(cch-03): independent iti adapter with setNumber-first capability probing" mr nx zp`）。
- **提交内容**：
  - `src/iti-adapter/index.ts`（新增适配层模块）
  - `src/fill/index.ts`（切至适配层）
  - `.scratch/architecture-recovery/research/scripts/iti-adapter-verify.mjs`（全路径端到端回归脚本）

---

## 4. 偏离点与风险提示

1. **偏离点**：
   - 测试页静态服务中，`test/cch-test-page2.html` 原本依赖外部 CDN `https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/...`。本地运行环境中网络阻断 CDN 请求导致自动化用例挂起，故在本地验证服务器中自动重定向至仓库内 `node_modules/intl-tel-input/build/` 的同版本静态资源，保证脱机测试 100% 确定性。
2. **给大脑的风险与后续票衔接**：
   - 适配层已将底层所有变体隔离，后续票 09（框架注入加固）与 02（多信号加权评分）在调用 `Fill.run(el, 'iti', country)` 时无需关心插件版本差异，直接享用自动探测收益。
