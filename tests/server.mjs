// E2E 静态 fixture 服务器：test/ 三个手工测试页 + tests/fixtures/ 回归 fixture + 本地 vendored intl-tel-input。
// Hermetic：cch-test-page2.html 里的 jsdelivr CDN 引用在响应中改写到 /vendor/ 路径，离线可复现。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.E2E_PORT || 4273);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const ROUTES = [
  { prefix: '/test/', dir: path.join(ROOT, 'test') },
  { prefix: '/fixtures/', dir: path.join(ROOT, 'tests', 'fixtures') },
  { prefix: '/vendor/intl-tel-input/', dir: path.join(ROOT, 'node_modules', 'intl-tel-input') },
  // 票 09 框架 fixture 本地 vendored（hermetic：E2E 无外部网络依赖）
  { prefix: '/vendor/react/', dir: path.join(ROOT, 'node_modules', 'react') },
  { prefix: '/vendor/react-dom/', dir: path.join(ROOT, 'node_modules', 'react-dom') },
  { prefix: '/vendor/vue/', dir: path.join(ROOT, 'node_modules', 'vue', 'dist') },
  // 票 15 React 19 本地 vendored（npm 别名包 react19/react-dom19 生产构建，hermetic 无外网）

  { prefix: '/gen/react19/', handler: serveReact19Gen },

];

const CDN_PREFIX = 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/';
const CDN_LOCAL = '/vendor/intl-tel-input/build/';

// ── 票 15：React 19 CJS→ESM 现场转译（零依赖，node_modules 生产构建直供）──
// React 19 npm 包不再发布 UMD/min 构建；按真实 require 图（react → scheduler →
// react-dom → react-dom-client）现场拼装 ESM。转译只改写 require()/exports. 赋值，
// 模块体内代码逐字保留（无打包器语义漂移）；页面以命名空间 import 消费。
const REACT19_FILES = {
  react: 'react19/cjs/react.production.js',
  scheduler: 'react-dom19/node_modules/scheduler/cjs/scheduler.production.js',
  'react-dom': 'react-dom19/cjs/react-dom.production.js',
  'react-dom-client': 'react-dom19/cjs/react-dom-client.production.js',
};

const REACT19_CACHE = new Map();

function react19Esm(name, stack = []) {
  if (REACT19_CACHE.has(name)) return REACT19_CACHE.get(name);
  if (stack.includes(name)) throw new Error('react19 dependency cycle: ' + stack.concat(name).join(' -> '));
  const rel = REACT19_FILES[name];
  if (!rel) throw new Error('react19 module unknown: ' + name);
  const src = readFile(path.join(ROOT, 'node_modules', rel), 'utf8');
  const imports = [];
  const body = src
    .replace(/require\("([\w-]+)"\)/g, (_, dep) => {
      imports.push(dep);
      return '__r19_' + dep.replace(/-/g, '_') + '__';
    })
    .replace(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm, 'export const $1 =');
  const uniq = [...new Set(imports)];
  const header = uniq.map(dep =>
    "import * as __r19_" + dep.replace(/-/g, '_') + "__ from '/gen/react19/" + dep + "';").join("\n");
  return header + '\n' + body;
}

async function serveReact19Gen(pathname, res) {
  try {
    const name = pathname.slice('/gen/react19/'.length).replace(/\/+$/, '');
    if (!(name in REACT19_FILES)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(react19Esm(name));
  } catch (e) {
    res.writeHead(500);
    res.end('react19 gen error: ' + (e && e.message));
  }
}

// npm 包不发布 CDN 专供的 intlTelInputWithUtils.js 合并 bundle，现场按官方顺序拼接。
function withUtilsBundle() {
  const dir = path.join(ROOT, 'node_modules', 'intl-tel-input', 'build', 'js');
  return Promise.all(
    ['utils.js', 'data.js', 'intlTelInput.js'].map(f => readFile(path.join(dir, f)))
  ).then(parts => Buffer.concat([...parts.flatMap(p => [p, Buffer.from('\n')])]));
}

function resolveWithin(dir, rel) {
  const target = path.resolve(dir, rel);
  if (target !== dir && !target.startsWith(dir + path.sep)) return null;
  return target;
}

// 票 12:跨域 fixture 需要不同 origin —— 同一 handler 监听 PORT 与 PORT+1(端口不同 = origin 不同)
const handler = async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/test/test-page.html';
    const route = ROUTES.find(r => pathname.startsWith(r.prefix));
    if (!route) { res.writeHead(404); res.end('not found'); return; }
    if (route.handler) { await route.handler(pathname, res); return; }

    const file = resolveWithin(route.dir, pathname.slice(route.prefix.length));
    if (!file) { res.writeHead(403); res.end('forbidden'); return; }
    let body;
    if (pathname === '/vendor/intl-tel-input/build/js/intlTelInputWithUtils.js') {
      body = await withUtilsBundle();
    } else {
      body = await readFile(file);
    }
    if (file.endsWith('.html')) {
      body = Buffer.from(body.toString('utf8').split(CDN_PREFIX).join(CDN_LOCAL));
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
};

const server = http.createServer(handler);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`e2e fixture server: http://127.0.0.1:${PORT}`);
});

const serverAlt = http.createServer(handler);
serverAlt.listen(PORT + 1, '127.0.0.1', () => {
  console.log(`e2e fixture server (cross-origin): http://127.0.0.1:${PORT + 1}`);
});
