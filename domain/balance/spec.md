# Balance model (BAL)

## 1. Purpose and scope

The balance model is a tool that plays the real game without a player, many times over, and checks how the
systems work together. It answers three questions with numbers instead of feel:

1. Does any way of playing beat every other way (an overpowered mechanic or strategy)?
2. Does any mechanic do nothing (a dead lever), or swing the outcome far more than it should (a sensitive lever)?
3. Does the world move like history, roughly (realms merge and split at a believable pace, no runaway snowball)?

The first thing it checks is Leroy's concern of 18 October: **war has too few downsides, so it feels
overpowered; it should be balanced through diplomacy** (X-21). The war-price rules themselves live in warfare
(WAR-221 to WAR-232) and diplomacy (DIPL-221 to DIPL-226); this context measures whether they work.

The model is built on the balance runs that already exist in `packages/sim` (feedback 130,
`docs/balance-runs.md`): AI-only campaigns and the break-the-game bot, with their findings and report. This
context adds probe strategies, the strategy comparison, the war-price checks, return on gold and lever sweeps to
those tools rather than a second runner.

In scope:
- Headless runs of the 1444 scenario with every realm played by the AI, and probe realms played by a fixed
  strategy.
- The metrics recorded each year, per realm and for the world.
- The balance checks, their thresholds and their verdicts.
- Lever sweeps over configuration keys.
- The balance report, and how the tools are tested in continuous integration.

Not in scope:
- The rules of any system (owned by each context; the model only reads the world and sends commands).
- The AI's decisions (owned by each context's §12); probe strategies are scripts that send ordinary commands.
- Performance budgets per turn (docs/performance.md; the model has its own run-time budget only).
- Anything the player sees: the model never runs inside the game, and settings never reach it (X-15).

## 2. Sources

- `docs/balance-runs.md` and `packages/sim` (feedback 130): AI-only campaigns, the break-the-game bot, the
  findings (Broken, Balance, Note), `packages/sim/config.json`, and the rule that runs start only when Leroy asks.

- Leroy, 18 October 2026 (project chat): "there should be a balancing model aimed to check how systems work
  together, and to check if we don't have overpowered mechanics. I feel war right now doesn't have enough
  negatives, so it feels overpowered; it should be balanced through diplomacy." Decision X-21.
