# Multiplayer (MP)

## 1. Purpose and scope

This context decides how two or more people play one campaign together: on one device passed from hand to hand
(**Pass and play**) or each on their own device (**Online**). It owns the turn model (simultaneous weeks), the
order in which the players' orders are carried out, the game table on our server that carries the orders
between devices, and the screens that find, start and follow a game.

**In scope**
- Simultaneous weeks: every player plans the same week from the same start; the week is played once all are in.
- Who is human in a campaign with more than one player, and what the AI no longer decides for them.
- The resolution order of the players' orders, and how what an order creates is matched across devices.
- Online games on our server: codes, seats, starting, sending a week's orders, coming back to a game, the
  account's games, out-of-step detection.
- Pass and play: the cover between players.
- The Multiplayer dialog, the lobby card, the Players card and the Players plaque.

**Not in scope (owned by …)**
- Accounts, sign-in, devices and tokens (saves, SAVE-112 … SAVE-118; `accounts/accounts-design.md`). Online play
  uses that account and that sign-in; it has no identity of its own.
- The week, the clock and the turn order inside a week (time-and-turns).
- What each order does (the context that owns the order).
- Peace terms and their answer (warfare); this context only says that a human answers for a human realm.
- Saves (saves): a multiplayer campaign is not saved; the table is its record.

## 2. Sources

Newest decision first.

1. Leroy, multiplayer thread (19 Oct 2026): "just design the full server": online play on our own Symfony server
   with the accounts of the cloud-saves work, not on the Artifact's database. The coordinator's note the same day:
   reuse those accounts and that server, no second identity system.
2. Leroy, multiplayer thread (19 Oct 2026): the second device could not join, and a list of every game does not
   scale to 1000+ games: a game is found by its code.
3. Leroy, multiplayer thread (18 Oct 2026): "a playable test"; "If we can have simultaneous turns, then that's fine.
   If we have to go turn by turn, that's fine as well." The prototype chose simultaneous weeks
   (`docs/multiplayer.md`, "The turn model").
4. `planning/gap-lists.md`, "Decisions already made": multiplayer-friendly, deterministic, orders as data, no
   player-only shortcuts (restated in time-and-turns §2).
5. X-19 (Leroy): every feature is designed from how the player uses it.
6. `accounts/accounts-design.md` §8 (server design), §10 (what is needed before launch).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Human realm | A realm a person plays in this campaign; the AI leaves its choices to that person | The realm this device shows |
| Simultaneous week | All human realms plan the same week from the same start; nobody sees another's orders until the week is played | Turn by turn |
| Planning | Giving orders for the coming week on this device's own copy of the world | The week being played |
| Ready | "My orders for this week are done"; the week is played once every human realm is Ready | End turn in a game of one |
| Week's orders | The orders a human realm gave while planning one week, in the order given, with what each created | A single order |
| Resolution order | The order in which the human realms' week's orders are carried out; it turns each week | The order of steps inside a week |
| Week-start hash | A short fingerprint of the whole world at the start of a week; every device's must agree | A save |
| Out of step | A device whose week-start hash differs from another player's for the same week | Offline |
| Game table | Where an online game lives: our server's game, seats and week's orders | The Artifact's database (prototype only) |
| Game code | Five letters that name an online game; the only way to find one | The game's internal id |
| Seat | One human realm of an online game, held by one account | A device |
| Host | The account that made the game; it starts it | A server |
| Your games | The online games the signed-in account holds a seat in | Saves |
| Cover | The full-screen card in Pass and play that hides the map while the device changes hands | A loading screen |

## 4. Domain model

### Aggregates

**Online game** (identity: game code)
- Holds: seed, host account and realm, created, started at, the human realms (fixed at start), a version that
  changes on every change, the first week found out of step.
- INV-MP-1: A code names at most one game, and never changes.
- INV-MP-2: Before start a game has no week's orders; after start its human realms never change.
- INV-MP-3: Every device makes the same world from the seed and the human realms, then plays the same weeks.

