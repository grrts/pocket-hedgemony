import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { AstBuilder, GherkinClassicTokenMatcher, Parser, compile } from "@cucumber/gherkin";
import { IdGenerator, type Pickle } from "@cucumber/messages";

/** The domain specs: one folder per bounded context, each with features/*.feature. */
export const domainRoot = new URL("../../../domain/", import.meta.url).pathname;

export interface FeatureFile {
  /** Path from the domain folder, e.g. "trade/features/collecting.feature". */
  path: string;
  context: string;
  name: string;
  pickles: readonly Pickle[];
}

function findFeatures(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findFeatures(full));
    else if (name.endsWith(".feature")) out.push(full);
  }
  return out;
}

export function parseFeature(path: string, source: string): FeatureFile {
  const newId = IdGenerator.incrementing();
  const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
  const document = parser.parse(source);
  const rel = relative(domainRoot, path);
  return {
    path: rel,
    context: rel.split("/")[0]!,
    name: document.feature?.name ?? rel,
    pickles: compile(document, rel, newId),
  };
}

export function loadFeatures(root = domainRoot): FeatureFile[] {
  return findFeatures(root).map((path) => parseFeature(path, readFileSync(path, "utf8")));
}
