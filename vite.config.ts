import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [monkey({ entry: 'src/main.ts', userscript: {
    name: { '': 'Find-Your-Country-Code', 'zh-CN': '快速选择你的手机号国家区号' }, namespace: 'https://github.com/Xxx91n/Find-Your-Country-Code', version: '1.3.4',
    description: { '': 'Detect country/phone code fields and quickly search/fill international dialing codes on any website.', 'zh-CN': '智能识别国家/电话区号字段，提供可搜索的快速选择面板并自动填充区号。' }, author: 'Xxx91n', license: 'MIT',
    homepageURL: 'https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code', supportURL: 'https://github.com/Xxx91n/Find-Your-Country-Code/issues', downloadURL: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js', updateURL: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js', match: ['*://*/*'], grant: ['GM_setValue','GM_getValue','GM_addValueChangeListener'], 'run-at': 'document-idle'
  } })]
});