**Seat** (identity: game + realm)
- Holds: the realm, the account, when it was taken, whether the account hid the game from Your games.
- INV-MP-4: One account per realm in a game, and one realm per account in a game.
- INV-MP-5: Only the seat's account sends that realm's orders.

**Week's orders** (identity: game + realm + week)
- Holds: the orders, the week-start hash of the device that sent them, when they arrived.
- INV-MP-6: Written once. Sending the same orders again changes nothing; different orders for the same week are
  refused.
- INV-MP-7: A realm sends a week only once every human realm has sent the week before it (the first week sent
  needs nothing before it).

### Value objects
- **Player orders**: `{ nation, orders: Order[], created: Created[] }` (engine `multiplayer.ts`), as JSON.
- **Created**: the armies, commanders, fleets, governors and traders an order made on the planning copy, so the
  same things can be found when every player's orders are carried out.

### Domain services
- **Resolution** (engine `applyAll`): from the week's start, carry out each human realm's week's orders in the
  resolution order, mapping what each created; then play the week.

## 5. Requirements

### Turn model
- MP-001 The game shall let every human realm plan the same week at once, each from the same start of the week. [Leroy 18 Oct; prototype]
- MP-002 While a player plans, the game shall carry out each order at once on that player's own copy of the week, as in a game of one. [prototype]
- MP-003 When every human realm is Ready, every device shall go back to the start of the week, carry out every human realm's orders in the resolution order and play the week. [prototype]
- MP-004 The resolution order shall be the human realms by number, starting with the one at position (week mod number of human realms), so the first place turns each week. [prototype `resolutionOrder`]
- MP-005 When an order made a new army, commander, fleet, governor or trader on the planning copy, the game shall give later orders of the same player the one made when all orders are carried out. [prototype]
- MP-006 If an order can no longer be carried out when all orders are carried out, then the game shall skip it and tell its player "Not done" with the reason. [prototype]
- MP-007 The AI shall make no choice for a human realm: events, peace answers and the other choices the AI makes for computer realms wait for that realm's player. [prototype `isHuman`]
- MP-008 When a human realm offers peace to another human realm, the game shall deliver the offer to that realm's Dispatches the next week, and only that realm's player shall answer it. [prototype]
- MP-009 While a multiplayer campaign runs, the week shall not stop for an event or a revolution; they wait for the next planning, and Ready shall be blocked until they are answered. [prototype]
- MP-010 While a multiplayer campaign runs, auto turns, saving and achievements shall be off. [prototype]
- MP-011 After the week is played, every device shall work out the week-start hash of the next week. [prototype]
- MP-012 Each device shall carry out a week's orders as the realm whose seat sent them, whatever realm the orders name, so no player gives orders for another's realm. [design]

