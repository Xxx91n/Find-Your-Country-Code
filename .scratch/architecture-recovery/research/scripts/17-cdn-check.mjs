// 17-cdn-check.mjs — verify pinned CDN URLs for pseudo-select sample pages (ticket 17)
// stdout: compact per-URL status; exit 1 only if all fail
const URLS = [
  ['react',          'https://unpkg.com/react@18.3.1/umd/react.production.min.js'],
  ['react-dom',      'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'],
  ['mui-6.4.8',      'https://unpkg.com/@mui/material@6.4.8/umd/material-ui.production.min.js'],
  ['mui-6',          'https://unpkg.com/@mui/material@6/umd/material-ui.production.min.js'],
  ['dayjs',          'https://unpkg.com/dayjs@1.11.13/dayjs.min.js'],
  ['antd-5.27.4',    'https://unpkg.com/antd@5.27.4/dist/antd.min.js'],
  ['vue',            'https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js'],
  ['element-plus',   'https://unpkg.com/element-plus@2.9.3/dist/index.full.min.js'],
  ['element-plus-css','https://unpkg.com/element-plus@2.9.3/dist/index.css'],
  ['react-select',   'https://unpkg.com/react-select@5.10.0/dist/react-select.js'],
  ['esm.sh react',   'https://esm.sh/react@18.3.1'],
  ['esm.sh react-dom/client', 'https://esm.sh/react-dom@18.3.1/client'],
  ['esm.sh radix-select', 'https://esm.sh/@radix-ui/react-select@2.2.2?deps=react@18.3.1'],
  ['esm.sh react-select', 'https://esm.sh/react-select@5.10.0?deps=react@18.3.1,react-dom@18.3.1'],
];
const results = [];
for (const [name, url] of URLS) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    const buf = await r.arrayBuffer();
    results.push(name + ' ' + r.status + ' ' + Math.round(buf.byteLength / 1024) + 'KB');
  } catch (e) {
    results.push(name + ' ERR ' + String(e && e.message || e).slice(0, 80));
  }
}
console.log(results.join('\n'));
