import type { BreakerResult } from "./breaker.ts";
import type { CampaignResult } from "./campaign.ts";
import { pct, type Finding } from "./findings.ts";

const ORDER: Finding["severity"][] = ["broken", "balance", "note"];
const LABEL: Record<Finding["severity"], string> = { broken: "Broken", balance: "Balance", note: "Note" };

/**
 * The run's report as Markdown, read first on a phone: what needs a look at
 * the top, then one section per campaign and one table for the bot's realms.
 * Tables keep to five narrow columns so they fit a phone held either way.
 */
export function markdownReport(title: string, campaigns: readonly CampaignResult[], breakers: readonly BreakerResult[]): string {
  const all = [...campaigns.flatMap((c) => c.findings.map((f) => ({ ...f, run: `campaign, seed ${c.seed}` }))), ...breakers.flatMap((b) => b.findings.map((f) => ({ ...f, run: `bot as ${b.realm}` })))];
  const lines: string[] = [`# ${title}`, ""];
  const runs = [campaigns.length ? `${campaigns.length} AI-only campaign${campaigns.length > 1 ? "s" : ""}` : "", breakers.length ? `${breakers.length} bot run${breakers.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ");
  const map = campaigns[0]?.map ?? breakers[0]?.map;
  lines.push(`${runs}${map === "synthetic" ? ", on a small made-up world (not the real map)" : ""}.`, "");

  lines.push("## At a glance", "");
  if (!all.length) lines.push("Nothing crossed a line.", "");
  else {
    lines.push("| What | Found |", "|---|---|");
    for (const sev of ORDER) {
      const n = all.filter((f) => f.severity === sev).length;
      if (n) lines.push(`| ${LABEL[sev]} | ${n} |`);
    }
    lines.push("");
    for (const sev of ORDER) {
      const fs = all.filter((f) => f.severity === sev);
      if (!fs.length) continue;
      lines.push(`**${LABEL[sev]}**`, "");
      for (const f of fs.slice(0, 30)) lines.push(`- ${f.year}, ${f.run}: ${f.text}`);
      if (fs.length > 30) lines.push(`- …and ${fs.length - 30} more in the JSON files.`);
      lines.push("");
    }
  }

  for (const c of campaigns) {
    lines.push(`## AI-only campaign, seed ${c.seed}`, "", `${c.startYear} to ${c.samples[c.samples.length - 1]?.year ?? c.startYear}, ${c.weeks} weeks in ${Math.round(c.seconds)} s.`, "");
    lines.push("| Year | Realms | Wars | Largest | Gold |", "|---|---|---|---|---|");
    const step = Math.max(1, Math.round(c.samples.length / 10));
    // One row a year at most, the year's last sample.
    const picked = c.samples.filter((x, i) => (i % step === 0 || i === c.samples.length - 1) && c.samples[i + 1]?.year !== x.year);
    for (const s of picked) lines.push(`| ${s.year} | ${s.realmsAlive} | ${s.wars} | ${s.largest.realm} ${pct(s.largest.share)} | ${Math.round(s.medianTreasury)} |`);
    lines.push("", "Gold is the middle realm's treasury.", "");
    const first = c.samples[0]!;
    const last = c.samples[c.samples.length - 1]!;
    const moves = Object.keys(first.realms).map((id) => ({ id, from: first.realms[id]!.provinces, to: last.realms[id]?.provinces ?? 0 }));
    const changed = moves.filter((m) => m.to !== m.from);
    const up = changed.filter((m) => m.to > m.from).sort((a, b) => b.to - b.from - (a.to - a.from)).slice(0, 5);
    const down = changed.filter((m) => m.to < m.from).sort((a, b) => a.to - a.from - (b.to - b.from)).slice(0, 5);
    if (changed.length) lines.push("| Grew most | Provinces | Shrank most | Provinces |", "|---|---|---|---|");
    else lines.push("No realm gained or lost land.");
    for (let i = 0; i < Math.max(up.length, down.length); i++) {
      const u = up[i];
      const d = down[i];
      lines.push(`| ${u ? u.id : ""} | ${u ? `${u.from} → ${u.to}` : ""} | ${d ? d.id : ""} | ${d ? `${d.from} → ${d.to}` : ""} |`);
    }
    lines.push("");
  }

  if (breakers.length) {
    lines.push("## The bot as each realm", "", "Provinces and income at the end, the AI's own result with the same realm in brackets.", "");
    lines.push("| Realm | Provinces | Income | At war | Found |", "|---|---|---|---|---|");
    for (const b of [...breakers].sort((x, y) => severityRank(x.findings) - severityRank(y.findings) || x.realm.localeCompare(y.realm))) {
      const end = b.end?.realms[b.realm];
      const base = b.baseline;
      const start = b.realmSamples[0]?.realm?.provinces ?? 0;
      lines.push(`| ${b.realm} | ${start} → ${end?.provinces ?? 0}${base ? ` (${base.provinces})` : ""} | ${end ? Math.round(end.income) : "–"}${base ? ` (${Math.round(base.income)})` : ""} | ${b.weeks ? pct(b.weeksAtWar / b.weeks) : "–"} | ${b.findings.length ? b.findings.map((f) => f.kind.replace(/_/g, " ")).join(", ") : "–"} |`);
    }
    lines.push("");
    const refused = new Map<string, { count: number; reason: string }>();
    for (const b of breakers) for (const [type, r] of Object.entries(b.rejected)) {
      const e = refused.get(type) ?? { count: 0, reason: r.reason };
      e.count += r.count;
      refused.set(type, e);
    }
    if (refused.size) {
      lines.push("### Orders the game refused the bot", "", "Not faults by themselves: the bot tries what a player could tap. A high count can mean a screen offers what the rules then refuse.", "");
      lines.push("| Order | Times | First reason given |", "|---|---|---|");
      for (const [type, r] of [...refused].sort((a, b) => b[1].count - a[1].count)) lines.push(`| ${type} | ${r.count} | ${r.reason} |`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function severityRank(fs: readonly Finding[]): number {
  for (let i = 0; i < ORDER.length; i++) if (fs.some((f) => f.severity === ORDER[i])) return i;
  return ORDER.length;
}
