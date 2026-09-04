# 窗口实施报告：05 — 站点规则引擎

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/05-site-rules-engine
> 开工复述：Blocked by: 02 —— 已确认解除（`cch/02-scoring-engine` 分支含 4 commit + `research/window-reports/02-scoring-engine-report.md` 落盘）；必读清单（prompt → issue → handoff → atomcode-industry-models → spec → WORKFLOW → src/Find-Your-Country-Code.js Store 区块）已按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 `cch/05-site-rules-engine`，`but branch new --above cch/02-scoring-engine` 创建——src 变更依赖 02 票评分引擎与 01 票骨架，按 §4.2「确有依赖按堆叠」执行）。

## 1. 规则数据格式文档（票 07 UI 的接口契约 · 权威定义）

**存储位置**：GM 存储独立键 `cch_site_rules_v1`（与收藏键 `cch_v33` 解耦；写入源：`src/store/index.ts` `_writeRules`）。权威 schema 定义同步维护在 `src/store/index.ts` 文件头注释。

```jsonc
// GM_setValue('cch_site_rules_v1', JSON.stringify(doc))
{
  "version": 1,                      // 文档版本（非 1 的文档被防御性回退为空文档）
  "exempt": ["example.com"],         // ① 豁免域名列表：小写 hostname；点边界子域匹配
  "overrides": [                     // ② 元素级覆盖规则列表
    {
      "id": "r" + base36时间 + 随机段,  // 稳定主键（增改按 id 幂等）
      "host": "example.com",           // 规则绑定站点（_hostOf 归一：小写、去端口/路径/末点）
      "selector": "#phone-cc",         // CSS 选择器（文档级 querySelectorAll；el.matches 单元素命中）
      "action": { "tier": "auto" },    // tier ∈ 'auto' | 'lowkey' | 'none'
      "note": "panel-negative-feedback", // 来源备注（07 面板展示）；'panel-negative-feedback' = 负反馈记忆
      "createdAt": 1756900000000,      // epoch ms
      "updatedAt": 1756900000000       // epoch ms（每次更新刷新）
    }
  ],
  "global": null                     // ③ 预留：{ thresholds: { auto?, lowkey? } }；本期无 CRUD，读取回退 config.ts 全局阈值
}
```

**三类规则能力**（对标 [AM 核心结论5] 行业后门三源）：

| 能力 | 格式落点 | 行业对标 | 匹配时机 |
|---|---|---|---|
| 豁免域名 | `exempt[]` | 1Password `data-1p-ignore`（全站忽略） | **检测入口最前**：`Detect.scan()` 入口短路，不评分/不注入/不登记 |
| 强制选择器 | `overrides[].selector + action.tier` | Bitwarden linked custom field（强制锚定） | **评分之前**：`Detect._process()` 命中即按 `action.tier` 注入/移除 |
| 置信度分档覆盖 | `overrides[].action.tier`（页面级，selector='body' 即页面级；任意 auto/lowkey 覆盖规则生效） | KeePassXC Site Preferences | 评分之后重映射：页面档即「本页注入档位下限」 |

**匹配语义细则**：
- 域名匹配：`host === 规则键 || host.endsWith('.' + 规则键)`（点边界子域；`example.com` 覆盖 `www.example.com`；`notexample.com` / `example.com.evil.io` 不误命中）。
- tier 语义：`auto`/`lowkey` 参与页面级覆盖（双向重映射，`none` 档也可被提升——用户显式规则自担误报风险）；`none` 的元素级含义 = 不注入不登记召唤；**域名豁免（完全跳过）仅由 `exempt[]` 承担**，`none` 覆盖规则不等于豁免。
- 防御性规范化（`_normRulesDoc`）：非对象文档 / version≠1 → 空文档；exempt 过滤非字符串/空；overrides 过滤缺 id/host/空 selector/非法 tier 的规则并截断至 `RULES_MAX_OVERRIDES=500`；GM 数据被外部写坏不崩。

## 2. 增删改查函数边界（07 票 UI 只允许依赖此 API 面）

**Store 层（持久化原语 + 同步，`src/store/index.ts`）**：

