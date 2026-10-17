# Saving

Saving in Pocket Hegemony is built so that you never lose more than the orders you gave since your last End turn, even if your phone kills the app without warning. Saves work the same on every platform, keep loading after updates, and can follow you between your phone, tablet, Steam Deck and the web through an optional account, or as a file you export yourself.

## How it works

### The principles

- **Only at a turn boundary.** A save is the world at the start of a turn plus the orders you have queued so far. It is never a point halfway through a turn.
- **Lose almost nothing.** At worst you lose the orders given since your last End turn.
- **Write once.** Every save file is written once and never changed. A new save gets a new file name; replacing means writing the new file first and then removing the old one.
- **One format everywhere.** A save made on any platform opens on any other.
- **Old saves keep loading.** Every released format has a migration to the next and a test save in the repository.
- **Only game state.** Rules, map shapes and art come from the game itself. Settings, purchases and achievement progress live elsewhere.

### Kinds of save

Saves are grouped by **campaign**: one new game is one campaign, with a random id.

| Kind | When it is written | How many are kept | In the Load list |
|---|---|---|---|
| Resume | After every End turn, and on pause, quit, exit to the main menu or suspend (backgrounding writes only the orders journal) | 1 per campaign, plus the one before as a backup | No; it is what Continue opens |
| Autosave | At the start of a turn in which a month on your autosave interval begins | Your choice of 1, 3 or 5 per campaign, oldest rotated out | Yes, marked "Auto" |
| Manual | When you tap Save, with a name | Up to 20 per campaign and 100 in total | Yes |
| Ironman | After every End turn and on every exit (Save and quit, Exit to main menu, closing the app), in an ironman campaign | 1 plus a backup | Yes, as the campaign itself |
| Exported | When you tap Export; the file leaves the game | No limit | Imported files join the Manual saves |

**Autosave options.** The interval can be every month, every 6 months (January and July), every 12 months (each January) or off; the default is every 12 months. An autosave is written at the start of the turn in which that month begins, so even "every month" writes about once every 4 turns. You can keep 1, 3 or 5 autosaves per campaign; the default is 3. Turning autosaves off stops only the rotating autosaves. An ironman campaign writes no rotating autosaves, only its ironman save. If something goes wrong, "Restore the last autosave" on the failure screen opens your Resume save, or your newest autosave if the Resume save is damaged. The Resume save cannot be turned off.

**Continue** opens the newest Resume or Ironman save across all your campaigns, whether it was made on this device or arrived from the cloud. If it came from another device, the button says so: "Continue: Portugal, March 1512 (from Steam Deck)".

**The Load screen** lists campaigns first, each with its nation banner, nation name, in-game date, turn, play time and a small map crop. Opening a campaign lists its saves newest first, each marked autosave or ironman and with the device that made it. The list reads only each file's header, so it fills quickly without unpacking whole saves.

### Saving by hand

Save in the game menu shows the campaign's slots with "New save" at the top and your manual saves below. A new save is named after your nation and date ("Castile, May 1492"); renaming is optional, so you never need a keyboard with a controller. Picking an existing save asks "Replace?". At the slot limit, Save asks which one to replace and never removes one silently. Deleting a save from the Load screen asks for confirmation.

The game keeps its messages short and plain:

| Situation | What you see |
|---|---|
| A save is written | A small "Saved." toast, no dialog |
| Not enough space | "There isn't enough space on this device to save. Free some space, or delete old saves." |
| A save from a newer version | "This save is from a newer version of Pocket Hegemony. Update the game to open it." |
| A damaged save | "This save is damaged. The previous save from Dec 1511 was opened instead." |
| A locked nation | "Portugal is part of the full game. Unlock it to continue this campaign." |

### The Resume save and the orders journal

When you end a turn, the engine writes the Resume save for the new turn in the background, and you can give orders while it writes. While you give orders, the game keeps an **orders journal**: the orders queued since the turn began, in the same form End turn sends them. It is written whenever the app is backgrounded, suspended or closed, and every 30 seconds while orders are changing. When you come back, the game loads the Resume save and puts the journal's orders back in the queue, giving you exactly the state you left. If the journal's turn number or Resume save hash does not match, it is ignored. The journal is never synced. A choice you make at a before-the-battle stop also goes into the journal with its day, so the turn plays out the same way when it is replayed.

The journal is written on these platform events:

| Platform | Events |
|---|---|
| iOS | `pause` and `appStateChange` (inactive) |
| Android | `pause` |
| Desktop | window `close`, `before-quit`, and `suspend` (Steam Deck and Steam Machine suspend this way) |
| Web | `visibilitychange` (hidden) and `pagehide` |

