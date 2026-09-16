// ══════════════════════════════════════════════════════════════════
// iti-l3-criterion.spec.ts — Cycle-6 票 11 / A-035：ITI 形态下 L3 的正确可观测判据
//
// 判定结论（依据：atomcode 深度调研 + 本地确定性复现，见
// .scratch/architecture-recovery/research/atomcode-11-iti-l3-criterion.md 与
// research/window-reports/11-iti-l3-criterion-report.md）：
//   · ITI 官方**不承诺**把所选国家区号写进它接管的 input.value；separateDialCode 模式下
//     区号由独立元素（.iti__selected-dial-code）承载，input.value 只留国家号码。
//   · ITI **从不**派发原生 input / change；切国时派发官方自定义事件 countrychange。
//   · 因此 ITI 形态的「写入结果」= **选中国家状态**，而非 input.value。
//
// 本 spec 把两件事钉在 PR 阻断面（密封层，真 Chromium + 出厂产物，零外网）：
//   ① 对照组：普通 select 字段**仍按原判据**（value == 区号 + input/change 各 ≥1）
//   ② ITI 形态（默认 / separateDialCode）：L3 判据 = 选中国家状态（官方读 API → DOM 选中态）
//      + ITI 官方 countrychange 事件；并记录旧判据在此形态下确定性红灯的对照事实。
//
// 断言纪律（验收面 §1 / D-002）：裁定权在**页面侧外部可观测结果**；本 spec 读的是 ITI（宿主页
// 第三方库）的**官方公共面**与 DOM 选中态，不是被测脚本的自报结果。
// 断言一律 expect.soft（一次收全量）；原语唯一实现 = tests/helpers/primitives.mjs。
// ══════════════════════════════════════════════════════════════════
import { test, expect } from 'playwright/test';
import {
  installUserscript, waitForInjection, openPanel, searchType, selectCountry,
  readHostValue, readFieldEvents, countFieldEvents, recordFieldEvents,
  readWriteSurface, readItiSelectedCountry, readItiCountryEvents, recordItiCountryEvents,
  ITI_COUNTRY_EVENT,
} from './helpers/userscript';

const FIXTURE = '/fixtures/iti-l3-write-surface.html';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('票 11 / A-035 · L3 判据按写入口形态分派', () => {
  test('对照组 · 普通 select 仍按原判据（value == 区号 + input/change ≥1）', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInjection(page, '#ctl-select');
    expect.soft(await readWriteSurface(page, '#ctl-select'), '普通 select 应判定为 field 写入口')
      .toBe('field');
    await recordFieldEvents(page, '#ctl-select');
    await openPanel(page, '#ctl-select');
    await searchType(page, 'china');
    await selectCountry(page, 'cn');
    expect.soft(await readHostValue(page, '#ctl-select'), '宿主 select 的 value 应为 +86（原判据，逐字不变）')
      .toBe('+86');
    const events = await readFieldEvents(page);
    expect.soft(events.includes('input') && events.includes('change'),
      '宿主 select 应派发 input 与 change 各 ≥1（原判据，逐字不变）— 实测 [' + events.join(',') + ']')
      .toBe(true);
  });

  for (const [id, desc] of [
    ['#iti-plain', '默认模式'],
    ['#iti-sep', 'separateDialCode 模式（区号由独立元素承载）'],
  ] as const) {
    test('ITI · ' + id + ' ' + desc + ' → L3 判据 = 选中国家状态', async ({ page }) => {
      await page.goto(FIXTURE);
      await waitForInjection(page, id);
      expect.soft(await readWriteSurface(page, id), 'ITI 接管字段应判定为 iti 写入口').toBe('iti');
      await recordFieldEvents(page, id);
      await recordItiCountryEvents(page, id);
      const pre = await readItiSelectedCountry(page, id);
      expect.soft(pre.iso2, '写入前 ITI 选中国家应为初始值 us（实测 ' + JSON.stringify(pre.raw) + '）').toBe('us');

      await openPanel(page, id);
      await searchType(page, 'china');
      await selectCountry(page, 'cn');

      // ① 新判据（决定性）：选中国家状态 = 写入结果
      const st = await readItiSelectedCountry(page, id);
      expect.soft(st.iso2, '写入后 ITI 选中国家应为 cn（via ' + st.via + '）').toBe('cn');
      // ② 独立读取路径交叉核验（DOM 选中态，不经官方读 API）
      const dom = await readItiSelectedCountry(page, id, { domOnly: true });
      expect.soft(dom.iso2, 'DOM 选中态应独立反映 cn（via ' + dom.via + '）').toBe('cn');
      // ③ ITI 官方事件面（v17 起跨 v16–v29 未改名）
      expect.soft(await readItiCountryEvents(page), 'ITI 应广播官方 countrychange 事件')
        .toContain(ITI_COUNTRY_EVENT);

      // ④ 对照事实（判据变更的依据，非放宽）：旧判据在本形态下确定性红灯
      const value = await readHostValue(page, id);
      const inputCount = await countFieldEvents(page, 'input');
      const changeCount = await countFieldEvents(page, 'change');
      test.info().annotations.push({
        type: 'legacy-observables',
        description: '旧判据读数（保留记录，不作 ITI 判据）：value=' + JSON.stringify(value)
          + ' input=' + inputCount + ' change=' + changeCount,
      });
      expect.soft(changeCount, 'ITI 从不派发原生 change（旧判据在此形态不可满足）').toBe(0);
      expect.soft(inputCount, 'ITI 不派发原生 input（旧判据在此形态不可满足）').toBe(0);
      if (id === '#iti-sep') {
        expect.soft(value, 'separateDialCode：input.value 只承载国家号码（区号在独立元素），旧判据确定性红灯')
          .toBe('');
      }
    });
  }
});
