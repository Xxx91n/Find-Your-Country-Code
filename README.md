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

<div style="display: flex; align-items: flex-start; gap: 10px;">
  <img width="690" alt="主界面预览" src="https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6Mjg4NjczLCJwdXIiOiJibG9iX2lkIn19--44c373684108d5b3eff5a9d9242eea5b79197a0d/%E5%9B%BE%E7%89%87.png">
  <img width="690" alt="脚本触发预览" src="https://greasyfork.org/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6Mjg4Njc1LCJwdXIiOiJibG9iX2lkIn19--50617e76254e4f74d395ee8ba1a0dc693ae08a89/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJwbmciLCJyZXNpemVfdG9fbGltaXQiOlsyMDAsMjAwXX0sInB1ciI6InZhcmlhdGlvbiJ9fQ==--74d795a80595346362306a325643f8710996102f/%E5%9B%BE%E7%89%87.png">
</div>

## 如何使用
### 前置要求

安装以下任意一个浏览器扩展:
- [Tampermonkey](https://www.tampermonkey.net/)
- [Greasemonkey](https://www.greasespot.net/)

### 安装脚本

**方法一：点击直接安装**

- [GreasyFork](https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js)  |  [Jsdelivr CDN](https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/src/Find-Your-Country-Code.js)

**方法二：手动安装**

1. 复制 [Find-Your-Country-Code.js](./src/Find-Your-Country-Code.js) 的内容。
2. 打开 Tampermonkey 管理面板。
3. 点击 添加新脚本。
4. 粘贴代码并保存。

## 许可证

[MIT License](./LICENSE)
