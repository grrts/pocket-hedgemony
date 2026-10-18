# Domain specs: conventions

Every system of Pocket Hegemony is described here as a **bounded context** (domain-driven design), with a
**domain spec** (spec-driven development) and **feature files** (behaviour-driven development, Gherkin).
The design documents elsewhere in `/mnt/project-files/` stay the source of the ideas; this folder states the
same rules in one precise, testable shape so the game code can be checked against them.

## Folder layout

```
domain/
  CONVENTIONS.md          this file
  context-map.md          every context, and every seam between two contexts
  open-questions.md       every gap and contradiction found, in one list
  <context>/
    spec.md               the domain spec
    features/*.feature    Gherkin features, one per capability
```

## Rules for writing

1. **Only what the designs say.** No new mechanics, numbers or names. Where a design is silent, vague or
   contradicts another design, write an open question (`OQ-<CODE>-<n>`) instead of deciding.
2. **The latest decision wins.** Inside a document, a "Decisions" / "Decided (16 October)" section or a later
   version beats older text. Across documents, a newer design that says it replaces a section of an older one
   wins (for example trade v2 replaces province stats section 7). The campaign runs 1444 to 31 August 1939;
   anything after is out of scope.
3. **Nothing copied from EU4** or other Paradox games: no term, mechanic name or number. Use the project's own
   words (for example "heritage", "reasons count", "scholar-years").
4. **Numbers.** Write a number only if the design gives it. Mark numbers the design calls placeholders with
   `@placeholder` on the scenario and name the config key they come from (for example `trade.ratio_per_trader`).
5. **Plain language**, the same words the designs use. Each term is defined once in the spec's glossary.
6. **How the player uses it** (X-19, Leroy). Every player-facing feature, new or changed, gets a short
   "How the player uses it" heading in section 5 that answers four questions, as requirements like any other:
   where the player finds it and what they do (most play is in the screens and cards over the map); how it is
   grouped with related things (one card, tab or screen per subject); which overview shows its state at a
   glance, for anything important; and how it looks and works on a phone in landscape (Wide and Tall layouts,
   safe areas, 44-point tap targets, nothing that needs hover). If an answer gives a poor experience, fix the
   design before it is built.

## spec.md template

```
# <Context name> (<CODE>)

## 1. Purpose and scope
What this context decides. "In scope" and "Not in scope (owned by …)" lists.

## 2. Sources
Design files and sections this spec is drawn from, newest decision first.

## 3. Ubiquitous language
| Term | Meaning | Not to be confused with |

## 4. Domain model
### Aggregates
For each: identity, what it holds, invariants (numbered INV-<CODE>-n).
### Entities and value objects
### Domain services (if any)

## 5. Requirements
Numbered <CODE>-001 … in EARS form, one rule each:
- Ubiquitous: "The <system> shall …"
- Event-driven: "When <trigger>, the <system> shall …"
- State-driven: "While <state>, the <system> shall …"
- Unwanted: "If <condition>, then the <system> shall …"
- Optional: "Where <feature/setting>, the <system> shall …"
Each line ends with its source in brackets: [country-stats §2.1]. Group under short headings. A player-facing
feature has a "How the player uses it" heading (rule 6).

## 6. Commands
| Command | Who issues it (player / AI / system) | Preconditions | Result | Events emitted |
Commands are orders that can be sent as data (multiplayer-friendly, same for player and AI).

## 7. Domain events
| Event | When | Payload | Consumed by (context) |

## 8. Policies (reactions to other contexts)
"When <event from context X>, then <what this context does>."

## 9. Each turn
What this context does each turn (a week, X-18) and in the turns where a new month, season or year begins, and what it must read first. The global order lives in
time-and-turns; here list the steps and their dependencies.

## 10. Configuration
| Key | Meaning | Value in the design | Placeholder? | Config file |

## 11. Seams
| Other context | Direction (upstream / downstream) | Pattern | What crosses |
Patterns: Customer–Supplier, Conformist, Published Language, Open Host Service, Anti-Corruption Layer,
Shared Kernel, Partnership. "Upstream" means the other context supplies this one.

## 12. AI
What the computer players do in this context, as stated by the designs.

## 13. Open questions and contradictions
OQ-<CODE>-n: question. Sources that disagree or are silent. What blocks on it.

## 14. Traceability
| Requirement | Feature file | Scenario |
Every requirement has at least one scenario, or a line saying why not (for example "presentation only").
```

## Feature file rules

- One file per capability: `features/<capability>.feature`.
- First lines: tags, then `Feature:` and a narrative:
  ```
  @context-<slug>
  Feature: <capability>
    As a <player | AI country | the game>
    I want <…>
    So that <…>
  ```
- Each scenario carries the requirement ids it checks as tags: `@TRADE-004`. Also `@placeholder` when its
  numbers are placeholders and `@open-question` when it depends on an open question (name the OQ in a comment).
- Declarative and in domain words (what happens, not which button is tapped), except in UI contexts (shell,
  settings, tutorial) where screens are the domain.
- Concrete examples from the designs: their worked examples (Champagne 1444, Troyes, Lagos, Hungary winter
  1444, Castile 1493 …) make good scenarios.
- Prefer `Scenario Outline` with `Examples` for tables of values.
- Step phrasing: quote names (`the country "France"`), write numbers bare (`has 120 gold`), keep the same
  phrasing for the same fact across a context so steps can be automated. Start Given steps with the subject
  (`the province "Champagne" …`, `the country "Castile" …`, `the date is …`).
- Valid Gherkin 6 (`Feature`, `Rule`, `Background`, `Scenario`, `Scenario Outline`, `Examples`, `Given`,
  `When`, `Then`, `And`, `But`, data tables, doc strings). English keywords.

## Context codes

| Code | Context folder | Main sources |
|---|---|---|
| TIME | time-and-turns | gap-lists decisions, troop-movement §2, save-system §1, engine turn.ts |
| MAP | world-map | terrain.md, province-stats §2–3, repo README (map) |
| VIEW | map-presentation | province-stats §14, warfare §14, naval §10, religion §12, performance.md, screen-flow §7 |
| SETUP | scenario-setup | country-catalogue, government start forms, country-stats §10, province-stats §16 |
| PROV | province | province-stats |
| REALM | realm | country-stats |
| RSCH | research | country-stats §7, research-tree |
| BLD | buildings | buildings |
| TRADE | trade | trade |
| HER | national-strengths | national-strengths |
| RECR | recruiting | recruiting |
| MOVE | troop-movement | troop-movement |
| WAR | warfare | warfare, warfare-eras, warfare-styles |
| NAVY | naval | naval |
| EXPL | exploration | exploration |
| DIPL | diplomacy | diplomacy, country-relations |
| SUBJ | subjects | subjects |
| GOV | government | government |
| CULT | culture | culture |
| RELG | religion | religion |
| TRIBE | tribes | tribes spec (Leroy, 18 Oct) |
| REBL | rebellions | province-stats/rebellions-design |
| REVO | revolutions | revolutions |
| EVT | events | event-tree |
| SHELL | game-shell | screen-flow |
| SAVE | saves | save-system |
| SET | settings | settings |
| ACH | achievements | achievements |
| TUT | onboarding | tutorial |
| AUD | audio | music-design, sound-effects |
