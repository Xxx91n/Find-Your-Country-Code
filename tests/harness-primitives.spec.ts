// ══════════════════════════════════════════════════════════════════
// harness-primitives.spec.ts — Cycle-6 票 05 / A-029 交互原语自证（密封层）
//
// 本 spec 是「共享交互原语层可从密封层被驱动」的可执行证据：
//   ① 全链路原语：open → search → select → fill → 读回宿主字段 value（issue 验收 1）
//   ② 事件面：写入后宿主字段实际收到 input / change（L3 判据来源）
//   ③ GM 替身：记录 {title, fn} 且 fn 可调用（issue 验收 3）
//   ④ 断言一律 web-first locator + expect.soft —— 一次收全量、不中断（issue 验收 4）
//
// 原语的**唯一实现** = tests/helpers/primitives.mjs（与 tests/live/live-smoke.mjs
// 零转换加载同一份文件）。本 spec 只经 ./helpers/userscript 门面调用，门面内不含
// 任何原语实现。结构不变量由 tests/scripts/verify-ticket-05-harness.mjs 钉住。
//
// fixture 选择：tests/fixtures/harness-primitives.html（本票自带，形态取自 live 层
// 已知好对照组 mirror-three-forms.html#f-control），避免耦合其他票的 fixture 语义。
//
// 两条时序契约（实测确定，非猜测）：
//   · #cch-toast 的 on 类只保持 2000ms（src/ui/index.ts:186）—— 反馈快照必须紧跟
//     写入读取，不能排在任何带超时的等待式断言之后。
//   · UI.open 对同一 anchor 重入是 toggle 关闭（src/ui/index.ts:346）—— 菜单开面板
//     与 openPanelViaMenu 不可在同一条用例内对同一 anchor 重复调用。
// ══════════════════════════════════════════════════════════════════
import { test, expect } from 'playwright/test';
import {
  installUserscript, waitForInjection, openPanel, openPanelViaMenu, searchType,
  selectCountry, fillField, readHostField, readTier, readFeedback,
  readVisibleRows, recordFieldEvents, readFieldEvents, countFieldEvents,
  menuCommands, menuIds, menuCount, waitForMenu, invokeMenuCommand, panel,
  softInjected, softTier, softHostValue, softFieldEvent, softFeedback, softMenuCallable,
} from './helpers/userscript';

const FIXTURE = '/fixtures/harness-primitives.html';

/** 稳定菜单 id（src/main.ts 顶层注册，票 02/03 收口后的四顶入口）。 */
const MENU_IDS = ['cch-menu-restore', 'cch-menu-panel', 'cch-menu-settings', 'cch-menu-diag'];

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// ── 验收 1：交互原语可从密封层调用（open → search → select → fill → 读回 value） ──

test.describe('验收 1 · 全链路原语（open → search → select → fill → 读回宿主 value）', () => {
  test('A · select 宿主：四步原语逐段可调用，L1–L4 断言一次收全量', async ({ page }) => {
    await page.goto(FIXTURE);

    await test.step('inject → L1 元素已注入', async () => {
      await waitForInjection(page, '#hp-select');
      await softInjected(page, '#hp-select');
    });

    await test.step('open → 面板可见', async () => {
      await openPanel(page, '#hp-select');
      await expect.soft(panel(page), 'open 后面板 #cch-pop 应可见').toBeVisible();
    });

    await test.step('search → 列表收窄', async () => {
      const before = await readVisibleRows(page);
      await searchType(page, 'china');
      const after = await readVisibleRows(page);
      expect.soft(after.length, 'search 应收窄可见行（前 ' + before.length + ' → 后 ' + after.length + '）')
        .toBeLessThan(before.length);
      expect.soft(after.join(' '), 'search 结果应含 China').toMatch(/china|中国/i);
    });

    await test.step('select → 面板关闭', async () => {
      await selectCountry(page, 'cn');
      await expect.soft(panel(page), 'select 后面板应从 DOM 移除').toHaveCount(0);
    });

    // 紧跟写入读取：toast 的 on 类只保持 2000ms（src/ui/index.ts:186）
    await test.step('L4 用户反馈出现（趁 toast on 窗口内）', async () => {
      const fb = await readFeedback(page);
      expect.soft(fb.present, '#cch-toast 应已出现（实测 ' + JSON.stringify(fb) + '）').toBe(true);
      expect.soft(fb.on, '#cch-toast 应处于 on 态（实测 ' + JSON.stringify(fb) + '）').toBe(true);
      await softFeedback(page, /已填入|Filled/);
    });

    await test.step('fill → 读回宿主字段 value（L3）', async () => {
      await softHostValue(page, '#hp-select', '+86');
      const f = await readHostField(page, '#hp-select');
      expect.soft(f && f.value, 'readHostField 应读回 +86（实测 ' + JSON.stringify(f) + '）').toBe('+86');
      expect.soft(f && f.tag, '宿主字段应为 select').toBe('select');
      const tier = await readTier(page, '#hp-select');
      expect.soft(tier, 'data-cch-tier 应为合法档位（实测 ' + JSON.stringify(tier) + '）')
        .toMatch(/^(auto|lowkey)$/);
      await softTier(page, '#hp-select', 'lowkey');
    });
  });

  test('B · input 宿主：fillField 一站式原语 + 写入事件面（input/change 实际派发）', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInjection(page, '#hp-input');
    await recordFieldEvents(page, '#hp-input');

    const value = await fillField(page, '#hp-input', { iso: 'cn', query: 'china' });
    expect.soft(value, 'fillField 应返回写入后的宿主 value（实测 ' + JSON.stringify(value) + '）').toBe('86');

    await softHostValue(page, '#hp-input', '86');
    await softFieldEvent(page, 'input', 1);
    await softFieldEvent(page, 'change', 1);

    const events = await readFieldEvents(page);
    expect.soft(await countFieldEvents(page, 'change'),
      'change 计数应 ≥1（实测序列 [' + events.join(',') + ']）').toBeGreaterThanOrEqual(1);
    await softFeedback(page, /已填入|Filled/);
  });
});

