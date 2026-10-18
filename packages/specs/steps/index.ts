// Loads every step definition file in this folder: one per bounded context
// (<context>.steps.ts), plus common.steps.ts for steps all contexts share.
import { readdirSync } from "node:fs";

const here = new URL("./", import.meta.url);
for (const name of readdirSync(here).sort()) {
  if (name.endsWith(".steps.ts")) await import(new URL(name, here).href);
}
