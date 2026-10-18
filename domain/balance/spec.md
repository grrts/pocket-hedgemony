# Balance model (BAL)

## 1. Purpose and scope

The balance model is a tool that plays the real game without a player, many times over, and checks how the
systems work together. It answers three questions with numbers instead of feel:

1. Does any way of playing beat every other way (an overpowered mechanic or strategy)?
2. Does any mechanic do nothing (a dead lever), or swing the outcome far more than it should (a sensitive lever)?
3. Does the world move like history, roughly (realms merge and split at a believable pace, no runaway snowball)?

The first thing it checks is Leroy's concern of 18 October: **war has too few downsides, so it feels
overpowered; it should be balanced through diplomacy** (X-20). The war-price rules themselves live in warfare
(WAR-221 to WAR-232) and diplomacy (DIPL-221 to DIPL-226); this context measures whether they work.

In scope:
- Headless runs of the 1444 scenario with every realm played by the AI, and probe realms played by a fixed
  strategy.
- The metrics recorded each year, per realm and for the world.
- The balance checks, their thresholds and their verdicts.
- Lever sweeps over configuration keys.
- The balance report, and the quick run used in continuous integration.

Not in scope:
- The rules of any system (owned by each context; the model only reads the world and sends commands).
- The AI's decisions (owned by each context's §12); probe strategies are scripts that send ordinary commands.
- Performance budgets per turn (docs/performance.md; the model has its own run-time budget only).
- Anything the player sees: the model never runs inside the game, and settings never reach it (X-15).

## 2. Sources

- Leroy, 18 October 2026 (project chat): "there should be a balancing model aimed to check how systems work
  together, and to check if we don't have overpowered mechanics. I feel war right now doesn't have enough
  negatives, so it feels overpowered; it should be balanced through diplomacy." Decision X-20.