// ── 验收 3：GM 替身记录 {title, fn} 且可调用 ──

test.describe('验收 3 · GM 替身记录 {title, fn} 且 fn 可调用（共享原语驱动）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForMenu(page, 4); // 等待式守卫：菜单注册发生在脚本求值时
  });

  test('C · menuCommands 记录 {title, fn} 且 fn 全部可调用；稳定 id 齐备', async ({ page }) => {
    const cmds = await menuCommands(page);
    expect.soft(cmds.length, '应登记 4 条命令（实测 ' + cmds.length + '：' + cmds.map((c) => c.title).join(' / ') + '）')
      .toBe(4);
    const notCallable = cmds.filter((c) => !c.callable).map((c) => c.title);
    expect.soft(notCallable, '所有命令的 fn 都应可调用（不可调用：' + notCallable.join(' / ') + '）').toEqual([]);

    const ids = await menuIds(page);
    for (const id of MENU_IDS) {
      expect.soft(ids, '稳定 id ' + id + ' 应存在（实测 ' + ids.join(',') + '）').toContain(id);
    }
    expect.soft(await menuCount(page), '计数应等于条目数（id 原地更新语义的可观测面）').toBe(cmds.length);

    await softMenuCallable(page, /面板|panel/i);
    await softMenuCallable(page, /设置|settings/i);
    await softMenuCallable(page, /诊断|diagnostic/i);
  });

  test('D · invokeMenuCommand：「打开面板」命令 fn 真实执行 → 面板可见', async ({ page }) => {
    const r = await invokeMenuCommand(page, /面板|panel/i);
    expect.soft(r.invoked, '命令应被真实调用（实测 ' + JSON.stringify(r) + '）').toBe(true);
    expect.soft(r.id, '命中的应为 cch-menu-panel').toBe('cch-menu-panel');
    expect.soft(r.reason, '调用不应有拒因').toBeNull();
    await expect.soft(panel(page), '菜单命令执行后面板应可见').toBeVisible();
  });

  test('E · openPanelViaMenu：同一原语的封装可直接开面板', async ({ page }) => {
    const r = await openPanelViaMenu(page, /面板|panel/i);
    expect.soft(r.invoked, 'openPanelViaMenu 应复用 invokeMenuCommand').toBe(true);
    await expect.soft(panel(page), 'openPanelViaMenu 后面板应可见').toBeVisible();
  });

  test('F · invokeMenuCommand：恢复命令可调用不抛异常；无匹配给出 no-match 拒因', async ({ page }) => {
    const before = await menuCount(page);
    const r = await invokeMenuCommand(page, /恢复|restore|exempt/i);
    expect.soft(r.invoked, '恢复命令应可调用（实测 ' + JSON.stringify(r) + '）').toBe(true);
    expect.soft(r.id, '命中的应为 cch-menu-restore').toBe('cch-menu-restore');
    expect.soft(r.reason, '调用不应有拒因').toBeNull();
    expect.soft(await menuCount(page), '调用命令不应改变菜单计数（id 原地更新语义）').toBe(before);

    const miss = await invokeMenuCommand(page, /__never_exists__/);
    expect.soft(miss.invoked, '无匹配命令应返回 invoked:false').toBe(false);
    expect.soft(miss.reason, '无匹配应给出 no-match 拒因').toBe('no-match');
  });
});

// ── 验收 4：断言改 web-first + expect.soft 一次收全量 ──

test.describe('验收 4 · expect.soft 一次收全量（单条用例内跨宿主全部软断言）', () => {
  test('G · 两字段跨宿主：L1/L3/L4 软断言全部被求值，前序失败不中断后续', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInjection(page, '#hp-select');
    await waitForInjection(page, '#hp-input');

    await softInjected(page, '#hp-select');
    await softInjected(page, '#hp-input');

    const vSelect = await fillField(page, '#hp-select', { iso: 'cn', query: 'china' });
    const vInput = await fillField(page, '#hp-input', { iso: 'gb', query: 'united kingdom' });

    // 以下断言全部为 soft：任一失败不抛断，剩余断言仍被求值（一次收全量）
    expect.soft(vSelect, 'select 宿主应写入 +86（实测 ' + JSON.stringify(vSelect) + '）').toBe('+86');
    expect.soft(vInput, 'input 宿主应写入 44（实测 ' + JSON.stringify(vInput) + '）').toBe('44');
    await softHostValue(page, '#hp-select', '+86');
    await softHostValue(page, '#hp-input', '44');
    await softFeedback(page, /已填入|Filled/);
  });
});
