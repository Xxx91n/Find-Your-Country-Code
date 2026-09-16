// 票 06 侦察脚本（非交付物）：对镜像页跑一次真实注入，观测各页的档位/命中元素。
// 用途：为 tests/corpus-forms.spec.ts 的断言提供**现实基线**（不凭猜）。
// 口径纪律（R1）：UA / 等待序列 / 扫描函数一律取自 06-probe-common.mjs，
// 与 06-probe-real.mjs 逐字同源；不得就地重写其中任何一项。
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installUserscript, userscriptCode } from '../../../../tests/helpers/primitives.mjs';
import { UA, settle, scanWrappers } from './06-probe-common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const PORT = Number(process.env.E2E_PORT || 4287);

const PAGES = [
  ['iti-v29', 'iti-v29.html'],
  ['rpn-input', 'rpn-input.html'],
  ['codepen-iti-v17', 'codepen-iti-v17.html'],
  ['mui-autocomplete', 'mui-autocomplete.html'],
  ['element-plus-select', 'element-plus-select.html'],
  ['antd-select', 'antd-select.html'],
  ['chosen-select', 'chosen-select.html'],
  ['heroku-signup', 'heroku-signup.html'],
];

const srv = spawn(process.execPath, [path.join(REPO, 'tests', 'server.mjs')], {
  env: { ...process.env, E2E_PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch();
try {
  for (const [id, file] of PAGES) {
    const page = await browser.newPage({ userAgent: UA });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await installUserscript(page);
    await settle(page, `http://127.0.0.1:${PORT}/corpus/forms/mirrors/${file}`);
    let total = 0;
    const lines = [];
    for (const fr of page.frames()) {
      try {
        const snap = await fr.evaluate(scanWrappers);
        if (!snap.length) continue;
        total += snap.length;
        lines.push(`    [frame ${fr.url().slice(0, 56)}]`);
        for (const o of snap) lines.push(`      ${o.tag}#${o.id || '-'}.${o.cls}  tier=${o.tier} score=${o.score} lowkey=${o.lowkey}`);
      } catch {}
    }
    console.log(`===== ${id} =====`);
    console.log(`  frames=${page.frames().length} wrappers=${total} pageerrors=${errs.length}${errs.length ? ' [' + errs.join(' | ') + ']' : ''}`);
    lines.forEach((l) => console.log(l));
    await page.close();
  }
} finally {
  await browser.close();
  srv.kill();
}
