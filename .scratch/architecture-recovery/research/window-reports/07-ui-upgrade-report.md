# 窗口实施报告：07 — 面板 UI 升级

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/07-ui-upgrade（GitButler，`but branch new --anchor cch/05-site-rules-engine` 锚定创建——本票 src 变更行依赖 01/02/04/05 分支已提交行，按 WORKFLOW §4.2「确有依赖按堆叠」执行；首次无锚提交被 GitButler 原子拒绝后按 but skill 恢复路径锚定）
> 开工复述：Blocked by: 02、05 —— 均已确认解除（两票分支 + window-reports 落盘齐备）；必读清单（prompt → issue → handoff → 05 报告 → spec → WORKFLOW → src UI/store/rules/detect/main/config 区块 + legacy Find-Your-Country-Code.js UI 区块）已按序读全。

## 1. 交互变更清单（对照 issue 验收项）

| # | 变更 | 落点 | 验收映射 |
|---|---|---|---|
| 1 | 三档置信样式差异可见：auto 全亮（data-cch-tier=auto）/ lowkey 低调样式（.cch-btn-lowkey，02 票已有，本票钉死断言）/ none 不注入 | ui attach/detect 分档 | 验收1 前半 |
| 2 | 三档可配置：GM 偏好键 `cch_ui_prefs_v1`（独立键，损坏值防御回退 dim），lowkeyMode=dim（默认，低调可见）⇄ hidden（中置信不注入转召唤登记）；规则视图内切换，dim→hidden 对已挂低调图标即时拆除转登记，hidden→dim 对登记字段即时补挂，无需刷新 | config.ts UI_PREFS_KEY/LOWKEY_MODES；ui prefs()/setPref()/_applyLowkeyMode() | 验收1 后半 [SP US17] |
| 3 | 负反馈入口：面板内「这不是区号字段」按钮（#cch-fb）→ Rules.rememberNone(target)（tier=none, note=panel-negative-feedback）+ UI.detach 即时拆图标（不等 350ms 防抖）+ toast，无需刷新 | ui _feedback() | 验收2 [SP US9] |
| 4 | 负反馈幂等与冲突清理：目标字段已有命中 none 规则 → 不重复写；命中 auto/lowkey 强制规则 → 先删后写（后到用户意图优先，防文档序旧规则压住负反馈） | ui _feedback() + 模块级 matchingOverrides()（纯函数） | 验收2 |
| 5 | 规则管理视图：面板搜索行齿轮（#cch-rules-tg）切换；视图含 ① 当前站豁免开关（#cch-exempt-tg）② 豁免域名列表删除 ③ 当前站覆盖规则列表（selector/tier/note）逐条删除 ④ 低调样式切换 | ui _renderRules()/_render() 视图路由 | 验收3 |
| 6 | 豁免即时拆图标：UI.detachAll() 拆除本页全部 wrapper（含 open shadow root 内递归）+ 清空召唤登记；兑现 05 报告偏离点 4 移交本票的收尾职责 | ui detachAll()/_allWrappers()/_fieldOf() | 验收3 + 05 偏离4 |
| 7 | 规则变更→重扫接线：main.ts Store 订阅内规则快照比对（JSON.stringify 快照，收藏变更不误触发）→ 豁免页 detachAll + Detect.scheduleScan()；删除 none 规则后字段按评分恢复注入 | main.ts | 验收2/3 即时生效的引擎侧 |
| 8 | 豁免恢复 hatch：GM_registerMenuCommand 注册「恢复本站检测」菜单（豁免后面板不可达的解禁通道，对标 1Password 扩展菜单恢复路径；宿主缺该 API 时静默降级） | main.ts | 05 风险提示2 的可用性补齐 |

体验红线（搜索/收藏/双语/动态渲染）回归保障：本票未触碰 Fill/detect 评分主路径；搜索/收藏渲染仅加视图路由分支（rules 视图 return，list 视图行为不变）；新增 i18n 十键 zh/en 双语齐备；召唤入口由「登记非空才创建」改为「常创建 + _render 按 _lowFields.size 控制 hidden」——对零登记页面渲染结果等价（hidden）；主号锚/选择器/评分函数零改动。逐条 e2e 断言见 §3。

## 2. 关键发现与修复（偏离点）