If a turn is being processed when the app goes to the background, nothing new is saved: the previous Resume save and journal stay, and the turn is processed again on resume. On desktop, quitting waits for the write, up to 2 seconds.

### Writing safely

Every file is written in four steps: serialise and compress in the engine worker; write to a temporary file in the same folder; flush and rename it to its final name (a single transaction in IndexedDB on the web); and only then remove what it replaces. The newest two Resume saves are always kept, so if the newest is damaged the game falls back to the one before.

### The save file

A save is one binary `.phsave` file:

1. the magic "PHSV" (4 bytes);
2. a container version (uint16);
3. the header length (uint32);
4. the header, as uncompressed JSON;
5. a chunk table: the count, then for each chunk its id, version, offset, length and CRC-32;
6. the chunks, each compressed with deflate.

Compression uses a small bundled deflate library rather than the browser's own, so output is identical on every platform, including iOS 15 web views.

**The header** holds the save id, campaign id, kind, name, when it was saved, device, platform, game version, format version, rules hash, map hash, turn, date, player nation, the ironman flag, play time, the campaign options (difficulty, events, end date), the tier (nation, and whether it needs the full game), the world hash and a 96 × 64 thumbnail.

**Chunks.** Each system gets its own chunk with its own version, so a new system adds a chunk without touching the others.

| Chunk | What it holds |
|---|---|
| core | Turn, date, random number state, game options, the player's nation |
| ids | The province, nation and commander id lists |
| provinces, nations | Their changing fields |
| armies | Live armies only, with their routes |
| events | Events fired, flags set, pending choices and cooldowns |
| history | The realm timeline for the ledger and end screens |
| orders | Queued orders, only in a Resume save made during a turn |
| later: diplomacy, subjects, religion, culture, government, trade, ai, … | One per system |

Only changing state is saved, never anything from the build (adjacency, terrain, water, rivers, province shapes). Arrays are stored as raw bytes and always indexed through the `ids` chunk, never by position in the build's data.

### Keeping saves working across updates

- The format version goes up whenever any chunk's layout changes. Loading an older save runs every migration step in order, each a pure function from one version's chunks to the next, then validates the result.
- If the rules or the map changed, the game then matches provinces and nations by id, applies the map's rename table (old province id to new ids with shares) for split or merged provinces, applies the nation table to dropped nations, and gives new fields their default. A dropped nation with no entry leaves its provinces unowned and loads with a warning in the log, not an error.
- A save from a newer version never opens.
- A balance patch applies from the next turn on with the saved random state: it changes outcomes from then on but never corrupts the save.
- Each release adds at least two saves (one early game, one late game) to the test saves. Every test run loads every save from every earlier release and plays a turn. A release does not ship if any old save fails, and the changelog says when the format changes.

### Cloud saves

Cloud saves run on Pocket Hegemony's own server, so one optional account carries a campaign across Steam, iPhone, iPad, Android and the web. The game still plays fully offline.

- **No conflicts by design.** Files are named `<campaignId>/<savedAt>-<saveId>.phsave`, so two devices that played offline simply end up with both sets. The Load screen shows them all, marked with the device that made each, and Continue picks the newest. Two devices continuing the same non-ironman campaign make two lines of play, and that is not an error.
- **What syncs.** All Manual saves, the latest Resume and Ironman save per campaign, and the newest autosave per campaign. Older autosaves, the backup Resume save and the orders journal stay on the device.
- **Deleting** a campaign deletes it from the cloud too. A removed save gets a tombstone so other devices learn of it, and its bytes are purged 30 days later.
- **Signing in** is with email and password. You get a short-lived access token and a long-lived device token, kept in the platform's secure storage (Keychain, Keystore, or Electron's safe storage). Each device appears in your account's device list and can be signed out from any other. Password reset by email and account deletion (which deletes every save) are offered. Sign in with Apple, Google and Steam come later; if Google is offered on iOS, Apple will be too. Sign-in is offered from a Cloud saves row in [Settings](Settings) and a "Sign in to sync" prompt on the Load screen, never as a wall before playing.
- **When it syncs.** On launch and when you return to the app, the game fetches changes since its last position, headers first so the Load screen fills at once. A save's bytes download only when you open it, or in the background for the newest Resume save. Every written save is queued for upload; the queue survives restarts and empties oldest first when online, retrying with back-off. Backgrounding does nothing extra for the cloud, so those few seconds go to the orders journal. "Sync on Wi-Fi only" (off by default) stops syncing on a metered connection.
- **Server checks.** Each upload is checked for size (2 MB cap), magic, CRCs, and that its header matches. Each account has a quota of 300 saves and 200 MB; at the quota the game asks you to delete old saves, and the server never drops one on its own. There is a rate limit per account and per device. Later, the server can load a save with the engine and check its world hash before trusting it, for example for a leaderboard.
- **Saves, not purchases.** A campaign synced from one store opens on another device only if its nation is unlocked there.

