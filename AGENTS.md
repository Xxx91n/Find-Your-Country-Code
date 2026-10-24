# Find-Your-Country-Code
浏览器油猴脚本：在任意网页识别电话国家区号字段，注入 🌐 图标与快速选择面板。

## 装 / 跑 / 测

- 安装 `npm ci`；构建 `npm run build`（产物在 `dist/`）；开发 `npm run dev`
- 类型门禁 `npm run typecheck`；E2E `npm run e2e`（首次先 `npx playwright install chromium`）

## 别改

- `tests/corpus/`、`tests/fixtures/`：语料，改动须同步 manifest 与基线
- `dist/`、`playwright-report/`、`test-results/`：产物，不手改
- `.github/workflows/`：门禁定义，改前先确认触发面

## 看不出来的坑

- 注入走 Shadow DOM，样式不得泄漏到宿主页面。
- 给受控组件写值必须用元素原型上的原生 value setter，再派发 input→change→blur；直接赋值不会同步框架状态。
- `about:srcdoc` 帧的 `location.origin` 是字符串 `"null"`，判来源要用 `window.origin`。

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles map to the same label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: glossary at the repo root, open decisions as `needs-triage` issues. See `docs/agents/domain.md`.
