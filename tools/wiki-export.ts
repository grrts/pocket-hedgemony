// Turns the wiki (docs/wiki/*.md) into what the website serves at /wiki:
//   server/wiki/index.json      the sidebar groups, and each page's title, summary and headings
//   server/wiki/search.json     each page's plain text, for the search box
//   server/wiki/pages/<Page>.html  each page's body
// The markdown stays the one source; CI re-runs this and fails if the output changed.
// Usage: node --experimental-strip-types tools/wiki-export.ts
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked, type Tokens } from "marked";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "docs/wiki");
const out = join(root, "server/wiki");

const files = readdirSync(source).filter((f) => f.endsWith(".md")).sort();
const slugs = new Set(files.map((f) => f.slice(0, -3)));

/** GitHub's heading anchors, so links like Provinces#tolls keep working. */
function anchor(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n ? `${base}-${n}` : base;
}

function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wikiHref(href: string): string {
  const m = /^([A-Z][\w-]*?)?(?:\.md)?(#[\w-]+)?$/.exec(href);
  if (!m || (m[1] && !slugs.has(m[1]))) return href;
  if (!m[1]) return href;
  return (m[1] === "Home" ? "/wiki" : `/wiki/${m[1]}`) + (m[2] ?? "");
}

type Heading = { id: string; text: string; level: number };

function render(markdown: string): { html: string; headings: Heading[] } {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const id = anchor(plain(text), seen);
        if (depth > 1) headings.push({ id, text: plain(text), level: depth });
        if (depth === 1) return `<h1>${inner}</h1>\n`;
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const to = wikiHref(href);
        const external = /^https?:/.test(to);
        return `<a href="${escape(to)}"${title ? ` title="${escape(title)}"` : ""}${external ? ' rel="noopener"' : ""}>${inner}</a>`;
      },
      table(token: Tokens.Table) {
        // Wide tables scroll sideways inside their own box on a phone, not the whole page.
        const cell = (c: Tokens.TableCell, tag: string) =>
          `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        const head = `<tr>${token.header.map((c) => cell(c, "th")).join("")}</tr>`;
        const body = token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("\n");
        return `<div class="table-scroll"><table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody></table></div>\n`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        // The wiki is markdown only: stray tags are shown as text.
        return escape(text);
      },
    },
  });
  return { html: marked.parse(markdown, { async: false }), headings };
}

const pages: Record<string, { title: string; summary: string; headings: Heading[] }> = {};
const search: Record<string, string> = {};
const bodies: Record<string, string> = {};

for (const file of files) {
  const slug = file.slice(0, -3);
  const markdown = readFileSync(join(source, file), "utf8").replace(/\r\n/g, "\n");
  const title = /^# (.+)$/m.exec(markdown)?.[1].trim() ?? slug.replace(/-/g, " ");
  const firstParagraph = markdown.split(/\n\n+/).find((p) => p.trim() && !/^\s*(#|\||-|\*|>|```)/.test(p)) ?? "";
  const summary = plain(firstParagraph);
  const { html, headings } = render(markdown);
  pages[slug] = { title, summary: summary.length > 220 ? summary.slice(0, 217).replace(/\s\S*$/, "") + "…" : summary, headings };
  search[slug] = plain(markdown.replace(/^# .+$/m, ""));
  bodies[slug] = html;
}

// The sidebar follows the Home page: each "## Group" and the pages it links to, in order.
const nav: { title: string; pages: string[] }[] = [];
const home = readFileSync(join(source, "Home.md"), "utf8");
for (const section of home.split(/^## /m).slice(1)) {
  const title = section.split("\n")[0].trim();
  const linked = [...section.matchAll(/\]\(([A-Z][\w-]*)(?:#[\w-]+)?\)/g)].map((m) => m[1]).filter((s) => slugs.has(s));
  const unique = [...new Set(linked)];
  if (unique.length) nav.push({ title, pages: unique });
}
const listed = new Set(nav.flatMap((g) => g.pages));
const rest = [...slugs].filter((s) => s !== "Home" && !listed.has(s));
if (rest.length) nav.push({ title: "More", pages: rest });

rmSync(join(out, "pages"), { recursive: true, force: true });
mkdirSync(join(out, "pages"), { recursive: true });
for (const [slug, html] of Object.entries(bodies)) writeFileSync(join(out, "pages", `${slug}.html`), html);
writeFileSync(join(out, "index.json"), JSON.stringify({ nav, pages }, null, 1) + "\n");
writeFileSync(join(out, "search.json"), JSON.stringify(search, null, 1) + "\n");
console.log(`wiki: ${files.length} pages, ${nav.length} groups -> server/wiki`);
