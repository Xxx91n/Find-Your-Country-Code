// ══════════════════════════════════════════════════════════════════
// gate-assert.mjs — 门断言的共享真相检查（retro 2026-10-26）
//
// 失败模式（票 44 review 实证）：`src.indexOf(A) < src.indexOf(B)` 在 A 只匹配到
// 函数定义、或任一 token 缺失（-1 < n）时恒真——门看起来在守顺序，实际永远绿。
// 本库把「两个 token 都在场」与「顺序成立」拆成显式结果：缺失 / 逆序一律 ok:false。
//
// 用法（门脚本）：
//   const order = before(ORCH, 'assertReportOutsideCorpus(outDir);', 'TOOLS.capture,');
//   check(order.ok, '护栏先于抓取', order.detail);
//   const stim = containsToken(fixtureHtml, 'challenges.cloudflare.com');
//   check(stim.ok, '反例刺激在场', stim.detail);
//
// 纪律：first / second 传**调用点**文本（带分号、逗号等唯一后缀），不要传会先
// 命中定义处的片段；本库只能保证 token 在场与顺序，不能替你区分定义与调用。
// ══════════════════════════════════════════════════════════════════

export function before(src, first, second) {
  const text = String(src);
  const firstAt = text.indexOf(first);
  const secondAt = text.indexOf(second);
  const missing = [];
  if (firstAt < 0) missing.push(JSON.stringify(first));
  if (secondAt < 0) missing.push(JSON.stringify(second));
  if (missing.length) {
    return { ok: false, detail: '未找到：' + missing.join(', ') + '（缺失 token 一律判红，禁止 -1 恒真）' };
  }
  if (!(firstAt < secondAt)) {
    return {
      ok: false,
      detail: JSON.stringify(first) + ' @' + firstAt + ' 不在 ' + JSON.stringify(second) + ' @' + secondAt + ' 之前',
    };
  }
  return { ok: true, detail: JSON.stringify(first) + ' @' + firstAt + ' < ' + JSON.stringify(second) + ' @' + secondAt };
}

export function containsToken(src, token) {
  return String(src).indexOf(token) >= 0
    ? { ok: true, detail: '' }
    : { ok: false, detail: '未找到刺激：' + JSON.stringify(token) + '（fixture 注入可能是空操作）' };
}
