---
name: atomcode-research
description: "Deep web research via the atomcode CLI — one-shot (-p), read-only enforced, Exa+Tavily+AnySearch search engines plus Patchright browser rendering, output auto-indexed by ctx. Use for multi-source research needing verified citations."
argument-hint: "<research question>"
---

# AtomCode Research

Delegate web research to the local `atomcode` CLI. atomcode runs its own research loop
(hook auto-injects the research protocol: multi-angle quotas, cross-engine verification,
read-only gate). The `-p` prompt is the
research QUESTION ONLY — NEVER pre-list search angles, key names, or source domains in it;
that collapses the hook's own angle expansion and slows the run. Mode words ("快速查 X",
"对比 X 和 Y") are ALLOWED — they are the only exception to the no-hint rule.

## Serialized research (hard guardrail — read before dispatching)

atomcode research is a **serial, shared-quota resource**. Three external rate-limited engines
(Exa + Tavily + AnySearch) plus Patchright browser rendering sit behind a single CLI, and the
hook injects a heavy quota per run. Concurrency
> 1 at the orchestration layer saturates the engines at once and the run jams — observed
symptom: atomcode hangs / returns rate-limit errors / model stalls.

`concurrency: 1` on the `ctx_batch_execute` call below scopes ONLY **one command per batch**.
It does NOT, and cannot, prevent you from dispatching a second atomcode research in parallel
via a sibling subagent, a second skill instance, or a second `ctx_batch_execute` call in the
same turn. That parallel dispatch is the failure mode this gate exists to stop.

**Rule:** at most ONE atomcode research call in flight per session at any time. Before issuing
a new `ctx_batch_execute` for atomcode, finish (or cancel) any prior atomcode research currently
running. If the user's request decomposes into several research questions, **serialize them**:
ask one, wait for its answer, then ask the next. Do NOT fan out a research bundle into parallel
atomcode subagents. If you observed multi-source reasoning that genuinely needs parallelism,
do it via a single atomcode run with a broader question — never via N concurrent atomcode runs.

Resume anchoring (below) replaces retry: a failed run is resumed (probe → poll → find →
`-c`), never re-run from scratch. The serialization gate above is its sibling: it forbids a
second *different* query from starting while the first is still live — a different failure
mode than a resume.

## The only command (MUST run inside ctx via ctx_batch_execute)

```
ctx_batch_execute(
  commands: [{label: "atomcode", command: "atomcode -p \"<research question verbatim>\""}],
  queries: ["<2-5 keywords from the question, to pull matches inline>"],
  concurrency: 1,
  timeout: 600000
)
```

- Tool identifier: `ctx_batch_execute`. This is the PREFERRED carrier — it auto-indexes
  stdout into FTS5 and returns inline query matches in one round trip.
- NEVER use `shell_command` — it bypasses ctx entirely; stdout floods the main context and
  never gets indexed.
- Avoid `ctx_execute` for multi-source research — it does NOT auto-index stdout; if you must
  use it (single-source quick lookup), follow up with manual `ctx_index`.
- stdout = final answer only (with source list); research internals stay inside atomcode's
  own context and never enter yours.
- Read-only gate active: the subprocess cannot write files or run bash — safe from any directory.

**`concurrency: 1` is per-batch, not per-session.** It keeps one command inside THIS call. It
cannot see sibling subagents or a second `ctx_batch_execute` you fire in the same turn. The
serialization gate above is what enforces "one atomcode run at a time across the whole session";
this parameter alone does not. Do not rely on it to protect you from parallel oversubscription.

### Fallback if ctx_batch_execute is unreachable

If `ctx_batch_execute` is not in the tool list, use `ctx_execute(language: "shell", code:
"atomcode -p ...", timeout: 600000)` then manually `ctx_index(content: <stdout>, source:
"atomcode")`. If neither ctx tool is available, STOP and tell the user the skill cannot run
without the context-mode plugin — do NOT fall back to `shell_command`.

## Resume anchoring (续跑锚定 — 失败即续，完成前不开新调研)

**锚定规则**：一次调研结束的**唯一正常形态是拿到干净结果**。任何非正常结束——报错、
中断、超时（**额度/配额耗尽除外**，那是真没余量）——都意味着"这次调研还没完成"，
处理方式是**先探测、再等待、后续跑**，而不是重开一个等价的新调研：

1. **探测存活，不急着判死**：超时/中断返回后，先探测 atomcode 进程是否仍在运行
   （Windows: `Get-Process atomcode` 或 `tasklist /FI "IMAGENAME eq atomcode.exe"`；
   Linux/macOS: `pgrep -f atomcode`）。进程还在 = 调研可能仍在后台推进，**不能判死**。
2. **轮询等待**：进程存活时，每 30 秒探测一次并同时
   `ctx_search(queries: ["<原问题关键词>"], source: "atomcode")`，直到进程退出或检索命中
   （总等待上限对齐 timeout，如 10 分钟）。先等它跑完，别急着重开。
3. **退出后再找回**：进程已退出（自然完成或崩溃）→ `ctx_search` 找回落盘结果——命中说明
   它跑完了（PostToolUse 已索引 FTS5），直接用，不续跑不重跑。
