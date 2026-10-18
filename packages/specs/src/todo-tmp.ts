import "../steps/index.ts";
import { loadFeatures } from "./features.ts";
import { readiness } from "./run.ts";
const ctx = process.argv[2] ?? "realm";
for (const f of loadFeatures()) {
  if (f.context !== ctx) continue;
  for (const p of f.pickles) {
    const r = readiness(p, f.context);
    if (!r.automated) console.log(f.path, "›", p.name, "\n   ", r.missing.join("\n    "));
  }
}
