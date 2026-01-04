import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = process.cwd();
const RUNTIME_LOG = join(ROOT, "data", "runtime", "triggerguard.kernel.runtime.json");

function nowUtcIso() {
  return new Date().toISOString();
}

function safeString(x) {
  const s = typeof x === "string" ? x.trim() : "";
  return s.length > 0 ? s : "";
}

function safeObject(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : {};
}

function safeDecision(x) {
  const v = safeString(x).toLowerCase();
  if (v === "allow" || v === "deny" || v === "flag") return v;
  return "flag";
}

async function main() {
  if (!existsSync(RUNTIME_LOG)) {
    console.error("Missing runtime log. Run: node scripts/triggerguard-runtime-init.js");
    process.exit(2);
  }

  const type = safeString(process.argv[2]) || "enforcement.pulse";
  const decision = safeDecision(process.argv[3]);
  const subject = safeString(process.argv[4]) || "unknown";
  const metaArg = safeString(process.argv[5]);

  let meta = {};
  if (metaArg) {
    try {
      meta = safeObject(JSON.parse(metaArg));
    } catch {
      meta = { note: metaArg };
    }
  }

  const bytes = await readFile(RUNTIME_LOG, "utf8");
  const parsed = JSON.parse(bytes);

  if (!Array.isArray(parsed.events)) parsed.events = [];

  const ev = {
    id: randomUUID(),
    time_utc: nowUtcIso(),
    type,
    decision,
    subject,
    meta
  };

  parsed.events.push(ev);

  await writeFile(RUNTIME_LOG, JSON.stringify(parsed, null, 2) + "\n", "utf8");

  console.log("TriggerGuard kernel event appended");
  console.log(`id: ${ev.id}`);
  console.log(`decision: ${ev.decision}`);
  console.log(`subject: ${ev.subject}`);
}

main().catch((err) => {
  console.error("Emit failed:", err);
  process.exit(1);
});
