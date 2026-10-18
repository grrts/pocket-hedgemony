# Pocket Hegemony wiki

Pocket Hegemony is an 8-bit grand strategy game for phones, desktop and the web. You lead one of hundreds of realms from 1444 to the end of August 1939, one week per turn, on a pixel-art map of the whole world that you can zoom from the globe down to a single town.

This wiki explains every system in the game and how it works. Each page is written from the game's domain specs, the precise rules the code is checked against, so the wiki and the game say the same thing. Numbers marked provisional are still being balanced, and every page ends with what is not decided yet.

## Start here

- [How a turn works](Time-and-Turns): one week per turn, the days inside it, and when the campaign ends.
- [The 1444 start](The-1444-Start): which realms exist and which you can play.
- [Your realm](Your-Realm) and [Provinces](Provinces): the two cards everything else feeds.
- [Map and lenses](Map-and-Lenses): what the map shows at each zoom.

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

## Statecraft

| Page | What it covers |
|---|---|
| [Diplomacy](Diplomacy) | Envoys, relations, the reasons count, war aims, peace and truces |
| [Subjects](Subjects) | Overlords and subjects, loyalty, folding a subject in |
| [Government](Government) | Forms of rule, the caps on officials and lords, reforms |
| [Culture](Culture) | Tongues, kin and strangers, how tongues drift |
| [Religion](Religion) | Faiths, the faith mix, preachers, holy places |
| [Rebellions](Rebellions) | Grievances, risings and how to answer them |

## History and identity

| Page | What it covers |
|---|---|
| [Historical events](Historical-Events) | Ages, periods and events with choices |
| [Revolutions](Revolutions) | Revolutions that change how a country plays |
| [National strengths](National-Strengths) | Each realm's heritage: birthright, heydays, ambitions, legacies, burden |

## Around the game

| Page | What it covers |
|---|---|
| [Screens and navigation](Screens-and-Navigation) | Every screen from the title to the end of a campaign, on touch, mouse and controller |
| [Saving](Saving) | Autosave, slots, ironman and cloud saves |
| [Settings](Settings) | Every setting and what it changes |
| [Tutorial and help](Tutorial-and-Help) | The Year of Varna tutorial, tooltips and the Almanac |
| [Achievements](Achievements) | What can be earned and how |
| [Music and sound](Music-and-Sound) | The PH-5 sound chip, music that follows history, and sound effects |

## How the systems fit together

The game is built as 29 systems, each owning its own rules. The [context map](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/context-map.md) shows how they depend on each other. In short: the clock, the map and the 1444 start sit underneath everything; provinces and the realm make the gold, food and people; armies, fleets and traders spend and move them; diplomacy, government, culture and religion shape who rules and who obeys; events, revolutions and heritage give history its shape; and the screens, saves, sound and achievements sit on top without ever changing the simulation.

## For developers

- [Design principles](Design-Principles): how every feature is designed around the player, grouped logically, given an overview and checked on a phone.

- Domain specs and feature files: `domain/` in the [game repository](https://github.com/grrts/pocket-hedgemony). Each system has `spec.md` (requirements with ids such as `TRADE-004`) and `features/*.feature` (Gherkin).
- `pnpm specs` prints how many scenarios each system has, how many are automated and how many pass.
- Rules code lives in `packages/engine/src/domain/<system>/`, balance numbers in `packages/rules/data/domain/<system>.json`.
- Everything not yet decided is in [open-questions.md](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/open-questions.md).