The server keeps a table of the header fields the Load screen needs and stores the file bytes in object storage, not in the database. Its interface:

| Request | What it does |
|---|---|
| `GET /api/saves?since=<cursor>` | Headers and tombstones changed since the cursor, plus the new cursor |
| `PUT /api/saves/{saveId}` | Upload one save; rejected for an existing id unless the bytes match |
| `GET /api/saves/{saveId}` | Download the bytes |
| `DELETE /api/saves/{saveId}` | Tombstone one save |
| `DELETE /api/campaigns/{campaignId}` | Tombstone every save of a campaign |
| `POST /api/campaigns/{campaignId}/ironman-head` | Claim the ironman line |

### Store backups, Export and Import

| Platform | Free backup |
|---|---|
| Steam | Steam Auto-Cloud on the save folder, one cloud folder for Windows, macOS and Linux, 500 MB and 2,000 files for the synced set only, Dynamic Cloud Sync on so a suspended Deck uploads |
| Android | Auto Backup of the synced set (within its 25 MB limit), excluding the orders journal |
| iOS and iPadOS | The device's own iCloud backup includes the save folder |
| Web | Saves live in IndexedDB; the game asks for persistent storage. Signing in is the only way to keep web saves beyond the browser |

Play Games saved games and an iCloud Documents container are not used.

**Export** writes a `.phsave` file through the share sheet on phones or a save dialog on desktop. **Import** (file picker, or opening the file from Files, Drive or a download) checks its magic, CRCs and world hash and adds it to your Manual saves, with the same nation-lock check as any save.

### Free tier and full game

On phones the free download and the full game are the same app, so saves carry over with nothing to do; buying the unlock removes the lock. Each header records your nation and whether it needs the full game. Loading a locked nation's save without the full game shows the unlock screen instead of failing, and never deletes the save. If a purchase is refunded or revoked, the saves stay and those nations ask to be unlocked again.

With the Steam demo and the full game on the same computer, the full game finds the demo's saves on first launch and copies them into its own folder, and Steam Cloud keeps them from then on. A signed-in demo player's saves sync to the full game on any computer or phone; without an account, Export and Import do the same. Each save records which app wrote it (free, demo or full game) but no list of limits, so the full game simply opens a demo save with no limits.

### Ironman

- Chosen only when a campaign starts, and it cannot be turned off.
- No manual Save, no Load of earlier points, no console or debug tools.
- Export is allowed as a backup. Importing an ironman save starts it on this device; the copy on the old device is then no longer the newest. Importing an ironman save needs a connection: offline you see "Connect to import an ironman save."
- The server accepts an ironman upload only if the save it names as its parent is still the campaign's newest ironman save. Otherwise the second device is told to load the newer game first.
- If two devices played the same ironman campaign offline and the line has split, the game asks once: "Keep the game from Steam Deck (June 1530) or from this phone (Feb 1528)?", recommends the one further along, and removes the other line.
- If an ironman save is damaged, its backup opens and you are told; you roll back at most one turn.

### Integrity

Every chunk has a CRC, and loading recomputes the world hash, so damaged or edited files are caught. Saves are not encrypted. A save that fails the hash check opens only outside ironman, after a warning, and is marked as modified. The header carries the ironman flag, the modified mark and four flags for [Achievements](Achievements): ironman unbroken, cheat marked (the game has no cheats or console, so this is the modified mark), switched country, and began as the tutorial. Your campaign options (difficulty, events, end date, AI temper, fog of war and the music-era rule) are saved with the campaign; tutorial progress and Needs attention mutes belong to your player profile and sync with it, not with any save. A damaged or cut-short save is rejected cleanly and the previous save is opened or offered.

### Bug reports and tests

Send a report, on the failure screen, attaches the Resume save and the orders journal, and sending is always your choice. Before release the save code must pass: every test save loads, migrates and plays a turn; save, load and save again gives identical chunks and the same world hash; a file cut short at any byte is rejected cleanly with the previous save offered; killing the app during a write leaves the old save intact (desktop and both phone platforms); backgrounding, killing and relaunching on a real iPhone and Android phone resumes with the queued orders; and two devices with cloud on, played offline and reconnected, show both lines of play, with the one prompt for ironman.

