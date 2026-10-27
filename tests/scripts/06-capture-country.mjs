// ══════════════════════════════════════════════════════════════════
// 06-capture-country.mjs — 采集国别固定的纯函数库（issue #34 / spec #32 Q7/Q10/Q16）
//
// 定位：06-capture-forms.mjs（公开页重捕）、06-skeleton.mjs（骨架 meta）与
//   06-manifest.mjs（入库台账）共用的一份定义——三处读写的必须是同一口径，
//   否则「这次按哪个国家采」在台账里各说各话（12-login-capture.mjs 同模式）。
//
// 成因（spec #32）：演示页用 `initialCountryLookup` 按访问者 IP 定初始国家，
//   同一份代码换个出口 IP 就是一次假漂移（基线在 JP 下采 / CI 在 US 下重捕）。
//   本库把「初始国家」在采集侧钉住：拦截 `ipapi.co` 的响应，让页面的 lookup
//   拿到指定国家。**不伪造 UA、不伪造时区**（固定 locale 不在本轮范围：
//   只记录，不固定）。
//
// 除 `installCountryRoute`（唯一的接线动作，只调 Playwright 的 page.route）之外
// 全是纯函数（无 IO、无网络）；`installCountryRoute` 只要求传入对象提供
//   `page.route`，因此门可用假 page 行为级断言拦截接线。
// ══════════════════════════════════════════════════════════════════

export const DEFAULT_COUNTRY = 'us';

// 采集条件两字段（台账里的键名唯一定义处）。
export const COUNTRY_FIELD = 'capture_country';
export const LOCALE_FIELD = 'browser_locale';
export const HITS_FIELD = 'ipapi_stub_hits';
const CONDITION_FIELDS = [COUNTRY_FIELD, LOCALE_FIELD];

// 站点实际请求的是 `https://ipapi.co/json?token=…`（2026-10-27 抓
// https://intl-tel-input.com/js/homepage.js 对照：lookup 只读响应里的 country_code，
// 并把结果缓存进 sessionStorage）。匹配只认 host + `/json` 端点，**不认 token**——
// 站点换 token 不该让固定失效；也不放行 ipapi.co 的其它路径（只钉 lookup 端点）。
export const IPAPI_LOOKUP_URL_RE = /^https?:\/\/(?:[\w-]+\.)*ipapi\.co\/json\/?(?:\?|$)/i;

export function normalizeCountry(raw) {
  const c = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(c)) {
    throw new Error(
      '--country 需两字母 ISO 3166-1 alpha-2（如 us / jp / gb），收到 ' + JSON.stringify(String(raw == null ? '' : raw))
    );
  }
  return c;
}

// 桩响应体：只给 lookup 真正读取的字段。多给的字段等于替站点编造响应形状。
function ipapiStubBody(country) {
  return JSON.stringify({ country_code: normalizeCountry(country) });
}

// 固定值只有在「页面真的向桩要过响应」之后才成立：hits=0 意味着这个源压根不做
// ipapi lookup（或被站点换掉了端点），此时把请求值 us 原样写进台账就是在声称
// 「这次是按 us 采的」——而它从未生效。如实记 null，条件变化当场可见（issue #34）。
// hits 拿不准（缺失 / undefined）同样落 null：宁缺勿假。
export function resolvedCountry(country, hits) {
  return Number(hits) > 0 ? normalizeCountry(country) : null;
}

// 证据字段（不在强制两键之内，但必须与固定值一道入台账）：历史条目没有它就
// 不落键，保证 06-manifest --from-ledger 复现旧条目时逐字段稳定。
export function evidenceField(entry) {
  return entry && HITS_FIELD in entry ? { [HITS_FIELD]: entry[HITS_FIELD] } : {};
}

// 注册拦截；返回 { country, hits() } —— hits 是「本页面向桩要了几次响应」的计数，
// 0 = 这个源压根不做 IP lookup（国别固定对它无作用），台账如实记下而不是假装生效。
export async function installCountryRoute(page, country) {
  const pinned = normalizeCountry(country);
  let hits = 0;
  await page.route(IPAPI_LOOKUP_URL_RE, (route) => {
    hits++;
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: ipapiStubBody(pinned),
    });
  });
  return { country: pinned, hits: () => hits };
}