| 函数 | 边界 |
|---|---|
| `getSiteRules()` | 查：全量**深拷贝**（外部改副本不渗入存储）；首次读懒加载 + 规范化 |
| `isExempt(urlOrHost)` | 查：豁免判定（接受 URL 字符串 / 裸域名 / `location` 对象） |
| `setExempt(urlOrHost, on)` | 增/改：豁免开关（幂等）；归一化失败返回 false |
| `upsertOverride(rule)` | 增/改：无 id 新建（生成 id/timestamps），有 id 更新；非法输入（空 host/空 selector/非法 tier）返回 null 不落盘 |
| `removeOverride(id)` | 删：存在返回 true，否则 false |
| `_writeRules(r)`（内部） | 写路径收口：缓存 + `GM_setValue` + BroadcastChannel 广播 + `_notify` 订阅者 |
| 同步通道 | BroadcastChannel `cch-rules-sync-v1`（本机跨标签页）+ `GM_addValueChangeListener(RULES_KEY)`（TM 远端，remote=true 才应用）；双通道均过 `_normRulesDoc` 防御 |

**Rules 引擎层（语义 + 检测接线，`src/rules/index.ts`，`createRules(Store)`）**：

| 函数 | 边界 |
|---|---|
| `listRules()` / `isExempt()` / `isPageExcluded()` | 查（转发 Store；`isPageExcluded` 基于 `location.href`，node 环境 false） |
| `pageOverrides()` | 查：当前页 host 命中的覆盖规则副本列表 |
| `forcedTier(el)` | 查：评分前强制命中；**自身 UI（#cch-root / .cch-wrapper / cch-btn / cch-search / cch-si）永不命中**（`_own` 前置）；非法/未命中/异常选择器一律 null（`_safeMatches` try/catch 静默） |
| `pageTierOverride()` | 查：页面级覆盖档（文档序第一个 auto/lowkey 覆盖规则；none 规则不参与） |
| `setExempt(urlOrHost, on)` / `upsertOverride(rule)` / `removeOverride(id)` | 写（转发 Store） |
| `rememberNone(el)` | 便捷写（spec US9 负反馈）：按 id/name/tag 三态生成 selector，tier='none'，note='panel-negative-feedback'；自身 UI 元素返回 null 不落盘 |
| `subscribe(fn)` | 订阅规则变更（07 面板刷新用） |

## 3. 检测入口接线（匹配发生在检测入口之前）

- `src/main.ts`：`Store.init()` 前置 → `createRules(Store)` → `createDetect(UI, Rules)`（原 `void Rules` 死代码移除）。
- `src/detect/index.ts`：
  - `scan()` 入口：`Rules.isPageExcluded()` → 直接 return（**豁免=完全跳过**，连 `_deepRoots`/shadow observer 都不进；仅 `_pruneLow` 清理登记）。
  - `_process()`：`_own` 拦截后、评分前查 `Rules.forcedTier(el)` —— 命中走规则档注入/移除（指纹拼 `|rule:<tier>`，规则变更自动重评；`none` = 撤图标且不登记）；`Rules.pageTierOverride()` —— `none` 页面覆盖等同引擎 none（撤图标不登记），auto/lowkey 在 `scoreElement` 后重映射。
  - `Rules` 缺省（02 票单参调用形态）时全部路径跳过 = 无规则，向后兼容。
- `src/config.ts`：05 票常量（RULES_KEY/RULES_BROADCAST/RULE_TIERS/RULE_FORCE_TIER/RULES_MAX_OVERRIDES）逐条注明 [AM]/[SP] 出处。
- `src/i18n.ts`：新增 `ruleNoneRemembered` / `ruleExemptAdded` / `ruleExemptRemoved` 中英三键（07 票 UI 直接消费）。
- 04 票并行改动兼容：基于 04 版 detect（`_collect(roots,sel)`、`Detect.watch()`、指纹重评）接线，未覆盖 04 产物。

## 4. 验收命令与退出码（issue 内 4 条验收项）

