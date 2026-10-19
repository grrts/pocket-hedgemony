# Pocket Hegemony wiki

Pocket Hegemony is an 8-bit grand strategy game for phones, desktop and the web. You lead one of hundreds of realms from 20 September 1378 to the end of August 1939, one week per turn, on a pixel-art map of the whole world that you can zoom from the globe down to a single town.

This wiki explains every system in the game and how it works. Each page is written from the game's domain specs, the precise rules the code is checked against, so the wiki and the game say the same thing. Numbers marked provisional are still being balanced, and every page ends with what is not decided yet.

## Start here

- [How a turn works](Time-and-Turns): one week per turn, the days inside it, and when the campaign ends.
- [The 1378 start](The-1378-Start): which realms exist and which you can play.
- [Your realm](Your-Realm) and [Provinces](Provinces): the two cards everything else feeds.
- [Map and Map Modes](Map-and-Lenses): what the map shows at each zoom.

## Land and economy

| Page | What it covers |
|---|---|
| [Provinces](Provinces) | Land and tiles, people and classes, tax, roads, officials, order, health |
| [Your realm](Your-Realm) | Treasury, food, lords, the ruler and family, how a campaign is scored |
| [Research](Research) | Schools, scholars and the invention tree, era by era |
| [Buildings](Buildings) | Building, upgrading and keeping buildings; landmarks |
| [Trade](Trade) | Traders and trade ships, routes, the trade ratio and deposits |

## Armies and the seas

| Page | What it covers |
|---|---|
| [Recruiting](Recruiting) | Calling the levy, training regiments, commanders |
| [Troop movement](Troop-Movement) | Marching day by day, food on the road, orders |
| [Warfare](Warfare) | Battles, sieges, occupation, war through the eras |
| [Naval](Naval) | Ports, sailors, admirals, fleets and sailing |
| [Exploration and colonies](Exploration-and-Colonies) | Voyages into the unknown and founding colonies |
| [Tribes and hunting grounds](Tribes-and-Hunting-Grounds) | Tribal realms, claiming and taking in hunting grounds, asking a tribe for its land |

## Statecraft

| Page | What it covers |
|---|---|
| [Diplomacy](Diplomacy) | Envoys, relations, the reasons count, war aims, peace and truces |
| [Subjects](Subjects) | Overlords and subjects, loyalty, folding a subject in |
| [Institutions](Institutions) | The Empire: hold, seats and elections, the Emperor's duties |
| [Government](Government) | Forms of rule, the caps on officials and lords, reforms |
| [Culture](Culture) | Languages, how close each is to yours, how languages drift |
| [Religion](Religion) | Faiths, the faith mix, preachers, holy places |
| [Rebellions](Rebellions) | Grievances, risings and how to answer them |

## History and identity

| Page | What it covers |
|---|---|
| [Historical events](Historical-Events) | Ages, periods and events with choices |
| [Revolutions](Revolutions) | Revolutions that change how a country plays |
| [National strengths](National-Strengths) | Each realm's heritage: birthright, golden ages, ambitions, legacies, weakness |

## Around the game

| Page | What it covers |
|---|---|
| [Screens and navigation](Screens-and-Navigation) | Every screen from the title to the end of a campaign, on touch, mouse and controller |
| [Saving](Saving) | Autosave, slots, ironman and cloud saves |
| [Settings](Settings) | Every setting and what it changes |
| [Tutorial and help](Tutorial-and-Help) | The Murad's Frontier tutorial, tooltips and the Almanac |
| [Achievements](Achievements) | What can be earned and how |
| [Music and sound](Music-and-Sound) | The PH-5 sound chip, music that follows history, and sound effects |

## Game data

Every number the game plays by, made from its config so it always matches the game, and the formulas that combine them.

| Page | What it covers |
|---|---|
| [Game data](Game-Data) | Where every value comes from, and how to read them |
| [Formulas](Formulas) | How the game computes battles, sieges, harvests, money, trade, research and marching |
| [Core values](Data-Defines) | Economy, works, levies, military, march |
| [Time and turns data](Data-Time-and-Turns) | Mover kind order, battle days, cadences, seasons, autosave |
| [Realm data](Data-Realm) | Stats, loyalty, food, officials, lords |
| [Province data](Data-Province) | Land tiles, buildings, food, classes, births and deaths, tax, plague, walls and grievances |
| [Buildings data](Data-Buildings) | Building materials, sites, condition and damage, upkeep, landmarks and regional variants |
| [Trade data](Data-Trade) | Ratio, value, collect, deposit, route |
| [Research data](Data-Research) | All 187 inventions with era, prerequisites and what they open, era costs, schools and scholars |
| [Institutions data](Data-Institutions) | Hold, empire, shogunate |
| [Warfare data](Data-Warfare) | Arms and their strengths, kinds of troops and their break points, battles, sieges, supply and hunger |
| [Recruiting data](Data-Recruiting) | Call shares, mass conscription, refill per year, conscription, gathering |
| [Troop movement data](Data-Troop-Movement) | Frozen rivers, battle steps, road factor, season factor, order factor |
| [Naval data](Data-Naval) | Ships, harbours and shipyards, crews and pay, admirals, storms, pirates and blockades |
| [Exploration data](Data-Exploration) | Governor slots, aggression, colony stores, naval, game |
| [Tribes data](Data-Tribes) | Region bounds, new tribe provinces, new tribes left out, range size, settlers wrong |
| [Government data](Data-Government) | Over cap, great lord, subject reach start, start, buildings |
| [Subjects data](Data-Subjects) | Gift, loyalty, kinds, ties, reasons |
| [Diplomacy data](Data-Diplomacy) | Relations, envoys, ledger, reasons, actions |
| [Religion data](Data-Religion) | Added faiths, faiths, relations, mix, pull |
| [Culture data](Data-Culture) | Relation, drift, policy, officials, effects |
| [Rebellions data](Data-Rebellions) | Steps, rising chance, step effects, sparks, causes |
| [Revolutions data](Data-Revolutions) | Reference, foreign backing, counter revolution, reaction, generals switch to |
| [National strengths data](Data-National-Strengths) | Rules, units, levers, scope cost, levels |
| [Events data](Data-Events) | Campaign, balance, enums, statistics, ai factor rules |
| [Achievements data](Data-Achievements) | Limits, progress, tiers, achievements |
| [Everyday events data](Data-Events-Everyday) | Food, events |

## How the systems fit together

The game is built as 29 systems, each owning its own rules. The [context map](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/context-map.md) shows how they depend on each other. In short: the clock, the map and the 1378 start sit underneath everything; provinces and the realm make the gold, food and people; armies, fleets and traders spend and move them; diplomacy, government, culture and religion shape who rules and who obeys; events, revolutions and heritage give history its shape; and the screens, saves, sound and achievements sit on top without ever changing the simulation.

## For developers

- [Design principles](Design-Principles): how every feature is designed around the player, grouped logically, given an overview and checked on a phone.

- Domain specs and feature files: `domain/` in the [game repository](https://github.com/grrts/pocket-hedgemony). Each system has `spec.md` (requirements with ids such as `TRADE-004`) and `features/*.feature` (Gherkin).
- `pnpm specs` prints how many scenarios each system has, how many are automated and how many pass.
- Rules code lives in `packages/engine/src/domain/<system>/`, balance numbers in `packages/rules/data/domain/<system>.json`.
- Everything not yet decided is in [open-questions.md](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/open-questions.md).
