// ══════════════════════════════════════════════════════════════════
// 12-login-capture.mjs — 登录态镜像采集旁路的纯函数库（issue #12 / 票 T3）
//
// 定位：06-capture-forms.mjs 附着模式（--attach）与 verify-ticket-12.mjs
//   合规门共享的唯一实现——门断言的就是工具运行的，不各说各话。
//
// 依据（spec #9 Q3/Q8）：
//   · CI/自动化永不登录；登录态 = 用户本地 CDP 附着人工采集旁路；
//   · 产物与公开页采集同构（同一 CAPTURE-MANIFEST 结构），条目标 login-derived；
//   · 密码/验证码等敏感字段值 → 形状占位（与 06-skeleton.mjs 文本形状令牌
//     同词表：数字→# / 字母→a / 其余→·，本库即该词表的第二消费点）；
//   · 原始快照仍走仓库外 archive 硬护栏（永不入库）。
//
// 全部为纯函数（无 IO、无浏览器）：零依赖、可离线测试。
// ══════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import path from 'node:path';

import { COUNTRY_FIELD, LOCALE_FIELD } from './06-capture-country.mjs';

const sha256buf = (buf) => createHash('sha256').update(buf).digest('hex');

// ── 形状令牌（与 06-skeleton.mjs textShape 同词表，含 ≤40 字符上限；幂等） ──
// 密码/验证码/账号标识的占位替换用它：保形状（长度 + 字符类别），不保内容。
export function shapeToken(v) {
  return String(v)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[0-9]/g, '#')
    .replace(/[a-zA-Z]/g, 'a')
    .replace(/[^\sa#+\-().:/]/g, '·')
    .slice(0, 40);
}

// ── 敏感字段判定（密码/验证码「等」：凭证 + 验证码 + 账号标识 + 会话凭据） ──
// 只作用于 <input>；值替换只发生在 value 非空时（空值本就无内容）。
// 按钮类/布尔类 input 永不脱敏；其余 PII（姓名等普通文本）按 GLOSSARY
// 「登录态镜像」口径留给镜像页制作步骤人工剥除，采集器不越权。
const NEVER_TYPES = new Set(['submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio']);

export function sensitiveFieldReason(attrs) {
  const t = String(attrs.type || '').toLowerCase();
  if (NEVER_TYPES.has(t)) return null;
  const ac = String(attrs.autocomplete || '').toLowerCase();
  const ident = (String(attrs.name || '') + ' ' + String(attrs.id || '') + ' ' + ac).toLowerCase();
  if (t === 'password') return 'password';
  if (ac === 'one-time-code' || /otp|one[-_ ]?time|verif(y|ication)|two[-_ ]?factor/.test(ident)) return 'otp';
  if (t === 'email' || /(^|\s)username(\s|$)|user[-_ ]?id|^login/.test(ac)) return 'identity';
  if (t === 'tel') return 'identity';
  if (t === 'hidden' && /(csrf|authenticity|_token|session)/.test(ident)) return 'session-token';
  return null;
}

// 极简 input 属性解析（同 06-skeleton.mjs parseAttrs 词法，够覆盖渲染后 DOM）
function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    attrs[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
  }
  return attrs;
}

// ── 敏感字段值 → 形状占位（字符串变换，幂等） ──
// 返回 { html, redactions:[{reason, name, shape}] }——记录只留形状，绝不含原值。
// 标签匹配器不得在引号属性值内的 `>` 处截断（value="ab>cd" 会把值切成两半：
// parseAttrs 拿不到完整值 → 漏脱敏），故闭合尖括号走「非引号 | 双引号串 | 单引号串」三路。
const INPUT_TAG_RE = /<input\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

