// Writes the wiki's game data pages (docs/wiki/Data-*.md and Game-Data.md) from the game's
// rules config in packages/rules/data, so the numbers on the wiki are the ones the game plays by.
// Run by `pnpm wiki` before tools/wiki-export.ts; CI re-runs it and fails if the output changed.
// Usage: node --experimental-strip-types tools/wiki-data.ts
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = join(root, "packages/rules/data");
const wiki = join(root, "docs/wiki");

/**
 * The rules files the wiki shows, in the order of Game-Data.md: the page title, the config file,
 * the wiki page that explains the system in words, and top-level keys left out (text, art and
 * tooling the player never plays by), and the keys shown first.
 */
const systems: { title: string; file: string; explains?: string; skip?: string[]; first?: string[] }[] = [
  { title: "Core values", file: "defines.json" },
  { title: "Time and turns", file: "domain/time-and-turns.json", explains: "Time-and-Turns", skip: ["presentation", "playback", "selection", "endTurnConfirmation"] },
  { title: "Realm", file: "domain/realm.json", explains: "Your-Realm", skip: ["card_extra_lines"] },
  { title: "Province", file: "domain/province.json", explains: "Provinces" },
  { title: "Buildings", file: "domain/buildings.json", explains: "Buildings" },
  { title: "Trade", file: "domain/trade.json", explains: "Trade", skip: ["screens"] },
  { title: "Research", file: "domain/research.json", explains: "Research", first: ["inventions", "era_cost", "era_dates"] },
  { title: "Institutions", file: "domain/institutions.json", explains: "Institutions" },
  { title: "Warfare", file: "domain/warfare.json", explains: "Warfare", first: ["arms", "later_arms", "kinds", "battle", "hits_per_bell"] },
  { title: "Recruiting", file: "domain/recruiting.json", explains: "Recruiting" },
  { title: "Troop movement", file: "domain/troop-movement.json", explains: "Troop-Movement" },
  { title: "Naval", file: "domain/naval.json", explains: "Naval" },
  { title: "Exploration", file: "domain/exploration.json", explains: "Exploration-and-Colonies" },
  { title: "Tribes", file: "domain/tribes.json", explains: "Tribes-and-Hunting-Grounds" },
  { title: "Government", file: "domain/government.json", explains: "Government" },
  { title: "Subjects", file: "domain/subjects.json", explains: "Subjects" },
  { title: "Diplomacy", file: "domain/diplomacy.json", explains: "Diplomacy" },
  { title: "Religion", file: "domain/religion.json", explains: "Religion" },
  { title: "Culture", file: "domain/culture.json", explains: "Culture" },
  { title: "Rebellions", file: "domain/rebellions.json", explains: "Rebellions" },
  { title: "Revolutions", file: "domain/revolutions.json", explains: "Revolutions", skip: ["card"] },
  { title: "National strengths", file: "domain/national-strengths.json", explains: "National-Strengths" },
  { title: "Events", file: "domain/events.json", explains: "Historical-Events", skip: ["vocabulary", "schema_fields", "statistics_notes"] },
  { title: "Everyday events", file: "domain/events-everyday.json", explains: "Historical-Events" },
  { title: "Achievements", file: "domain/achievements.json", explains: "Achievements", skip: ["icons", "toast", "stores", "store_retry_minutes"] },
];

const slugOf = (file: string) =>
  "Data-" +
  file
    .replace(/^domain\//, "")
    .replace(/\.json$/, "")
    .split("-")
    .map((w) => (w === "and" ? w : w[0].toUpperCase() + w.slice(1)))
    .join("-");

const read = (file: string): Obj => JSON.parse(readFileSync(join(data, file), "utf8"));

// Inventions are named by id everywhere in the config (unlock: "W12"); the pages show their names.
const inventions = new Map<string, string>(
  (read("domain/research.json").inventions as Obj[]).map((i) => [i.id as string, i.name as string]),
);

const isObj = (v: Json): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isScalar = (v: Json) => v === null || typeof v !== "object";
const isFlat = (v: Json) => isScalar(v) || (Array.isArray(v) && v.every(isScalar));
const hidden = (key: string) => key.startsWith("$") || key.startsWith("_");
/** A config key as words: "battle_days" and "battleDays" both read "battle days". */
const words = (key: string) => key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`);

/** Text in a table cell or a line: markdown's own characters are shown as they are. */
const text = (s: string) => s.replace(/\s+/g, " ").replace(/([\\`*_[\]|<>])/g, "\\$1");

