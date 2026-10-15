// Prepares dist/ for publishing as a claude.ai Artifact: the host wraps the main
// page in its own document and only allows our own scripts and images, so CSS is
// inlined and the main page loses its <html>/<head>/<body> wrapper.
// Usage: pnpm build && node scripts/artifact.mjs <outDir>
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const out = process.argv[2];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(dist, "assets"), join(out, "assets"), { recursive: true });
cpSync(join(dist, "map"), join(out, "map"), { recursive: true });

const inlineCss = (html) =>
  html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, f) => `<style>${readFileSync(join(dist, f), "utf8")}</style>`);

const game = inlineCss(readFileSync(join(dist, "index.html"), "utf8"));
const head = game.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, "");
const body = game.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(join(out, "index.html"), head.trim() + "\n" + body.trim() + "\n");
writeFileSync(join(out, "style.html"), inlineCss(readFileSync(join(dist, "style.html"), "utf8")));
for (const f of readdirSync(join(out, "assets"))) if (f.endsWith(".css")) rmSync(join(out, "assets", f));
console.log(readdirSync(out, { recursive: true }).join("\n"));
