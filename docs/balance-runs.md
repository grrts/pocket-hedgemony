# Balance runs (feedback 130)

Three tools in `packages/sim` play the game without a person, to find what is out of balance and what is
broken. **They run only when Leroy asks for a run.** CI tests the tools on a few weeks of a small made-up
world; it never starts a campaign.

## What they do

**AI-only campaigns.** Every realm is the AI's and nobody plays. The world is played week after week exactly
as the game plays the AI around a player, and sampled every year (config `run.sample_months`). The checks
flag a realm that takes too much of the world, too many realms gone, gold piling up with nothing to spend
it on, decades of peace, near-total war, and any number that turned into NaN or a negative population.

**The bot as each realm.** An advanced bot plays one realm as the "human". It plays through the same engine
host and the same orders as the game's screens (`newGame`, `act`, `advance`), and it decides from the same
snapshot the screens draw, so it can only do what a player can. It plays hard: heavy taxes, building with
every spare gold, the troop cap full in war, wars on the weakest neighbour it outmatches, marches on the
nearest enemy land, land demanded at the peace table. It answers everything that waits on the player
(events, peace offers, calls to arms, envoys, risings, a revolution) and, once a year, tries round trips
that must never make money (borrow then repay, recruit then cancel, build then cancel).

Each bot run is measured against the same realm in an AI-only campaign of the same seed and length. The
checks flag a realm that ends with several times the AI's land or income, a hoard of gold, a world power,
gold made from a round trip, bad numbers and engine errors. Orders the game refused the bot are counted:
not faults by themselves, but a high count can show a screen offering what the rules then refuse.

**Strategy runs (the balance model, `domain/balance`, X-21).** Asks whether war is too strong next to
building and diplomacy. Probe realms in three size bands (config `balance.probes`: France and the Ottomans,
Castile and Mali, Brandenburg and Ayutthaya; on the made-up world the largest, middle and smallest realm) are
each played, on the same seeds, by four strategies:

- **Conqueror**: war on the weakest neighbour it may whenever it is at peace and out of debt, the troop cap
  full, every peace asked for all the land it holds; it builds nothing.
- **Builder**: no war of its own; its gold goes to works and to founding and filling schools; it answers only
  defensive calls and takes any peace that costs it nothing.
- **Diplomat**: war only on a realm it holds a war aim on; envoys every month (subjects offered to smaller
  neighbours, alliances, marriages, gifts, courtesy visits), a demand a year of a much weaker neighbour, and
  subjects folded in when it may.
- **Court**: the plain AI. One AI-only world per seed serves every probe realm.

The scripted strategies play through the engine host like the bot (they share its code in `bot.ts`), decide
from the snapshot only and answer everything that waits on the player. The run itself reads the world each
week to measure it (`metrics.ts`), and each January it writes a row per realm (land and subjects, people, the
Economy, Power and Technology scores, treasury, debt, income and the ledger by line, soldiers and those killed,
wars declared, joined, won and lost, Lands taken, notoriety, leagues against it, its neighbours' mean standing,
its weakest stability pillar, rebels risen, inventions) and one for the world (realms alive, the largest
realm's share of settled land, provinces that changed owner by war, by a demand and by diplomacy, wars begun
and how they ended, leagues, and what occupied land pays its occupier). Numbers the engine does not keep yet
are left empty: soldiers lost to hunger, sickness and desertion.

Nine checks (BAL-013 to BAL-021) give pass, warn (within a fifth of the line) or fail, with their lines in
`balance.checks`. The war-price checks come first: the Conqueror must not grow much faster than the best
peaceful strategy (BAL-014), war must not return much more per 100 gold than the other paths and occupied
land must pay its occupier less than its own (BAL-015), a conqueror past the league threshold must meet a
league (BAL-016), and long wars must end by obliged peaces rather than by exhaustion (BAL-017). The first lines
are set so today's engine fails them (D-BAL-2).

How the numbers are read:

- *Score growth* is the mean of the three scores' change over the run, each relative to the realm's start,
  as an index: 100 held its own, 120 grew a fifth. Strategies are ranked per probe realm and seed on the sum
  of their three score ranks (D-BAL-1).
- *Return on gold* is the path's score gained, as a percent of its start, per 100 gold spent on it: war
  (army pay, navy, and the gold recruiting, hiring, commissioning and training took) against Power, works
  against Economy, learning (schools) against Technology, diplomacy (tribute paid, gifts, demands) against
  the Power its subjects give. Court counts ledger spending only, as an AI realm's one-off spending is not
  seen. A score that starts at 0 everywhere (Technology in 1444) is measured against a tenth of the world's
  mean.
- *How a war ended* is worked out from outside: obliged when, the week before, either side's peace voices
  were over half; land when provinces changed hands between the sides; exhaustion when it lasted the
  war-exhaustion months; else white.

