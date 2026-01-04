import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const RUNTIME_DIR = join(ROOT, "data", "runtime");
const RUNTIME_LOG = join(RUNTIME_DIR, "triggerguard.kernel.runtime.json");

function nowUtcIso() {
  return new Date().toISOString();
}

async function main() {
  await mkdir(RUNTIME_DIR, { recursive: true });

  const runtime = {
    kind: "triggerguard_kernel_runtime_log",
    version: "1.0.0",
    kernel: "TriggerGuard Kernel",
    kernel_version: "1.0.0",
    created_time_utc: nowUtcIso(),
    events: []
  };

  await writeFile(RUNTIME_LOG, JSON.stringify(runtime, null, 2) + "\n", "utf8");

  console.log("TriggerGuard kernel runtime initialised");
  console.log("Wrote: data/runtime/triggerguard.kernel.runtime.json");
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
