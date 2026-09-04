## 功能特性

- 多信号加权评分自动识别国家/区号字段（`select`、`input`、`intl-tel-input` 场景），按置信度分级行动，称呼前缀、固话本地区号、纯数字枚举等易混淆字段不再误报
- 高置信字段自动注入 🌐 图标；中置信低调注入（半透明小图标，悬停恢复）；低置信默认不注入，可从面板手动召唤
- 支持 `autocomplete` 标准信号（如 `tel-country-code`）与下拉选项内容验证
- 点击 🌐 图标快速打开国家区号面板，支持中文/英文国家名、ISO、区号搜索
- 支持收藏常用国家区号并持久化保存
- 兼容动态页面：MutationObserver 自动扫描 + SPA 路由切换重扫，穿透 open Shadow DOM
- intl-tel-input v16–v29 版本适配；React/Vue 等受控组件经原生事件序列真实同步

## 截图预览

<table>
  <tr>
    <td style="vertical-align: top;">
      <img width="100%" src="https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main1.png">
    </td>
    <td style="vertical-align: top;">
      <img width="100%" src="https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main2.png">
    </td>
  </tr>
</table>