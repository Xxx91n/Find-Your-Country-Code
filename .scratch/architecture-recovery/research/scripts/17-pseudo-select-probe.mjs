// 17-pseudo-select-probe.mjs — ticket 17 forensics probe (pseudo-select DOM/ARIA forensics)
// Loads pinned-CDN sample pages, opens each pseudo select, captures Playwright aria snapshots
// and structured DOM/ARIA facts. Research tooling only: imports no repo code, touches no repo src.
// Usage: node .scratch/architecture-recovery/research/scripts/17-pseudo-select-probe.mjs [pagesDir] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const PAGES_DIR = process.argv[2] || path.join(repoRoot, '.scratch/architecture-recovery/research/pseudo-select-samples/pages');
const OUT_DIR = process.argv[3] || path.join(repoRoot, '.scratch/architecture-recovery/research/pseudo-select-samples');
const SNAP_DIR = path.join(OUT_DIR, 'snapshots');
const FACTS_DIR = path.join(OUT_DIR, 'facts');
fs.mkdirSync(SNAP_DIR, { recursive: true });
fs.mkdirSync(FACTS_DIR, { recursive: true });

const EVENTS_INIT = 'window.__fycEvents=[];["input","change"].forEach(function(t){document.addEventListener(t,function(e){var el=e.target;try{window.__fycEvents.push({type:t,tag:el.tagName,name:el.name||null,value:(el.value!==undefined?String(el.value).slice(0,60):null)});}catch(err){}},true);});';

const DUMP_ATTRS = (el) => { const o = { tag: el.tagName, id: el.id || null, cls: String(el.className || '').slice(0, 90), role: el.getAttribute('role'), tabIndex: el.tabIndex, text: (el.textContent || '').trim().slice(0, 60), attrs: {} }; for (const a of el.getAttributeNames()) { if (a.startsWith('aria-') || a.startsWith('data-') || ['name','type','readonly','disabled','for'].includes(a)) o.attrs[a] = el.getAttribute(a); } return o; };;
const ROLE_CENSUS = () => Array.from(document.querySelectorAll('[role]')).slice(0, 40).map(el => ({ role: el.getAttribute('role'), tag: el.tagName, id: el.id || null, cls: String(el.className || '').slice(0, 50), text: (el.textContent || '').trim().slice(0, 26) }));;
const CARRIERS = () => Array.from(document.querySelectorAll('input,select,textarea')).map(el => ({ tag: el.tagName, type: el.getAttribute('type'), name: el.getAttribute('name'), id: el.id || null, value: (el.value !== undefined ? String(el.value).slice(0, 40) : null), ariaHidden: el.getAttribute('aria-hidden'), htmlHidden: !!el.hidden, tabindex: el.getAttribute('tabindex'), readonly: el.getAttribute('readonly'), cls: String(el.className || '').slice(0, 70) }));;
const POPUP_FACTS = (lb) => { const chain = []; let n = lb; for (let i = 0; i < 4 && n && n.parentElement; i++) { n = n.parentElement; const c = typeof n.className === 'string' ? n.className.split(/\s+/).slice(0, 2).join('.') : ''; chain.push(n.tagName + (n.id ? '#' + n.id : '') + (c ? '.' + c : '')); } const o = { id: lb.id || null, tag: lb.tagName, cls: String(lb.className || '').slice(0, 90), ariaAndData: {}, parentChain: chain }; for (const a of lb.getAttributeNames()) { if (a.startsWith('aria-') || a.startsWith('data-')) o.ariaAndData[a] = lb.getAttribute(a); } return o; };;
const OPTIONS_FACTS = () => Array.from(document.querySelectorAll('[role="option"]')).map(el => ({ id: el.id || null, tag: el.tagName, text: (el.textContent || '').trim().slice(0, 44), ariaSelected: el.getAttribute('aria-selected'), ariaDisabled: el.getAttribute('aria-disabled'), ariaLabel: el.getAttribute('aria-label'), dataValue: el.getAttribute('data-value'), dataHighlighted: el.getAttribute('data-highlighted'), tabindex: el.getAttribute('tabindex'), cls: String(el.className || '').slice(0, 60) }));;
const FOCUS_FACTS = () => { const el = document.activeElement; const cands = Array.from(document.querySelectorAll('[role="combobox"], [role="listbox"], [aria-activedescendant]')).slice(0, 8).map(c => ({ tag: c.tagName, role: c.getAttribute('role'), id: c.id || null, activeDescendant: c.getAttribute('aria-activedescendant'), expanded: c.getAttribute('aria-expanded'), controls: c.getAttribute('aria-controls') })); return { active: el ? { tag: el.tagName, id: el.id || null, role: el.getAttribute('role'), cls: String(el.className || '').slice(0, 60) } : null, candidates: cands }; };;

const LISTBOX_OR = '[role="listbox"], .ant-select-dropdown:not(.ant-select-dropdown-hidden), .el-select-dropdown:not([style*="display: none"]), .MuiMenu-list, .rs__menu';

