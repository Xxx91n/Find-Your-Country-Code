import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [monkey({ entry: 'src/main.ts', userscript: {
    name: { '': 'Find-Your-Country-Code', 'zh-CN': '快速选择你的手机号国家区号' }, namespace: 'https://github.com/Xxx91n/Find-Your-Country-Code', version: '1.4.0',
    description: { '': 'Detect country/phone code fields and quickly search/fill international dialing codes on any website.', 'zh-CN': '智能识别国家/电话区号字段，提供可搜索的快速选择面板并自动填充区号。' }, author: 'Xxx91n', license: 'MIT',
    homepageURL: 'https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code', supportURL: 'https://github.com/Xxx91n/Find-Your-Country-Code/issues', downloadURL: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js', updateURL: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js', // 票 12 帧策略:userscript 元数据无正向 all-frames 键;@match 命中 + 不设 @noframes = 全帧注入(TM 语义)。
    // 顶层/子帧分工:每帧各自检测与填充(行为同源);面板宿主(#cch-root)仅顶层渲染;跨帧填充经 postMessage 协议。
    match: ['*://*/*'], grant: ['GM_setValue','GM_getValue','GM_addValueChangeListener','GM_registerMenuCommand'], 'run-at': 'document-idle'
  } })]
});
