# 外部输入留痕台账（External Input Ledger）

> 依据：`docs/adr/0013-governed-artifact-area-and-evidence-trail.md` 决策 3（留痕三件套）· `.scratch/README.md` §5。
> 生成：2026-09-18（Cycle-8 **T-02**）｜生成方式：**脚本遍历仓库实际文件并计算 SHA-256**（非人工转录，可复跑）。
> 台账口径：**只增不改**；更正以**追加带日期条目**表达，保留原条目。

## 一、三件套定义（ADR-0013 决策 3）

1. **入库**受管区（`.scratch/`，Git 跟踪）；
2. **台账**记录 **SHA-256 + 来源 + 抓取日期**（本文件）；
3. **push 到远端**（「证据只存在一份于本地可清理目录且从未 push，等于没有」）。

## 二、登记表（本仓现存 **22** 件）

| # | 类别 | 路径 | 字节 | SHA-256 | 来源 | 入库日期 | Git 跟踪 | 已在 `origin/main` |
|---|---|---|---|---|---|---|---|---|
| 1 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-01-acceptance-surface-and-ladder.md` | 11617 | `0940564e58b64efae3c663bdb133979e0101dbba7d9d1922b7880ce14bd9b3cd` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 2 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-02-settings-surface.md` | 22851 | `c235cb60cc8dcf99291ae5f22c682990ee37c0e3fb1c257dd3a11d636f5a4630` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 3 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-03-diagnostics-surface.md` | 21757 | `7aa545f8f68378e3c29a68f1737ce6d9a8989810abe5e75a270e0082e7fb3e29` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 4 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-04-release-gate.md` | 13517 | `41e36d6b61706adb6500d188b660e0a715cff8084a656b48bf26d0bbcd7594c5` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 5 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-05-harness-primitives.md` | 11059 | `aaf3c39f64fec2a420e897c26ea5b3fe6adfb3a79b6f310e4917970c3787f94a` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 6 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-06-form-corpus.md` | 8680 | `2fefda2e019fea23d580437c6703246ea08fad29589d8ead20276576cc29a6fb` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-16 | yes | **yes** |
| 7 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-08-hidden-native-control-and-dial-text.md` | 8428 | `47d9394ef8c66675da3ed5842d6b4202bb1df32172448bdf11d78ccd7803edc4` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-17 | yes | **yes** |
| 8 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-11-iti-l3-criterion.md` | 9675 | `54e1373c2eb4fb278f703343eb8d550a96a2539310c50e02e995d1eeb23e8f12` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-17 | yes | **yes** |
| 9 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-43-dependency-peer-rootfix.md` | 18248 | `9e5e8b69030111eb43e66c6d6caa6cab86552d6d0eaaca0c9f5d8ce27ab006e9` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-14 | yes | **yes** |
| 10 | 第三方评审（atomcode 产出） | `.scratch/architecture-recovery/research/atomcode-45-ci-evidence-boundary.md` | 9169 | `48252635b5d398eeae5ae12994b65e7ff48bfded72b951bb7436d8e091ca3785` | atomcode CLI（Exa+Tavily+AnySearch + Patchright） | 2026-09-14 | yes | **yes** |
| 11 | 审计报告（独立审计） | `.scratch/architecture-recovery/research/cycle6-audit-report.md` | 8487 | `65ada09acb4aeada36d035b38cc023b8bd2201b500baef12a0a541ec3954228c` | 独立审计窗口（第二方审计） | 2026-09-16 | yes | **yes** |
| 12 | 审计报告（独立审计） | `.scratch/cycle7-grill/reports/2026-09-17-audit-report.md` | 29460 | `bb26dd43317c11cde421b53a10f2a29b4903ad7aa5305ebfe902c92de9216cc7` | 独立审计窗口（第二方审计） | 2026-09-18 | yes | **yes** |
| 13 | 外部调研存档（Cycle-7 grill） | `.scratch/cycle7-grill/research/q2-industry-benchmark.md` | 9413 | `e74c7aad6d5d37aa88d2e7d319f1e7dc727952e01ed575ad5c0ab06ede9cea9f` | atomcode 行业对标调研 | 2026-09-17 | yes | **yes** |
| 14 | 外部调研存档（Cycle-7 grill） | `.scratch/cycle7-grill/research/q3-process-doc-debt-benchmark.md` | 11837 | `9d822b328d62fa63f7d39f165d87acaf7ed3f835c78e239fd0b237b737d6a867` | atomcode 行业对标调研 | 2026-09-17 | yes | **yes** |
| 15 | 外部调研存档（Cycle-7 grill） | `.scratch/cycle7-grill/research/q4-coverage-expansion-benchmark.md` | 12363 | `bae01cf4d6d10f4f512b8e02b68fa8695356c6871e6e50bbcf0bf2739e9d871d` | atomcode 行业对标调研 | 2026-09-17 | yes | **yes** |
| 16 | 外部调研存档（Cycle-8 grill Q3/Q4） | `.scratch/cycle8-grill/research/q3-evidence-workspace-governance.md` | 17025 | `1c5afb4edc5e76cbfdc98f8d9db2bba3b3cf5d559172666cb5a53b3f31af1c54` | atomcode 行业对标调研 | 2026-09-18 | yes | **no** |
| 17 | 外部调研存档（Cycle-8 grill Q3/Q4） | `.scratch/cycle8-grill/research/q4-audit-residue-disposal-benchmark.md` | 14951 | `3c63d85084caa6b1bc5294760861c2ae5da603d129aadd8c384a73b142eb87fa` | atomcode 行业对标调研 | 2026-09-18 | yes | **no** |
| 18 | 外部工具产出（prompt 存档） | `.scratch/architecture-recovery/research/prompt-02-atomcode.md` | 5628 | `1eb3c2065ba7fba256c05f5306c81568ddb7c8f4b2ac33172fedaf360fe278d3` | atomcode CLI 调用 prompt 存档 | 2026-09-16 | yes | **yes** |
| 19 | 外部工具产出（prompt 存档） | `.scratch/architecture-recovery/research/prompt-03-atomcode.md` | 5938 | `2ffdba59d258b2aeb963cdf6747a6c625ca695499c9b7020fe6e4b7df8406f73` | atomcode CLI 调用 prompt 存档 | 2026-09-16 | yes | **yes** |
| 20 | 外部工具产出（prompt 存档） | `.scratch/architecture-recovery/research/prompt-05-atomcode.md` | 1787 | `aea8933e611a98c82b97a0e31ddf9f7754fd79e3a3f6504d6448e0a729a918cc` | atomcode CLI 调用 prompt 存档 | 2026-09-16 | yes | **yes** |
| 21 | 外部工具产出（prompt 存档） | `.scratch/architecture-recovery/research/prompt-06-atomcode.md` | 1163 | `91126f3e96809271c3436953fc484e9c5b703e69d6db1318948bebbc142d2a1b` | atomcode CLI 调用 prompt 存档 | 2026-09-16 | yes | **yes** |
| 22 | 外部工具产出（prompt 存档） | `.scratch/architecture-recovery/research/prompt-11-atomcode.md` | 1445 | `90c990ada05b3b6cb1590bda36b805593dfa2e4215b972d8330c66daec4233ce` | atomcode CLI 调用 prompt 存档 | 2026-09-17 | yes | **yes** |

## 三、未闭合项

| 项 | 状态 | 补偿控制 |
|---|---|---|
| `test-results/锐.txt`（第三方锐评原文） | **永久丢失，不可恢复** —— 无哈希可录（实证：工作区零命中、`git ls-tree HEAD` 零命中、`git log --diff-filter=D` 零命中、广域搜索零命中；根因 = `.gitignore:25` 忽略 `test-results/` ⇒ 从未入库） | 事故回溯已落 `ADR-0013`「事故回溯」节；本台账从此逐件录哈希 |
| 本轮 22 件外部输入的 **push 状态** | 其中已在 `origin/main` 的为已闭合；其余**未 push**（本轮硬边界：未获授权不得 `push`） | 登记于本表第 9 列；授权后 `but push` 即闭合 |

## 四、复跑命令（证据）

```bash
# 重算台账哈希（应与上表逐字一致）
node -e "const{execSync}=require('child_process'),fs=require('fs'),c=require('crypto');
for(const f of execSync('git ls-files .scratch',{encoding:'utf8'}).trim().split(String.fromCharCode(10)).filter(p=>/atomcode-|prompt-.*-atomcode|audit-report|research\/q[0-9]-/.test(p)))
  console.log(c.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),f);"
```

> 注：脚本按类别正则枚举，可能同时列出不属于本表口径的同类文件；本表为**规范化登记面**，新增外部输入须**当场**追加行。
