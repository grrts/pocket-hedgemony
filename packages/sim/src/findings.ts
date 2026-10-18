import type { SimConfig } from "./config.ts";
import type { BadValue, WorldSample } from "./measure.ts";

/**
 * Something a run turned up that a person should look at. "broken" is the
 * game doing what it must never do (bad numbers, an engine error, gold from
 * nothing); "balance" is a line in config.json crossed; "note" is worth
 * knowing but not wrong by itself.
 */
export interface Finding {
  severity: "broken" | "balance" | "note";
  /** A short key for grouping across runs, such as "snowball" or "nan". */
  kind: string;
  /** One plain sentence. */
  text: string;
  year: number;
  realm?: string;
}

/** The checks on an AI-only campaign's samples, oldest first. */
export function campaignFindings(samples: readonly WorldSample[], c: SimConfig["campaign_checks"]): Finding[] {
  const out: Finding[] = [];
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return out;
  const big = samples.find((s) => s.largest.share > c.largest_realm_share);
  if (big) out.push({ severity: "balance", kind: "snowball", year: big.year, realm: big.largest.realm, text: `${big.largest.realm} holds ${pct(big.largest.share)} of all land by ${big.year} (line: ${pct(c.largest_realm_share)}).` });
  const gone = samples.find((s) => 1 - s.realmsAlive / first.realmsAlive > c.realms_gone_share);
  if (gone) out.push({ severity: "balance", kind: "realms_gone", year: gone.year, text: `${first.realmsAlive - gone.realmsAlive} of ${first.realmsAlive} realms are gone by ${gone.year} (line: ${pct(c.realms_gone_share)}).` });
  const hoard = samples.find((s) => s.medianIncome > 0 && s.medianTreasury / (s.medianIncome * 12) > c.years_of_income_hoarded);
  if (hoard) out.push({ severity: "balance", kind: "hoarding", year: hoard.year, text: `The middle realm sits on ${Math.round(hoard.medianTreasury / (hoard.medianIncome * 12))} years of income by ${hoard.year}: gold has nothing to be spent on (line: ${c.years_of_income_hoarded}).` });
  let quietSince: number | null = null;
  for (const s of samples) {
    if (s.wars > 0) quietSince = null;
    else if (quietSince === null) quietSince = s.year;
    else if (s.year - quietSince >= c.peace_years) {
      out.push({ severity: "balance", kind: "stagnation", year: s.year, text: `No war anywhere from ${quietSince} to ${s.year} (line: ${c.peace_years} years).` });
      break;
    }
  }
  const allWar = samples.find((s) => s.realmsAlive > 0 && s.realmsAtWar / s.realmsAlive > c.share_of_realms_at_war);
  if (allWar) out.push({ severity: "balance", kind: "endless_war", year: allWar.year, text: `${pct(allWar.realmsAtWar / allWar.realmsAlive)} of realms are at war in ${allWar.year} (line: ${pct(c.share_of_realms_at_war)}).` });
  const armed = samples.find((s) => s.levies > 0 && s.menUnderArms / (s.menUnderArms + s.levies) > c.share_in_arms && s.wars === 0);
  if (armed) out.push({ severity: "note", kind: "armed_peace", year: armed.year, text: `${pct(armed.menUnderArms / (armed.menUnderArms + armed.levies))} of all men who could fight are under arms in ${armed.year}, with no war on.` });
  return out;
}

export function badValueFindings(bad: readonly BadValue[], year: number, realm?: string): Finding[] {
  return bad.slice(0, 10).map((b) => ({
    severity: "broken",
    kind: "bad_number",
    year,
    ...(realm ? { realm } : {}),
    text: `${b.path}${b.index >= 0 ? `[${b.index}]` : ""} is ${b.value}.`,
  }));
}

export function errorFinding(e: unknown, year: number, realm?: string): Finding {
  const text = e instanceof Error ? `${e.message} ${e.stack?.split("\n")[1]?.trim() ?? ""}`.trim() : String(e);
  return { severity: "broken", kind: "engine_error", year, ...(realm ? { realm } : {}), text: `The engine threw: ${text}` };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
