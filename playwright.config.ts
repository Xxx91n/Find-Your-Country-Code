import { defineConfig } from 'playwright/test';

// 一条命令跑全部 E2E：npm run e2e（= npm run build && playwright test）。
// 服务器与端口由 tests/server.mjs 提供，CI 可复用（headless，无外部网络依赖）。
const PORT = Number(process.env.E2E_PORT || 4273);

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  workers: 2, // 并发浏览器实例过多会在本机触发 launch 超时
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
  },
  webServer: {
    command: 'node tests/server.mjs',
    url: `http://127.0.0.1:${PORT}/test/test-page.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
