# Balance runs (feedback 130)

Two tools in `packages/sim` play the game without a person, to find what is out of balance and what is
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

All lines the checks draw and the bot's play are in `packages/sim/config.json`; the game's own rules are not
touched.

## Running one

```
pnpm --filter @ph/sim campaign --years 50 --seeds 1,2,3
pnpm --filter @ph/sim breaker --realms france,castile --years 50
pnpm --filter @ph/sim breaker --all --years 50 --jobs 4
```

`--map synthetic` tries the tools on a small made-up world in seconds. `--jobs` runs that many at once,
each on its own thread (each real-map engine needs a few hundred MB). `--no-baseline` skips the AI-only
campaign a bot run is measured against. On the real map a 50-year campaign is minutes of work and `--all`
(137 realms, each against the AI) is hours; the command line prints each run as it ends.

Each run writes into `packages/sim/out/<time>-<command>/` (or `--out DIR`): `report.md` to read first,
`summary.json` with every finding, and one JSON file per campaign (`campaign-seed-N.json`, with every
sample) and per realm (`bot-<realm>.json`).

## How the player uses it

Here the player is Leroy, balancing the game, and most of the time Claude runs the tools for him.

1. **Where he finds it and what he does.** He asks in the project for a run ("run the AI for 100 years", "let
   the bot play every realm"). Claude runs it and copies the run's folder to the shared project files under
   `balance-runs/<date>/`, then links `report.md` in the thread. No in-game screen: these are tools for
   building the game, not part of it.
2. **How it is grouped.** One report per run, one section per campaign and one table for all the bot's
   realms. The JSON files beside it hold every sample for any question the report leaves open.
3. **The overview.** The report opens with **At a glance**: how many findings are Broken (must be fixed),
   Balance (a line in config.json crossed) or Note, then each one in a line with its year and run.
4. **On a phone.** The report is plain Markdown that the project's file preview shows on a phone; every table
   keeps to five short columns so it reads in portrait and landscape without scrolling sideways.