export function redactSensitiveValues(html) {
  const redactions = [];
  const out = html.replace(INPUT_TAG_RE, (tag) => {
    const attrs = parseAttrs(tag);
    const raw = attrs.value;
    if (raw === undefined || raw === '') return tag;
    const reason = sensitiveFieldReason(attrs);
    if (!reason) return tag;
    const shape = shapeToken(raw);
    redactions.push({ reason, name: attrs.name || attrs.id || '(unnamed)', shape });
    return tag.replace(/(\svalue\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)/i, (_m, head) => head + '"' + shape.replace(/"/g, '&quot;') + '"');
  });
  return { html: out, redactions };
}

// ── 仓外护栏（票 06 既有语义的唯一共享实现；公开页/附着两路径同源） ──
export function assertArchiveOutsideRepo(outDir, repoRoot) {
  const o = path.resolve(outDir);
  const r = path.resolve(repoRoot);
  if (o === r || o.startsWith(r + path.sep)) {
    throw new Error('拒绝写入：原始快照输出目录不得位于仓库内 → ' + o);
  }
}

// ── 附着条目构造（CAPTURE-MANIFEST 同构 + login-derived 超集标记） ──
// 与公开页条目同形：id / source_url / family / http_status / raw / dom /
// frames / shot / ok；登录态专有字段只增不改：login_derived / capture_mode /
// captured_at / attached_url / redacted / redaction_count（06-manifest.mjs
// 对未知字段零感知）。redactionCount = 本次脱敏处数（形状记录不进条目，
// 原值永不落任何清单）。
// 采集条件（issue #34）：附着**不固定国别**——工具不导航、也不在用户浏览器里
// 装路由拦截，现场由用户出口 IP 决定。键照样落（capture_country: null），
// 语义是「本次采集未固定」，与「台账早于本旋钮（键缺失）」是两回事：后者被
// 06-skeleton 硬拒。locale 读自附着现场，只记录不伪造。
export function buildAttachEntry({ id, sourceUrl, family, attachedUrl, userAgent, browserLocale, domBuf, frames, shotRel, redactionCount }) {
  return {
    id,
    source_url: sourceUrl,
    family,
    login_derived: true,
    capture_mode: 'cdp-attach',
    [COUNTRY_FIELD]: null,
    [LOCALE_FIELD]: browserLocale || null,
    captured_at: new Date().toISOString(),
    attached_url: attachedUrl,
    redacted: true,
    redaction_count: redactionCount || 0,
    user_agent: userAgent,
    http_status: null, // 附着不走网络请求（匿名 GET 对登录页无意义，不伪造）
    raw: null,         // 原始响应层对登录态无对应物；06-manifest 走既有 null 分支
    dom: { file: 'dom/' + id + '.html', bytes: domBuf.length, sha256: sha256buf(domBuf) },
    frames: (frames || []).map((f) => ({
      file: f.rel, bytes: f.buf.length, sha256: sha256buf(f.buf), url: f.url,
    })),
    shot: { file: shotRel },
    ok: true,
  };
}

// ── 附着首次落盘时的清单骨架（顶层与公开页整批 report 同形） ──
export function newCaptureReport(entry, archiveRoot) {
  return {
    capturedAt: entry.captured_at,
    archiveRoot: String(archiveRoot).replace(/\\/g, '/'),
    archiveDir: 'corpus-forms',
    userAgent: entry.user_agent,
    entries: [entry],
  };
}

// ── CAPTURE-MANIFEST 按 id 原位合并（附着一次采一个标签页，不整批覆盖） ──
// 顶层 capturedAt 不动：那是公开页整批重捕的时点，附着不该让它漂移
// （附着条目自带 captured_at provenance）。
export function mergeCaptureManifest(report, newEntries) {
  const byId = new Map(newEntries.map((e) => [e.id, e]));
  const seen = new Set();
  const entries = report.entries.map((e) => {
    if (!byId.has(e.id)) return e;
    seen.add(e.id);
    return byId.get(e.id);
  });
  for (const e of newEntries) if (!seen.has(e.id)) entries.push(e);
  return { ...report, entries };
}

// ── 采集纪律（成对拒绝的唯一判定；06-capture-forms.mjs 与合规门共用） ──
// CI/自动化永不登录的机器形态：匿名模式拒绝 login:true source；
// 附着模式只服务 login:true source 且一次一个（--id 唯一）。
// 纯函数（抛错即拒绝），门可离线行为级测试两个方向。
export function assertCaptureDiscipline(args, selectedSources) {
  const loginIds = selectedSources.filter((s) => s.login === true).map((s) => s.id);
  if (args.attach) {
    if (!args.id) throw new Error('--attach 需要唯一 --id（一次附着采集一个已登录标签页）');
    if (selectedSources.length !== 1) throw new Error('--attach 只接受唯一 --id，得到 ' + selectedSources.length + ' 个');
    if (loginIds.length === 0) {
      throw new Error(
        '附着模式只服务 login:true 的登录态镜像 source（公开页走匿名重捕回路）——' +
        args.id + ' 未标 login:true（tests/corpus/forms/sources.json）'
      );
    }
  } else if (loginIds.length > 0) {
    throw new Error(
      '匿名采集拒绝 login:true source：' + loginIds.join(', ') +
      '（CI/自动化永不登录；登录态镜像走 --attach，见 tests/corpus/forms/LOGIN-CAPTURE.md）'
    );
  }
}

// ── login-derived 标记门（verify-ticket-12 硬校验的核心判定） ──
// 违例两种：unmarked-login-mirror（登录产物未标 → 拒绝入库）、
// unregistered-marker（标记未在 sources.json 登记 → 防私挂标记）。
// headerOf(source) 返回镜像页头注释文本；无镜像页（skeleton-only /
// deferred）返回 null，不在标记门范围——门管的是「镜像入库面」。
export const LOGIN_MARKER_RE = /^[ \t]*login-derived[ \t]*:/im;

export function checkLoginMarking(sources, headerOf) {
  const violations = [];
  for (const s of sources) {
    const header = headerOf(s);
    if (header == null) continue;
    const marked = LOGIN_MARKER_RE.test(header);
    if (s.login === true && !marked) {
      violations.push({
        id: s.id,
        kind: 'unmarked-login-mirror',
        msg: '登录态镜像未标 login-derived（未标 login-derived 的登录产物拒绝入库）',
      });
    }
    if (s.login !== true && marked) {
      violations.push({
        id: s.id,
        kind: 'unregistered-marker',
        msg: '镜像页带 login-derived 标记，但 sources.json 未声明 login:true',
      });
    }
  }
  return violations;
}