function scalar(v: Json): string {
  if (v === null) return "none";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(Number(v.toPrecision(6)));
  const s = String(v);
  const name = inventions.get(s);
  if (name) return `[${s} ${text(name)}](Data-Research#inventions)`;
  return s === "" ? "(empty)" : text(s);
}

/** Any value in one cell: lists joined with commas, objects as "key: value; key: value". */
function inline(v: Json): string {
  if (isScalar(v)) return scalar(v);
  if (Array.isArray(v)) return v.length ? v.map((x) => (isScalar(x) ? scalar(x) : `(${inline(x)})`)).join(", ") : "none";
  const parts = Object.entries(v)
    .filter(([k]) => !hidden(k))
    .map(([k, x]) => `${text(k)}: ${isScalar(x) || (Array.isArray(x) && x.every(isScalar)) ? inline(x) : `(${inline(x)})`}`);
  return parts.length ? parts.join("; ") : "none";
}

const MAX_COLUMNS = 10;

/** Entries of a collection that reads best as one table: a row per entry, a column per field. */
function rowsOf(v: Json): [string, Obj][] | null {
  const entries: [string, Json][] = Array.isArray(v)
    ? v.map((x, i) => [String(i + 1), x])
    : Object.entries(v as Obj).filter(([k]) => !hidden(k));
  if (entries.length < 2 || !entries.every(([, x]) => isObj(x))) return null;
  const columns = new Set(entries.flatMap(([, x]) => Object.keys(x as Obj).filter((k) => !hidden(k))));
  if (columns.size === 0) return null;
  // A field holding a large object of its own reads better as its own section.
  const deep = entries.some(([, x]) => Object.values(x as Obj).some((f) => !isFlat(f) && JSON.stringify(f).length > 160));
  return deep ? null : (entries as [string, Obj][]);
}

function matrix(rows: [string, Obj][], label: string, provisional: (path: string) => boolean, path: string): string {
  const all = [...new Set(rows.flatMap(([, x]) => Object.keys(x).filter((k) => !hidden(k))))];
  // Past MAX_COLUMNS, the fields fewest rows have share one last column.
  const used = (c: string) => rows.filter(([, x]) => c in x).length;
  const kept = all.length <= MAX_COLUMNS ? all : [...all].sort((a, b) => used(b) - used(a)).slice(0, MAX_COLUMNS - 1);
  const columns = all.filter((c) => kept.includes(c));
  const rest = all.filter((c) => !kept.includes(c));
  // A list of records names each row by its own id or name, when it has one.
  const own = rows[0][0] === "1" ? columns.find((c) => c === "id" || c === "name") : undefined;
  const head = [...(own ? [] : [label]), ...columns, ...(rest.length ? ["more"] : [])];
  const lines = [`| ${head.map((h) => text(words(h))).join(" | ")} |`, `|${head.map(() => "---").join("|")}|`];
  for (const [key, x] of rows) {
    const mark = provisional(`${path}.${key}`) ? " (provisional)" : "";
    // A row's own id stays plain: it is the row the links lead to.
    const cells = columns.map((c) => (!(c in x) ? "" : c === own && isScalar(x[c]) ? text(String(x[c])) : inline(x[c])));
    const extra = rest.filter((c) => c in x);
    if (rest.length) cells.push(extra.length ? inline(Object.fromEntries(extra.map((c) => [words(c), x[c]]))) : "");
    lines.push(`| ${own ? cells.join(" | ") + mark : `${text(key)}${mark} | ${cells.join(" | ")}`} |`);
  }
  return lines.join("\n") + "\n";
}

