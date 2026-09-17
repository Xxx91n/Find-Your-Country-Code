# cch/02 R2 去污染移交包（供大脑落地）

由票 02 返工轮次 R2 窗口产出。**修复已全绿验证，但未能自行落地**（GitButler 依赖机制阻断），按用户裁定移交大脑。

## 内容

| 文件 | 说明 | 行数 / 字节 | SHA-256 |
|---|---|---|---|
| `cch02-r2-decontamination.patch` | 相对 cch/02 分支内容（61f3ebe7）的补丁，`-p1` 可施 | — / 23634 | `b56939ff03f25d93…` |
| `cch02-r2/src/ui/index.ts` | 修复后全文（1160 → 862 行） | 862 / 43319 | `864fda62bff01eea…` |
| `cch02-r2/src/i18n.ts` | 修复后全文（59 → 55 行） | 55 / 6110 | `1ce49046b4837c83…` |

## 应用方式

两种等价方式（二选一）：

1. 补丁：在仓库根 `git apply -p1 .scratch/architecture-recovery/research/cch02-r2-decontamination.patch`（已实测 `--check` CLEAN；仓内 `core.autocrlf=false` + `.gitattributes` `* text=auto eol=lf` ⇒ 应用结果与上表两个全文文件**逐字节相等**）。
2. 直拷：将 `cch02-r2/src/ui/index.ts` 与 `cch02-r2/src/i18n.ts` 覆盖到 `src/` 同名路径。

## 落地阻断（大脑需决定的机制）

`but commit -b cch/02-settings-surface` 报 `depends on cch/03-diagnostics-surface (oto)`：改动的上下文行同时落在 cch/02 与 cch/03 上。已实测排除：`but worktree`（特性旗标未开、无 `add`）、`but unapply cch/03`（会连带卸下含 7 支的整栈）。

## 验证（隔离检出 cch/02 内容，非并集）

- 修复前 `npm run build` → exit 1，与 CI run 35089321289 逐字一致
- 修复后 `npm run build` → exit 0；`npm run typecheck` → exit 0 / 0 错
- 门 02 → 33 PASS / 0 FAIL；门 42 → 42 PASS / 0 FAIL
- 全量 E2E → 103 passed / 1 failed（唯一红 = entry-access:40 垂直居中 = R-3，非本票）

详见 `window-reports/02-settings-surface-report.md` 的 `## 返工轮次 R2` 节。