- DECISIONS.md rule 4: missing numbers get a provisional value marked `provisional` so balancing can find them.
- X-12 and realm §12: the Economy, Power and Technology scores.
- The war-cost audit of 18 October (engine at merge #72, summarised in X-21): leagues, peace voices and the
  lords' wavering exist as rule libraries but are not run in the turn; occupation pays the occupier; a peace
  takes every occupied province; the AI weighs no cost before declaring.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Balance run | One campaign played headless from 11 November 1444 for a set number of years with one seed | A playtest (a person plays) |
| Run set | Every balance run of one report: seeds × probe realms × strategies | — |
| Probe realm | A realm whose orders come from a probe strategy instead of the AI | The player's realm |
| Probe strategy | A fixed script of ordinary commands: Conqueror, Builder, Diplomat or Court (the plain AI) | An AI personality |
| Size band | Large, medium or small, by the probe realm's settled provinces in 1444 | — |
| Metric | A number read from the world once a year | A score (realm §12) |
| Check | A rule over metrics with a threshold and a verdict: pass, warn or fail | A requirement |
| Lever | A configuration key, most often one marked provisional | A setting (X-15) |
| Lever sweep | The run set repeated with one lever scaled down and up | — |
| Dead lever | A lever whose sweep moves its own target metric by less than the dead threshold | — |
| Sensitive lever | A lever whose sweep moves the strategy ranking more than the sensitive threshold | — |
| Snowball | Large realms growing faster, in share, than small ones | Consolidation (realms merging at a believable pace) |
| Price of war | Everything a war costs its realm: gold, men, people, lords, standing abroad, leagues | War score (not used, WAR-200) |
| Return on gold | Score gained per 100 gold spent on a path (war, works, learning, diplomacy) over the run | — |

## 4. Domain model

### Aggregates

**Run set** (identity: report date and configuration hash)
- Holds: the seeds, the years, the probe realms, the strategies, the lever sweep if any, the runs.
- INV-BAL-1: Every run in a set uses the same rules data and the same game build; a lever sweep changes exactly one lever.
- INV-BAL-2: The same seed, rules data, strategy and probe realm always give the same metrics (determinism, DECISIONS rule 3).

**Balance run** (identity: seed, probe realm, strategy)
- Holds: the yearly metrics per realm and for the world, the commands the probe sent, the news of wars and peaces.
- INV-BAL-3: A run never reads anything the AI or the player could not read; it sends only commands from the
  contexts' §6 tables, with no cheat and no direct write to the world.

**Report** (identity: run set)
- Holds: every check's verdict with its numbers, the flagged levers, the tables behind them.

### Value objects

- Yearly metrics row (realm or world), check verdict (pass / warn / fail, value, threshold), lever result
  (lever, factor, target metric change, ranking change).

### Domain services

- **Runner**: builds the world from the 1444 scenario, plays turns headless (the engine's turn with no player),
  hands each probe realm's turn to its strategy.
- **Recorder**: reads the metrics each January turn.
- **Checker**: evaluates the checks over a run set.
- **Sweeper**: repeats a run set per lever and factor.
- **Reporter**: writes the report.

## 5. Requirements

### 5.1 Runs

- BAL-001 The balance model shall play the 1444 scenario on the real map from 11 November 1444 with every realm
  played by the AI except the probe realms, and with no player realm. [X-21]
- BAL-002 The balance model shall play each run for `balance.years` years (50, provisional), or to 31 August 1939
  when asked for a full run. [X-21]
- BAL-003 The balance model shall play each run set over `balance.seeds` seeds (8, provisional), the same seeds
  for every strategy and probe realm, so strategies are compared on the same worlds. [X-21]
- BAL-004 The balance model shall give the same metrics for the same seed, rules data, probe realm and
  strategy, on every machine. [X-21; DECISIONS rule 3]
- BAL-005 The balance model shall play every rule exactly as the game does: it calls the same turn the game
  calls and changes nothing in the rules. [X-21]
- BAL-006 If a run throws, stalls or breaks an invariant, then the balance model shall stop that run, record the
  turn, seed and error, mark the run set failed, and go on with the other runs. [X-21]

### 5.2 Probe realms and strategies

- BAL-007 The balance model shall pick probe realms in three size bands by settled provinces in 1444 (large,
  medium and small), two per band and from at least three continents, listed in `balance.probes`
  (provisional: France, Ottomans, Castile, Mali, Brandenburg, Ayutthaya). [X-21]
- BAL-008 The balance model shall play each probe realm, in its own run, by each of four strategies:
  - **Conqueror**: declares war on the weakest neighbour it may (no truce, not allied) whenever it is at peace
    and its treasury is not in debt, and asks every peace for all the land it may take.
  - **Builder**: never declares war; spends on works and learning; answers calls to arms only when bound.
  - **Diplomat**: never declares war without a held war aim; spends on envoys, marriages, alliances, demands,
    subjects and folding them in.
  - **Court**: the plain AI, as every other realm. [X-21]
- BAL-009 A probe strategy shall send only commands the player could send, and shall answer every call, offer
  and ask the AI would be asked. [X-21; INV-BAL-3]

### 5.3 Metrics

- BAL-010 Each January turn the balance model shall record for every realm: settled provinces owned and held as
  subjects, people, the Economy, Power and Technology scores (realm §12), treasury, debt, a year's income and
  spending by ledger line, soldiers and those lost that year (battle, hunger, sickness, desertion), wars
  declared, joined, won and lost, Lands taken (20 years), notoriety, leagues against it and their soldiers,
  mean standing of its neighbours toward it, its weakest stability pillar, rebels risen, and inventions known. [X-21]
- BAL-011 Each January turn the balance model shall record for the world: realms alive, the largest realm's share
  of settled land, provinces that changed owner that year by war, by demand and by diplomacy (subjects,
  unions, folding in), wars started, wars ended and how (taken land, white peace, obliged by peace voices,
  exhaustion), the mean length of the wars that ended, and leagues standing. [X-21]
- BAL-012 For every realm and path the balance model shall work out the return on gold: score gained per 100 gold
  spent on war (armies, companies, their pay and food), on works, on learning and on diplomacy (envoys, gifts,
  tribute paid), over the run. [X-21]

### 5.4 Checks

Thresholds are provisional values in `balance.checks`; each check gives pass, warn (within a fifth of the
threshold) or fail.

- BAL-013 *No strategy dominates.* Across every probe realm and seed, no strategy shall rank first on the sum of
  its three score ranks in more than `balance.checks.dominance_share` (60 %, provisional) of the pairs. [X-21]
- BAL-014 *War is not the best path.* For every size band, the Conqueror's mean score growth shall not exceed the
  better of the Builder's and the Diplomat's by more than `balance.checks.war_edge` (25 %, provisional), and the
  Diplomat's shall reach at least `balance.checks.diplomacy_floor` (80 %, provisional) of the Conqueror's. [X-21]
- BAL-015 *War is paid for.* In Conqueror runs, the return on gold of war shall not exceed that of the best other
  path by more than `balance.checks.war_return_edge` (50 %, provisional), and an occupied province shall yield
  its occupier less than the occupier's own provinces of the same tax. [X-21; WAR-224]
- BAL-016 *Conquest is answered.* In Conqueror runs where Lands taken passes the era's league threshold, a league
  against the probe shall form within 2 years in at least `balance.checks.league_share` (75 %, provisional) of
  them, and its neighbours' mean standing toward it shall fall below Cool. [X-21; DIPL-221, DIPL-222]
- BAL-017 *Wars end.* In every run, at least `balance.checks.voices_share` (20 %, provisional) of the wars that
  last over a year shall end by an obliged peace (peace voices over half), and no war shall reach the 60-month
  exhaustion peace in more than 10 % of the wars. [X-21; WAR-221]
- BAL-018 *No snowball.* Over each run, realms of the top size decile in 1444 shall not grow their share of
  settled land faster than the median realm by more than `balance.checks.snowball_edge` (1.5 ×, provisional),
  and no AI realm shall hold more than `balance.checks.max_share_1544` (10 %, provisional) of settled land by
  1544 in more than one seed in eight. [X-21; X-12]
- BAL-019 *Believable pace.* Realms alive in 1544 shall lie between `balance.checks.alive_1544` (50 % and 90 % of
  the 1444 count, provisional). [X-21]
- BAL-020 *Every path is open to every size.* For the small band, the best strategy's mean score growth shall be at
  least `balance.checks.small_floor` (70 %, provisional) of the large band's best, so small realms are playable. [X-21]
- BAL-021 *No collapse without cause.* No realm shall go bankrupt (debt over two years' income) at peace with no
  rebels in more than `balance.checks.bankrupt_share` (5 %, provisional) of realm-runs. [X-21]

### 5.5 Lever sweeps

- BAL-022 When asked for a lever sweep, the balance model shall repeat the run set with each lever in
  `balance.sweep.levers` (every provisional key by default) multiplied by each factor in `balance.sweep.factors`
  (0.5 and 2, provisional), one lever at a time. [X-21; DECISIONS rule 4]
- BAL-023 The balance model shall name each lever's target metric from `balance.sweep.targets` (for example
  `warfare.occupation.tax_share` → the Conqueror's return on gold of war) and flag a **dead lever** when no factor
  moves its target by `balance.sweep.dead` (2 %, provisional). [X-21]
- BAL-024 The balance model shall flag a **sensitive lever** when a factor changes which strategy ranks first in
  more than `balance.sweep.sensitive` (25 %, provisional) of the pairs. [X-21]

### 5.6 Report

- BAL-025 The balance model shall add to the run folder `packages/sim` already writes (`report.md`,
  `summary.json`, one JSON file per campaign and per bot realm): a strategy comparison section in `report.md`
  with every check's verdict, value and threshold, the flagged levers and the three largest gaps between
  strategies; and `metrics.csv` and `world.csv`, one row per realm, run and year and one per run and year, for
  questions the report leaves open. A failed check is a *Balance* finding; a run that breaks is *Broken*.
  [X-21; feedback 130]
- BAL-026 The report's *At a glance* shall list first the war-price checks (BAL-014 to BAL-017) and explain each failure in one
  sentence that names the lever most likely to fix it, from the sweep when one ran. [X-21]
- BAL-027 The balance model shall exit with a failure code when any check fails, so it can guard a merge. [X-21]

### 5.7 When it runs

- BAL-028 Continuous integration shall test the strategies, checks and sweeps on a few weeks of the small
  made-up world (`--map synthetic`), as it tests the existing tools, and shall never start a campaign. [X-21;
  feedback 130]
- BAL-029 Strategy runs and lever sweeps shall start only when Leroy asks for one, through the `packages/sim`
  command line (for example `pnpm --filter @ph/sim strategies --years 50 --seeds 1,2,3` and `--sweep`); Claude
  copies the run folder to the project files under `balance-runs/<date>/` and links `report.md` in the thread.
  [X-21; feedback 130]

### 5.8 The history check (milestone 10, 19 October 2026)

A headless run from the start compares the world with the history checkpoints, to measure how far a campaign moves
from history (plan-1378 §2). It is reference only: the game never pulls a realm back toward history.

- BAL-031 The history check shall play AI-only campaigns from the bundled start, as the balance runs do (BAL-005),
  over the seeds asked, and on each checkpoint date after the start that a run reaches (18 Feb 1405, 21 May 1420,
  11 Nov 1444, 1 Jan 1500, 1 Jan 1600, 1 Jan 1715, 9 Jun 1815, 28 Jun 1914), compare the world with that
  checkpoint (`packages/sim/data/checkpoints/`). [plan-1378 §2]
- BAL-032 The history check shall count four things at each checkpoint: the share of the 146 key places whose
  holder matches (each place bound to the nearest land province, a holder matching by its id or an alias in
  `ids.json`, and a place nobody held as a state left out); the share of the checkpoint's listed realms that
  exist; how many of its great powers are among the 8 realms with the most provinces (EVT-083); and the share of
  its turning points the event tree holds that have happened. [plan-1378 §2; checkpoints/README.md]
- BAL-033 The history check shall mark a checkpoint *within history* when its key-place share is at least the
  checkpoint's `tolerance.key_places_match_share` (1405 0.8, 1420 0.75, 1444 0.7, 1500 0.6, 1600 0.5, 1715 0.4,
  1815 0.35, 1914 0.3), and *apart* otherwise; it never fails the command, since realms are meant to go their own
  way. @placeholder [plan-1378 §2]
- BAL-034 The history check shall write `history.md` (read this first: one row per checkpoint with the four counts,
  the tolerance and the mark, then the places that differ most often, with who held them instead) and
  `history.json`, and start only when Leroy asks (`pnpm --filter @ph/sim history --seeds 1,2,3 --years 70`), as
  BAL-029. [plan-1378 §2, §6 step 8]

### How the player uses it

- BAL-030 The player of the game never sees the balance model: it is a tool for building the game, and it
  changes no rule or setting; its results reach players only as tuned numbers in the rules data. Its user is
  Leroy, as for the balance runs (`docs/balance-runs.md`): he asks for a run in the project, Claude runs it and
  links `report.md`, whose *At a glance* opens with the war-price checks and shows whether war, diplomacy and
  growth are in balance; the report keeps to short tables a phone shows in landscape without sideways scrolling. The player-facing side of the price of war (the declare sheet, the war card, *Your name abroad*)
  is specified in WAR-229 to WAR-232 and DIPL-225 to DIPL-226. [X-19; X-21]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| RunStrategies(seeds, years, probes, strategies) | Claude, when Leroy asks | rules data load | run set played, report written | BalanceRunFinished, BalanceCheckFailed |
| SweepLevers(levers, factors) | Claude, when Leroy asks | a run set definition | one run set per lever and factor | LeverFlagged |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| BalanceRunFinished | A run set ends | report path, verdicts | CI, developers |
| BalanceCheckFailed | A check fails | check, value, threshold | CI |
| LeverFlagged | A sweep flags a lever | lever, dead or sensitive, numbers | developers |

## 8. Policies

- When any context marks a number provisional, the lever becomes part of the default sweep.

## 9. Each turn

The model runs outside the game's turn. Each turn it lets each probe strategy send its commands in the orders
step (X-2, step 1, in the probe's nation order like any AI realm), then calls the game's turn; in each January
turn, after the turn, it records the metrics.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| balance.years | Years per run | 50 | yes | packages/sim/config.json |
| balance.seeds | Seeds per run set | 8 | yes | packages/sim/config.json |
| balance.probes | Probe realms by band | France, Ottomans; Castile, Mali; Brandenburg, Ayutthaya | yes | packages/sim/config.json |
| balance.checks.dominance_share | BAL-013 | 60 % | yes | packages/sim/config.json |
| balance.checks.war_edge | BAL-014 | 25 % | yes | packages/sim/config.json |
| balance.checks.diplomacy_floor | BAL-014 | 80 % | yes | packages/sim/config.json |
| balance.checks.war_return_edge | BAL-015 | 50 % | yes | packages/sim/config.json |
| balance.checks.league_share | BAL-016 | 75 % | yes | packages/sim/config.json |
| balance.checks.voices_share | BAL-017 | 20 % | yes | packages/sim/config.json |
| balance.checks.snowball_edge | BAL-018 | 1.5 × | yes | packages/sim/config.json |
| balance.checks.max_share_1544 | BAL-018 | 10 % | yes | packages/sim/config.json |
| balance.checks.alive_1544 | BAL-019 | 50 % to 90 % | yes | packages/sim/config.json |
| balance.checks.small_floor | BAL-020 | 70 % | yes | packages/sim/config.json |
| balance.checks.bankrupt_share | BAL-021 | 5 % | yes | packages/sim/config.json |
| balance.sweep.levers | Levers swept | every provisional key | yes | packages/sim/config.json |
| balance.sweep.factors | Sweep factors | 0.5, 2 | yes | packages/sim/config.json |
| balance.sweep.targets | Target metric per lever | per lever | yes | packages/sim/config.json |
| balance.sweep.dead | BAL-023 | 2 % | yes | packages/sim/config.json |
| balance.sweep.sensitive | BAL-024 | 25 % | yes | packages/sim/config.json |
| checkpoint `tolerance.key_places_match_share` | BAL-033 | 0.8 to 0.3 by checkpoint | yes | packages/sim/data/checkpoints/<year>.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| time-and-turns | upstream | Conformist | The turn, played headless; the date; the January turn |
| scenario-setup | upstream | Conformist | The 1444 world, probe realms by id |
| realm | upstream | Open Host Service | Scores, treasury, ledger lines, stability pillars |
| warfare | upstream | Open Host Service | Wars, battles, losses, peace voices, peace outcomes; the war-price rules it checks |
| diplomacy | upstream | Open Host Service | Lands taken, notoriety, leagues, standing, commands for the Diplomat strategy |
| subjects | upstream | Open Host Service | Subjects held, folding in |
| research | upstream | Open Host Service | Inventions known |
| rebellions | upstream | Open Host Service | Rebels risen |
| buildings | upstream | Open Host Service | Works commands for the Builder strategy |

## 12. AI

The model adds no AI. Every realm but the probes is played by the game's AI; the probes play the scripted
strategies of BAL-008 with ordinary commands. The Court strategy is the AI itself, as the baseline.

## 13. Decisions and open questions

- **D-BAL-1** Scores as the yardstick: strategies are compared on the game's own Economy, Power and Technology
  scores (X-12), so balance means "balanced for winning", not a new number.
- **D-BAL-3** One set of tools: the model extends `packages/sim` (feedback 130) and its config, report and run rule
  instead of adding a second runner; strategy runs, like every balance run, start only when Leroy asks.
- **D-BAL-2** First thresholds are provisional and chosen so today's engine fails BAL-014 to BAL-016: the audit
  found no league ever forms and occupation pays the occupier, which is the overpowered war Leroy felt. The
  first full run records the baseline before the war-price rules land.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| BAL-001 … BAL-006 | features/balance-runs.feature | A headless run plays the real 1444 world; Strategies are compared on the same worlds; Same seed, same metrics; A broken run is recorded and the rest go on |
| BAL-007 … BAL-009 | features/probe-strategies.feature | Probe realms by size band; Four strategies; Probes send only player commands |
| BAL-010 … BAL-012 | features/metrics.feature | Realm metrics each January; World metrics each January; Return on gold per path |
| BAL-013 … BAL-021 | features/balance-checks.feature | No strategy dominates; War is not the best path; War is paid for; Conquest is answered; Wars end; No snowball; Believable pace; Small realms are playable; No collapse without cause |
| BAL-022 … BAL-024 | features/lever-sweeps.feature | A sweep scales one lever at a time; A dead lever; A sensitive lever |
| BAL-025 … BAL-029 | features/balance-report.feature | The report's files; War-price checks come first; A failed check fails the command; CI tests the tools without a campaign; Runs start when Leroy asks |
| BAL-031 … BAL-034 | features/history-check.feature | The start matches its own checkpoint; A checkpoint within history; A place held by an alias; The command never fails on history |
| BAL-030 | — | Not player-facing; the player-facing price of war is WAR-229 to WAR-232 and DIPL-225 to DIPL-226 |
