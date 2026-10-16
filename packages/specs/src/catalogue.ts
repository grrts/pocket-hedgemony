import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { domainRoot } from "./features.ts";

/** What the specs themselves say: their seams, requirements and open questions. */
export interface Seam {
  from: string;
  to: string;
  direction: string;
  pattern: string;
  crosses: string;
}

export interface OpenQuestion {
  context: string;
  id: string;
  text: string;
}

export interface Spec {
  context: string;
  title: string;
  code: string;
  purpose: string;
  requirements: string[];
  seams: Seam[];
  openQuestions: OpenQuestion[];
}

function section(md: string, n: number): string {
  const start = md.search(new RegExp(`^## ${n}\\.`, "m"));
  if (start < 0) return "";
  const rest = md.slice(start + 1);
  const end = rest.search(/^## \d+\./m);
  return end < 0 ? rest : rest.slice(0, end);
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function readSpec(context: string, root = domainRoot): Spec {
  const md = readFileSync(join(root, context, "spec.md"), "utf8");
  const heading = md.match(/^# (.+?)(?: \(([A-Z]+)\))?\s*$/m);
  const purpose = section(md, 1).split("\n").slice(1).join("\n").trim().split(/\n\n/)[0] ?? "";
  const seams = section(md, 11)
    .split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l) && !/Other context/i.test(l))
    .map(cells)
    .filter((c) => c.length >= 4)
    .map(([to, direction, pattern, ...crosses]) => ({ from: context, to: to!.replace(/`/g, ""), direction: direction!, pattern: pattern!, crosses: crosses.join(" | ") }));
  const openQuestions = [...section(md, 13).matchAll(/^[-*]?\s*\**(OQ-[A-Z]+-\d+)\**[:.]?\s*(.+)$/gm)].map((m) => ({ context, id: m[1]!, text: m[2]!.trim() }));
  const requirements = [...new Set([...md.matchAll(/\b([A-Z]{2,6}-\d{3})\b/g)].map((m) => m[1]!))];
  return { context, title: heading?.[1] ?? context, code: heading?.[2] ?? "", purpose, requirements, seams, openQuestions };
}

export function readSpecs(root = domainRoot): Spec[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "spec.md")))
    .map((d) => readSpec(d.name, root))
    .sort((a, b) => a.context.localeCompare(b.context));
}
