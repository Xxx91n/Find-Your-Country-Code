// ════════════════════════════════════════════════════════
// 诊断面（票 03 / A-028）：结构化诊断事件流 —— 唯一事实来源
//
// 分层（调研报告 Q1：采集层一次写入，渲染层各自只读）：
//   采集层（本模块，唯一写者，只 append 不渲染）
//     → 存储层（固定容量环形缓冲 + 计数器 + 四层状态，唯一事实源）
//       → 渲染层 A：面板时间线（人读，ui/index.ts _renderDiag）
//       → 渲染层 B：snapshot()/text() 机器可读（CI 断言 / 导出）
// 纪律：两个 serializer 读同一份 records()，面板不持有独立状态 —— 双写漂移（面板 ok / JSON fail）
//   从架构上不可能发生（Sentry breadcrumb 六键 schema + Playwright trace viewer 双出口同源先例）。
//
// 分级门控（D-012）：恒开 = error/warn + 计数器（uBlock「filter hit 统计恒开、逐条日志门控」同构）；
//   门控 = info/trace 全链路，且 detail 以 thunk 传入（门控关时 thunk 永不求值 = 惰性构造）。
//   热路径开销 = 一次布尔读取 + 一次属性自增；trace 关时无对象分配。
//
// 已验证因果（调研 Q5）：reason 取自 DIAG_REASON 闭集；层由 reason 前缀推导（层与原因不可能漂移）；
//   闭集外取值 → 降级为 unknown-open-debug 且 verified=false（诚实报未知，禁止猜测）。
// 自保（调研 Q5-4 / Q8）：诊断写入全包 try/catch，诊断自身抛错绝不拖垮主流程，降级不重试。
// ════════════════════════════════════════════════════════
import { DIAG_CAPACITY, DIAG_LAYERS, DIAG_REASON, DIAG_VERSION } from '../config';
import type { CchDiag, DiagCheck, DiagCounters, DiagDetail, DiagFixKey, DiagLayer, DiagLayerState, DiagLevel, DiagRecord, DiagSnapshot, DiagVerdict } from '../types';

// reason 闭集成员（装载期一次构建，运行时只做 Set.has）
const REASON_SET = new Set<string>(Object.keys(DIAG_REASON).map(k => (DIAG_REASON as Record<string, string>)[k]));
// 前缀 → 层（reason 命名空间即层归属；见 config.ts DIAG_REASON 注释）
const LAYER_PREFIX: Array<[string, DiagLayer]> = [['tool-', 'tool'], ['inject-', 'inject'], ['logic-', 'logic'], ['write-', 'write']];
// 无法归因时的层：不得冒充工具层结论（诚实报未知）
const UNKNOWN_LAYER: DiagLayer = 'logic';
// 每层修复提示的 i18n 键（仅 fail 时挂载；无已知修复手段不猜）
const FIX_BY_LAYER: Record<DiagLayer, DiagFixKey> = {
  tool: 'diagFixTool', inject: 'diagFixInject', logic: 'diagFixLogic', write: 'diagFixWrite',
};

function layerOf(reason: string): DiagLayer {
  for (let i = 0; i < LAYER_PREFIX.length; i++) {
    if (reason.indexOf(LAYER_PREFIX[i][0]) === 0) return LAYER_PREFIX[i][1];
  }
  return UNKNOWN_LAYER;
}