### Online games on our server
- MP-020 Online play shall use the player's account (SAVE-112) and the signed-in device's access token; there is no other identity. [Leroy 19 Oct; coordinator]
- MP-021 If the player is not signed in, then Online shall ask them to sign in with the Account card, and Host and Join shall wait until they are. [Leroy 19 Oct]
- MP-022 When a signed-in player hosts a game, the server shall make a game with a new five-letter code (letters without I and O), a random seed, and the host's seat on the realm they chose. [prototype; Leroy 19 Oct]
- MP-023 The server shall find a game only by its code; no call lists other accounts' games. [Leroy 19 Oct]
- MP-024 When a player types a code, the game shall accept four or five letters in either case and ignore spaces and other marks. [prototype]
- MP-025 When a signed-in player takes a free realm in a game that has not started, the server shall seat them there; if they already hold another realm in that game, the seat moves. [prototype]
- MP-026 If the realm is held by another account, then the server shall refuse the seat with "taken". [prototype]
- MP-027 If the game has started, then the server shall refuse new seats. [prototype]
- MP-028 While a game has not started, a player shall be able to leave it, freeing their realm; when the host leaves, the game shall end for everyone. [design]
- MP-029 When the host starts a game with at least two seats, the server shall fix the human realms as the seated realms in realm order and mark the game started. [prototype]
- MP-030 If anyone but the host starts a game, or it has fewer than two seats, then the server shall refuse. [prototype]
- MP-031 The server shall hold at most `multiplayer.max_players` seats in a game. [design] @placeholder
- MP-032 When a seated player sends a week's orders, the server shall keep them with the device's week-start hash, once (INV-MP-6, INV-MP-7). [prototype]
- MP-033 If a week's orders arrive for a realm whose account is not the sender, for a game not started, or for a week whose previous week is not complete, then the server shall refuse them. [design]
- MP-034 When two week's orders for the same week carry different week-start hashes, the server shall mark the game out of step from that week, and every device shall show it. [prototype]
- MP-035 The server shall give a seated player the game, its seats (realm, player's name, when taken, whether the seat is theirs) and the week's orders from a week the device asks for; a player not seated sees the game and seats but no orders. [design]
- MP-036 The server shall give each game a version that changes on every change, so a device that asks again with the version it has gets "not changed" at no cost. [design]
- MP-037 While an online game is open, the game shall ask the server for changes every `multiplayer.poll_seconds` seconds while the page is visible, and every `multiplayer.poll_hidden_seconds` while it is hidden. [design] @placeholder
- MP-038 When the device comes back to a started game, the game shall play the weeks already complete again at once, a day at a time, then plan the current week. [prototype]
- MP-039 The server shall limit writes (host, seat, start, orders) per account and per device to `multiplayer.writes_per_10_minutes`, and reads to `multiplayer.reads_per_10_minutes`. [design] @placeholder
- MP-040 The server shall refuse a week's orders larger than `multiplayer.max_orders_kb` KB. [design] @placeholder
- MP-041 When an account is deleted, the server shall remove its seats; a game whose host is gone and has not started ends. [accounts §5; design]

### Your games
- MP-050 The server shall list the account's games, newest activity first: code, realm, started or not, the week being planned, which realms it waits on, and whether it waits on this account. [Leroy 19 Oct]
- MP-051 When a player leaves a started game from the Players card, the server shall hide it from their Your games; typing its code again brings it back. [design]

### Pass and play
- MP-060 Pass and play shall take 2 to 4 realms on one device. [prototype]
- MP-061 Before each player plans, the game shall show the cover with "Pass to <realm>" and hide the map until that player taps "Plan as <realm>". [prototype]

### How the player uses it
- MP-070 Where: the start screen shall have a **Multiplayer** button that opens the Multiplayer dialog with **Pass and play**, **Online** (Host a game; Join a game with a code field and Join button) and **Your games**. [X-19; prototype]
- MP-071 Where: hosting or joining shall open the realm chooser over the map, as for a game of one; tapping a realm sits down and opens the lobby card. [X-19; prototype]
- MP-072 Grouping: everything about multiplayer shall be in three places: the Multiplayer dialog (games), the lobby card (one game before it starts: code, players with their names and realms, Start for the host, Leave) and the Players card (one game while it runs: who is ready, this week's resolution order, out of step, Leave). [X-19]
- MP-073 Overview: while a multiplayer campaign runs, the top bar shall show the Players plaque: every human realm's pennant, lit when its orders are in, and "ready/total"; tapping it opens the Players card. [X-19]
- MP-074 Overview: Your games shall mark the games waiting on this player's orders, so a player with several games sees where they are needed. [X-19; design]
- MP-075 Phone in landscape: the dialog, lobby card, Players card and cover shall be the game's parchment cards inside the safe areas, in Wide and Tall layouts, with every button and the code field at least 44 points tall, and nothing that needs hover. [X-19]
- MP-076 The lobby card shall show the code large, with "Others open Multiplayer and type this code". [prototype]
- MP-077 If a write is refused (not signed in, taken, started, gone, offline, limited), then the game shall say why in the player's words where they are looking. [prototype]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| HostGame(realm) | player | signed in | game with code, host seated | GameHosted |
| TakeSeat(code, realm) | player | signed in; game not started; realm free or theirs | seated | SeatTaken |
| LeaveGame(code) | player | seated | seat freed (before start), game hidden (after start), game ended (host before start) | SeatLeft / GameEnded |
| StartGame(code) | host | ≥ 2 seats; not started | human realms fixed | GameStarted |
| SendWeek(code, week, orders, hash) | player | seated; started; previous week complete | week's orders kept | WeekSent, WeekComplete, OutOfStep |
| Ready | player | planning; no event or revolution waiting | the device sends the week (online) or covers for the next player (pass and play) | — |

Every engine order inside a week's orders is the same command a game of one uses (time-and-turns, no player-only shortcuts).

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| GameHosted | a game is made | code, host realm | — |
| SeatTaken | a realm is seated | code, realm, player name | lobby card |
| GameStarted | the host starts | code, human realms, seed | every seated device: makes the world |
| WeekSent | a realm's orders arrive | code, week, realm | Players plaque |
| WeekComplete | every human realm sent a week | code, week | every device: resolution, then the week is played |
| OutOfStep | two hashes differ for a week | code, week | Players card and plaque |
| GameEnded | the host leaves before start, or the host's account is deleted | code | lobby card |

## 8. Policies

- When an account is deleted (saves), then its seats are removed and games it hosts that have not started end.
- When a device is signed out (saves), then its open online game stops asking the server and the Multiplayer dialog asks for sign-in.

## 9. Each turn

Before the week: every device plans; Ready sends the week's orders (online). When the week is complete: every
device goes back to the week's start, carries out all week's orders in the resolution order, then plays the week
through the time-and-turns steps unchanged; at its end each device works out the next week-start hash.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| multiplayer.max_players | Seats in an online game | 8 | yes | server `config/packages/multiplayer.yaml` |
| multiplayer.code_letters | Letters in a game code | 5 | no | server and client |
| multiplayer.poll_seconds | Asking for changes while visible | 2 | yes | client |
| multiplayer.poll_hidden_seconds | Asking for changes while hidden | 15 | yes | client |
| multiplayer.writes_per_10_minutes | Write limit per account and per device | 300 | yes | server |
| multiplayer.reads_per_10_minutes | Read limit per account | 1200 | yes | server |
| multiplayer.max_orders_kb | Largest week's orders | 256 | yes | server |
| pass_and_play.max_realms | Realms in Pass and play | 4 | no | client |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| saves | upstream | Conformist | Account, device, access token, sign-in card; account deletion |
| time-and-turns | upstream | Conformist | The week, its steps, playback by the day |
| game-shell | downstream | Customer–Supplier | The Multiplayer button on the start screen, the Players plaque on the top bar |
| warfare | upstream | Customer–Supplier | Peace offers between two human realms are answered by a person |
| events | upstream | Customer–Supplier | Events wait for the human realm's player |
| achievements | upstream | Conformist | Off in multiplayer |

## 12. AI

The computer realms play as in a game of one. The AI makes no choice for a human realm (MP-007), and offers
between two human realms are not answered by the AI.

## 13. Open questions and contradictions

- OQ-MP-1: A player who never presses Ready: is there a timer, and what happens to the realm then (AI takes it, the week plays without its orders)? The prototype has none.
- OQ-MP-2: Dropping a player or moving the host after start.
- OQ-MP-3: Games that never start: how long the server keeps them before removing them.
- OQ-MP-4: Out of step: the server marks it, but the only cure is replaying from the start. Should a device that disagrees fetch the agreed world instead?
- OQ-MP-5: Diplomacy between players beyond war and peace (alliances, calls to arms, envoys' asks) and Imperial votes have not been played through.
- OQ-MP-6: Is online multiplayer part of the paid game, the demo, or both (accounts §6)?
- OQ-MP-7: Push notifications when a game waits on you (phones), instead of opening the game to see.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| MP-001 … MP-006, MP-011, MP-012 | simultaneous-weeks.feature | all scenarios |
| MP-007 … MP-010 | simultaneous-weeks.feature | Humans choose for themselves; The week does not stop |
| MP-020 … MP-041 | online-games.feature | all scenarios (server: `server/tests/Controller/GamesTest.php`) |
| MP-050, MP-051 | online-games.feature | Your games |
| MP-060, MP-061 | pass-and-play.feature | all scenarios |
| MP-070 … MP-077 | multiplayer-screens.feature | all scenarios (checked by `apps/client/scripts/multiplayer-shots.mjs`) |
