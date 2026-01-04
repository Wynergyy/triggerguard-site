import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const RUNTIME_LOG = join(ROOT, "data", "runtime", "triggerguard.kernel.runtime.json");
const OUT_DIR = join(ROOT, "data", "seals");
const OUT_PATH = join(OUT_DIR, "triggerguard.kernel.runtime.replay.json");

function nowUtcIso() {
  return new Date().toISOString();
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function isKernelEvent(e) {
  return (
    e &&
    typeof e === "object" &&
    typeof e.id === "string" &&
    typeof e.time_utc === "string" &&
    typeof e.type === "string"
  );
}

async function main() {
  if (!existsSync(RUNTIME_LOG)) {
    console.error("Missing runtime log");
    console.error("Run: node scripts/triggerguard-runtime-init.js");
    process.exit(2);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const bytes = await readFile(RUNTIME_LOG);
  const hash = sha256Hex(bytes);

  const parsed = JSON.parse(bytes.toString("utf8"));
  const events = Array.isArray(parsed.events) ? parsed.events : [];

  const valid = events.filter(isKernelEvent);
  const invalid = events.filter((e) => !isKernelEvent(e));

  const summary = {
    kind: "triggerguard_kernel_replay",
    version: "1.0.0",
    time_utc: nowUtcIso(),
    runtime_log_path: "data/runtime/triggerguard.kernel.runtime.json",
    runtime_log_sha256: hash,
    counts: {
      total_events: events.length,
      valid_kernel_events: valid.length,
      invalid_events: invalid.length
    },
    sample: valid.slice(0, 3).map((e) => ({
      id: e.id,
      time_utc: e.time_utc,
      type: e.type,
      decision: e.decision
    }))
  };

  await writeFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log("TriggerGuard kernel replay complete");
  console.log(`Valid events: ${valid.length}`);
  console.log(`Invalid events: ${invalid.length}`);
  console.log("Wrote: data/seals/triggerguard.kernel.runtime.replay.json");
}

main().catch((err) => {
  console.error("Replay failed:", err);
  process.exit(1);
});