## What you see

- Continue on the main menu, with "(from <device>)" when the save came from elsewhere.
- The Load screen: campaigns first, then their saves, each marked with the device that made it, and a "Sign in to sync" prompt.
- Save in the game menu with "New save" and your manual saves; "Replace?" when saving over one.
- The "Saved." toast and the plain messages above.
- The Cloud saves row and "Sync on Wi-Fi only" in [Settings](Settings), and the autosave interval and count rows.
- The ironman split prompt, asked once.
- The unlock screen for a locked nation's save.

## How it connects

- [How a turn works](Time-and-Turns): the turn must finish deterministically from the saved random state; turn number, date and orders.
- [Screens and navigation](Screens-and-Navigation): Continue, Load, Save, toasts and messages, the app lifecycle, the unlock screen and the split prompt.
- [Settings](Settings): the autosave values, the Cloud saves row, Wi-Fi only and sign-in; personal settings ride the same account.
- [Achievements](Achievements): reads the ironman flag and the modified mark, and asks for more flags.
- [Tutorial and help](Tutorial-and-Help): tutorial progress and Needs attention mutes live in your player profile, apart from saves.
- [The 1444 start](The-1444-Start): campaign options, ironman and the player's nation at a new game.
- [Map and lenses](Map-and-Lenses): the map hash, province ids and the rename table.
- [Historical events](Historical-Events): the events chunk.
- Every system ([Provinces](Provinces), [Your realm](Your-Realm), [Warfare](Warfare), [Diplomacy](Diplomacy) …) owns its own chunk with its own version and migrations.

Saving never changes the simulation. The computer players' state is saved like anything else.

## Numbers

From `save-config.example.yaml`.

| Key | Value | Status |
|---|---|---|
| `format.extension` / `format.magic` | `.phsave` / `PHSV` | fixed |
| `format.thumbnail` | 96 × 64 | fixed |
| `kinds.resume.keep` | 2 (newest plus backup) | fixed |
| `kinds.autosave.interval_months` | 12 | decided default |
| `kinds.autosave.interval_options` | 1, 6, 12, off | fixed |
| `kinds.autosave.keep` / `keep_options` | 3 / 1, 3, 5 | default |
| `kinds.manual.max_per_campaign` | 20 | provisional |
| `kinds.manual.max_total` | 100 | provisional |
| `kinds.ironman.keep` | 2 | fixed |
| `orders_journal.safety_interval_seconds` | 30 | provisional |
| `budgets.file_kb_start` / `file_kb_late` | 400 KB / 2048 KB | targets |
| `budgets.write_ms` / `journal_write_ms` | 300 ms / 20 ms | targets |
| `budgets.header_read_ms` / `load_ms` | 5 ms / 1500 ms | targets |
| `cloud.server.max_save_mb` | 2 | provisional |
| `cloud.server.quota_saves` / `quota_mb` | 300 / 200 | provisional, to decide later |
| `cloud.server.tombstone_purge_days` | 30 | provisional |
| `cloud.server.wifi_only_default` | false | fixed |
| `cloud.store_backups.steam` | 500 MB, 2,000 files | platform |
| `ironman.conflict` / `recommended_choice` | ask once / furthest turn | fixed |
| `integrity.modified_saves` | allowed outside ironman with a warning | fixed |
| `desktop_quit_wait_seconds` | 2 s | provisional |
| `kinds.autosave.every_6_months` | January, July | provisional |

The budgets are targets for a low-end Android phone, still to be confirmed by the performance design.

## Still open

- The cloud quota (300 saves, 200 MB per account) is a starting point until real save sizes are measured, and which social sign-ins ship at launch is a store decision.

## For developers

- Spec: [`domain/saves/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/saves/spec.md), requirement code **SAVE** (SAVE-001 to SAVE-104).
- Features: `domain/saves/features/` (save-kinds-and-continue, saving-by-hand, resume-and-orders-journal, safe-writing, save-file-format, migrations, cloud-sync, backups-export-import, free-tier-saves, ironman, integrity-and-testing).
- Code: `packages/engine/src/domain/saves/`. The engine core has `packages/engine/src/protocol.ts` (`newGame` with seed and nation only, `endTurn` with orders) and `hashWorld` in `packages/engine/src/hash.ts`; the save and load requests are still to be added. Test saves go in `packages/engine/test/saves/`.
