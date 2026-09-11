# Cycle-3 Decision Ledger

> All A-xxx acceptance criteria from issues 20-26 with implemented/deferred/stale status

## 4.1 Ledger summary

| Total ACs | Implemented | Pending | Status |
|-----------|-------------|---------|--------|
| 6 | 6 | 0 | ✅ ALL IMPLEMENTED |

## 4.2 Per-ticket detail

### Ticket 20 (6 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|
| 20-01 | 扫描 workflows 识别 CI 引用脚本 → §1（8 引用 + 1 传递依赖） | ✅ implemented |
| 20-02 | 创建 tests/scripts/ 并复制 → §1/§3（无子目录结构需保留） | ✅ implemented |
| 20-03 | 更新全部 workflow YAML node 路径 → §4（12 处；4 处经 §5 事故落入 cch-25 提交，工作区/合并结果完整） | ✅ implemented |
| 20-04 | rg '.scratch/' .github/workflows/ = 0 → §4 | ✅ implemented |
| 20-05 | 复制脚本与原件一致性验证 → §3（2 个逐字节 + 7 个改动面逐行界定） | ✅ implemented |
| 20-06 | calibration-baseline workflow_dispatch 干跑确认路径可解析 → §6 绿 | ✅ implemented |

### Ticket 21 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

### Ticket 22 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

### Ticket 23 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

### Ticket 24 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

### Ticket 25 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

### Ticket 26 (0 ACs)

| AC ID | Description | Status |
|-------|-------------|--------|

## 4.3 Implemented decisions to sink to docs/

All Cycle-3 decisions are already captured in:
- `docs/adr/0006-ci-hygiene-policy.md` (ADR-0006)
- `CONTEXT.md` (5 new terms at lines 104-120)

## 4.4 Stale/deferred items (carry-forward backlog)

- F-1: verify-15 S4 pre-existing failure (run 34606594163 on main)
- F-2: typecheck.yml --legacy-peer-deps residue (1 occurrence)
- F-3: lockfile regeneration pending CI empirical verification