export function createDiag(opts: {
  capacity?: number;
  trace?: boolean;
  now?: () => number;
  env?: () => { url: string; frame: string };
} = {}): CchDiag {
  const cap = Math.max(1, Math.floor(opts.capacity || DIAG_CAPACITY));
  const now = opts.now || (() => Date.now());
  const env = opts.env || (() => ({ url: '', frame: '' }));
  const buf: Array<DiagRecord | undefined> = new Array(cap);
  let head = 0, count = 0, seq = 0, dropped = 0;
  let traceFlag = !!opts.trace;
  const counters: DiagCounters = {
    scans: 0, candidates: 0, scored: 0,
    injected: 0, lowkey: 0, registered: 0, summoned: 0, detached: 0,
    fills: 0, filled: 0, copied: 0, failed: 0,
    errors: 0, warns: 0, traces: 0, dropped: 0,
  };
  const layers = {} as Record<DiagLayer, DiagLayerState>;
  const resetLayers = (): void => {
    for (let i = 0; i < DIAG_LAYERS.length; i++) {
      layers[DIAG_LAYERS[i] as DiagLayer] = { verdict: 'unknown', point: '', reason: '', ts: 0 };
    }
  };
  resetLayers();

  // ── 采集层（唯一写者）───────────────────────────────
  const put = (level: DiagLevel, verdict: DiagVerdict, point: string, reason: string, detail: DiagDetail | null): void => {
    try {
      let verified = true;
      let r = reason;
      if (typeof r !== 'string' || !REASON_SET.has(r)) { r = DIAG_REASON.UNKNOWN; verified = false; }
      const pt = (typeof point === 'string' && point) ? point : 'unknown-point';
      const layer = layerOf(r);
      const rec: DiagRecord = { seq: seq++, ts: now(), level, layer, point: pt, verdict, reason: r, verified, detail: detail || null };
      if (count === cap) { dropped++; counters.dropped = dropped; } else { count++; }
      buf[head] = rec;
      head = (head + 1) % cap;
      const st = layers[layer];
      st.verdict = verdict; st.point = pt; st.reason = r; st.ts = rec.ts;
    } catch {
      // 诊断面自保：写入失败降级为门控告警（traceFlag 开启时才打印），不重试、不抛给主流程（调研 Q8：诊断不是业务逻辑）
      try { if (traceFlag) console.warn('[cch][diag] write failed'); } catch {}
      return;
    }
    if (level === 'error') counters.errors++;
    else if (level === 'warn') counters.warns++;
    else counters.traces++;
  };
  // 惰性构造：thunk 只在门控开启时求值（关闭时零分配、零调用）
  const lazily = (thunk: (() => DiagDetail | null) | null | undefined): DiagDetail | null => {
    if (typeof thunk !== 'function') return null;
    try { const d = thunk(); return d && typeof d === 'object' ? d : null; }
    catch { return { detailError: true }; }
  };

  const D: CchDiag = {
    // ── 恒开通道 ──
    error(point: string, reason: string, detail?: DiagDetail | null): void { put('error', 'fail', point, reason, detail || null); },
    warn(point: string, reason: string, detail?: DiagDetail | null): void { put('warn', 'fail', point, reason, detail || null); },
    counter(key: keyof DiagCounters, by?: number): void {
      // 热路径：一次类型检查 + 一次属性自增；不分配对象、不读时钟
      if (typeof counters[key] !== 'number') return;
      counters[key] += (typeof by === 'number' ? by : 1);
    },
    // ── 门控通道（惰性构造）──
    info(point: string, reason: string, thunk?: (() => DiagDetail | null) | null): void {
      if (!traceFlag) return;
      put('info', 'unknown', point, reason, lazily(thunk));
    },
    trace(point: string, reason: string, thunk?: (() => DiagDetail | null) | null): void {
      if (!traceFlag) return;
      put('trace', 'pass', point, reason, lazily(thunk));
    },
    // ── 读面 ──
    traceOn(): boolean { return traceFlag; },
    setTrace(on: boolean): boolean { traceFlag = !!on; return traceFlag; },
    records(): DiagRecord[] {
      try {
        const out: DiagRecord[] = [];
        for (let i = 0; i < count; i++) {
          const r = buf[(head - count + i + cap) % cap];
          if (r) out.push(r);
        }
        return out;
      } catch { return []; }
    },
    clear(): void {
      try {
        for (let i = 0; i < cap; i++) buf[i] = undefined;
        head = 0; count = 0; seq = 0; dropped = 0;
        const keys = Object.keys(counters) as Array<keyof DiagCounters>;
        for (let i = 0; i < keys.length; i++) counters[keys[i]] = 0;
        resetLayers();
      } catch {}
    },
    checks(): DiagCheck[] {
      const out: DiagCheck[] = [];
      try {
        for (let i = 0; i < DIAG_LAYERS.length; i++) {
          const L2 = DIAG_LAYERS[i] as DiagLayer;
          const s = layers[L2];
          out.push({
            id: 'layer:' + L2, layer: L2, status: s.verdict, reason: s.reason, point: s.point, ts: s.ts,
            fix: s.verdict === 'fail' ? FIX_BY_LAYER[L2] : null,
          });
        }
      } catch {}
      return out;
    },
    snapshot(): DiagSnapshot {
      let url = '', frame = '';
      try { const e = env(); url = e.url || ''; frame = e.frame || ''; } catch {}
      let health: DiagVerdict = 'unknown';
      try {
        let anyFail = counters.errors > 0;
        let allPass = true;
        for (let i = 0; i < DIAG_LAYERS.length; i++) {
          const v = layers[DIAG_LAYERS[i] as DiagLayer].verdict;
          if (v === 'fail') anyFail = true;
          if (v !== 'pass') allPass = false;
        }
        health = anyFail ? 'fail' : (allPass ? 'pass' : 'unknown');
      } catch {}
      const c = {} as DiagCounters;
      const l = {} as Record<DiagLayer, DiagLayerState>;
      try {
        const ck = Object.keys(counters) as Array<keyof DiagCounters>;
        for (let i = 0; i < ck.length; i++) c[ck[i]] = counters[ck[i]];
        for (let i = 0; i < DIAG_LAYERS.length; i++) {
          const L3 = DIAG_LAYERS[i] as DiagLayer;
          const s = layers[L3];
          l[L3] = { verdict: s.verdict, point: s.point, reason: s.reason, ts: s.ts };
        }
      } catch {}
      return {
        version: DIAG_VERSION, generatedAt: now(), url, frame, trace: traceFlag,
        capacity: cap, dropped, truncated: dropped > 0, health,
        counters: c, layers: l, checks: this.checks(), records: this.records(),
      };
    },
    // 人读文本投影（与 snapshot 同源；供复制/导出，不参与断言）
    text(): string {
      try {
        const snap = this.snapshot();
        const lines: string[] = [];
        lines.push('# cch diagnostics v' + snap.version + ' health=' + snap.health + ' trace=' + snap.trace);
        lines.push('url=' + snap.url + ' frame=' + snap.frame + ' capacity=' + snap.capacity + ' dropped=' + snap.dropped);
        const cs = snap.counters;
        lines.push('counters scans=' + cs.scans + ' candidates=' + cs.candidates + ' scored=' + cs.scored
          + ' injected=' + cs.injected + ' registered=' + cs.registered + ' summoned=' + cs.summoned
          + ' fills=' + cs.fills + ' filled=' + cs.filled + ' copied=' + cs.copied + ' failed=' + cs.failed
          + ' errors=' + cs.errors + ' warns=' + cs.warns);
        const ck = snap.checks;
        for (let i = 0; i < ck.length; i++) {
          lines.push('[' + ck[i].layer + '] ' + ck[i].status + ' ' + ck[i].reason + ' @' + ck[i].point);
        }
        const rec = snap.records;
        for (let i = 0; i < rec.length; i++) {
          const r = rec[i];
          lines.push(String(r.seq) + ' ' + r.level + ' ' + r.layer + ' ' + r.point + ' ' + r.reason
            + (r.verified ? '' : ' (unverified)'));
        }
        return lines.join('\n');
      } catch { return '# cch diagnostics unavailable'; }
    },
  };
  return D;
}
