# 21 — PR Triggers 窗口实施报告

> 子窗口 | 2026-09-11 | 分支 `cch/21-pr-triggers` @ `21c0e1d`（单提交 `feat(cch-21)`）

## 0 阻塞与必读复述（开工呈报）

- **Blocked by: 20**（CI 脚本迁移到位后触发才有意义）。票 20 已实施：`cch/20-ci-script-relocation`（tests/scripts/ 9 脚本 + calibration 引用更新 + 窗口报告在盘），阻塞解除成立。
- 必读已读全：prompts/21、handoffs/21、issues/21、spec.md、WORKFLOW.md（§4.2）、release.yml（确认不改）。

## 1 检查点核对（handoff Delta 4/4）

| # | 检查点 | 结果 |
|---|---|---|
| 1 | e2e/calibration-baseline/verify-* 六文件 `on:` 加 `pull_request:` | ✅ 提交 21c0e1d 恰好 6 文件 × +1 行 |
| 2 | release.yml 不获得 pull_request | ✅ 零接触（见 §3） |
| 3 | 每个非发版 workflow 含 pull_request | ✅ js-yaml 全解析 9/9：6 新增 + typecheck.yml（cch-23 已带）+ 2 发版系按预期不带 |
| 4 | 推测试分支 + 开 PR 确认触发 | ✅ PR #2，pull_request 事件 ×6 run（见 §2） |

## 2 PR 触发实证（run IDs，event=pull_request，head=cch/21-pr-triggers-test → base=cch/21-pr-triggers）

| Workflow | Run ID | 结论 |
|---|---|---|
| E2E | 34606285994 | success |
| Calibration Baseline | 34606286007 | success |
| verify-13 | 34606286053 | success |
| verify-15 | 34606286040 | **failure — 预存门漂移，非本票归因**（见 §4 F-1） |
| verify-16 | 34606286037 | success |
| verify-18 | 34606286054 | success |

辅助对照：verify-15 于 `main`（零本票提交）workflow_dispatch run **34606594163 同样红**（27/28，FAIL S4:dispatch-single），坐实红线与触发器改动无关。探针 run 附：push 触发 34606231409（E2E on push 分支过滤器命中）证明既有 push 触发未被破坏。

PR [#2](https://github.com/Xxx91n/Find-Your-Country-Code/pull/2) 已关闭并删探针分支（本地+远端）；交付分支 cch/21-pr-triggers 保留在远端待收口。

**触发评估落点**：GitHub 对 `pull_request` 事件按 **base 分支** 的 workflow 配置评估触发。因此 dry-run 以 cch/21（含本票改动）为 base、空提交探针分支为 head，而非向 main 开 PR（main 尚无 pull_request 配置，PR 不会触发）。合入 main 后，PR 门控即对全仓 PR 生效。

## 3 修改清单（before/after `on:` 全段）

### e2e.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/**'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - 'cch/**'

```

diff=CHANGED

### calibration-baseline.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main
      - 'cch/14-calibration-corpus'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - main
      - 'cch/14-calibration-corpus'

```

diff=CHANGED

### verify-13.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/13-visibility-l3-hardening'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - 'cch/13-visibility-l3-hardening'

```

diff=CHANGED

### verify-15.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/15-react19-fill-probe'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - 'cch/15-react19-fill-probe'

```

diff=CHANGED

### verify-16.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/16-scoring-consistency'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - 'cch/16-scoring-consistency'

```

diff=CHANGED

### verify-18.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/18-pseudo-select-e2e'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches:
      - 'cch/18-pseudo-select-e2e'

```

diff=CHANGED

### typecheck.yml

before (origin/main):
```yaml
on:

```

after (origin/cch/21-pr-triggers):
```yaml
on:

```

diff=IDENTICAL (no change by cch-21)

### release.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'vite.config.ts'
      - 'package.json'
      - 'package-lock.json'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'vite.config.ts'
      - 'package.json'
      - 'package-lock.json'

```

diff=IDENTICAL (no change by cch-21)

### release-dry-run.yml

before (origin/main):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/10-release-pipeline'

```

after (origin/cch/21-pr-triggers):
```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - 'cch/10-release-pipeline'

```

diff=IDENTICAL (no change by cch-21)


## 4 偏离点（呈报大脑确认）

- **D-21a verify-19.yml 不存在**：issue 枚举 "verify-13, verify-15, verify-16, verify-18, verify-19"，但 `git log --all -- '*verify-19*'` 为空，票 19（发版链接）从未建 verify workflow。按 spec 条款（"all verify-*.yml"）以现存 4 个为准。
- **D-21b 分支不堆叠 cch/20**（Blocked-by 由合入顺序而非堆叠满足）：若堆在 ci 分支上，cch/20 tip 的 verify-13/15/16/18 仍引用 `.scratch` 路径而脚本已删（其路径 hunk 因竞态落入 cch-25 提交，票20报告事故记录在案）→ 快照自洽损坏，触发链无法验证；基于 common base 则 `.scratch` 脚本在 base 仍存在、workflow 引用 `.scratch` → 自洽可跑（本次实证 6 run 全进入执行态）。收口顺序建议 main: 20 → 25 → 21（或 21 与 20/25 同批，merge 后 verify-* 指向 tests/scripts 的完整性由 20+25 合流保证）。
- **D-21c `but pr new` 不可用 → gh 回退**：forge auth 需人机交互（`but config forge auth` 报 "Human input required"）。按 skill 回退 `but push`（栈推送，GitButler 权威不变）+ `gh pr create -B cch/21-pr-triggers -H ...-test`。探针 PR 用完即关、不入栈元数据，影响面≈0；**正式 PR（cch/21→main）本票不创建**，留收口阶段由人工配好 forge 后 `but pr new` 或人审直合。
- **F-1 verify-15 S4 门预存红（新发现，建议起返修票）**：`src/fill/index.ts:246` 第二个 `dispatchEvent`（pseudo-select keydown 模拟）由 **b18dab4（cch-18）** 引入，verify-ticket-15.mjs S4 断言 "dispatchEvent 恰 1 处" 写于票 15 时代 → cch-18 合入 main 后门即漂移，此前 verify-* 仅 push 到各自票分支从不复跑 main，无人看见。**PR 门控合入 main 后此红会挡所有 PR**：修法为 S4 限定统计口径（仅 input/change 值事件派发点）或票24 式呈报后豁免，归票 20/26 或新票，超本票授权范围未动。

## 5 风险提示

- 合入后每个 PR 都会跑 verify-13/15/16/18 全量门（spec/issue 明示要求），PR CI 时长 ~1-4 分钟 ×6 workflow；若嫌重可由后续票给 verify-* 加 `pull_request: paths:` 过滤。
- 工作区 zz 残留 7 个 `run: npm ci` 缩进/改动 hunks（e2e/release*/verify-* 安装步，非本票产物），本票按 hunk 精确提交未裹挟；该残留需其属主窗口收编，否则会漂成孤儿改动。

## 6 教训建议（供大脑写回 WORKFLOW §5）

- **PR 触发类改动的 dry-run 必须以"含改动的分支"为 base**：GitHub 按 base 分支评估 pull_request 触发，向 main 开 PR 自证必假阴性——本票探针分支 → cch/21 的构造是此类票的通用形状。
- **新增 PR 门控前先跑一轮"main 全门基线"**：门控上线会把从未复跑的历史漂移门（如 verify-15 S4）变成全 PR 阻塞。门漂移由 push-分支过滤器（只跑本票分支）掩盖，属体系性盲区。
