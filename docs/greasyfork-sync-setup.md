# GreasyFork 版本同步配置（一次性人工设置）

> 票 38 / A-011「分发最后一公里」交付物。
> **本页动作面向真实用户，须由维护者人工执行并确认。CI 不会、也不能代为执行。**

## 1. 背景：为什么只能人工、只能是拉取

GreasyFork 没有对外开放的写入 API。脚本在 GF 上的版本更新只能由 GF 站内在维护者授权后**主动拉取**（pull 模型），不存在任何合法的「CI 推送到 GF」路径。因此票 38 明确禁止设计 CI 主动 POST 到 GreasyFork 的步骤。

产物头部的 `@updateURL` / `@downloadURL` 指向 `update.greasyfork.org`（由 `vite.config.ts` 维护），用户侧更新检查实际读取的是 GF 线上 `.meta.js`。

**实测断点（2026-09-14，reproduced）**：

```text
GF 线上 @version : 1.3.4   （update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js）
仓库 package.json: 1.5.0   （唯一真源）
```

即：仓库已到 1.5.0，但从 GreasyFork 安装的用户做更新检查仍只会看到 1.3.4——v1.5.0 的安全修复与识别改进全部堵在分发链路上。

## 2. 一次性设置步骤

1. 登录 GreasyFork，进入脚本编辑页：
   `https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code`
2. 找到同步区域（**Sync from external URL** / 从外部 URL 同步）。
3. 填入以下 URL 并保存：

   ```text
   https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest/download/find-your-country-code.user.js
   ```

   这是 GitHub 提供的「最新 Release 资产」固定入口，每次发布新 Release 后自动指向新产物，无需随版本改动 URL。

4. 保存后，GreasyFork 按自己的节奏从该 URL 拉取脚本源码并更新线上版本。

### 为什么用 `releases/latest` 而不是仓库 raw 文件

`dist/` 被 `.gitignore` 忽略，仓库内不存在可直接 raw 引用的构建产物；`releases/latest/download/<asset>` 由 GitHub Release 资产承载，是唯一稳定、且无需把二进制提交进仓库的「最新产物」入口。

## 3. 验收（只读，不写入 GF）

```bash
node tests/scripts/38-gf-alignment-check.mjs           # advisory：漂移仅告警（exit 0）
node tests/scripts/38-gf-alignment-check.mjs --strict  # strict：漂移即红（exit 1）
```

脚本只发起 HTTP GET：

- 拉取 GF 线上 `.meta.js`，解析 `@version`；
- 拉取 GitHub `releases/latest` 产物链，解析 `@version`；
- 两者与 `package.json`（唯一真源）比对，输出 `ALIGNED` / `DRIFT` / `REACHABLE`。

CI 侧由 `.github/workflows/gf-alignment-check.yml` 每日执行一次（遵守 GF「更新检查 ≤ 1 次/天」），也可手动 `workflow_dispatch` 触发。

**开通同步前**，该检查会持续报 `DRIFT: 1.3.4 -> 1.5.0`，属预期结果（尚未开通）；开通且 GF 完成抓取后转为 `ALIGNED`。届时应把 CI 调用切换为 `--strict`，让漂移重新变成红灯。

## 4. 回滚

在 GF 编辑页清空 Sync from external URL 并保存，即回到手动上传模式。此操作同样须维护者确认。

## 5. GreasyFork 三条硬规则的遵守情况

| 规则 | 现状 | 证据 |
|------|------|------|
| 禁止 minify | 满足 | 产物 2965 行、最长行 270 字符；`vite.config.ts` 未设 `build.minify` |
| 单文件 ≤ 2MB | 满足 | 产物 127,133 bytes（上限 2,097,152） |
| 更新检查 ≤ 1 次/天 | 满足 | 产物 `@updateURL` 恰好 1 条；对齐校验 workflow 每日 1 次 |

三项由 `tests/scripts/38-version-consistency.mjs` 的 G4 组断言持续守护。
