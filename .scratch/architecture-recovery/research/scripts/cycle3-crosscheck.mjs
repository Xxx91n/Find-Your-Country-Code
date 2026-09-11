#!/usr/bin/env node
// cycle3-crosscheck.mjs — compare prompts, handoffs, issues, spec for tickets 20-26
const fs = require("fs");
const path = require("path");

const base = path.resolve(__dirname, "..", "..");
const spec = fs.readFileSync(path.join(base, "spec.md"), "utf8");

const SLUGS = {
  "20":"ci-script-relocation","21":"pr-triggers","22":"dead-code-elimination",
  "23":"ts-strict-typecheck","24":"security-hardening","25":"dependency-directory-hygiene",
  "26":"adr-docs-closure"
};

const FORBIDDEN = [/worktree/i, /git\s+checkout/i, /git\s+branch/i];
let fails = 0, warns = 0;

for (const [n, s] of Object.entries(SLUGS)) {
  const ip = path.join(base, "issues", n + "-" + s + ".md");
  const hp = path.join(base, "handoffs", n + "-" + s + ".md");
  const pp = path.join(base, "prompts", n + "-" + s + ".md");
  const ex = f => fs.existsSync(f);
  if (!ex(ip)) { console.log("FAIL [" + n + "] issue missing"); fails++; continue; }
  if (!ex(hp)) { console.log("FAIL [" + n + "] handoff missing"); fails++; continue; }
  if (!ex(pp)) { console.log("FAIL [" + n + "] prompt missing"); fails++; continue; }

  const issue = fs.readFileSync(ip, "utf8");
  const handoff = fs.readFileSync(hp, "utf8");
  const prompt = fs.readFileSync(pp, "utf8");

  // Title check
  const it = (issue.match(/^#\s+(.+)/m) || ["",""])[1];
  const pt = (prompt.match(/^#\s+(.+)/m) || ["",""])[1];
  if (!it) { console.log("FAIL [" + n + "] issue missing H1"); fails++; }
  if (!pt) { console.log("FAIL [" + n + "] prompt missing H1"); fails++; }

  // Acceptance count
  const ac = (issue.match(/- \[ \]/g) || []).length;
  if (ac === 0) { console.log("WARN [" + n + "] 0 acceptance criteria"); warns++; }

  // Prompt line count
  const pl = prompt.split("\n").length;
  if (pl > 60) { console.log("FAIL [" + n + "] prompt " + pl + " lines (max 60)"); fails++; }
  else console.log("OK [" + n + "] prompt " + pl + " lines, " + ac + " ACs");

  // Forbidden patterns
  for (const re of FORBIDDEN) {
    if (re.test(prompt)) { console.log("FAIL [" + n + "] prompt forbidden: " + re); fails++; }
    if (re.test(handoff)) { console.log("FAIL [" + n + "] handoff forbidden: " + re); fails++; }
  }

  // Spec mention
  if (!spec.includes(n)) { console.log("WARN [" + n + "] not mentioned in spec"); warns++; }

  // Path resolvability
  const refs = [...prompt.matchAll(/([Dd]:\\[^` ]+)/g)];
  for (const [, r] of refs) {
    const resolved = r.replace(/\\/g, "\");
    if (!fs.existsSync(resolved) && !resolved.includes("*")) {
      console.log("FAIL [" + n + "] unresolved path: " + resolved);
      fails++;
    }
  }
}

console.log("\nFails: " + fails + " | Warns: " + warns);
process.exit(fails > 0 ? 1 : 0);
