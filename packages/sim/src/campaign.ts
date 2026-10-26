import { advance, STEPS_PER_TURN, type World } from "@ph/engine";
import { simConfig, type SimConfig } from "./config.ts";
import { badValueFindings, campaignFindings, errorFinding, type Finding } from "./findings.ts";
import { checkFinite, sample, viewOfWorld, type WorldSample } from "./measure.ts";
import { newWorld, rulesFor, type MapKind } from "./world.ts";

export interface CampaignOptions {
  seed: number;
  years: number;
  map: MapKind;
  /** Months between samples. */
  sampleMonths?: number;
  config?: SimConfig;
  /** The campaign's difficulty (easy, normal, hard; SETUP-099); normal when left out. */
  difficulty?: string;
  /** Called after each sample, for progress on the command line. */
  onSample?: (s: WorldSample) => void;
}

/** An AI-only campaign: its samples, what the checks found, and where each realm started and ended. */
export interface CampaignResult {
  kind: "campaign";
  seed: number;
  map: MapKind;
  years: number;
  startYear: number;
  endYear: number;
  weeks: number;
  seconds: number;
  samples: WorldSample[];
  findings: Finding[];
}

/**
 * Plays a campaign with no player: every realm is the AI's, week after week,
 * exactly as the game plays the AI around a player. Samples the world every
 * few months, looks for bad numbers each sample and stops at the first engine
 * error (reported as a finding, not thrown).
 */
export function runAiCampaign(o: CampaignOptions): CampaignResult {
  const config = o.config ?? simConfig();
  const every = o.sampleMonths ?? config.run.sample_months;
  const t0 = performance.now();
  const world = newWorld(o.map, o.seed, rulesFor(o.map), o.difficulty);
  const startYear = world.date.year;
  const endYear = startYear + o.years;
  const end = dayKey({ ...world.date, year: endYear });
  const samples: WorldSample[] = [];
  const findings: Finding[] = [];
  let weeks = 0;
  let lastSampled = -1;
  let sampledAt = -1;
  const take = (w: World) => {
    sampledAt = weeks;
    const s = sample(viewOfWorld(w));
    samples.push(s);
    findings.push(...badValueFindings(checkFinite(w), s.year));
    o.onSample?.(s);
  };
  take(world);
  try {
    while (dayKey(world.date) < end) {
      advance(world, STEPS_PER_TURN - world.step);
      weeks++;
      const month = (world.date.year - startYear) * 12 + world.date.month;
      if (month !== lastSampled && month % every === 0) {
        lastSampled = month;
        take(world);
        if (findings.some((f) => f.kind === "bad_number")) break;
      }
    }
  } catch (e) {
    findings.push(errorFinding(e, world.date.year));
  }
  if (sampledAt !== weeks) take(world);
  findings.push(...campaignFindings(samples, config.campaign_checks));
  return { kind: "campaign", seed: o.seed, map: o.map, years: o.years, startYear, endYear, weeks, seconds: (performance.now() - t0) / 1000, samples, findings };
}

/** A date as one sortable number. */
export const dayKey = (d: { year: number; month: number; day?: number }) => (d.year * 12 + d.month) * 31 + (d.day ?? 1);
