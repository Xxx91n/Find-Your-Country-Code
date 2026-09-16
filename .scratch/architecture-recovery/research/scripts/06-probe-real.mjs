// 票 06 侦察脚本（非交付物）：对**真实页**跑一次真实注入，与镜像页探测结果对照，
// 判定「镜像保真度」是否足以承载检测结论（防伪影）。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installUserscript } from '../../../../tests/helpers/primitives.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PAGES = [
  ['iti-v29', 'https://intl-tel-input.com/'],
  ['rpn-input', 'https://catamphetamine.gitlab.io/react-phone-number-input/'],
  ['codepen-iti-v17', 'https://cdpn.io/webdevpuneet/fullpage/ExzVrPY'],
  ['mui-autocomplete', 'https://mui.com/material-ui/react-autocomplete/'],
  ['element-plus-select', 'https://element-plus.org/en-US/component/select.html'],
  ['antd-select', 'https://ant.design/components/select'],
  ['chosen-select', 'https://harvesthq.github.io/chosen/'],
  ['heroku-signup', 'https://signup.heroku.com/'],
];

const browser = await chromium.launch();
try {
  for (const entry of PAGES) {
    const [id, ...urls] = entry;
    const url = urls[urls.length - 1];
    const page = await browser.newPage({ userAgent: UA });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 60)));
    await installUserscript(page);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log(`===== ${id} =====  NAV-FAIL ${String(e.message).slice(0, 60)}`);
      await page.close();
      continue;
    }
    const all = [];
    for (const fr of page.frames()) {
      try {
        const snap = await fr.evaluate(() => {
          const out = [];
          document.querySelectorAll('.cch-wrapper').forEach((w) => {
            const btn = w.querySelector('.cch-btn');
            const t = w.firstElementChild || w;
            out.push({
              tag: t.tagName.toLowerCase(),
              id: t.id || null,
              cls: (t.className || '').toString().slice(0, 48),
              tier: btn ? btn.getAttribute('data-cch-tier') : null,
              score: btn ? btn.getAttribute('data-cch-score') : null,
            });
          });
          return out;
        });
        if (snap.length) all.push({ frame: fr.url().slice(0, 60), snap });
      } catch {}
    }
    console.log(`===== ${id} =====  frames=${page.frames().length} wrappers=${all.reduce((a, x) => a + x.snap.length, 0)} pageerrors=${errs.length}`);
    for (const { frame, snap } of all) {
      console.log(`  [frame ${frame}]`);
      for (const o of snap.slice(0, 6)) console.log(`    ${o.tag}#${o.id || '-'}.${o.cls}  tier=${o.tier} score=${o.score}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