- DECISIONS.md rule 4: missing numbers get a provisional value marked `provisional` so balancing can find them.
- X-12 and realm §12: the Economy, Power and Technology scores.
- The war-cost audit of 18 October (engine at merge #72, summarised in X-20): leagues, peace voices and the
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
  played by the AI except the probe realms, and with no player realm. [X-20]
- BAL-002 The balance model shall play each run for `balance.years` years (50, provisional), or to 31 August 1939
  when asked for a full run. [X-20]
- BAL-003 The balance model shall play each run set over `balance.seeds` seeds (8, provisional), the same seeds
  for every strategy and probe realm, so strategies are compared on the same worlds. [X-20]
- BAL-004 The balance model shall give the same metrics for the same seed, rules data, probe realm and
  strategy, on every machine. [X-20; DECISIONS rule 3]
- BAL-005 The balance model shall play every rule exactly as the game does: it calls the same turn the game
  calls and changes nothing in the rules. [X-20]
- BAL-006 If a run throws, stalls or breaks an invariant, then the balance model shall stop that run, record the
  turn, seed and error, mark the run set failed, and go on with the other runs. [X-20]

### 5.2 Probe realms and strategies

- BAL-007 The balance model shall pick probe realms in three size bands by settled provinces in 1444 (large,
  medium and small), two per band and from at least three continents, listed in `balance.probes`
  (provisional: France, Ottomans, Castile, Mali, Brandenburg, Ayutthaya). [X-20]
- BAL-008 The balance model shall play each probe realm, in its own run, by each of four strategies:
  - **Conqueror**: declares war on the weakest neighbour it may (no truce, not allied) whenever it is at peace
    and its treasury is not in debt, and asks every peace for all the land it may take.
  - **Builder**: never declares war; spends on works and learning; answers calls to arms only when bound.
  - **Diplomat**: never declares war without a held war aim; spends on envoys, marriages, alliances, demands,
    subjects and folding them in.
  - **Court**: the plain AI, as every other realm. [X-20]
- BAL-009 A probe strategy shall send only commands the player could send, and shall answer every call, offer
  and ask the AI would be asked. [X-20; INV-BAL-3]

### 5.3 Metrics

- BAL-010 Each January turn the balance model shall record for every realm: settled provinces owned and held as
  subjects, people, the Economy, Power and Technology scores (realm §12), treasury, debt, a year's income and
  spending by ledger line, soldiers and those lost that year (battle, hunger, sickness, desertion), wars
  declared, joined, won and lost, Lands taken (20 years), notoriety, leagues against it and their soldiers,
  mean standing of its neighbours toward it, its weakest stability pillar, rebels risen, and inventions known. [X-20]
- BAL-011 Each January turn the balance model shall record for the world: realms alive, the largest realm's share
  of settled land, provinces that changed owner that year by war, by demand and by diplomacy (subjects,
  unions, folding in), wars started, wars ended and how (taken land, white peace, obliged by peace voices,
  exhaustion), the mean length of the wars that ended, and leagues standing. [X-20]
- BAL-012 For every realm and path the balance model shall work out the return on gold: score gained per 100 gold
  spent on war (armies, companies, their pay and food), on works, on learning and on diplomacy (envoys, gifts,
  tribute paid), over the run. [X-20]

### 5.4 Checks

Thresholds are provisional values in `balance.checks`; each check gives pass, warn (within a fifth of the
threshold) or fail.

- BAL-013 *No strategy dominates.* Across every probe realm and seed, no strategy shall rank first on the sum of
  its three score ranks in more than `balance.checks.dominance_share` (60 %, provisional) of the pairs. [X-20]
- BAL-014 *War is not the best path.* For every size band, the Conqueror's mean score growth shall not exceed the
  better of the Builder's and the Diplomat's by more than `balance.checks.war_edge` (25 %, provisional), and the
  Diplomat's shall reach at least `balance.checks.diplomacy_floor` (80 %, provisional) of the Conqueror's. [X-20]
- BAL-015 *War is paid for.* In Conqueror runs, the return on gold of war shall not exceed that of the best other
  path by more than `balance.checks.war_return_edge` (50 %, provisional), and an occupied province shall yield
  its occupier less than the occupier's own provinces of the same tax. [X-20; WAR-224]
- BAL-016 *Conquest is answered.* In Conqueror runs where Lands taken passes the era's league threshold, a league
  against the probe shall form within 2 years in at least `balance.checks.league_share` (75 %, provisional) of
  them, and its neighbours' mean standing toward it shall fall below Cool. [X-20; DIPL-221, DIPL-222]
- BAL-017 *Wars end.* In every run, at least `balance.checks.voices_share` (20 %, provisional) of the wars that
  last over a year shall end by an obliged peace (peace voices over half), and no war shall reach the 60-month
  exhaustion peace in more than 10 % of the wars. [X-20; WAR-221]
- BAL-018 *No snowball.* Over each run, realms of the top size decile in 1444 shall not grow their share of
  settled land faster than the median realm by more than `balance.checks.snowball_edge` (1.5 ×, provisional),
  and no AI realm shall hold more than `balance.checks.max_share_1544` (10 %, provisional) of settled land by
  1544 in more than one seed in eight. [X-20; X-12]
- BAL-019 *Believable pace.* Realms alive in 1544 shall lie between `balance.checks.alive_1544` (50 % and 90 % of
  the 1444 count, provisional). [X-20]
- BAL-020 *Every path is open to every size.* For the small band, the best strategy's mean score growth shall be at
  least `balance.checks.small_floor` (70 %, provisional) of the large band's best, so small realms are playable. [X-20]
- BAL-021 *No collapse without cause.* No realm shall go bankrupt (debt over two years' income) at peace with no
  rebels in more than `balance.checks.bankrupt_share` (5 %, provisional) of realm-runs. [X-20]

### 5.5 Lever sweeps

- BAL-022 When asked for a lever sweep, the balance model shall repeat the run set with each lever in
  `balance.sweep.levers` (every provisional key by default) multiplied by each factor in `balance.sweep.factors`
  (0.5 and 2, provisional), one lever at a time. [X-20; DECISIONS rule 4]
- BAL-023 The balance model shall name each lever's target metric from `balance.sweep.targets` (for example
  `warfare.occupation.tax_share` → the Conqueror's return on gold of war) and flag a **dead lever** when no factor
  moves its target by `balance.sweep.dead` (2 %, provisional). [X-20]
- BAL-024 The balance model shall flag a **sensitive lever** when a factor changes which strategy ranks first in
  more than `balance.sweep.sensitive` (25 %, provisional) of the pairs. [X-20]

### 5.6 Report

- BAL-025 The balance model shall write each run set's report to `balance-reports/<date>-<config hash>/`:
  `summary.md`, one page with every check's verdict, value and threshold, the flagged levers, and the three
  largest gaps between strategies; `metrics.csv`, one row per realm, run and year; `world.csv`, one row per run
  and year; and `runs.json`, the run set and every run's error if any. [X-20]
- BAL-026 The summary shall start with the war-price checks (BAL-014 to BAL-017) and explain each failure in one
  sentence that names the lever most likely to fix it, from the sweep when one ran. [X-20]
- BAL-027 The balance model shall exit with a failure code when any check fails, so it can guard a merge. [X-20]

### 5.7 Quick run and the full run

- BAL-028 The balance model shall offer a quick run (`balance.quick`: 2 seeds, 20 years, the Conqueror and the
  Court on two probe realms, provisional) that finishes within `balance.quick.minutes` (10, provisional) on the CI
  runner and runs on pull requests that change rules data, the turn or a context's rules; a quick run warns but
  never fails a merge. [X-20]
- BAL-029 The full run and lever sweeps shall run on demand (`pnpm balance`, `pnpm balance --sweep`), and their
  summaries are kept with the milestone that tunes them. [X-20]

### How the player uses it

- BAL-030 The player never sees or runs the balance model: it is a developer's tool, outside the game, and it
  changes no rule or setting. Its results reach the player only as tuned numbers in the rules data. The report's
  `summary.md` is the developers' overview: one page that shows at a glance whether war, diplomacy and growth are
  in balance. The player-facing side of the price of war (the declare sheet, the war card, *Your name abroad*)
  is specified in WAR-229 to WAR-232 and DIPL-225 to DIPL-226. [X-19; X-20]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| RunBalance(seeds, years, probes, strategies) | developer | rules data load | run set played, report written | BalanceRunFinished, BalanceCheckFailed |
| SweepLevers(levers, factors) | developer | a run set definition | one run set per lever and factor | LeverFlagged |
| RunQuickBalance() | CI | a pull request changes rules or the turn | quick run set, warnings only | BalanceRunFinished |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| BalanceRunFinished | A run set ends | report path, verdicts | CI, developers |
| BalanceCheckFailed | A check fails | check, value, threshold | CI |
| LeverFlagged | A sweep flags a lever | lever, dead or sensitive, numbers | developers |

## 8. Policies

- When any context marks a number provisional, the lever becomes part of the default sweep.
- When rules data, the turn or a context's rules change in a pull request, the quick run runs.

## 9. Each turn

The model runs outside the game's turn. Each turn it lets each probe strategy send its commands in the orders
step (X-2, step 1, in the probe's nation order like any AI realm), then calls the game's turn; in each January
turn, after the turn, it records the metrics.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| balance.years | Years per run | 50 | yes | balance |
| balance.seeds | Seeds per run set | 8 | yes | balance |
| balance.probes | Probe realms by band | France, Ottomans; Castile, Mali; Brandenburg, Ayutthaya | yes | balance |
| balance.checks.dominance_share | BAL-013 | 60 % | yes | balance |
| balance.checks.war_edge | BAL-014 | 25 % | yes | balance |
| balance.checks.diplomacy_floor | BAL-014 | 80 % | yes | balance |
| balance.checks.war_return_edge | BAL-015 | 50 % | yes | balance |
| balance.checks.league_share | BAL-016 | 75 % | yes | balance |
| balance.checks.voices_share | BAL-017 | 20 % | yes | balance |
| balance.checks.snowball_edge | BAL-018 | 1.5 × | yes | balance |
| balance.checks.max_share_1544 | BAL-018 | 10 % | yes | balance |
| balance.checks.alive_1544 | BAL-019 | 50 % to 90 % | yes | balance |
| balance.checks.small_floor | BAL-020 | 70 % | yes | balance |
| balance.checks.bankrupt_share | BAL-021 | 5 % | yes | balance |
| balance.sweep.levers | Levers swept | every provisional key | yes | balance |
| balance.sweep.factors | Sweep factors | 0.5, 2 | yes | balance |
| balance.sweep.targets | Target metric per lever | per lever | yes | balance |
| balance.sweep.dead | BAL-023 | 2 % | yes | balance |
| balance.sweep.sensitive | BAL-024 | 25 % | yes | balance |
| balance.quick | Quick run | 2 seeds, 20 years, Conqueror and Court, 2 probes | yes | balance |
| balance.quick.minutes | Quick run budget | 10 | yes | balance |

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
| BAL-025 … BAL-029 | features/balance-report.feature | The report's files; War-price checks come first; A failed check fails the command; The quick run warns only; Full runs and sweeps run on demand |
| BAL-030 | — | Not player-facing; the player-facing price of war is WAR-229 to WAR-232 and DIPL-225 to DIPL-226 |
