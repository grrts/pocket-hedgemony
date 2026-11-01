# Multiplayer

Multiplayer on its own branch, not merged until Leroy says so. The rules are in `domain/multiplayer/spec.md` (MP) with its features; this page explains how it works and why.

Two tables carry an online game between devices:

- **Our server** (`server/src/Controller/GamesController.php`), when the build has one (`VITE_CLOUD_API`). It uses the accounts of cloud saves: the player signs in once, and their games follow them to every device.
- **The Artifact's shared database or the browser's storage**, the prototype's table, in a build without a server (the published Artifact, the dev server). The Artifact cannot reach our server: its page may not call other sites.

## The turn model: simultaneous weeks

Every player plans the same week at once. When all have pressed **Ready**, every device goes back to the week's start, carries out all players' orders and plays the week. Nobody waits for another player's whole turn, and on a phone a week's planning fits in a spare minute.

Why simultaneous and not one player after the other:

- The game already freezes the clock while the player plans and then plays a week out by itself; a week of orders is the natural unit to exchange.
- Turn by turn would make each player wait for every other player's planning *and* would hand the last player a view of everyone's moves.
- The engine is deterministic from the seed, so only the orders cross the network: a week of orders is a few hundred bytes.

Fairness: when two players' orders compete (the same company to hire, a war declared on someone who also acts), they are carried out in an order that turns each week (week 1: lowest realm first, week 2 the next, and so on). The Players card shows this week's order.

What simultaneous costs: an order you give while planning acts at once on your own copy of the week (as in a game of one), but someone else's orders that week can change the outcome. A split army or a new commander keeps working even when another player's order took its number first (see "Under the hood").

## How the player uses it

1. **Where they find it, what they tap.** Start screen → **Multiplayer**. Two choices:
   - **Pass and play**: tap 2 to 4 realms (in the realm list or on the map), then **Start**. A cover hides the map and says "Pass to Castile"; that player taps **Plan as Castile**, gives orders as in a game of one and taps the hourglass (**Ready**). The cover comes up for the next player, who plans from the week's start without seeing the first player's orders. After the last Ready the week plays and the cover comes back for the first player.
   - **Online**: **Host a game** and tap your realm; the lobby shows the five-letter code and who has sat down. Others open Multiplayer, type the code under **Join a game** and tap their realm. The host picks how long each week stays open for orders (**No limit**, **5 min**, **1 hour** or **1 day**) and taps **Start**. Each player plans and taps **Ready**; the hourglass dims while the others still plan, and the week plays on every device once all are in, or when the week's time runs out: a realm whose orders are not in by then does nothing that week, and its player is told. **Your games** lists the games this device sat down in, to come back after closing the page (the weeks played so far are replayed at once). There is no list of everyone's games: with thousands of them a list helps nobody, and a friend's game is found by its code.