**Lever sweeps** (`--sweep`) play the whole set again with one lever scaled by each factor in
`balance.sweep.factors` (0.5 and 2). A lever is a dotted path into the rules data: `defines.<path>` in the
ruleset's defines, or `<file>.<path>` in a gameplay domain file (`warfare.troop_cap`, `diplomacy.leagues` …);
every number under it is scaled, and the files are put back after each run. By default every key the
domain files list as `_provisional` is swept; `--levers a.b,c.d` narrows it. Each lever is measured by its
target (`balance.sweep.targets`); it is **dead** when no factor moves the target by 2 %, **sensitive** when a
factor changes the first-ranked strategy in more than a quarter of the pairs. A lever the rules data does not
have yet (such as `warfare.occupation.tax_share`, which comes with WAR-224) is listed as not swept.

All lines the checks draw, the bot's play and the balance model's settings are in
`packages/sim/config.json`; the game's own rules are not touched.

## Running one

```
pnpm --filter @ph/sim campaign --years 50 --seeds 1,2,3
pnpm --filter @ph/sim campaign --years 50 --seeds 1,2 --difficulty hard
pnpm --filter @ph/sim breaker --realms france,castile --years 50
pnpm --filter @ph/sim breaker --all --years 50 --jobs 4
pnpm --filter @ph/sim strategies --years 50 --seeds 1,2,3
pnpm --filter @ph/sim strategies --years 50 --seeds 1,2,3 --probes france,mali --strategies conqueror,diplomat,court
pnpm --filter @ph/sim strategies --years 20 --seeds 1,2 --sweep --levers warfare.troop_cap,diplomacy.leagues
```

`--difficulty easy|hard` plays campaign and bot runs on that difficulty (SETUP-099 to SETUP-103: the AI's war
chance and income, the player's risings); left out, they play on normal. `--map synthetic` tries the tools on a small made-up world in seconds. `--jobs` runs that many at once,
each on its own thread (each real-map engine needs a few hundred MB). `--no-baseline` skips the AI-only
campaign a bot run is measured against. On the real map a 50-year campaign is minutes of work and `--all`
(137 realms, each against the AI) is hours; the command line prints each run as it ends. A full strategy run
set is 6 probe realms × 3 scripted strategies × 8 seeds plus 8 AI-only worlds (152 runs of 50 years); a sweep
plays that again for every lever and factor, so name the levers.

Each run writes into `packages/sim/out/<time>-<command>/` (or `--out DIR`): `report.md` to read first,
`summary.json` with every finding, and one JSON file per campaign (`campaign-seed-N.json`, with every
sample) and per realm (`bot-<realm>.json`). Strategy runs write one JSON file per run
(`run-<strategy>-<realm>-seed-N.json`, the probe realms' rows), `metrics.csv` (a row per realm, run and
year) and `world.csv` (a row per run and year); the command exits with code 1 when a check fails or a run
broke, so it can guard a merge (BAL-027).

## How the player uses it

Here the player is Leroy, balancing the game, and most of the time Claude runs the tools for him. The
player of the game never sees any of this: the tools change no rule or setting, and their results reach
players only as tuned numbers in the rules data (BAL-030).

1. **Where he finds it and what he does.** He asks in the project for a run ("run the AI for 100 years", "let
   the bot play every realm", "compare the strategies over 50 years", "sweep the war levers"). Claude runs it
   and copies the run's folder to the shared project files under `balance-runs/<date>/`, then links
   `report.md` in the thread. No in-game screen: these are tools for building the game, not part of it.
2. **How it is grouped.** One report per run. Campaigns get a section each and the bot's realms one table;
   a strategy run's report has At a glance, then one **Strategy comparison** section holding the checks,
   score growth by size band, the largest gaps, return on gold, the probe realms, the flagged levers and the
   world. The JSON and CSV files beside it hold every number for any question the report leaves open.
3. **The overview.** The report opens with **At a glance**. For campaigns and bot runs: how many findings are
   Broken (must be fixed), Balance (a line in config.json crossed) or Note, then each one in a line with its
   year and run. For strategy runs: the war-price checks first (BAL-014 to BAL-017), then the others, each
   in one line with its verdict and one sentence, a failure naming the lever most likely to fix it (from the
   sweep when one ran, else from `balance.check_levers`); a glance shows whether war, diplomacy and growth
   are in balance.
4. **On a phone.** The report is plain Markdown that the project's file preview shows on a phone; every table
   keeps to five short columns so it reads in portrait and landscape without scrolling sideways.

## The history check (BAL-031 to BAL-034)

`pnpm --filter @ph/sim history --seeds 1,2,3 --years 70` plays AI-only campaigns from the bundled start and compares the world with each history checkpoint it reaches (1405, 1420, 1444, 1500, 1600, 1715, 1815, 1914; the data is in `packages/sim/data/checkpoints/`). At each one it counts the key places whose holder matches, the listed realms that exist, the great powers among the 8 largest realms and the turning points that happened, and marks the checkpoint *within history* when the key-place share reaches the checkpoint's tolerance (0.8 in 1405 down to 0.3 in 1914). It never fails: realms are meant to go their own way, and the game never pulls them back. `history.md` has one row per checkpoint in five short columns, then the places that differ most often; `history.json` has every number. As with the balance runs, it starts only when Leroy asks. For scale: the 1444 start compared with its own checkpoint matches 82 % of the key places, since some realms are too small for the map.
