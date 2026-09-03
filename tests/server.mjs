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
];

const CDN_PREFIX = 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/';
const CDN_LOCAL = '/vendor/intl-tel-input/build/';

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/test/test-page.html';
    const route = ROUTES.find(r => pathname.startsWith(r.prefix));
    if (!route) { res.writeHead(404); res.end('not found'); return; }
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
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`e2e fixture server: http://127.0.0.1:${PORT}`);
});