async function openPopup(page, combobox) {
  const attempts = [];
  const handle = typeof combobox === 'string' ? page.locator(combobox).first() : combobox;
  attempts.push(() => handle.click({ timeout: 4000 }));
  attempts.push(() => page.locator('.ant-select-selector, .el-select__wrapper, .MuiSelect-select, .rs__control').first().click({ timeout: 4000 }));
  attempts.push(() => page.locator('[data-testid="trigger"]').first().click({ timeout: 4000 }));
  for (let i = 0; i < attempts.length; i++) {
    try { await attempts[i](); break; } catch (e) { if (i === attempts.length - 1) throw new Error('all click attempts failed: ' + String(e.message || e).slice(0, 120)); }
  }
  try { await page.waitForSelector(LISTBOX_OR, { state: 'visible', timeout: 8000 }); return true; }
  catch (e) { return false; }
}

async function probeLib(browser, file) {
  const lib = path.basename(file, '.html');
  const facts = { lib, capturedAt: new Date().toISOString(), errors: [] };
  const ctx = await browser.newContext();
  ctx.setDefaultTimeout(15000);
  await ctx.addInitScript(EVENTS_INIT);
  const page = await ctx.newPage();
  page.on('pageerror', e => facts.errors.push('pageerror: ' + String(e).slice(0, 140)));
  try {
    await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction('!!window.__fycMeta', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    facts.meta = await page.evaluate(() => window.__fycMeta);

    let trig = page.locator('[aria-haspopup="listbox"]').first();
    if (!(await trig.count())) trig = page.locator('[role="combobox"]').first();
    if (!(await trig.count())) throw new Error('no combobox element found');
    const trigH = await trig.elementHandle();
    facts.comboboxClosed = await page.evaluate(DUMP_ATTRS, trigH);
    facts.roleCensusClosed = await page.evaluate(ROLE_CENSUS);
    facts.carriersClosed = await page.evaluate(CARRIERS);
    fs.writeFileSync(path.join(SNAP_DIR, lib + '--closed.yml'), await page.locator('body').ariaSnapshot(), 'utf8');

    facts.popupOpen = await openPopup(page, trig);
    facts.comboboxOpen = await page.evaluate(DUMP_ATTRS, trigH);
    facts.roleCensusOpen = await page.evaluate(ROLE_CENSUS);
    facts.carriersOpen = await page.evaluate(CARRIERS);
    let lbH = null;
    try { lbH = await page.locator('[role="listbox"]').first().elementHandle({ timeout: 3000 }); } catch (e) {}
    if (lbH) {
      facts.popup = await page.evaluate(POPUP_FACTS, lbH);
      facts.popupAriaSnapshot = await page.locator('[role="listbox"]').first().ariaSnapshot();
    }
    facts.optionsOpen = await page.evaluate(OPTIONS_FACTS);
    if (facts.popupOpen) fs.writeFileSync(path.join(SNAP_DIR, lib + '--open.yml'), await page.locator('body').ariaSnapshot(), 'utf8');

    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(450);
    facts.focusAfterArrows = await page.evaluate(FOCUS_FACTS);

    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    facts.comboboxAfterSelect = await page.evaluate(DUMP_ATTRS, trigH);
    facts.optionsAfterSelect = await page.evaluate(OPTIONS_FACTS);
    facts.carriersAfterSelect = await page.evaluate(CARRIERS);
    facts.focusAfterSelect = await page.evaluate(FOCUS_FACTS);
    facts.valueEvents = await page.evaluate(() => window.__fycEvents);
    fs.writeFileSync(path.join(SNAP_DIR, lib + '--selected.yml'), await page.locator('body').ariaSnapshot(), 'utf8');
  } catch (e) {
    facts.errors.push('fatal: ' + String(e && e.message || e).slice(0, 220));
  }
  await ctx.close();
  fs.writeFileSync(path.join(FACTS_DIR, lib + '.json'), JSON.stringify(facts, null, 2), 'utf8');
  const ok = facts.errors.length === 0 && facts.popupOpen === true;
  const t = facts.comboboxClosed || {};
  const sel = (facts.optionsAfterSelect || []).filter(o => o.ariaSelected === 'true').length;
  return lib + ' | ' + (ok ? 'OK' : 'FAIL') + ' | trigger=' + (t.tag || '?') + '[role=' + (t.role || '-') + ']'
    + ' | popup=' + (facts.popupOpen ? (facts.popup ? facts.popup.tag + (facts.popup.id ? '#' + facts.popup.id : '') : 'open-norolelistbox') : 'NOT-OPEN')
    + ' | options=' + ((facts.optionsOpen || []).length) + ' | selected=' + sel
    + ' | carriers=' + ((facts.carriersAfterSelect || []).length) + ' | events=' + ((facts.valueEvents || []).length)
    + ' | errs=' + facts.errors.length;
}

const browser = await chromium.launch();
const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html')).map(f => path.join(PAGES_DIR, f));
const lines = ['playwright probe ' + new Date().toISOString() + ' pages=' + files.length];
let goodCount = 0;
for (const f of files) {
  try { const line = await probeLib(browser, f); lines.push(line); if (line.includes(' | OK | ')) goodCount++; }
  catch (e) { lines.push(path.basename(f) + ' | HARNESS-FAIL | ' + String(e && e.message || e).slice(0, 120)); }
}
await browser.close();
lines.push('summary: ' + goodCount + '/' + files.length + ' libs fully captured');
console.log(lines.join(String.fromCharCode(10)));
if (goodCount < 3) process.exit(1);