// ── 采集条件的两种读法（同一处定义，语义差别是刻意的） ──
// requireCaptureConditions：骨架派生紧跟重捕之后，台账里没有采集条件 = 管线断了
//   （archive 早于本旋钮 / 台账被手工改坏）→ 硬拒，绝不静默产出一个「条件未知」
//   的骨架（那正是本轮要消灭的归因盲区）。
//   三态要分清：**键在、值为 null**（附着模式不固定 / 桩未被请求）= 已记录「未固定」，
//   照常派生；**键缺失** = 条件未知，一律硬拒。
// readCaptureConditions：清单再生成（06-manifest --from-ledger）必须逐字段复现
//   **历史条目**，旧条目没有这两个键 → 键也不落（补 null 会让台账当场漂移、
//   再生成被自己拒掉）。
function partitionConditions(entry, label) {
  const present = CONDITION_FIELDS.filter((f) => entry && f in entry);
  if (present.length === CONDITION_FIELDS.length) {
    return { fields: { [COUNTRY_FIELD]: entry[COUNTRY_FIELD], [LOCALE_FIELD]: entry[LOCALE_FIELD] } };
  }
  if (present.length === 0) return { fields: null };
  const missing = CONDITION_FIELDS.filter((f) => !present.includes(f));
  return {
    fields: null,
    partial: label + ' 采集条件半登记：有 ' + present.join('+') + '、缺 ' + missing.join('+') +
      '（两个键同生同灭：只记一个等于把「条件未知」伪装成「条件已记」）',
  };
}

// 采集条件三字段的一次构造（工具写条目与门断言共用同一份形状）：
// 有浏览器才有 locale 与 hits，固定值仍要 hits>0 才成立（同 resolvedCountry）。
// 单列成函数的理由不是复用行数，是让「工具记了什么」可被门直接断言——
// 否则「CAPTURE-MANIFEST 记录采集国别与 locale」这条验收只能靠读源码确认。
export function captureConditionFields({ country, hits, locale }) {
  return {
    [COUNTRY_FIELD]: resolvedCountry(country, hits),
    [LOCALE_FIELD]: locale == null ? null : String(locale),
    [HITS_FIELD]: Number(hits) || 0,
  };
}

// 声称与证据不得各说各话：capture_country 非 null 就必须拿得出「页面真的问过桩」
// 的证据（hits>0）。缺这一条，旧版工具直接落请求值、或手工改坏的台账会把下一次
// 归因带错（读到「按 jp 采」其实没人固定过）。
// 三个调用面共用：06-skeleton 派生前、06-manifest 写 capture 块前（archive 模式）、
// 以及 --from-ledger 从仓内台账重建时——仓内台账也接受这个状态的话，
// assertLedgerStable 会把矛盾逐字节复现成既成事实（它比矛盾更晚，永远看不到）。
// 矛盾住在哪一层，出路就写哪一层的话：archive 侧的原始数据可以重捕；仓内台账侧只能先归因，
// 手改成 null 等于把证据缺口藏起来（而且 --from-ledger 的 cur 与 out 同源于该文件，
// 改完 assertLedgerStable 永远看不见）。按枚举取文案，不按显示文本相等判定——
// 否则改一句提示词就换错出路。
const CLAIM_REMEDIES = {
  archive: {
    at: 'CAPTURE-MANIFEST 条目',
    way: '用 06-capture-forms.mjs --country <iso2> 重捕，或如实改成 null（未固定）',
  },
  ledger: {
    at: '仓内台账 manifest.json 的 capture 块',
    way: '先归因（archive 侧原始台账说什么），归因后重捕；手改仓内台账只是把证据缺口藏起来',
  },
};

// 键不存在（历史条目）或值为 null（已记录「未固定」）都不触发：那不是矛盾。
export function requireEvidenceForClaim(entry, label, kind) {
  if (!entry || !(COUNTRY_FIELD in entry) || entry[COUNTRY_FIELD] == null) return;
  if (Number(entry[HITS_FIELD]) > 0) return;
  const r = CLAIM_REMEDIES[kind || 'archive'];
  throw new Error(
    label + ' 在 ' + r.at + ' 里声称固定为 ' + JSON.stringify(entry[COUNTRY_FIELD]) + '，但 ' + HITS_FIELD +
    '=' + JSON.stringify(entry[HITS_FIELD]) + ' —— 桩从未被请求过就不可能有固定值；' + r.way
  );
}

export function requireCaptureConditions(entry, label) {
  const r = partitionConditions(entry, label);
  if (r.partial) throw new Error(r.partial);
  if (!r.fields) {
    throw new Error(
      label + ' 的 CAPTURE-MANIFEST 条目没有采集条件（' + CONDITION_FIELDS.join(' + ') + '）——' +
      '该 archive 早于 --country 旋钮或被手工改坏；用 06-capture-forms.mjs --country <iso2> 重捕后再派生'
    );
  }
  requireEvidenceForClaim(entry, label);
  return r.fields;
}

export function readCaptureConditions(entry, label) {
  const r = partitionConditions(entry, label);
  if (r.partial) throw new Error(r.partial);
  return r.fields || {};
}
