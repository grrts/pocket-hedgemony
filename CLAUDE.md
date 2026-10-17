# Working on Pocket Hegemony

- The rules live in `domain/` (specs and Gherkin features); read `domain/CONVENTIONS.md` and `domain/DECISIONS.md` before changing a system. The player-facing explanation lives in `docs/wiki/`.
- **Every feature, new or changed, is designed from how the player uses it** (Leroy, decision X-19; `docs/wiki/Design-Principles.md`). Before building it, answer and write down in its spec under "How the player uses it":
  1. Where the player finds it and what they tap; most play is in the screens and cards over the map.
  2. How it is grouped: one card, tab or screen per subject, never spread over unrelated panels.
  3. For anything important, which overview shows its state at a glance.
  4. How it looks and works on a phone in landscape: Wide and Tall layouts, safe areas, 44-point tap targets, nothing that needs hover.
  If an answer makes for a poor experience, change the design first.
- Run `pnpm --filter @ph/specs test` after changing `domain/`, and `pnpm --filter @ph/specs context-map` to refresh the generated files.