function notes(value: Obj): string {
  return Object.entries(value)
    .filter(([k, v]) => k.startsWith("$") && typeof v === "string")
    .map(([k, v]) => `> ${k === "$comment" ? "" : `\`${text(k.slice(1))}\`: `}${text(v as string)}`)
    .join("\n>\n");
}

/**
 * One config object as a section: its own values in a table, then each collection as a table,
 * then each larger object as a sub-section, down to level 4; deeper still, values flatten into
 * the table with their dotted keys.
 */
function section(value: Obj, path: string, depth: number, provisional: (path: string) => boolean): string {
  const own = notes(value);
  const flat: [string, Json][] = [];
  const blocks: string[] = [];
  const at = (k: string) => (path ? `${path}.${k}` : k);

  const nested = value._provisional;
  const marks = Array.isArray(nested) ? nested.filter((p): p is string => typeof p === "string").map(at) : [];
  const isProvisional = (p: string) => provisional(p) || marks.some((m) => p === m || p.startsWith(m + "."));
  // Inside a section already marked provisional, its values are not marked again.
  const marked = (p: string) => !(path && provisional(path)) && isProvisional(p);

  const flatten = (v: Obj, prefix: string) => {
    for (const [k, x] of Object.entries(v)) {
      if (hidden(k)) continue;
      if (isObj(x) && Object.keys(x).length) flatten(x, `${prefix}${k}.`);
      else flat.push([`${prefix}${k}`, x]);
    }
  };

  for (const [key, v] of Object.entries(value)) {
    if (hidden(key)) continue;
    const mark = marked(at(key)) ? " (provisional)" : "";
    if (isFlat(v) || (isObj(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length)) {
      flat.push([key, v]);
      continue;
    }
    const rows = rowsOf(v);
    if (depth >= 4 && !rows) {
      if (isObj(v)) flatten(v, `${key}.`);
      else flat.push([key, v]);
      continue;
    }
    const name = words(key);
    const heading = `${"#".repeat(depth + 1)} ${text(name[0].toUpperCase() + name.slice(1))}${mark}`;
    if (rows) {
      const comment = isObj(v) ? notes(v) : "";
      blocks.push(`${heading}\n\n${comment ? comment + "\n\n" : ""}${matrix(rows, "Name", (p) => !mark && marked(p), at(key))}`);
    } else if (isObj(v)) {
      blocks.push(`${heading}\n\n${section(v, at(key), depth + 1, isProvisional)}`);
    } else {
      // A list holding objects that differ: one line each.
      blocks.push(`${heading}\n\n${(v as Json[]).map((x) => `- ${inline(x)}`).join("\n")}\n`);
    }
  }

  const parts: string[] = [];
  if (own) parts.push(own + "\n");
  if (flat.length) {
    const lines = ["| Key | Value |", "|---|---|"];
    for (const [k, v] of flat) lines.push(`| \`${k}\`${marked(at(k)) ? " (provisional)" : ""} | ${inline(v)} |`);
    parts.push(lines.join("\n") + "\n");
  }
  parts.push(...blocks);
  return parts.join("\n");
}

const count = (v: Json): number =>
  isScalar(v) ? 1 : Array.isArray(v) ? v.reduce<number>((n, x) => n + count(x), 0) : Object.entries(v).reduce<number>((n, [k, x]) => n + (hidden(k) ? 0 : count(x)), 0);

for (const f of readdirSync(wiki)) if (/^Data-.*\.md$/.test(f)) rmSync(join(wiki, f));

const index: string[] = [];
for (const system of systems) {
  const whole = read(system.file);
  for (const key of system.skip ?? []) delete whole[key];
  const config: Obj = {};
  for (const key of system.first ?? []) if (key in whole) config[key] = whole[key];
  Object.assign(config, whole);
  const slug = slugOf(system.file);
  const path = `packages/rules/data/${system.file}`;
  const intro = [
    `# ${system.title} data`,
    "",
    `Every value in the game's ${system.title.toLowerCase()} config, exactly as the game reads it. This page is made from \`${path}\` each time the config changes, so it always matches the game.${system.explains ? ` How these values are used is explained on [${system.explains.replace(/-/g, " ")}](${system.explains}).` : ""}`,
    "",
    "Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).",
    "",
  ];
  const body = section(config, "", 1, () => false);
  writeFileSync(join(wiki, `${slug}.md`), intro.join("\n") + "\n" + body.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
  index.push(`| [${system.title}](${slug}) | ${count(config)} | \`${system.file}\` | ${system.explains ? `[${system.explains.replace(/-/g, " ")}](${system.explains})` : ""} |`);
}

writeFileSync(
  join(wiki, "Game-Data.md"),
  [
    "# Game data",
    "",
    "Every number the game plays by, straight from its config: unit strengths, building sizes, invention costs, break points, prices, chances and timings. These pages are made from the game's rules files in `packages/rules/data` each time they change, so they always match the game. The other wiki pages explain what the values do; [Formulas](Formulas) shows how the game combines them.",
    "",
    "Keys are written as in the config. Shares are fractions (0.25 is 25 %). A value marked (provisional) is a placeholder that may still change in balancing.",
    "",
    "| System | Values | Config file | Explained on |",
    "|---|---|---|---|",
    ...index,
    "",
  ].join("\n"),
);
console.log(`wiki data: ${systems.length} pages -> docs/wiki/Data-*.md`);
