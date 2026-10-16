import "../steps/index.ts";
import { loadFeatures } from "./features.ts";
import { readiness, requirementIds, runPickle } from "./run.ts";

/**
 * Prints, per bounded context, how many scenarios are specified, automated and
 * passing, and which requirements have a passing scenario. This is the
 * feedback loop between the domain specs and the game code.
 */
interface Row {
  scenarios: number;
  automated: number;
  passing: number;
  requirements: Set<string>;
  passed: Set<string>;
}

const rows = new Map<string, Row>();
const failures: string[] = [];
for (const feature of loadFeatures()) {
  const row = rows.get(feature.context) ?? { scenarios: 0, automated: 0, passing: 0, requirements: new Set(), passed: new Set() };
  rows.set(feature.context, row);
  for (const pickle of feature.pickles) {
    row.scenarios++;
    const ids = requirementIds(pickle);
    ids.forEach((id) => row.requirements.add(id));
    if (!readiness(pickle, feature.context).automated) continue;
    row.automated++;
    try {
      await runPickle(pickle, feature.context);
      row.passing++;
      ids.forEach((id) => row.passed.add(id));
    } catch (e) {
      failures.push(`${feature.path} › ${pickle.name}: ${(e as Error).message.split("\n").slice(0, 2).join(" ")}`);
    }
  }
}

const lines = ["| Context | Scenarios | Automated | Passing | Requirements with a passing scenario |", "|---|---:|---:|---:|---:|"];
let total = { scenarios: 0, automated: 0, passing: 0, req: 0, passed: 0 };
for (const [context, r] of [...rows].sort()) {
  lines.push(`| ${context} | ${r.scenarios} | ${r.automated} | ${r.passing} | ${r.passed.size} / ${r.requirements.size} |`);
  total = { scenarios: total.scenarios + r.scenarios, automated: total.automated + r.automated, passing: total.passing + r.passing, req: total.req + r.requirements.size, passed: total.passed + r.passed.size };
}
lines.push(`| **All** | ${total.scenarios} | ${total.automated} | ${total.passing} | ${total.passed} / ${total.req} |`);
console.log(lines.join("\n"));
if (failures.length) {
  console.log(`\nFailing scenarios:\n${failures.map((f) => `- ${f}`).join("\n")}`);
  process.exitCode = 1;
}
