# Cycle-6 第 3 波首脑复核报告（票 06 形态语料三层架构）

> 复核人：大脑 Agent | 2026-09-16 | 方法：**不信报告自述，逐条回仓库实物验证**（子代理只读验证 + 主 Agent 实跑门与 spec + 分支落位 + rg 代码抽查 + 仓外归档实物核实）

## §1 分支落位

| 项 | 实物 | 结论 |
|----|------|------|
| cch/06-form-corpus | tip = **06f7e42c**；3 提交（`pxk`+`xku`+`pxy` → `4a9b3187`/`3596390a`/`06f7e42c`） | ✅ 落位 |
| 栈位 | **堆叠于 cch/05 之上**（← 票 05） | ✅ 合法堆叠 |
| 堆叠副作用 | **堆叠触发 rebase，实现提交 sha 由 `a4b9150e` 变为 `4a9b3187`** | ✅ 窗口已在 `pxy` 中**主动披露并回写锚点**（诚实度高） |
| 远端 | 不在远端 | ⚠️ 无 CI 证据（P-2，窗口 E-6 已自报） |

## §2 声明 → 证据 → 结论对照表（13 项）

| # | 声明 | 实物证据 | 结论 |
|----|------|---------|------|
| 1 | 9 镜像 + 8 骨架 + manifest，单 `tests/` 根 | `ls tests/corpus/forms/` = `manifest.json` / `mirrors`(**9**) / `README.md` / `skeletons`(**8**) / `sources.json`；`ls -d corpus` → **No such file** | ✅ 属实 |
| 2 | 原始快照不入 git + 仓外 archive | 仓外实存 `choose-your-country-evidence-archive/corpus-forms/`（`raw`=8 / `dom`=15 / `shot`=8 + `CAPTURE-MANIFEST.json`）；`git ls-files` 无 raw/warc/screenshot | ✅ 属实（报告称「渲染后 DOM 9」实为 **15** = 9 主 + 6 帧文件，口径偏松） |
| 3 | 不引入对象存储/S3 | `package.json` 无 s3/aws/b2/minio；唯一命中在门自身的**反例词表** | ✅ 属实 |
| 4 | manifest 指纹 + 4 溯源键 | `source_url`/`captured_at`/`mirror_of`/`license_note` 各 **8**；重算 `mirrors/iti-v29.html` 的 sha256 = manifest 值**逐字命中** | ✅ 属实 |
| 5 | 退化回路 4 脚本 + 分级非像素 | 4 脚本均在；`06-structural-diff.mjs:26` `RANK={none:0,patch:1,minor:2,major:3}`；`:32-46` 比 tag/class/attrs/repeat/text-shape/children，**零 pixel/screenshot 代码** | ✅ 属实 |
| 6 | 结构门 187 断言 | 我实跑 `node tests/scripts/verify-ticket-06.mjs` → **187 PASS / 0 FAIL**（自己 grep 计数 = 187） | ✅ 属实 |
| 7 | `verify-06.yml` 带 `pull_request:` | 实测存在且声明 | ✅ 属实 |
| 8 | spec 18 例（含跨隔离双端） | 我实跑 `npx playwright test tests/corpus-forms.spec.ts` → **18 passed**；`:145` 为跨隔离上下文双端用例 | ✅ 属实（注：在**多分支混合树**上跑，见 §6） |
| 9 | `server.mjs` 仅 +1 路由（2 行） | `git show 4a9b3187 -- tests/server.mjs` → 唯一 hunk `+2`，无既有路由改动 | ✅ 属实 |
| 10 | 语料 README 四要素 | `tests/corpus/forms/README.md`：§1 三层架构 / §3 合规口径 / §4 退化回路 / 纪律「绝不为修绿而盲目更新快照」 | ✅ 属实 |
| 11 | 跨票边界 | `git show --name-only 4a9b3187` 32 文件，grep 其他票工件（issues/0[1-5]、handoffs、prompts、settings-surface、diagnostics-surface、ACCEPTANCE-SURFACE、primitives.mjs）→ **(none)** | ✅ 属实（**P-1 未复现**） |
| **12** | **「同口径双探测（`--user-agent` 同、等待窗口同）」** | `06-probe-real.mjs:28` `newPage({userAgent:UA})` + `:33-35` `domcontentloaded`→`networkidle(8s)`→`+1500ms`；`06-probe-mirrors.mjs:37-38` **无 UA** + `load`→`+1200ms` | ❌ **REFUTED** — **条件不同**，报告方法陈述为假（详见 §4 R-1） |
| 13 | issue 7 项勾销 | `- [x]`=**7**，`- [ ]`=**0** | ✅ 属实 |

**12/13 属实**（claim 12 被证伪）。

## §3 账本维度（A-030）