1. **05 报告声称的「规则变更自动重评」链路实际缺失**：05 报告 §1 称「规则变更依赖 Store._notify → main.ts subscribe → Detect.scheduleScan() 链路（已接线）」，实读 main.ts 该订阅只重渲染面板、未调 scheduleScan；Rules._notifySubs 为死代码（无调用方）。本票在 main.ts 补齐该接线（含快照比对防收藏变更误触发重扫）——这是负反馈/规则删除「无需刷新」生效的前提，属本票验收 2/3 的必要接线而非越权。
2. **行尾策略偏离（CRLF 政策）**：仓库无 .gitattributes、core.autocrlf=true、目标文件行尾现状混合（ui/i18n/config=CRLF，main.ts=LF）。为避免多窗口并行下 renormalize 污染其他票分支，本票**保持各文件现有行尾**（CRLF 文件续 CRLF、main.ts 续 LF、新文件 LF），.gitattributes 留待卫生票统一决策（01 票报告亦持此立场）。写后字节级验证：全部触达文件无 BOM、无混合行尾、锚点片段逐一如期存在；`git diff --check` 干净。
3. **CI-only 纪律下的证据边界**：按 2026-09-04 用户强制令，本机零构建/零测试运行；门禁脚本与 e2e 仅入库（node --check parse-only 防语法错误浪费 CI 轮次，不构成执行证据）。§3 验收命令为本票入库的可执行门禁，**执行与退出码待 CI run 落盘**（报告如实标注 pending）；单元门场景设计对照 verify-ticket-02/05 已验证模式（剥离拼接 + mock），且 S4/S5 引擎级断言与 05 门禁同构，红/绿以 CI 输出为准。
4. **summon 语义微调**：显式召唤补挂原样传 lowkey 档会被 hidden 偏好重新拦截（自相矛盾回路），本票 summon 走 force=true 按高置信样式挂（用户显式请求压过偏好，与「用户显式干预压过启发式」的 05 心智一致）。
5. **Ponytail full 守约**：不做规则导入导出/编辑已有规则内容/子域通配符/global.thresholds CRUD（05 预留格式未动）；低调样式仅 dim/hidden 两态（spec US17「低调且可配置」的最小完整实现）；无新依赖。

## 3. 验收命令与退出码（CI 执行；本机按 CI-only 令不跑）

| 命令 | 覆盖 | 退出码 |
|---|---|---|
| `node .scratch/architecture-recovery/research/scripts/verify-ticket-07.mjs` | 单元门 S0（02 评分烟测）/S1（偏好持久化+低调分流）/S2（matchingOverrides）/S3（负反馈幂等+冲突清理）/S4（规则删除恢复注入）/S5（豁免开关恢复）/S6（接线契约+i18n 键） | **pending CI** |
| `npm run e2e`（= build + playwright test，tests/rules-ui.spec.ts 8 用例 + 既有全量回归） | 验收1 三档差异与 hidden 召唤 / 验收2 负反馈即时抑制+持久+幂等 / 验收3 规则查看删除+豁免开关+域名删除 / 验收1 样式切换即时迁移 / 验收5 合成事件不外溢（submit/字段事件/状态值三探针） / 验收4 搜索收藏双语动态渲染由既有 scenarios/rescan/framework-inject 组回归 | **pending CI** |
| `npx tsc --noEmit` | 遗留错误基线不新增（17 错基线；本票新代码零 GM_* 裸用，ui/main 均局部 declare） | **pending CI** |

## 4. 给大脑的风险提示

1. **CI 红回滚单元**：feat 提交（rol）与 docs 提交分离，CI 红时仅返修 feat 提交，报告可独立保留。
2. **_applyLowkeyMode hidden→dim 的登记清空语义**：summon 消费登记后清空，dim 切回时已召唤字段不再在登记内（符合「已按高置信样式挂出」的事实），但面板关闭再开无召唤入口——用户预期应为「已召唤的不需要再召唤」，如 CI 交互测试有异议按此归因。
3. **规则视图豁免删除他人域名**：豁免列表删除按钮作用于任意域名（含跨站），属验收 3「查看/删除既有规则」语义内；误删无破坏性（可重新开启）。
4. **matchingOverrides 选择器集与引擎 _safeMatches 同构**（try/catch 静默），非法选择器规则在负反馈幂等判定中不命中 → 可能重复写一条 none（引擎仍静默无害）；如需彻底去重需引擎侧 selector 有效性预检（05 风险1，超出本票边界）。
5. **GM_registerMenuCommand 未入 vite-plugin-monkey grant 清单的可能**：e2e 用 GM stub 未覆盖该 API（stub 只声明三个 GM_*）；若宿主 grant 缺失，try/catch 静默降级不影响主功能，但菜单解禁入口不可用——建议票 10 发布管线核对 vite.config.ts grant 配置。