1. **规则持久化（GM 存储），刷新与跨标签页生效** ✅ — 单元门 S1：`GM_setValue` 落独立键、新 Store 实例重读（刷新）、`GM_addValueChangeListener` remote 触发 + BroadcastChannel 跨实例广播（跨标签页）全部断言。
   证据：`node .scratch/architecture-recovery/research/scripts/verify-ticket-05.mjs` → **exit 0，79/79 pass**（`verification/05-unit-gate.txt`；TDD 红基线 54/75 留档 `verification/05-red-baseline.txt`）。
2. **豁免域名完全跳过检测；强制选择器按高置信注入；分档覆盖生效** ✅ — 单元门 S2（引擎级）+ S3（检测接线级）：豁免 scan 入口短路、强制选择器命中 `#plain-num`（引擎 none 元素）按 auto 注入、页面级 lowkey 把引擎 auto 压成 lowkey、auto 覆盖把低分字段提为 auto（双向）。E2E 全量回归无规则路径零行为变化。
3. **规则对脚本自身面板元素不产生任何效果** ✅ — S2/S3：`#cch-root` 祖先元素 / `.cch-btn` / `#cch-si`（即使强制选择器显式指向 `#cch-si`）一律不注入不登记；`rememberNone(自身元素)` 返回 null 不落盘（此断言在红基线中真实抓到实现缺守卫，TDD 有效）。
4. **规则数据格式文档写入本票报告（供 07 票消费），含增删改查函数边界** ✅ — 本报告 §1/§2；S4 契约断言（非法输入拒绝不落盘、副本隔离、500 上限、i18n 三键）全绿。

**回归链**：02 票单元门 `verify-ticket-02.mjs` **36/36 exit 0**；harness `misdetect-repro-v2.mjs` **25/25 exit 0**；`npx tsc --noEmit` 17 错全为遗留（iti-adapter 8 / fill 7 / 04 票 detect `__cchPerfHook` 2），本票触达模块 0 错（store 的 GM_* 未声明遗留错误随本票重写清零）；`npm run build` **exit 0**（66.36 kB，11 modules）；`npx playwright test` **33 passed exit 0**（02 票基线 20 + 04 票新增 13，`verification/05-e2e.txt`）。

## 5. 偏离点

1. **`store/index.ts` 全量重写**：01 票版仅有 favs 收藏夹；本票为规则持久化按 Store 同款三通道机制扩展，并顺手清零该文件 GM_* 未声明 tsc 错误（02 票纪律「本票触达模块清零」）。
2. **分档覆盖语义取「页面档位下限」**：auto/lowkey 覆盖会把引擎 none 档也提升注入（用户显式规则压过启发式，对标 1Password data-1p-ignore 的显式干预哲学）；曾考虑「仅重映射已注入档」，TDD 断言驱动下选定前者并写入 §1 语义细则。
3. **TDD 顺序偏离**：store/rules 实现先于单元门落盘（发现 04 票并行改动后才重读现状）；红基线以「空壳 rules + 未接线 detect」真实捕获 21 红（含 rememberNone 缺自身 UI 守卫的实现缺陷），非合成红。
4. **豁免未拆除已挂图标**：跨标签页新豁免后，已有图标保留至下一次全页刷新（scan 短路阻止新注入；拆 wrapper 属 07 票 UI 交互范畴）。
5. **Ponytail full 守约**：不做规则导入导出/云同步/子域通配符/正则匹配；`global.thresholds` 仅预留格式未实现 CRUD。

## 6. 给大脑的风险提示

1. **选择器有效性未在写入时校验**：`##bad[` 等非法选择器可入库（命中时 `_safeMatches` 静默不命中，无害但用户无感知）；建议 07 票 UI 写入前做 `try { document.querySelector(sel) } catch` 预检并提示。
2. **`note` 字段自由文本**：负反馈自动写入 `panel-negative-feedback`，07 票若开放用户备注需注意长度上限（当前未限制）。
3. **多页面级覆盖规则的档位歧义**：同 host 多条 auto/lowkey 覆盖规则按文档序取第一条；07 票 UI 应避免为同 host 建多条页面级覆盖（或按 id 列表明确优先级）。
4. **fingerprint 不含规则版本**：元素指纹无规则代次；规则变更依赖 `Store._notify → main.ts subscribe → Detect.scheduleScan()` 链路触发重扫（已接线），极端时序下（通知丢失）需等待下一次 DOM 变更。