A-030 台账去向 = **T1 · T6**（见 `decision-ledger.md` §去向登记），本波完成 T6。

| A-ID | 票 | 实现证据 | 判定 |
|------|----|---------|------|
| A-030 | 06（T6） | 三层语料（镜像 9 + 骨架 8 + manifest 指纹逐字命中）+ 退化回路 4 脚本（分级非像素）+ 门 187 + spec 18 + 仓外归档实存 | ⚠️ **implemented（待 CI），但保真度结论的证据强度受限**（见 §4 R-1） |

**缺失/弱化/跑偏单独列出**：**A-030 的「镜像保真度」证据弱化** —— 声称的「同口径」对比未按声称的条件执行；语料本身与门禁无缺陷，但**保真度结论需重测或降级表述**。无「跑偏」。

## §4 返工判定（**存在源码层面问题 → 重发修复版启动器**）

### R-1（源码层面）两份探测脚本条件不一致，而报告声称「同口径」

- **实物**：`06-probe-real.mjs:28` `newPage({userAgent:UA})`（Chrome124）+ `:33-35` `domcontentloaded` → `networkidle(8000)` → `waitForTimeout(1500)`；`06-probe-mirrors.mjs:37-38` `goto(..., { waitUntil: 'load' })` → `waitForTimeout(1200)`，**全文无 UA**。
- **影响**：报告 §3.1 的 headline 结论「镜像保真度在注入口径上 8/8 与真实页一致 —— 该 2/8 是真实形态的测量结果，不是镜像伪影」**建立在一个未被控制为同口径的对比上**。差异可能无害（不同条件下仍 8/8 一致，反而暗示鲁棒），但**报告陈述了它没有的控制**，读者会过度采信。
- **修复要求**：先复核主 Agent 的检查结果；再二选一处置 —— **(a) 首选**：对齐两份探测的 UA 与等待策略（如均设同一 UA、均 `load`+ 同一等待窗口）后**重跑双探测**，以受控结果重述 §3.1；**(b) 备选**：若真实页不可达/被挑战致无法对齐，则**如实改写 §3.1** 描述实际条件差异，并明写由此产生的结论强度限制。**两路均需重跑同一套验收（门 187 + spec 18）**，并在原报告**追加** `## 返工轮次 R1`，**不覆盖原记录**。

### 其余部分无源码返工需求

语料三层架构、指纹清单、退化回路、门 187、spec 18、仓外归档、无 S3、单 `tests/` 根、跨票边界——均实物属实。

**修复版启动器**：`prompts/06-form-corpus-fix.md`（已生成）

## §5 过程违规（单独呈报，**不替你追认**）

| # | 违规 | 实物证据 | 待裁定 |
|----|------|---------|--------|
| **P-2（重复）** | 远端仍零 `cch/*` → 票 06 亦无 CI 证据 | `git ls-remote --heads origin 'refs/heads/cch/*'` → 空 | 票 06 含行为面改动（语料 E2E + 结构门），按 WORKFLOW §8.1 属合规缺口（窗口 E-6 已自报） |
| **P-9（新）** | 报告 §3.1 **方法陈述为假**（已计入 R-1） | 两份探测脚本条件不同 | 与 R-1 合并处置 |
| **P-10（新）** | 报告称「渲染后 DOM 9」，仓外实测 **15** | `ls archive/corpus-forms/dom | wc -l` = 15（9 主 + 6 帧） | 口径偏松，补正 |
| **P-11（新）** | 报告将 issue 路径写为 `issues/06-form-corpus.md`（漏 `.scratch/architecture-recovery/` 前缀） | 实际路径带前缀，可解析但字面不精确 | 补正 |

**P-1 未复现（第二次）**：`pxk` 的 32 文件**全部为本票产物**，未触碰任何其他票。

**正面记录（应给信用）**：窗口**主动披露 7 项偏离**（E-2 未产 WARC / E-3 镜像页非全资源内联 / E-4 骨架未用 toMatchAriaSnapshot / E-5 重捕未接调度 / E-6 CI 证据待补 / E-7 atomcode 首跑配额受限），且**自我拦截并重写了一次伪影**（heroku-signup 首版自造 `#dial_code` 字段 → 按真实页字段集重写，修正后 8/8 一致）。

## §6 复核方法局限（披露）

闸门与 spec 跑在 GitButler **多分支混合工作树**（各分支**并集**），非逐分支；逐分支绿需 push 后由 CI 证明。

## §7 frontier（返工未清，下一波暂不开工）

| 项 | 状态 |
|----|------|
| **票 06 返工轮次 R1** | **待开工**（修复版启动器已发） |
| **W4 = 票 07**（真实站点层全阶梯 + 发布门） | **暂不可开工** —— blocked by 票 06，而 06 有未清返工 |
| W5 = 票 08 · W6 = 票 09 | 依次后置 |
