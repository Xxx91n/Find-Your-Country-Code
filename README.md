<div align="center">
<h1 align="center">Find-Your-Country-Code</h1>

[**English**](./README_EN.md) | **简体中文**

<p align="center">
  
**一个浏览器js脚本，专注于在任意网页中快速选择填写手机号的国家区号，可用于篡改猴。**
</p>
</div>

## 功能特性

- 自动识别网页中的国家/区号字段（`select`、`input`、`intl-tel-input` 场景）
- 点击 🌐 图标快速打开国家区号面板
- 支持中文/英文国家名、ISO、区号搜索
- 支持收藏常用国家区号并持久化保存
- 兼容动态渲染页面（MutationObserver 自动扫描）

## 截图预览

- 主界面（搜索 + 收藏 + 全部）
- 触发入口（字段右上角 🌐 图标）
- 选择后自动填充并提示

> 可在 `test/cch-test-page.html` 本地页面中直接预览完整效果。

## 如何使用
### 前置要求

安装以下任意一个浏览器扩展:
- [Tampermonkey](https://www.tampermonkey.net/)
- [Greasemonkey](https://www.greasespot.net/)

### 安装脚本

**方法一: GreasyFork 安装**

[从 GreasyFork 安装](https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code)

**方法二：直接安装**

[点击安装脚本](https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js)

**方法三：手动安装**

1. 复制 [Find-Your-Country-Code.js](./src/Find-Your-Country-Code.js) 的内容。
2. 打开 Tampermonkey 管理面板。
3. 点击 添加新脚本。
4. 粘贴代码并保存。

## 许可证

[MIT License](./LICENSE)
