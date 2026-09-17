# Prompt 25 — Dependency Pinning + Directory Unification

你是一名实施 Agent。本票将依赖版本从 `latest` 钉死，并统一 `test/` + `tests/` 双目录。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\25-dependency-directory-hygiene.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\25-dependency-directory-hygiene.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\.github\workflows\e2e.yml` — 用于 `--legacy-peer-deps` 移除尝试

## 专属 Delta

- `package.json`: `"typescript": "latest"` → `"^5.7"`, `"vite": "latest"` → `"^6.0"`, `"vite-plugin-monkey": "latest"` → `"^5.0"`
- 走 CI `npm install` 重新生成 lockfile
- 尝试移除 CI workflow 中的 `--legacy-peer-deps`；若 peer 冲突持续存在，注释说明原因
- `test/*.html` → `tests/manual/*.html`，删除旧 `test/` 目录
- 更新所有引用 `test/` 路径的文档或脚本
- 验证：`grep "latest" package.json` 返回 0（description 中的 `latest` 字符串除外）

## 开工

先复述本票的阻塞关系（Blocked by: None — 可立即开工）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\25-dependency-directory-hygiene-report.md`
