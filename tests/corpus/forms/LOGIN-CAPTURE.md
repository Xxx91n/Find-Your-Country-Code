# 登录态镜像采集 runbook（CDP 附着旁路）

> issue #12 / 票 T3 | 依据 spec #9 Q3/Q8 | 词汇以 `GLOSSARY.md`「**登录态镜像**」为准
> 红线：**CI/自动化永不登录**（D-008 不动）。登录态只存在于用户本地浏览器；
> 本仓库的任何 workflow 都不引用 `--attach`（verify-ticket-12 静态断言）。

登录后才能到达的表单页没有匿名重捕落点——它由**用户本人**在本地有登录态的
浏览器里经 CDP 附着采集：工具只读已渲染现场，产物与公开页采集**同构**（同一
`CAPTURE-MANIFEST` 结构 + `dom/` + `shot/`，仅多 `login_derived` 等标记字段），
下游 `06-skeleton.mjs` / `06-manifest.mjs` 零改动直接消费。

---

## 1 何时 / 如何启动调试端口

前置：`tests/corpus/forms/sources.json` 里该 source 已标 `"login": true`
（`_meta.loginDerived` 有字段语义说明）。没标的 source 走匿名重捕回路，
附着模式会拒绝。

1. 用**独立的 Chrome profile**（不要用日常 profile，降低 cookie 暴露面）启动：

   ```
   chrome.exe --remote-debugging-port=9222 --user-data-dir=D:\cdp-login-profile
   ```

2. 在该浏览器里**人工登录**目标站点，导航到要采集的表单页，等页面完全渲染
   （SPA 挂载完成）。
3. 安全注意：调试端口只绑 `127.0.0.1`，用完即关浏览器；不要在共享机器上常开。

## 2 附着采集

```bash
node tests/scripts/06-capture-forms.mjs --attach --id <id> --cdp-port 9222
# 同源开了多个标签页时，用 --tab <url 子串> 消歧：
node tests/scripts/06-capture-forms.mjs --attach --id <id> --cdp-port 9222 --tab "/settings"
```

工具行为（纪律内建于工具，不靠自觉）：

- 附着后**绝不导航**、不碰表单——用户标签页停在哪儿就采哪儿；
- 捕获 rendered DOM + 子帧（`srcdoc` / 嵌套预览帧）+ 截图；
- 产物写入**仓库外 archive**（仓外护栏对附着路径同样生效）；
- `CAPTURE-MANIFEST.json` 按 id **原位合并**，不覆盖公开页条目；
- 成对拒绝：匿名模式拒绝 `login:true` source；附着模式拒绝非 `login` source。

## 3 脱敏（密码/验证码等敏感字段 → 形状占位）

捕获时自动把敏感字段**值**替换为**形状占位**——与 `06-skeleton.mjs` 文本形状
令牌同词表（数字→`#`、字母→`a`、其余→`·`；`+ - ( ) . : /` 保留，如
`user@example.com` → `aaaa·aaaaaaa.aaa`），
保形状不保内容，且对骨架派生不可见（归一化本就丢弃 `value`）：

| 类别 | 判定（`12-login-capture.mjs` 唯一定义处） |
|---|---|
| 密码 password | `input[type=password]` |
| 验证码 one-time-code / OTP | `autocomplete=one-time-code` 或 name/id 含 `otp` / `one-time` / `verif*` / `two-factor` |
| 账号标识 identity | `input[type=email]`、`input[type=tel]`、autocomplete 含 `username` 等 |
| 会话凭据 | `input[type=hidden]` 且 name/id 含 `csrf` / `authenticity` / `_token` / `session` |

边界：普通文本字段（姓名、公司名等其余 PII）**不在**自动脱敏范围——按
GLOSSARY「登录态镜像」口径，在镜像页制作步骤人工剥除；截图不脱敏，因此
截图**永远只留在仓外 archive**，绝不入库。

镜像页里的占位必须用**规范令牌**（即上表映射的输出，幂等）——合规门对
入库镜像做「已脱敏不动点」复检（`redact(镜像) === 镜像`），手写占位会被拒。

## 4 provenance 登记（三处一致，缺一被门拒绝）

1. `sources.json`：该 source `"login": true`（声明 = 这是登录产物）；
2. `CAPTURE-MANIFEST.json` 条目（工具自动）：`login_derived: true`、
   `capture_mode: "cdp-attach"`、`attached_url`、`captured_at`、`redacted: true`、
   `redaction_count`（脱敏处数；形状记录不进任何清单，原值永不落盘）；
3. 镜像页头注释（制作镜像时人工加一行）：

   ```
   login-derived : true（capture_mode: cdp-attach, redacted: true, attached_url: <当时标签页 URL>）
   ```

`verify-ticket-12.mjs` 硬校验两条方向：登录 source 未标 `login-derived` →
**拒绝入库**；镜像带了标记但 `sources.json` 未声明 `login:true` → 同样拒绝
（防未登记标记）。

## 5 附着失败兜底：bookmarklet（仅文档，不建工具）

附着连不上（端口被占 / 浏览器版本问题）时，在目标标签页地址栏执行以下
bookmarklet 手工导出渲染 DOM（**只导 DOM，无截图**），按同一目录结构存入
仓外 archive，事后手工补 `CAPTURE-MANIFEST` 条目（标 `login-derived` +
`capture_mode: "bookmarklet-manual"`）：

```js
javascript:(()=>{const d='<!DOCTYPE html>\n'+document.documentElement.outerHTML;const b=new Blob([d],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='manual-dom-export.html';a.click();})()
```

注意：手工导出**没有**经过自动脱敏——落 archive 前先肉眼检查敏感字段，
镜像页制作时按 §3 同样规则人工占位。

## 6 已知接缝

- 首个真实 login source 入库时，`verify-ticket-06.mjs` S4 对 `capture.raw`
  的逐条断言需按票内注释扩展为「raw 断言只作用于非 login 条目」（本票保持
  零下游改动，不在 06 票门里预改；登记该 source 的票负责带上这行调整）。