2. **Grouping.** Everything multiplayer is in three places: the Multiplayer dialog (games), the lobby card (one game before it starts, with the turn limit for the host) and the **Players** card (one game while it runs: the time left, **To the AI** on each other player's row for the host, **Hand my realm to the AI** and **Leave for now** for everyone). Handing a realm to the AI cannot be undone, so it takes a second tap on the same button. The game's own cards are unchanged.
3. **Overview.** The **Players plaque** on the top bar shows every player's pennant, lit when their orders are in, "1/2" and, with a turn limit, the time left counting down. Tapping it opens the Players card: who is ready, who is played by the AI, the time left, the order orders go in this week, whether every device agrees on the world, and the ways to leave.
4. **Phone in landscape.** The dialog, lobby, Players card and cover are the game's existing parchment cards and buttons, at least 44 points tall, inside the safe areas; nothing needs hover. The cover is full screen on purpose: it hides the map while the phone changes hands. Checked on a Pixel 7 and an iPad Pro, both in landscape (`apps/client/scripts/multiplayer-shots.mjs`).

## What is different in a multiplayer game

- Auto turns, saves and achievements are off: the game is the shared order list, and achievements are earned in a game of one.
- The week no longer stops for an event or a revolution; they wait for the next week's planning, and Ready is blocked until they are answered (as End turn is).
- While the week plays, and once Ready is pressed, orders wait for the next week.
- Peace between two players is asked and answered: the offer reaches the other player's Dispatches the next week, and they accept or refuse it. The AI no longer answers for a player.
- The first-campaign hints stay quiet.

## Under the hood

- `packages/engine/src/humans.ts`: the engine had one `world.player` that the AI left alone. It now asks `isHuman(world, n)`, which is every player's realm in multiplayer (`world.humans`) and the player in a game of one. `world.player` is left only for what this device shows.
- `packages/engine/src/multiplayer.ts`: `cloneWorld` copies the world at the week's start (about 60 ms on the real map), `applyAll` carries out every player's orders in the turning order, and maps the armies, commanders, fleets, governors and traders an order made on the planning copy to the numbers they get when everyone's orders are applied.
- The engine host (`protocol.ts`) records the orders given while planning, and has three new requests: `plan` (plan as a realm from the week's start, for Pass and play), `planned` (this week's orders to send) and `resolve` (everyone's orders, from the week's start).
- **Our server's table**: `POST /api/games` (host: code, seed, the host's seat), `GET /api/games` (Your games, marking those waiting on you), `GET /api/games/{code}?since=` (game, seats with player names, and the weeks' orders from a week on, only to seated players; `ETag` so an unchanged game costs a 304), `PUT /api/games/{code}/seats/{realm}` (sit, or move your seat before the start), `DELETE /api/games/{code}/seats/mine` (leave; before the start the host's part passes to the next player; after the start it only leaves Your games), `POST /api/games/{code}/start` (host, two seats or more, with `turnLimit` in seconds from `multiplayer.turn_limits`), `POST /api/games/{code}/seats/{realm}/drop` (hand a realm to the AI: the host any realm, a player their own), `PUT /api/games/{code}/weeks/{week}` (your realm's orders and week-start hash, once, for the week the table is on; two different hashes mark the game out of step). Three tables: `mp_game`, `mp_seat`, `mp_week`. The server never plays the game; it keeps orders and refuses what breaks the table's rules. Limits and seat count are provisional (`config/packages/multiplayer.yaml`).
- **Turn limit, handing a realm to the AI and the host** (MP-080 … MP-082, `server/src/Multiplayer/GameTable.php`). There is no timer process: the next request about a game whose week's time ran out closes it, writing empty orders marked `skipped` for the realms that sent nothing. A week nobody has sent anything for stays open, and its first orders after its time start the time again, so a table everyone left does not play on by itself. It first claims the week's opening time with one conditional `UPDATE`, so two devices asking at once never both close it. A realm handed to the AI is recorded with the week the table is on (`dropped`); every device passes the realms still played by people to the engine's `resolve`, which plays the others as computer realms from that week, so all devices switch on the same week. The host's part passes to the earliest seat still playing; the game ends when nobody is left. Deleting an account, or combining two that sit in one game, leaves games by the same rules.
- The game asks its server every 2 seconds while a game is open (15 when the page is hidden), and gets "not changed" almost always. Each device carries out a week's orders as the realm whose seat sent them, so nobody can give orders for another realm.
- Checked end to end: `apps/client/scripts/multiplayer-server-shots.mjs` plays two accounts on two separate browsers against a local server (three weeks agree; a third browser of the same account comes back from Your games and catches up); `server/tests/Controller/GamesTest.php` covers the table's rules.
- The prototype's table keeps the lobby and orders in the published Artifact's shared database: `mp/<code>` for the game and `mp/<code>/players/<realm>` for a realm's seat and all its weeks of orders, so a game is at most five documents however long it runs (the database holds 25,000, so about 5,000 games; a real release would keep games on our own server). Outside an Artifact the same code uses the browser's storage, shared between tabs, which is how the dev server and the shots script test it.
- Who may play online: the Artifact's database lets only its owner, and people invited by email as Editor (while the page has no public link), write. Everyone else can open the page and see games but not sit down; the Multiplayer dialog says so, and a refused write says why.
- Each device writes the world's hash at the week's start with its orders; a device that disagrees says "Out of step" on the plaque and the Players card.

## Bugs found on the way (they affect the game of one too)

- **Playback changed the outcome.** A cache of "who is at war" was kept for the day; if the screens read it between two 4-hour steps before a war began that day, armies ate as if at peace. So the same week played at normal speed and through a battle (smaller steps) could end differently. Fixed in `turn.ts` (the list is worked out each time).
- **A loaded save does not play on exactly as the game it was written from.** Trade keeps its yearly route weights outside the world (a cache in `trade.ts`), so they are lost in a save and on a copy. Multiplayer is not affected (every device copies the world at the same moment), but saves are; not fixed here.

## Known gaps of the prototype

- Diplomacy between players beyond war and peace (alliances, envoys' asks, calls to arms) follows the game-of-one rules: it works for the realm asked, but has not been played through.
- One vote per Imperial election or Diet is counted for the players (the engine kept a single player vote); the last player to vote wins it.
- News about another player's realm can read "you" when it reaches you (the texts were written for one player).
- Pass and play keeps no news log per player: each player sees the news from the last week played.
- No chat, and no push notification when a game waits on you.
- Only the Artifact's owner and its Editors can play online in the Artifact (see above); on our server anyone with an account can.
- Every poll is preceded by a browser CORS check while the game and the server are on different addresses; the Docker deploy serves the web game from the server's address, which avoids it.

## What is needed to go live

The server work is done and tested locally, on SQLite and on PostgreSQL 16 (the migration `server/migrations/Version20261031181935.php` makes the three tables). To try it on a test server, follow [A test server on one VPS](deploy.md#a-test-server-on-one-vps): one Docker compose with PostgreSQL 16 and HTTPS serves the server and the web game at `/play/` from one address, runs the migrations on start, and the game built there plays online with nothing else to set up. Two people sign up from the Play page's Account card, one hosts, the other joins by the code.

## Testing a deployed server

`apps/client/scripts/multiplayer-deploy-check.mjs` plays three accounts on two phones and a tablet against a server serving the web game at `/play/` (the Docker deploy, or a local stack like it): the five-minute turn limit running out on a player, out of step, coming back in a fresh page, the host handing their realm to the AI and the host's part passing on, the new host handing another realm over, and the game ending when nobody is left. Run it with `URL=https://<address> node scripts/multiplayer-deploy-check.mjs <outDir>`; for a local stack with its own certificate, add `NODE_EXTRA_CA_CERTS=<its root certificate>`.