4. **再续跑，不重开**：进程已退出且检索仍无果（真崩溃/被杀，没跑完）→ 同工作区执行
   `atomcode -c -p "继续之前被打断的调研：<原问题 verbatim>"`（实测确认 `-c` 复用上次
   会话上下文，`cached` tokens 证明加载）。
5. **额度不够是唯一例外**：明确显示 quota/credits 耗尽时，不续跑（续了也没配额跑），
   直接报告额度状态并停下；
6. **串行前提**：续跑能锚定到"被打断的那次"，靠的是本 skill 的串行护栏（同一工作区
   一次只允许一个调研在途）——实测确认同工作区多会话时 `-c` 只续**最近**那次，串行保证
   "最近那次 = 被打断的那次"。完成当前调研前，禁止发起任何新调研。

**禁令（硬护栏）**：任何情况下**禁止执行杀死 atomcode 进程的命令**（`Stop-Process` /
`taskkill` / `kill` / `pkill` / `killall` / `Stop-Process -Name atomcode`）。超时只代表
调用方放弃等待，进程可能马上跑完——杀掉才是真丢失。要等，不要杀。

## Timeout (10 minutes = 600000 ms, fixed, no negotiation)

- Pass `timeout: 600000` (ms). This is 10 minutes — fixed.
- A research run routinely takes 1–3 min, well inside the ceiling.
- `timeout` is best-effort: context-mode accepts the param (verified), but the ultimate backstop
  is the MCP host RPC timeout.
- On timeout, follow Resume anchoring (probe → poll → find → resume). A timeout is NOT a
  failure of the research — the atomcode process may still be running and its result may
  already be indexed.

## Success signal (dual, version-resilient)

A run succeeded if EITHER is true:
1. The ctx_batch_execute return contains "Indexed N sections" (N ≥ 1), OR
2. No error reported AND stdout is non-empty (contains the research answer + source list).

Do NOT rely on a single signal — the "Indexed N sections" format string may change across
context-mode versions. The dual signal survives format drift.

## Monitoring & failure (trigger → detection → action)

- **Stall / error / interruption** → non-zero exit / error in ctx return → report the error,
  then follow Resume anchoring (probe → poll → find → resume).
- **Hang** → process writes nothing, hits the 10-min timeout → detect by `(timed out)` block
  in the ctx return → follow Resume anchoring (probe → poll → find → resume).
- **Quota / credits exhausted** → the ONE case that does NOT resume: report the quota status and
  stop; resuming without quota would fail identically.
- **Never** redirect output to files inside the repo; keep stdout as the only channel.
- **Never** resume with a different query or a different timeout — resume is single-variable
  (same query, same timeout, per Resume anchoring), otherwise you cannot tell what fixed it.
- **Rate-limit from parallel dispatch** → if you hit a rate-limit / stall and a second
  atomcode run is live (sibling subagent, another ctx_batch_execute in the same turn), that
  is a self-inflicted oversubscription, NOT an atomcode bug. Do NOT kill anything — killing
  atomcode processes is forbidden (see the ban above). Wait for the runs to finish naturally
  (poll + ctx_search per Resume anchoring), keep one at a time going forward. Do NOT retry all
  of them in parallel — that re-triggers the same oversubscription. Going forward, serialize:
  one in flight at a time.

## ctx integration

ctx_batch_execute auto-indexes stdout into FTS5 (source label = the command's `label` field).
Follow up via `ctx_search(queries: ["..."], source: "atomcode")` to keep main context lean.
No manual `ctx_index` needed when using ctx_batch_execute as the carrier.

## Mode hints (phrase into the -p prompt)

| Mode | When | Prompt phrasing |
|------|------|-----------------|
| quick | low-stakes lookup | "快速查 X，2-3 条要点即可" |
| default | single-topic research | plain question |
| comparison | "compare X and Y" | "对比 X 和 Y，先给对比矩阵" |
| landscape | broad survey | "全景调研 X 生态，多角度覆盖" |

Mode words are ALLOWED in the -p prompt. Search angles, key names, source domains are NOT.

Note: atomcode's protocol enforces minimum quotas chosen by the hook.
quick mode only goes lighter if your phrasing explicitly overrides it — the quotas are the
hook's job, not yours.

## Rules

- MUST delegate to atomcode via ctx_batch_execute for any multi-source / citation-bearing research.
- You MAY research yourself via ctx_fetch_and_index for quick single-source lookups only.
- Pass the question verbatim — do not append key-name checklists or angle hints.
- Cite from the answer's source list; flag anything not from the research.
- Non-zero exit / error → report, then follow Resume anchoring (probe → poll → find → resume).
- **One atomcode run in flight per session.** Serialize multi-question research: ask, wait,
  then ask the next. Never fan out parallel atomcode subagents or parallel ctx_batch_execute
  calls for atomcode in the same turn — that oversubscribes Exa+Tavily+AnySearch and stalls
  the model.
- `concurrency: 1` below is per-batch, NOT a session-wide guarantee. The serialization rule
  above is what protects the shared quota; the parameter alone cannot.

Task: {{ARGUMENTS}}
