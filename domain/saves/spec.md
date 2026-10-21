# Saves (SAVE)

## 1. Purpose and scope

The saves context decides when the game state is written, how many saves of each kind are kept, how a save
file is laid out, how old saves keep loading after updates, how saves move between devices (our own cloud,
the stores' free backups, Export and Import), how ironman works, how the free tier's saves carry over to the
full game, and how damaged or edited saves are caught.

In scope:
- Kinds of save: Resume, Autosave, Manual, Ironman, Exported; campaigns as the grouping.
- Continue, the autosave options' values, saving by hand, deleting, the player-facing save messages.
- The Resume save and the orders journal; platform lifecycle hooks; safe writing; budgets.
- The `.phsave` file: layout, header, chunks; migrations across format, rules and map changes; test saves.
- Cloud saves on the Pocket Hegemony (Symfony) server: accounts and sign-in, storage, API, sync timing,
  server checks, quotas; store backups (Steam Auto-Cloud, Android Auto Backup, iOS device backup, web
  IndexedDB); Export and Import.
- Free tier and full game: locked-nation saves, refunds, Steam demo carry-over; the purchase of the full game on
  each store, the server's checks of it and the stores' refund notifications, and the game's unlock state.
- Ironman: one line per campaign, ironman-head check, the offline split conflict.
- Integrity: CRCs, `worldHash`, the "modified" mark; bug-report attachments; release tests; the engine
  worker's save and load requests.

Not in scope (owned by …):
- Where Continue, Load and Save sit in the flow, the Load screen's place → `game-shell`.
- The autosave and cloud-save rows on the Settings screen, and the settings files themselves → `settings`
  (this context defines the values the rows can take).
- Whether achievements need ironman, and the flags they read → `achievements`.
- The unlock screen shown for a locked nation → store and unlock screens (no design yet).
- The order of a turn and the determinism of `processTurn` → `time-and-turns`.
- Each system's own state (diplomacy, religion …) → its context; here only that it gets its own chunk.
- What the privacy policy allows to be sent → privacy (no design yet).
- Performance budgets as hard limits → performance (these are targets for it to confirm).

## 2. Sources

Newest decision first.

1. `accounts/accounts-design.md`, draft 1, 19 October 2026 (agreed by Leroy on 19 Oct: one account with several
   sign-ins, store sign-ins at launch, purchases per store), §4 and §5; §7 for sharing saves with the community
   (Leroy, 19 Oct: "I want them exportable, so other people could actually load in the save files … an active
   community thing").
   §9 and §11 step 4 for the desktop: Steamworks, Steam sign-in, saves as files and Auto-Cloud.
   §3, §4, §8 and §11 step 5 for phones and the web: Sign in with Apple, Google, and Steam in the browser sheet.
   §6, §8, §10 and §11 step 6 for purchases: the unlock, the server's checks and the store webhooks (Leroy, 19 Oct:
   cross-buy is per store; Steam is a paid app with a demo; the phones are a free download with a `full_game`
   in-app purchase).
   §5, §8 and §11 step 7 for linking and combining accounts and removing a sign-in.
2. `save-system/README.md`, second draft 2026-10-16, §8 Decisions (settled by Leroy on 16 Oct: Export and
   Import yes; cloud saves on our Symfony server with optional accounts; default autosave every 12 months plus
   the Resume save every turn; cross-store cloud saves at launch, purchases stay per store), and all of §1–§7, §9.
3. `save-system/save-config.example.yaml` (the configuration the rules describe).
4. `planning/gap-lists.md` "Decisions already made" (campaign to 31 August 1939; business model: paid full
   game, Steam demo, free mobile download with in-app purchases), List 2 item 3, List 3 items 2, 3, 7, 9, 13, 14.
5. Read for seams only: `achievements/achievements-design.md` v1.1 (16 Oct: every achievement is ironman-only;
   flags `ironman_unbroken`, `cheat_marked`, `switched_country`), `settings/settings-design.md` v2 §4, §5.3,
   §5.7, `screen-flow/screen-flow-design.md` §3 S4, S6, §4.5, §4.6, §6, `tutorial/tutorial-design.md` §9, §12.
6. Today's code: `packages/engine/src/protocol.ts` (`newGame` with seed and player nation only; `endTurn`
   with `Order[]`), `hashWorld`, `createEngineHost`; the server can only register accounts (`POST /api/accounts`).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Campaign | One new game, with a random `campaignId`; saves are grouped by it | A save |
| Save | One write-once `.phsave` file holding the world at the start of a turn plus queued orders | A setting; tutorial progress |
| Resume save | The save written after every End turn and on pause, quit, suspend or backgrounding; what Continue opens; 1 per campaign plus a backup | Autosave |
| Autosave | A rotating save at the start of a turn in which a month on the player's interval begins, marked "Auto" | Resume save |
| Manual save | A save the player makes with Save, with a name | Exported save |
| Ironman save | The single save line of an ironman campaign, written after every End turn and on every exit | Resume save |
| Exported save | A `.phsave` file sent out of the game with Export | Imported save (joins Manual) |
| Backup | The previous Resume or Ironman save, kept so a damaged newest one falls back | A store backup |
| Orders journal | The tiny list of orders queued since the turn began, with turn number and Resume save hash | The `orders` chunk |
| Turn boundary | The start of a turn: the only point a save describes | Mid-turn |
| Header | The uncompressed JSON at the start of a file, enough for the Load list | Chunk |
| Chunk | One system's compressed block, with its own id, version and CRC-32 | Header |
| Format version | `formatVersion`, raised when any chunk's layout changes | Container version; game version |
| Migration | A pure function from one format version's chunks to the next | Mapping step |
| Mapping step | Matching an old save's provinces and nations to a build whose rules or map differ | Migration |
| Rename table | Shipped with the map: old province id → new ids with shares | — |
| `worldHash` | `hashWorld()` of the saved state, recomputed on load | CRC-32 |
| Modified | The mark on a save that failed the hash check and was opened anyway | Damaged |
| Damaged | A save that fails its CRCs or is cut short | Modified |
| Synced set | The saves uploaded to the cloud: all Manual, latest Resume and Ironman per campaign, newest Autosave per campaign | Local only |
| Tombstone | The server's "deleted" mark that tells other devices a save is gone | Purge |
| Cursor | The server's position for "changes since" | — |
| Ironman head | The campaign's newest ironman save on the server | — |
| Line of play | A sequence of saves continuing one campaign; two devices can make two | — |
| Store backup | The free backup each store gives with no code (Auto-Cloud, Auto Backup, iCloud device backup) | Pocket Hegemony cloud |
| Needs full game | The header flag saying a save's nation is locked without the full game | — |
| Account | An optional Pocket Hegemony account on our server; needed only for cloud saves | A store account |
| Device token | Long-lived sign-in token kept in the platform's secure storage | Access token |
| Steam build | The desktop game started with a Steam app id, from the build's `PH_STEAM_APP_ID` or from Steam itself, with the Steam client running | The desktop game without Steam |
| Web API ticket | The ticket Steamworks gives for the identity `pockethegemony` (`GetAuthTicketForWebApi`), which the server checks with Steam | A Steam session ticket |
| Save folder | `<Electron userData>/saves` on the desktop, one `.phsave` file per save, the folder Steam Auto-Cloud syncs | IndexedDB |
| Shared save | A public copy of one save, uploaded once and attached to a community post, that anyone can play | A cloud save (private, synced) |
| Share code | The eight letters and digits that name a shared save (`K7QX-M2PA`), in its link `/s/<code>` | Save id |
| Copy of a shared save | The new campaign a player starts from a shared save, with its own campaign id and `sharedFrom` | The shared save itself |
| Full game purchase | The one thing each store sells: the paid app on Steam, the non-consumable in-app product `full_game` on the App Store and Google Play | The Steam demo (a separate app) |
| Entitlement | The server's record of one account's full game purchase on one store: the store's reference for it and its status (`active`, `refunded`, `revoked`) | A sign-in (identity) |
| Store bridge | The small interface each platform's shell gives the game for its own store: owned or not, the proof, the price, Buy, Restore purchases | The cloud API |
| Store proof | What the store hands the game for a purchase and the server checks: a StoreKit 2 signed transaction, a Play purchase token, or (Steam) the SteamID of the sign-in | A receipt shown to the player |
| Combining accounts | Moving everything of a second account (sign-ins, devices, saves, shared saves, purchases, community posts) into the account the player is in, then closing the emptied one; offered when an added sign-in already has its own account | Adding a sign-in (SAVE-153), which moves nothing |
| Combine token | The server's signed, short-lived proof that the player just passed the other account's sign-in, naming the account that stays and the one that goes | A device token |

## 4. Domain model

### Aggregates

**Campaign** (identity: `campaignId`, random)
- Holds: player nation, ironman flag, campaign options, its saves by kind, its lines of play.
- INV-SAVE-1: A campaign keeps at most 1 Resume save plus 1 backup, at most `autosave.keep` autosaves
  (1, 3 or 5), at most 20 manual saves, and (if ironman) 1 ironman save plus 1 backup.
- INV-SAVE-2: The player has at most 100 manual saves in total.
- INV-SAVE-3: An ironman campaign has no manual saves and no autosaves the player can load, and stays ironman
  for its whole life.
- INV-SAVE-4: Deleting a campaign deletes all its saves locally and from the cloud.

**SaveFile** (identity: `saveId`; file name `<campaignId>/<savedAt>-<saveId>.phsave`)
- Holds: header (§4.2 of the design), chunk table, chunks.
- INV-SAVE-5: A save file is written once and never changed; replacing means writing a new file and then
  removing the old one.
- INV-SAVE-6: A save describes the world at a turn boundary only, plus the orders queued so far.
- INV-SAVE-7: Every chunk carries a CRC-32; the header carries `worldHash` of the saved state.
- INV-SAVE-8: A save holds only changing game state; nothing that comes from the build.
- INV-SAVE-9: Typed arrays are indexed through the `ids` chunk, never by position in the build's data.
- INV-SAVE-10: An ironman save names the save it follows (its parent).

**OrdersJournal** (one per device and campaign)
- Holds: turn number, hash of the Resume save it belongs to, the queued `Order` values.
- INV-SAVE-11: A journal whose turn or Resume hash does not match the Resume save is ignored.
- INV-SAVE-12: The journal is never synced.

**CloudAccount** (on the server; identity: account id)
- Holds: devices (with device tokens), `Save` rows (header fields, size, deleted at), object storage bytes,
  per-campaign ironman head, quota use.
- INV-SAVE-13: An upload whose `saveId` exists is rejected unless its bytes match.
- INV-SAVE-14: The server never drops a save on its own; at quota it refuses and the game asks the player.
- INV-SAVE-15: The server accepts an ironman save only if its parent is the campaign's current ironman head.
- INV-SAVE-21: An account holds at most one sign-in per store and at most one email, and always at least one
  sign-in; combining two accounts never drops a save.

**UploadQueue** (one per device)
- INV-SAVE-16: The queue survives restarts and empties oldest first when online, retrying with back-off.

**Entitlement** (on the server; identity: account and store)
- Holds: the product, the store's reference for the purchase (SteamID and app id; Apple original transaction id;
  Google order id, and the token's hash), status, environment, first verified, last checked.
- INV-SAVE-19: An account has at most one entitlement per store, and a store reference belongs to at most one
  account.
- INV-SAVE-20: An entitlement unlocks the full game only on its own store (cross-buy is per store).

**SharedSave** (on the server; identity: share code)
- Holds: the account that shared it, the community topic and post it came with, the header fields its card
  shows, size, play count, removed at; the bytes under `shared/<code>.phsave`.
- INV-SAVE-17: A shared save never carries the device name of the save it was made from, and never counts
  toward the cloud quota.
- INV-SAVE-18: A copy of a shared save is a new campaign: it never shares a campaign id with the author's saves
  and is never ironman.

### Entities and value objects

- **SaveKind** (value): `resume`, `autosave`, `manual`, `ironman`, exported (outside the game).
- **Header** (value): `saveId`, `campaignId`, `kind`, `name`, `savedAt`, `device`, `platform`, `gameVersion`,
  `formatVersion`, `rulesHash`, `mapHash`, `turn`, `date {y, m}`, `playerNation`, `ironman`, `playSeconds`,
  `options {difficulty, events, endDate, aiTemper, fogOfWar, musicEra}` (D-SAVE-8), `tier {nation, needsFullGame, app}`
  (D-SAVE-13), `flags {ironman_unbroken, cheat_marked, switched_country, began_as_tutorial}` (D-SAVE-1), `worldHash`,
  `thumbnail` (base64 PNG 96 × 64), a modified mark (§6.3), and on a copy of a shared save `sharedFrom {code, author}`.
- **Chunk** (value): id, version, offset, length, CRC-32, deflate bytes. Ids: `core`, `ids`, `provinces`,
  `nations`, `armies`, `events`, `history`, `orders`, later `diplomacy`, `subjects`, `religion`, `culture`,
  `government`, `trade`, `ai` ….
- **AutosaveOptions** (value): interval ∈ {every month, every 6 months, every 12 months (each January), off}, written only in a turn in which a new month begins (X-18);
  keep ∈ {1, 3, 5}.
- **SaveMessage** (value): the plain lines of §2.5 of the design.
- **Tombstone** (value): save id, deleted at; bytes purged 30 days later.

### Domain services

- **SaveWriter**: serialise and compress in the worker, temp file, flush, rename, then remove what it replaces.
- **SaveLoader**: read header, check CRCs, run format migrations, mapping step, validate, recompute `worldHash`.
- **SyncService**: fetch changes since the cursor, download bytes on demand, run the upload queue.
- **DemoImporter**: copy the Steam demo's saves into the full game's folder on first launch.

## 5. Requirements

### 5.1 Principles

- SAVE-001: The save system shall save only at a turn boundary: a save is the world at the start of turn N plus the orders queued so far, never a point halfway through a turn. [save-system §1.1]
- SAVE-002: The save system shall never lose more than the orders given since the last End turn, even when the phone kills the app without warning. [save-system §1.2]
- SAVE-003: The save system shall write every save file once and never change it; new saves shall get new file names. [save-system §1.3]
- SAVE-004: The save system shall use one file format on every platform, so a save made on any platform opens on any other. [save-system §1.4]
- SAVE-005: The save system shall keep old saves loading: every released format version shall have a migration to the next and a test save in the repo. [save-system §1.5]
- SAVE-006: The save system shall store only game state in a save; rules, map shapes and art shall come from the build, and settings, purchases and achievement progress shall live elsewhere. [save-system §1.6; settings §4.2]

### 5.2 Kinds of save and Continue

- SAVE-007: When the player ends a turn, pauses, quits or exits to the main menu, or the app is suspended, the save system shall keep the campaign's Resume save current, keeping 1 per campaign plus the one before it as a backup, and shall not list it in Load; when the app is only backgrounded, it shall write the orders journal and no Resume save. [save-system §2.1; config `kinds.resume`; D-SAVE-2]
- SAVE-008: When a turn starts in which a new month on the player's autosave interval begins (X-18), the save system shall write an autosave, keep the chosen number per campaign rotating out the oldest, and list them in Load marked "Auto". [save-system §2.1]
- SAVE-009: When the player taps Save, the save system shall write a manual save with the player's name for it, allowing up to 20 per campaign and 100 in total, listed in Load. [save-system §2.1; config `kinds.manual`]
- SAVE-010: While a campaign is ironman, the save system shall write its ironman save after every End turn and on every exit (Save and quit, Exit to main menu, the app being closed; D-SAVE-16), keep 1 per campaign plus a backup, and list it in Load as the campaign itself. [save-system §2.1, §6.2]
- SAVE-011: When the player taps Export, the save system shall write an exported file that leaves the game, with no limit on how many; imported files shall join the Manual saves. [save-system §2.1, §5.4]
- SAVE-012: The save system shall group saves by campaign, one new game being one campaign with a random id. [save-system §2.1]
- SAVE-013: The Load screen shall list campaigns first, each with nation banner, nation name, in-game date, turn, play time and a small map crop, and opening a campaign shall list its saves newest first, each marked autosave or ironman and with the device it came from. [save-system §2.1; screen flow S6; D-SAVE-4]
- SAVE-014: Continue shall open the newest Resume or Ironman save across all campaigns, on this device or arrived from the cloud; if that save came from another device, the button shall say so ("Continue: Portugal, March 1512 (from Steam Deck)"). [save-system §2.2]
- SAVE-015: The save system shall offer the autosave interval values every month, every 6 months, every 12 months (each January) and off, default every 12 months, and the autosaves kept per campaign values 1, 3 and 5, default 3. [save-system §2.3, §8.3; config `kinds.autosave`]
- SAVE-016: Where the autosave interval is off, the save system shall stop only the rotating autosaves; the Resume save cannot be turned off. [save-system §2.3]

### 5.3 Saving by hand and messages

- SAVE-017: When the player opens Save in the game menu, the save system shall show the campaign's slots with "New save" at the top and the existing manual saves under it. [save-system §2.4]
- SAVE-018: The save system shall give a new manual save the default name of nation and date ("Castile, May 1492"), renaming being optional so that a controller player never needs a keyboard. [save-system §2.4]
- SAVE-019: When the player picks an existing manual save to save over, the save system shall ask "Replace?" and, on yes, write a new file and then remove the old one. [save-system §2.4]
- SAVE-020: If the campaign is at its manual slot limit, then Save shall ask which save to replace and shall never remove one silently. [save-system §2.4]
- SAVE-021: When the player deletes a save from the Load screen, the save system shall ask for confirmation first. [save-system §2.4]
- SAVE-022: When a save is written, the save system shall show the small toast "Saved." with no dialog. [save-system §2.5]
- SAVE-023: If there isn't enough space on the device to save, then the save system shall say "There isn't enough space on this device to save. Free some space, or delete old saves." [save-system §2.5]

### 5.4 The Resume save and the orders journal

- SAVE-024: When the player ends a turn, the engine worker shall write the Resume save for the new turn in the worker, and the player shall be able to give orders while it writes. [save-system §3.1]
- SAVE-025: While the player gives orders during a turn, the client shall keep an orders journal of the orders queued since the turn began, as the same `Order` values that `endTurn` sends. [save-system §3.1]
- SAVE-026: The client shall write the orders journal whenever the app is backgrounded, suspended or closed, and every 30 seconds while orders are changing. [save-system §3.1; config `orders_journal`; placeholder]
- SAVE-027: When a campaign resumes, the save system shall load the Resume save and put the journal's orders back in the queue, giving back exactly the state the player left. [save-system §3.1]
- SAVE-028: If the journal's turn number or Resume save hash does not match the Resume save, then the save system shall ignore the journal. [save-system §3.1]
- SAVE-029: The save system shall write the journal on these platform events: iOS `App` plugin `pause` / `appStateChange` (inactive); Android `App` plugin `pause`; desktop window `close`, `before-quit` and `powerMonitor` `suspend` (Steam Deck and Steam Machine suspend this way); web `visibilitychange` (hidden) and `pagehide`. [save-system §3.2]
- SAVE-030: If a turn is being processed when the app backgrounds, then the save system shall save nothing new, keep the previous Resume save and journal, and process the turn again on resume. [save-system §3.2]
- SAVE-031: When the player quits on desktop, the game shall wait for the write, up to 2 s. [save-system §3.2; config `desktop_quit_wait_seconds`; placeholder; D-SAVE-12]

### 5.5 Writing safely and budgets

- SAVE-032: The save system shall write every file by: serialising and compressing in the worker; writing to a temporary file in the same folder; flushing it and renaming it to its final name (a single transaction in IndexedDB on the web); and only then removing what it replaces. [save-system §3.3]
- SAVE-033: The save system shall always keep the newest two Resume saves, and if the newest is damaged it shall fall back to the one before. [save-system §3.3]
- SAVE-034: The save system shall aim for these targets, to be confirmed by the performance design on a low-end Android phone: save file under 400 KB at the 1444 start and under 2 MB late in the game (1900s); writing a save under 300 ms in the worker; writing the journal under 20 ms; reading one save's header under 5 ms without decompressing the rest; loading a save under 1.5 s including migrations. [save-system §3.4; config `budgets`; placeholder]

### 5.6 The save file

- SAVE-035: The save system shall write a save as one binary `.phsave` file: the magic "PHSV" (4 bytes), a uint16 container version, a uint32 header length, the header as uncompressed UTF-8 JSON, a chunk table (count, then per chunk id, version, offset, length and CRC-32), and the chunks each compressed with deflate. [save-system §4.1]
- SAVE-036: The Load screen shall list saves by reading only each file's header, without decompressing the rest. [save-system §4.1, §3.4]
- SAVE-037: The save system shall compress with a small bundled deflate library, not the browser's `CompressionStream`, so output is identical on every platform including iOS 15 web views. [save-system §4.1]
- SAVE-038: The header shall hold `saveId`, `campaignId`, `kind`, `name`, `savedAt`, `device`, `platform`, `gameVersion`, `formatVersion`, `rulesHash`, `mapHash`, `turn`, `date`, `playerNation`, `ironman`, `playSeconds`, `options` (difficulty, events, end date), `tier` (nation, needs full game), `worldHash` and a 96 × 64 PNG thumbnail. [save-system §4.2; config `format.thumbnail`]
- SAVE-039: The header's `worldHash` shall be `hashWorld()` of the saved state, and loading shall recompute it. [save-system §4.2]
- SAVE-040: The save system shall give each system its own chunk with its own version (`core`, `ids`, `provinces`, `nations`, `armies`, `events`, `history`, `orders`, and later one per system such as `diplomacy`, `subjects`, `religion`, `culture`, `government`, `trade`, `ai`), so a new system adds a chunk without touching the others. [save-system §4.3]
- SAVE-041: The `core` chunk shall hold the turn, date, `Rng` state (four uint32s), game options and the player's nation; `ids` the province, nation and commander id lists; `provinces` and `nations` their changing fields; `armies` the live armies only, with routes; `events` events fired, flags set, pending choices and cooldowns; `history` the realm timeline for the ledger and end screens. [save-system §4.3]
- SAVE-042: The save system shall save only changing state and nothing that comes from the build (adjacency, terrain, water, rivers, province shapes). [save-system §4.3]
- SAVE-043: The save system shall store typed arrays as their raw little-endian bytes, indexed through the `ids` chunk. [save-system §4.3]
- SAVE-044: Where a Resume save is made during a turn, it shall carry the `orders` chunk with the queued orders; no other save shall. [save-system §4.3]

### 5.7 Keeping saves working across updates

- SAVE-045: The save system shall raise `formatVersion` whenever any chunk's layout changes. [save-system §4.4]
- SAVE-046: When an older save is loaded, the save system shall run every migration step in order (`6 → 7`, `7 → 8`, …), each a pure function from one version's chunks to the next, then validate the result. [save-system §4.4]
- SAVE-047: If a save's `rulesHash` or `mapHash` differs from the build's, then after the format migrations the save system shall match provinces and nations by id through the `ids` chunk, apply the map's rename table (`old id → new ids, with shares`, written by `tools/mapgen`) to split or merged provinces, apply the nation table to dropped nations, and give new fields their default value from the rules. [save-system §4.4]
- SAVE-048: If a dropped nation has no entry in the nation table, then its provinces shall become unowned and the save shall load with a warning in the log, not an error. [save-system §4.4]
- SAVE-049: If a save's `formatVersion` is newer than the build's, then the save system shall not open it and shall say "This save is from a newer version of Pocket Hegemony. Update the game to open it." [save-system §4.4, §2.5]
- SAVE-050: Each release shall add at least two saves from that build (one early game, one late game) to `packages/engine/test/saves/`; every test run shall load every save from every earlier release and run one turn; a release shall not ship if any old save fails; the changelog shall say when a release changes the format. [save-system §4.4]
- SAVE-051: When a save is loaded into a build with changed rules, the rule changes shall apply from the next turn on, with the saved `Rng` state, so a balance patch changes outcomes from then on but never corrupts the save. [save-system §4.4]
- SAVE-111: A save shall record the start its campaign began from (`start` in the header; a save without one began in
  1444, before campaigns moved to 1378). When the player opens a save from another start, the game shall reopen in that
  start's world and load the save there, without asking; the save system shall never open a save in another start's
  world. Exit to main menu shall return to the default start, so new campaigns begin in 1378. [X-25; SETUP-095]

### 5.8 Cloud saves

- SAVE-052: The save system shall run cloud saves on our own Symfony server, so one optional account carries a campaign across Steam, iPhone, iPad, Android and the web, and the game shall still play fully offline. [save-system §5, §8.2, §8.4]
- SAVE-053: The save system shall name every file `<campaignId>/<savedAt>-<saveId>.phsave`, so two devices that played offline end up with both sets, the Load screen shows them all marked with the device that made each, and Continue picks the newest. [save-system §5.1]
- SAVE-054: When two devices continue the same non-ironman campaign, the save system shall keep both lines of play as separate saves and treat it as no error. [save-system §5.1]
- SAVE-055: The save system shall sync all Manual saves, the latest Resume and Ironman save per campaign, and the newest autosave per campaign, and keep older autosaves, the backup Resume save and the orders journal local only. [save-system §5.1; config `cloud.synced`, `cloud.local_only`]
- SAVE-056: When the player deletes a campaign, the save system shall delete it from the cloud too. [save-system §5.1]
- SAVE-057: When the player signs in with email and password (`POST /api/sessions`), the server shall return a short-lived access token and a long-lived device token, kept in the platform's secure storage (Keychain on iOS, Keystore on Android, `safeStorage` in Electron); each device shall show in the account's device list and can be signed out from any other. [save-system §5.2]
- SAVE-058: The server shall offer password reset by email, and account deletion that also deletes every save. [save-system §5.2]
- SAVE-059: The save system shall launch with these sign-ins, the ones that need no typing first: on Steam, Steam and email; on iOS and iPadOS, Sign in with Apple, Steam and email; on Android, Google, Steam and email; on the web, Steam, Google, Sign in with Apple and email; wherever another third-party sign-in is offered on iOS, Sign in with Apple shall be offered too. [accounts-design §4; D-SAVE-18]
- SAVE-060: The save system shall offer sign-in from a Cloud saves row in Settings and a "Sign in to sync" prompt on the Load screen, never as a wall before playing. [save-system §5.2]
- SAVE-061: The server shall keep a `Save` table of the header fields the Load screen needs (account, campaign, save id, kind, name, saved at, device, platform, game version, format version, turn, date, nation, ironman, size, deleted at) and put the file bytes in S3-compatible object storage under `<accountId>/<campaignId>/<saveId>.phsave`, not in the database. [save-system §5.2]
- SAVE-062: When a save is removed, the server shall mark it deleted with a tombstone so other devices learn of it, and purge the bytes after 30 days. [save-system §5.2; config `cloud.server.tombstone_purge_days`]
- SAVE-063: The server shall offer: `GET /api/saves?since=<cursor>` (headers and tombstones changed since the cursor, plus the new cursor); `PUT /api/saves/{saveId}` (upload one save, rejected for an existing id unless the bytes match); `GET /api/saves/{saveId}` (download bytes); `DELETE /api/saves/{saveId}` (tombstone); `DELETE /api/campaigns/{campaignId}` (tombstone every save of a campaign); `POST /api/campaigns/{campaignId}/ironman-head` (claim the ironman line). [save-system §5.2]
- SAVE-064: When the game launches or the player returns to the app, the save system shall fetch changes since the last cursor, headers first so the Load screen fills at once, downloading a save's bytes only when it is opened, or in the background for the newest Resume save. [save-system §5.2; config `cloud.server.sync_on`]
- SAVE-065: When a save is written, the save system shall queue its upload; the queue shall survive restarts and empty oldest first when the device is online, with retries that back off. [save-system §5.2]
- SAVE-066: When the app is backgrounded, the save system shall do nothing extra for the cloud, leaving the upload to the queue, so the few seconds go to the orders journal. [save-system §5.2]
- SAVE-067: Where the player chooses "Sync on Wi-Fi only" (default off), the save system shall not sync on a metered connection. [save-system §5.2; config `cloud.server.wifi_only_default`]
- SAVE-068: The server shall check each upload's size (2 MB cap), magic, CRCs, and that the header matches the database row. [save-system §5.2; config `cloud.server.max_save_mb`]
- SAVE-069: If an account reaches its quota (300 saves and 200 MB), then the game shall ask the player to delete old saves, and the server shall never drop a save on its own. [save-system §5.2, §8.6; placeholder]
- SAVE-070: The server shall apply a rate limit per account and per device. [save-system §5.2]
- SAVE-071: Where the server later needs to trust a save (for example before it counts toward a leaderboard), it may load it with the engine (`createEngineHost`) and check `worldHash`. [save-system §5.2]
- SAVE-072: The server shall sync saves, not purchases: a campaign synced from one store opens on another device only if its nation is unlocked there. [save-system §5.2, §8.4]

#### Sign-ins and devices

- SAVE-112: One account shall hold one or more sign-ins (Steam, Sign in with Apple, Google, email and password), and each Steam account, Apple id, Google id or email address shall belong to at most one account. [accounts-design §4, §5]
- SAVE-113: When the player signs in with Steam, the game shall send a Steam Web API ticket for the identity `pockethegemony`; the server shall check it with Steam (`ISteamUserAuth/AuthenticateUserTicket`), open the account that holds that SteamID, or make one with the player's Steam name as display name when none does. [accounts-design §4]
- SAVE-114: The server shall return the same pair for every way of signing in: an access token that lasts 15 minutes and a device token that lasts until the device is signed out, and shall store both only as hashes. [accounts-design §4; config `cloud.server.access_token_minutes`; placeholder]
- SAVE-115: When a device refreshes its access token with its device token, the server shall give it a new device token and refuse the old one from then on. [accounts-design §4]
- SAVE-116: When a device is signed out, from itself or from another device of the account, the server shall refuse its device token and its access token at once. [save-system §5.2; accounts-design §3]
- SAVE-117: If email sign-in fails 5 times within 15 minutes for one address from one place, then the server shall refuse further tries until the 15 minutes have passed, as the website's sign-in does. [save-system §5.2 rate limits; config `cloud.server.sign_in_throttle`]
- SAVE-118: Where the server has no Steam key configured, Steam sign-in shall answer "Steam sign-in is not available" and email sign-in shall keep working. [accounts-design §10]

#### Combining accounts and removing a sign-in

- SAVE-186: When the player adds a sign-in that already belongs to another account (`POST /api/account/sign-ins`), the server shall check it as for signing in and answer `linked_to_another_account` with an offer to combine: the other account's display name, how many cloud saves and shared saves it holds, the stores it holds an active purchase on, whether the two together go over the storage quota, and a combine token that names the account the player is in and the other account and lasts 10 minutes. Passing the other account's sign-in is the proof that the player owns it, so nothing else is asked. For email and password the offer shall come only when the password is that account's (otherwise the refusal stays as it was), and those tries shall count toward the email sign-in limit (SAVE-117). [accounts-design §5; config `sign_in.combine_minutes`; placeholder; D-SAVE-24]
- SAVE-187: When the game sends the combine token to `POST /api/account/merge`, from a device of the account the token names as staying, the server shall move to that account, in one transaction, everything of the other: its sign-ins (and its email and password), its devices, its cloud saves with their bytes, change log entries and ironman heads, its shared saves, its entitlements, and its community topics, posts and reports; then it shall delete the emptied account. The account the player is in keeps its id and display name. If the token has expired, was altered or names another account, then the server shall refuse with `combine_expired`; if the other account is gone already, with `nothing_to_combine`. [accounts-design §5, §8; D-SAVE-24]
- SAVE-188: If both accounts hold a sign-in of the same store, or both an email, then the offer shall say so and the server shall refuse to combine with `both_have_steam`, `both_have_apple`, `both_have_google` or `both_have_email`, because an account holds one sign-in per store (SAVE-153, INV-SAVE-21); the player removes one of the two first (SAVE-193) and adds the sign-in again. [accounts-design §5; D-SAVE-24]
- SAVE-189: When both accounts hold saves of the same campaign, every save of both shall be kept, as two lines of play (SAVE-054). A save id both accounts hold is the same write-once file (INV-SAVE-5) and shall be kept once: the copy that is not removed wins, and when both or neither are removed, the copy of the account that stays. When both hold an ironman head for the campaign, the head whose save is the newer shall stay (the staying account's on a tie), and the other device meets SAVE-089 on its next ironman upload. [accounts-design §5; INV-SAVE-5, INV-SAVE-15; D-SAVE-24]
- SAVE-190: When both accounts hold an entitlement for the same store, the account shall keep one (INV-SAVE-19): an active one before a refunded one before a revoked one, and on a tie the staying account's; the other row is dropped, which frees its store reference. [accounts-design §5, §6; D-SAVE-23, D-SAVE-24]
- SAVE-191: Combining shall never drop a save to fit the quota (INV-SAVE-14): when the two together hold more than the quota (SAVE-069) or more than 50 shared saves (SAVE-126), the accounts shall be combined all the same, the offer saying so first, and from then on uploads (and new shares) are refused until the player deletes some, as at any full account. [save-system §5.2; accounts-design §5; D-SAVE-24]
- SAVE-192: The other account's devices shall stay signed in, now in the staying account: on their next token refresh the server shall name the staying account (id and display name) as theirs, and on their next `GET /api/saves` it shall answer from the start of the staying account's change log with `reset`, so the device replaces the cloud lines it held with the staying account's. Each save that moved shall get a new change entry, so the staying account's own devices receive it on their next sync. [accounts-design §5; SAVE-064]
- SAVE-193: `DELETE /api/account/sign-ins/{provider}` (`steam`, `apple`, `google` or `email`) shall remove that sign-in from the signed-in account while at least one other remains, and refuse the last with `last_sign_in`; removing email removes the password with it. The devices stay signed in; the removed sign-in can be added again later, and signing in with it alone makes a new account. [accounts-design §5; INV-SAVE-21]

#### Store sign-ins on phones and the web

- SAVE-149: When the player signs in with Apple, the game shall make a random nonce, open Apple's own sign-in sheet with the nonce's SHA-256 (in hex), and send the identity token, the nonce and the device to `POST /api/sessions` (`appleIdentityToken`, `nonce`). The server shall accept the token only when it is signed with RS256 by a key in Apple's key set (`https://appleid.apple.com/auth/keys`), its issuer is `https://appleid.apple.com`, its audience is one of the server's Apple client ids (the app's bundle id, the website's Services ID), it has not expired (with 60 seconds' leeway for clocks), and its `nonce` is the SHA-256 of the nonce sent; then it shall open the account that holds that Apple id (the token's `sub`), or make one named with the name Apple gives the game on the first sign-in, else "Player". [accounts-design §4, §8; config `sign_in.token_leeway_seconds`; placeholder; D-SAVE-22]
- SAVE-150: When the player signs in with Google (Android's Credential Manager, or Google's sign-in on the web), the game shall do the same with Google's ID token (`googleIdToken`, `nonce`), and the server shall check it the same way against Google's key set (`https://www.googleapis.com/oauth2/v3/certs`), with the issuer `https://accounts.google.com` or `accounts.google.com` and the audience one of the server's Google client ids (the web client that the Android app names as its server client); the account it makes is named with the token's `name`. [accounts-design §4, §8; config `sign_in.token_leeway_seconds`; placeholder; D-SAVE-22]
- SAVE-151: When the player signs in with Steam on a phone or the web, the game shall ask the server for Steam's sign-in address (`POST /api/sessions/steam-openid` with the address to come back to) and open it in the system's browser sheet on a phone, or in the same tab on the web; Steam's OpenID 2.0 sign-in shall come back to `GET /auth/steam/return`. The server shall accept Steam's answer only when its mode is `id_res`, it names Steam's endpoint and the server's own return address, its claimed id is a Steam community id, Steam confirms it in a `check_authentication` round trip (`is_valid:true`), and its response nonce is less than 5 minutes old and was never used before. Then it shall send the browser back to the game's address with a one-time code (`steamCode`) that lasts 5 minutes, and the game shall exchange it at `POST /api/sessions` (`steamOpenIdCode`), which opens or makes the account as a Steam ticket does (SAVE-113, named "Player"). A code shall work once. If the answer fails a check, then the browser shall go back to the game with `steamError` and no code. [accounts-design §4, §8; config `sign_in.browser_code_minutes`; placeholder; D-SAVE-22]
- SAVE-152: The server shall send the browser back only to an address on its list of the game's return addresses (`SIGN_IN_RETURN_URLS`: the phone app's `pockethegemony://auth/steam` and the web game's page), and shall carry that address in a state it signs, so nothing on the way can change where the code goes. If the game asks for another address, then the server shall refuse with `return_not_allowed`. [accounts-design §4; config `sign_in.app_return`]
- SAVE-153: `POST /api/account/sign-ins` shall take each store sign-in as well (a Steam ticket, a Steam browser code, an Apple identity token with its nonce, a Google ID token with its nonce), checked as for signing in, and add it to the signed-in account. If that Steam account, Apple id or Google id belongs to another account, then the server shall refuse with `linked_to_another_account` and offer to combine the two accounts (SAVE-186), and if the account already holds a sign-in of that store, with `already_has_steam`, `already_has_apple` or `already_has_google`. [accounts-design §5; SAVE-112]
- SAVE-154: Where the server has no Apple client ids, Sign in with Apple shall answer "Sign in with Apple is not available."; where it has no Google client ids, Google sign-in shall answer "Google sign-in is not available."; where it has no return addresses, Steam in the browser shall answer "Steam sign-in is not available."; and where a store's key set or Steam cannot be reached, the sign-in shall give the same answer, never a refusal. Every other sign-in shall keep working, as SAVE-118 says for the Steam key. [accounts-design §10; SAVE-118]

#### Steam on the desktop

- SAVE-140: Where the desktop game has a Steam app id (`--steam-app-id`, the build's `PH_STEAM_APP_ID`, the `SteamAppId` Steam sets when it starts the game, or, last, the id the packaged store build was made with) and the Steam client is running, the game shall start Steamworks through `steamworks.js`, loaded only then, and turn on the Steam overlay; when the packaged store build is started outside Steam, it shall ask Steam to start it (`restartAppIfNecessary`) and quit before opening a window; if there is no app id, the library or its native part cannot load, or Steam is not running, then the game shall run as the desktop game without Steam (email sign-in, the same save folder), with no error shown to the player. [accounts-design §4, §9; D-SAVE-21]
- SAVE-141: When the Steam build starts and the device is signed out, the game shall sign in with Steam by itself: it gets a Web API ticket for the identity in `sign_in.steam_ticket_identity` and sends it with the player's Steam name to `POST /api/sessions` (SAVE-113), so the player types nothing. If the player signed out on this device, then the game shall not sign in by itself again until they tap Sign in with Steam. If the silent sign-in fails (offline, Steam refused the ticket, the server has no Steam key), then the game shall say nothing at launch, keep playing, and show the reason on the Account and cloud saves card. [accounts-design §3, §4; SAVE-113, SAVE-118]
- SAVE-142: Where the game runs on Steam, the device shall name itself to the server with the platform `steam`, and on a Steam Deck (where Steam sets `SteamDeck=1`) the device and its saves shall be named "Steam Deck", so another device's Load card and Continue say "from Steam Deck" (SAVE-014). [accounts-design §3; SAVE-014, SAVE-053]
- SAVE-143: On the desktop the device token shall be kept encrypted with Electron's `safeStorage` in the userData folder (SAVE-057); if `safeStorage` cannot encrypt on this computer, then it shall stay in the game's web storage as on the web, and a token kept there before shall move into `safeStorage` once it can. [accounts-design §4, §9; SAVE-057]

#### Shared saves

- SAVE-124: A shared save shall be a copy of one save, uploaded once, public, and attached to a community post under a share code; it shall be separate from cloud sync, so sharing exposes none of the player's other saves and deleting a cloud save leaves the shared copy, while removing the shared save or a moderator hiding its topic takes it away. [accounts-design §7]
- SAVE-125: When the player posts a share (`POST /api/shared-saves` with the file, a title, an optional note and what it is for), the server shall check the file as it checks an upload (SAVE-068), drop the device name from the copy's header, keep the bytes under `shared/<code>.phsave`, open a topic on the board the purpose picks ("Show my campaign": Strategy and campaign stories; "Help me with this": Saves to try; "Something broke": Bug reports) as the player, with the note, or a line naming the save, as its opening post, and return the code and the link `/s/<code>`. [accounts-design §7; config `cloud.shared.boards`]
- SAVE-126: Sharing shall need the account (it posts as the player); shared saves shall not count toward the cloud quota, an account shall keep at most 50 of them, and each share shall count toward the community's limit on new topics. [accounts-design §7; config `cloud.shared.max_per_account`; placeholder]
- SAVE-127: The server shall answer `GET /api/shared-saves/{code}` with the save card (title, author, realm, in-game date, turn, play time, game version, whether it was ironman, the modified mark, the map crop, plays) and `GET /api/shared-saves/{code}/file` with the bytes, counting a play; `/s/<code>` shall lead to the post with the save and `/s/<code>.phsave` download the file. If the save was removed or its topic or post is hidden, then each shall answer "There is no shared save with this code." [accounts-design §7]
- SAVE-128: When the player opens a shared save, the save system shall start a new campaign of the player's own from it: a new campaign id and save id, kept as a Manual save on this device, with `sharedFrom` (the share code and the author's display name) in its header and in every later save of the campaign; the locked-nation check (SAVE-081), the newer-version check (SAVE-049) and the hash check (SAVE-094) shall apply as for any save. [accounts-design §7]
- SAVE-129: If a shared save was ironman, then its copy shall open as a normal campaign, not ironman, with `ironman_unbroken` off, so it earns no achievements and sharing cannot carry an ironman run past a mistake. [accounts-design §7; X-16]
- SAVE-130: When the player shares a save of a campaign that began as a copy of a shared save, the server shall accept "Reply in the original topic": the save goes up as a reply in the topic the original came from, with its own save card, unless that topic is locked or hidden. [accounts-design §7]
- SAVE-131: When the player who shared a save removes it, the server shall refuse it from then on and delete its bytes; the topic stays, its card saying the save was removed. [accounts-design §7]

### 5.9 Store backups, Export and Import

- SAVE-073: Where the game runs on Steam, the save folder (`<Electron userData>/saves`) shall be covered by Steam Auto-Cloud with root overrides mapping the Windows, macOS and Linux paths to one cloud folder, a quota of 500 MB and 2,000 files for the synced set only, and Dynamic Cloud Sync on so a suspended Deck uploads its saves. [save-system §5.3; config `store_backups.steam`]
- SAVE-144: Where the game runs on the desktop, with or without Steam, the save system shall keep each save as its own `.phsave` file in the save folder under the same name as in the cloud, `<campaignId>/<savedAt>-<saveId>.phsave` (SAVE-053): written to a `.tmp` file beside it, flushed and renamed into place before the saves it replaces are removed (SAVE-032); the Load card shall read only each file's header (SAVE-036), and a file that is not a readable save shall be left alone and not listed. Saves an earlier desktop build kept in IndexedDB shall move into the folder once, on the first launch that has it. [accounts-design §9; SAVE-032, SAVE-036, SAVE-053]
- SAVE-145: Steam Auto-Cloud shall be set in the Steamworks partner site (App Admin → Steam Cloud) as: byte quota 500 MB and 2,000 files; one root path, root `WinAppDataRoaming`, subdirectory `Pocket Hegemony/saves`, pattern `*.phsave`, OS all, recursive; root overrides `WinAppDataRoaming` → `MacAppSupport` on macOS with the path unchanged, and `WinAppDataRoaming` → `LinuxHome` on Linux with the path replaced by `.config/Pocket Hegemony/saves`; Dynamic Cloud Sync on. The desktop app's product name "Pocket Hegemony" makes the userData folder these paths name. [save-system §5.3; config `cloud.store_backups.steam`; D-SAVE-21]
- SAVE-074: Where the game runs on Android, Auto Backup shall include the synced set through the backup rules file (within its 25 MB per-app limit) and exclude the orders journal. [save-system §5.3]
- SAVE-075: Where the game runs on iOS or iPadOS, the device's own iCloud backup shall include the save folder. [save-system §5.3]
- SAVE-076: Where the game runs on the web, saves shall live in IndexedDB, the game shall ask for persistent storage (`navigator.storage.persist()`), and signing in shall be the only way a web player keeps saves beyond the browser. [save-system §5.3]
- SAVE-077: The save system shall not use Play Games saved games or an iCloud Documents container. [save-system §5.3, §8.2]
- SAVE-078: When the player taps Export, the save system shall write a `.phsave` file through the share sheet on phones or a save dialog on desktop. [save-system §5.4, §8.1]
- SAVE-079: When the player imports a file (file picker, or opening it from Files, Drive or a download), the save system shall check its magic, CRCs and `worldHash` and add it to the Manual saves, applying the nation-lock check like any other save. [save-system §5.4]

### 5.10 Free tier and full game

- SAVE-080: Where the game runs on a phone, the free download and the full game shall be the same app, so saves need nothing to carry over; buying the unlock removes the lock, and each header shall record the player's nation and whether it needs the full game. [save-system §6.1]
- SAVE-081: If a save of a locked nation is loaded without the full game, then the save system shall show the unlock screen instead of failing ("Portugal is part of the full game. Unlock it to continue this campaign.") and shall never delete the save. [save-system §6.1, §2.5]
- SAVE-082: If a purchase is refunded or revoked, then the saves shall stay and those nations shall ask to be unlocked again. [save-system §6.1]
- SAVE-083: Where the player has the Steam demo and the full game on the same computer, the full game shall find the demo's saves (same save folder name on disk) on first launch and copy them into its own folder, and Steam Cloud shall keep them from then on. [save-system §6.1]
- SAVE-084: Where a demo player is signed in, their saves shall sync through our server to the full game on any computer or phone; without an account, Export and Import shall do the same. [save-system §6.1]
- SAVE-085: The save system shall store in the header's `tier` the app that wrote the save (`free`, `demo` or `full`) and no list of limits, and the full game shall open such a save with no limits. [save-system §6.1; D-SAVE-13]

#### Purchases and the server's checks

- SAVE-170: The full game shall be one purchase per store, and it shall unlock the full game only on the store where it was bought: on Steam the paid app (the demo is a separate app id and unlocks nothing), on the App Store and Google Play the non-consumable in-app product `full_game` in the free download. The account carries the saves across stores, never a purchase. [accounts-design §6 (cross-buy per store, Leroy 19 Oct); SAVE-072; config `purchases.product_id`]
- SAVE-171: The server shall keep one entitlement per account and store: the product, the store's reference for the purchase (SteamID and app id; the Apple original transaction id; the Google order id with the purchase token's hash), its status (`active`, `refunded` or `revoked`), the store's environment, when it was first verified and when last checked. One store reference shall belong to at most one account: a purchase already held by another account shall be refused with "This purchase is on another Pocket Hegemony account." [accounts-design §6, §8; D-SAVE-22]
- SAVE-172: The server shall answer `GET /api/entitlements/{store}` (`steam`, `apple` or `google`) for the signed-in account with whether the full game is unlocked on that store, the status (`active`, `refunded`, `revoked` or `none`), when it was last checked, and the tag the store's purchase should carry for this account: on the App Store the `appAccountToken`, which is the account id; on Google Play the `obfuscatedAccountId`, a SHA-256 hash of it. [accounts-design §6]
- SAVE-173: When the Steam entitlement is asked for and the last check is older than 24 hours or there is none, or `POST /api/purchases` asks for Steam, the server shall check `ISteamUser/CheckAppOwnership` with the publisher key for the full game's app id and the account's SteamID; it shall record the entitlement active when Steam says the app is owned, mark it refunded when Steam says it no longer is, and, while Steam cannot be reached, answer what it last recorded. An account without a Steam sign-in shall have no Steam entitlement. [accounts-design §6; config `purchases.steam_recheck_hours`; D-SAVE-22]
- SAVE-174: When the game sends an App Store purchase (`POST /api/purchases` with the StoreKit 2 signed transaction), the server shall accept it only if the JWS is signed with ES256, its `x5c` chain runs leaf, intermediate, root with each certificate signed by the next, the root is the Apple Root CA - G3 the server is configured with, the intermediate and the leaf carry Apple's marker extensions (`1.2.840.113635.100.6.2.1`, `1.2.840.113635.100.6.11.1`), every certificate was valid at the transaction's `signedDate`, the signature checks with the leaf's key, and the transaction names our bundle id, the product `full_game`, the Production environment (Sandbox only where the server is set to accept it) and no `appAccountToken` but this account's. A transaction with a `revocationDate` shall be recorded as revoked. [accounts-design §6; D-SAVE-22]
- SAVE-175: When the game sends a Google Play purchase token, the server shall read it with the Play Developer API `purchases.products.get` for our package and `full_game`, signed in as its service account; it shall record the entitlement active only when the purchase state is purchased, refuse a token Play does not know, answer a pending purchase as pending without unlocking, refuse a purchase whose `obfuscatedExternalAccountId` names another account, and acknowledge a purchased one that is not acknowledged yet, so Play does not refund it after 3 days. [accounts-design §6]
- SAVE-176: The server shall listen for App Store Server Notifications V2 at `POST /api/stores/apple/notifications`: it shall check the signed payload and the transaction inside it as in SAVE-174, mark the entitlement refunded on `REFUND`, revoked on `REVOKE` (Family Sharing ended) and active again on `REFUND_REVERSED`, record a `ONE_TIME_CHARGE` whose `appAccountToken` names an account, answer 200 to every notification that passes the check (also one about a purchase it does not hold), and refuse one that does not. [accounts-design §6]
- SAVE-177: The server shall listen for Google Play real-time developer notifications, pushed by Pub/Sub to `POST /api/stores/google/notifications?token=<push token>`: it shall refuse a push without the configured push token or for another package, mark refunded the entitlement whose purchase token or order a `voidedPurchaseNotification` names, read a purchase again with `purchases.products.get` on a `oneTimeProductNotification`, and accept every other push it could read (a test notification, a purchase it does not hold) so Pub/Sub does not send it again. A daily command, `app:stores:google-voided`, shall read Play's voided purchases list as well. [accounts-design §6; D-SAVE-22]
- SAVE-178: Where a store's settings are not set on the server, that store shall be unavailable: its entitlement, purchase and notification calls shall answer 503 with `store_unavailable` and a message that names it ("App Store purchases are not available on this server."), while the other stores, sign-in and saves keep working. [accounts-design §10; SAVE-118]
- SAVE-179: The game shall ask its own store first, through the store bridge its platform's shell gives it, which works offline and needs no account. Where the build names a cloud server and the player is signed in, the game shall also ask the server for this store's entitlement and decide from both: on Steam the running paid app is the full game whatever the server answers, as Steam keeps its own licences; on the App Store and Google Play an active entitlement unlocks the full game, a refunded or revoked one locks it again even while the store's own answer still says owned, and with no answer (offline, signed out, the store unavailable on the server) or no entitlement yet, the store's answer decides. When the store says owned and the server holds no active entitlement, the game shall first send the store's proof and then decide from the answer. [accounts-design §6]
- SAVE-180: Where the build names no cloud server, or its shell gives no store bridge (the web game, the desktop game without Steam), the game shall stay the full game as it is today, with no unlock state, ribbon or Restore purchases. [accounts-design §9; D-SET-22]
- SAVE-181: While the full game is locked on this store, the game shall open the Unlock card in place of loading a save of a locked nation (with the message of SAVE-081) and in place of starting a new campaign of a realm that needs the full game; when it locks again after a refund or revocation every save shall stay (SAVE-082), and once it unlocks, the save or realm the player asked for shall be one tap away. [accounts-design §6; SAVE-081, SAVE-082; SHELL-032, SHELL-105]

### 5.11 Ironman

- SAVE-086: The save system shall let ironman be chosen only when a campaign starts, and it cannot be turned off. [save-system §6.2]
- SAVE-087: While a campaign is ironman, the save system shall allow no manual Save, no Load of earlier points, and no console or debug tools. [save-system §6.2]
- SAVE-088: While a campaign is ironman, Export shall be allowed as a backup, and importing an ironman save shall start it on this device, the copy on the old device then no longer being the newest. [save-system §6.2; config `ironman.allow_export`]
- SAVE-089: When an ironman save uploads, the server shall accept it only if the save it names as its parent is still the campaign's newest ironman save (`ironman-head`); otherwise the second device shall be told to load the newer game first. [save-system §6.2]
- SAVE-090: If two devices played the same ironman campaign offline and the server rejects an upload because the line has split, then the game shall ask once "Keep the game from Steam Deck (June 1530) or from this phone (Feb 1528)?", recommend the further-along one, and remove the other line. [save-system §6.2; config `ironman.conflict`, `ironman.recommended_choice`]
- SAVE-091: If an ironman save is damaged, then the save system shall open its backup and tell the player, rolling back at most one turn. [save-system §6.2]

### 5.12 Integrity

- SAVE-092: The save system shall catch damaged or edited files with the CRC on every chunk and the recomputed `worldHash`. [save-system §6.3; config `integrity`]
- SAVE-093: The save system shall not encrypt saves. [save-system §6.3]
- SAVE-094: If a save fails the hash check, then it shall open only outside ironman, after a warning, and be marked as modified. [save-system §6.3; config `integrity.modified_saves`]
- SAVE-095: The header shall carry the `ironman` flag, the modified mark and the flags `ironman_unbroken`, `cheat_marked`, `switched_country` and `began_as_tutorial` so the achievements context can check them. [save-system §6.3, §8.5; X-16; D-SAVE-1]
- SAVE-096: If a save is damaged or cut short, then the save system shall reject it cleanly and open or offer the previous save ("This save is damaged. The previous save from Dec 1511 was opened instead."). [save-system §2.5, §3.3, §7]

### 5.13 Bug reports, tests and the engine

- SAVE-097: When the player chooses Send a report, the report shall attach the Resume save and the orders journal, and sending shall always be the player's choice under the privacy design. [save-system §7]
- SAVE-098: Before release, the save code shall pass: every save in `test/saves/` loads, migrates and plays a turn; save, load and save again gives byte-identical chunks and the same `worldHash`; a file cut short at any byte is rejected cleanly and the previous save offered; the app killed during a write leaves the old save intact (desktop and both phones); backgrounding, killing and relaunching on a real iPhone and Android phone resumes with the queued orders; two devices with cloud on, played offline and reconnected, show both lines of play, and for ironman the one prompt. [save-system §7]
- SAVE-099: The engine worker shall produce and read the save bytes (a `save` request returning file bytes, a `load` request that migrates, validates and returns a snapshot, `newGame` carrying the game options, and `endTurn` also returning the serialised Resume save); each platform's storage layer shall only store and list them, and the sync queue shall upload them. [save-system §9 Engine]
- SAVE-100: Where the autosave interval is every 6 months, the save system shall write the autosave at the start of the turns in which January and July begin, and while a campaign is ironman it shall write no rotating autosaves. [save-system §2.3; config `kinds.autosave.every_6_months`; D-SAVE-9]
- SAVE-101: When the player picks "Restore the last autosave" on the failure screen, the save system shall open the campaign's Resume save, or its newest rotating autosave when every Resume save is damaged. [screen flow X1; D-SAVE-3]
- SAVE-102: If an ironman save is imported while the device is offline, then the save system shall refuse it with "Connect to import an ironman save." so the ironman head check always runs. [save-system §6.2; D-SAVE-15]
- SAVE-103: When the player makes a choice at a before-the-battle stop, the save system shall append it to the orders journal with its day, so a replay reaches the same result. [X-1; D-SAVE-10]
- SAVE-104: The save system shall sync the personal settings file `settings-personal.json` with the account's saves, under the same rules as a save. [settings §8; D-SAVE-6]

### 5.14 How the player uses it

- SAVE-105: The player shall reach saving and loading from the game menu (the three-line button at the top left of the map's top bar, or Esc), which holds Return to the map, Save, Load, Settings and Exit to main menu, opened as one card over the dimmed map; the start screen shall hold Continue (with its label, SAVE-014), Load and Settings above the realms to choose. [X-19; SHELL-051, SHELL-064, SHELL-065]
- SAVE-106: The Save card shall be the one place for saving by hand: the new save's name, filled in with the default (SAVE-018) and changeable, and a Save button at the top; under them the campaign's manual saves newest first with their in-game date and when they were saved, each with Save over, which asks "Replace?" in the row itself; at the slot limit the new save gives way to "pick a save to replace" (SAVE-020); while the week plays, Save waits and says so, because a save is a turn boundary (SAVE-001). [X-19]
- SAVE-107: The Load card shall be the overview of every save on the device: one line per campaign for where the player left off (its Resume save, marked "Where you left off"), then every autosave and manual save, all newest first, each with its map crop, banner, realm, in-game date, when it was saved and an "Auto" mark; tapping a line opens it in place with Load and Delete, and Delete asks first (SAVE-021). [X-19; D-SAVE-17]
- SAVE-108: The autosave choices shall live in Settings → Gameplay (Autosave, Autosaves kept), and a toast "Saved." shall show over the map whenever the player saves, never a dialog; autosaves and the Resume save are written quietly after End turn. [X-19; SAVE-022, SET-061, SET-062]
- SAVE-109: Exit to main menu shall keep the campaign's Resume save current and return to the start screen, where Continue opens it again. [X-19; SAVE-007]
- SAVE-110: On a phone in landscape the Save and Load cards shall be one scrolling column inside the safe areas, with every button and save line at least 44 points high and nothing that needs hover; on the web the saves shall live in the browser's IndexedDB, one transaction per save written. [X-19; SAVE-032, SAVE-077]
- SAVE-119: The player shall find everything about the account and cloud saves in one card, Settings → Account and cloud saves, and a "Sign in to keep your saves on every device" line at the bottom of the Load card shall open it while signed out; there shall be no other way in and never a wall before playing. Where the build names no cloud server, neither the section nor the line shall show. [X-19; accounts-design §3; SAVE-060; D-SET-22]
- SAVE-120: While signed out, the card shall hold the email sign-in (email, password, Sign in) and "Make an account" (email, display name, password), which signs the new account in on this device; a failed try shall say why in the card ("Wrong email or password.", "Too many tries. Wait 15 minutes and try again.") and keep the email typed. The store sign-ins (Steam, Sign in with Apple, Google; SAVE-059) shall sit above the email form (SAVE-146, SAVE-155). [accounts-design §3, §4; SAVE-057, SAVE-117]
- SAVE-121: While signed in, the card shall show the display name and email, the cloud's status line as the overview of cloud state ("Up to date", "3 saves waiting to upload", "Offline, will sync when connected", "Storage full"), Storage (saves and megabytes used against the quota), Devices (name, platform, last seen, and Sign out on each, which asks first) and Sign out of this device; signing in sends up the synced set the device already holds. "Sync on Wi-Fi only" (SAVE-067), Sign-ins and Delete account shall join the card when they are built. [accounts-design §3; SAVE-055, SAVE-069, SAVE-116]
- SAVE-122: The Load card shall list the saves other devices put in the cloud with this device's own, each line from another device marked "from <device>", and download a save's bytes only when it is opened ("Connect to open this save from the cloud." while offline); Continue shall name the device of a save from another device (SAVE-014), and a campaign played on two devices shall show where each left off. Deleting a save on the Load card shall delete it in the cloud too. [accounts-design §3; SAVE-053, SAVE-054, SAVE-062, SAVE-064]
- SAVE-123: On a phone in landscape the Account and cloud saves card shall be one scrolling column inside the safe areas in both the Wide and Tall layouts, with full-width fields and buttons at least 44 points high (Sign in and Sign out 48), and nothing that needs hover. [X-19; accounts-design §3]

#### Sharing saves with the community

- SAVE-132: The player shall find sharing where the saves already are: **Share** beside Load and Delete on an open Load line, **Share this campaign** in the game menu over the map (it shares where the player is now, the campaign's Resume save), and **Open a shared save** at the bottom of the Load card, where a share code is typed; on the website a topic's save card holds **Play this save**, which opens the web game with the code, and **Download**. Where the build names no cloud server, none of these shall show in the game. [X-19; accounts-design §7]
- SAVE-133: The Share sheet shall be one card for the subject: the title, filled in with the save's name ("Castile, May 1492") and changeable; a short note; what it is for, as three large choices that pick the board (**Show my campaign**, **Help me with this**, **Something broke**), with **Reply in the original topic** first and chosen for a copy of a shared save (SAVE-130); then **Post to the community**. Signed out, the sheet shall say that sharing posts as the player and offer Sign in, which opens the Account and cloud saves card. When the save is posted, the sheet shall say "Shared. Your topic is on the community." with **Copy link**, **Share link** (the system share sheet, where the device has one) and **Open the topic**. [X-19; accounts-design §7; D-SAVE-19]
- SAVE-134: The topic shall show the save card above the post it came with: the map crop, the save's title, the realm, the in-game date, the week, the play time, the game version, "Was ironman: opens as a normal campaign" and "Modified" when they apply, the share code to type in the game, and Play this save and Download; on the Load card a copy's lines shall say "From <author>'s campaign". [X-19; accounts-design §7]
- SAVE-135: The overview of what the player shared shall be a **Shared saves** row on the Account and cloud saves card and a Shared saves list on the community's You page: each shared save with its title, how many times it was played, a link to its topic, and **Remove**, which asks first. [X-19; accounts-design §7]
- SAVE-136: On a phone in landscape the Share sheet shall be one scrolling column inside the safe areas in both the Wide and Tall layouts, the three choices rows at least 64 points high, every other button and field at least 44, and no typing needed because the title has a default; on the website Play this save and Download shall fill the width on a narrow phone, and nothing shall need hover. [X-19; accounts-design §7]
- SAVE-137: Where the phone and desktop builds register app links, the link `https://<domain>/s/<code>` shall open the game on that shared save, and fall back to the download and the store pages. [accounts-design §7]
- SAVE-138: The website's new-topic form shall also take a `.phsave` attachment, so a player who never signs in from the game can share an exported file (SAVE-078). [accounts-design §7]
- SAVE-139: Where a save needs Workshop mods (the header's `mods` list), its card shall say "Needs N Workshop mods (Steam only)" with links to them; saves shall never be put on the Workshop. [accounts-design §7; steam-design §4]

#### Signing in with Steam

- SAVE-146: The player shall find Steam sign-in where every sign-in is, on the Account and cloud saves card in Settings (SAVE-119); in the Steam build most players never look, because the game signs in by itself (SAVE-141). While signed out, the card shall hold **Sign in with Steam** above the email form, with the reason under it when the silent sign-in failed; on the desktop without Steam it shall not show (on phones and the web Steam signs in through the browser, SAVE-155). [X-19; accounts-design §3, §4; SAVE-120]
- SAVE-147: While signed in, the card shall show the account's sign-ins in one **Sign-ins** row, Steam first (with the Steam name on this computer) and email with its address, and under the display name "Signed in with Steam" in place of the email for an account that has none; together with the status line (SAVE-121) this is the overview of the account at a glance. Everything about the account stays on this one card. [X-19; accounts-design §3; SAVE-121]
- SAVE-148: On a Steam Deck (1280 × 800, held in landscape, touch or controller) and on a phone in landscape the card shall stay one scrolling column inside the safe areas in the Wide and Tall layouts, with Sign in with Steam full width and 48 points high and nothing that needs hover (SAVE-123). [X-19; accounts-design §3]

#### Signing in on phones and the web

- SAVE-155: The player shall find the phone and web sign-ins where every sign-in is, on the Account and cloud saves card (SAVE-119). While signed out, the card shall hold one full-width button per store sign-in this platform offers, in SAVE-059's order: on an iPhone or iPad **Sign in with Apple** then **Sign in with Steam**; on Android **Sign in with Google** then **Sign in with Steam**; on the web **Sign in with Steam**, **Sign in with Google**, **Sign in with Apple**; then "Or use email instead:" and the email form (SAVE-120). Tapping Apple or Google shall open the system's own sheet over the game; tapping Steam shall open Steam's page in the browser sheet, which closes and comes back to the game by itself (on the web the page goes to Steam and back to the game). While a sign-in runs, the buttons shall wait; a failed or cancelled try shall say why under the buttons and leave the card as it was. A button shall show only where this build can start that sign-in, and on iOS, if Sign in with Apple cannot be started, no other store sign-in shall show either (SAVE-059). [X-19; accounts-design §3, §4; SAVE-059, SAVE-146]
- SAVE-156: While signed in, the **Sign-ins** row (SAVE-147) shall list Apple and Google with Steam and email, and under the display name the card shall say "Signed in with Apple", "Signed in with Google" or "Signed in with Steam" for an account that has no email. Under the row, one **Add** button per store sign-in this platform offers and the account does not hold yet ("Add Sign in with Apple", "Add Sign in with Google", "Add Sign in with Steam") shall run the same sign-in and add it (SAVE-153); one that belongs to another account shall ask whether to combine the two accounts, in the card (SAVE-194). Everything about the account stays on this one card, and the Sign-ins row with the status line (SAVE-121) is its overview at a glance. [X-19; accounts-design §3, §5; SAVE-147]
- SAVE-157: On a phone in landscape the store sign-in buttons shall be full width and 48 points high, the Add buttons at least 44, inside the safe areas in the Wide and Tall layouts; the Apple and Google sheets and the browser sheet are the system's own and need no typing, only the email fallback does, and nothing shall need hover. [X-19; accounts-design §3; SAVE-123]
#### Combining accounts and removing a sign-in

- SAVE-194: The player shall meet combining where sign-ins are added, on the Sign-ins row of the Account and cloud saves card, and nowhere else: when an Add (SAVE-156) brings a sign-in of another account, the card shall ask once, in place of the Add buttons: "This Sign in with Apple has its own Pocket Hegemony account, "Bertrand", with 4 saves." (with its shared saves and "the full game on the App Store" where it has them), "Combine the two accounts?", and under it what happens: "Everything moves to this account, "Leroy": saves, shared saves, purchases, sign-ins and devices. All saves are kept. "Bertrand" is then closed.", "Your storage will be full; delete old saves to keep uploading." when SAVE-191 applies, then **Combine accounts** and **Keep apart**. After Combine accounts the card shall say "Accounts combined. Everything from "Bertrand" is now in this account." and the Load card shows the moved saves after the sync that follows. When SAVE-188 blocks it, the card shall give the reason ("Both accounts have a Steam sign-in. Remove one of them, then add this sign-in again.") with only **OK**. Keep apart, OK, closing the card and a token that ran out ("The offer to combine ran out. Add the sign-in again.") leave both accounts as they were. [X-19; accounts-design §3, §5]
- SAVE-195: Removing a sign-in shall sit on the same row: each sign-in has **Remove** while the account holds two or more, and the last has none; Remove asks first in the row ("Remove Steam? This device stays signed in.") with **Remove** and **Keep**, as Sign out does on a device. Everything about the account stays on this one card. [X-19; accounts-design §3, §5]
- SAVE-196: The Sign-ins row with the status line (SAVE-121) shall stay the overview of the account at a glance: after combining it lists the sign-ins of both, Devices lists both accounts' devices, Storage shows what they use together, and the status line says "Storage full" when they are over the quota. [X-19; accounts-design §3]
- SAVE-197: On a phone in landscape the combine question shall sit inside the card's one scrolling column, within the safe areas in the Wide and Tall layouts, with Combine accounts full width and 48 points high, Keep apart, OK, Remove and Keep at least 44, no typing, and nothing that needs hover. [X-19; accounts-design §3; SAVE-123]
#### Buying the full game

- SAVE-182: The player shall find buying in one place, the **Unlock** card: opened from the small "Full game" ribbon on the start screen (SHELL-029) and from More → Unlock (SHELL-154) while the full game is locked on this store, and in place of a locked realm's new campaign or a locked nation's save (SAVE-181); never as a pop-up and never before playing. [X-19; accounts-design §3]
- SAVE-183: The Unlock card shall hold everything about the purchase in one card: what it unlocks ("The full game: every realm"), **Buy** with the store's own price, **Restore purchases** on phones, and the result in the card itself ("The full game is unlocked on this device.", "Waiting for the store to confirm the payment.", "No purchase of the full game was found for this store account.", "This purchase is on another Pocket Hegemony account."); it shall name no other store and no other way to pay, within Apple's and Google's rules. A cancelled purchase shall add no message (SHELL-105). [X-19; accounts-design §3, §6; SHELL-135]
- SAVE-184: The start screen shall be the overview of the unlock at a glance: the "Full game" ribbon shows while the full game is locked on this store, goes once it is unlocked, and comes back after a refund. [X-19; SHELL-029]
- SAVE-185: On a phone in landscape the Unlock card shall be one scrolling column inside the safe areas in both the Wide and Tall layouts, with Buy full width and 48 points high, Restore purchases at least 44 points high, the store's own sheet doing the paying, and nothing that needs hover. [X-19; accounts-design §3]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| WriteResumeSave | system (after End turn, pause, quit, suspend) | Campaign loaded; not mid-turn | New Resume save; older beyond backup removed | `SaveWritten(resume)` |
| WriteAutosave | system (start of a turn in which a month on the interval begins) | Interval not off; not ironman | New autosave; oldest beyond keep removed | `SaveWritten(autosave)` |
| SaveManual | player | Not ironman; slot free or replace chosen | New manual save | `SaveWritten(manual)` |
| ReplaceManual | player | Existing manual save picked; "Replace?" yes | New file written, old removed | `SaveWritten(manual)`, `SaveRemoved` |
| WriteIronmanSave | system (after End turn, every exit) | Ironman campaign | New ironman save naming its parent | `SaveWritten(ironman)` |
| WriteJournal | system (background, suspend, close, every 30 s) | Orders changed | Journal written | — |
| DeleteSave | player | Confirmed | Removed locally; tombstone on the server | `SaveRemoved` |
| DeleteCampaign | player | Confirmed | All saves removed; campaign tombstoned on the server | `CampaignDeleted` |
| LoadSave / Continue | player | Save readable; nation unlocked; format not newer | Migrated, validated world; journal reapplied for Resume | `SaveLoaded`, or `LockedNationSaveOpened`, `SaveRejected` |
| ExportSave | player | — | `.phsave` file out | — |
| ImportSave | player | Valid magic, CRCs, `worldHash` | Joins Manual | `SaveWritten(manual)` |
| SignIn / SignOut / SignOutDevice | player | Online | Tokens stored / removed | `AccountSignedIn` / `AccountSignedOut` |
| DeleteAccount | player | Confirmed | Account and every save deleted | `AccountDeleted` |
| Sync | system (launch, resume, after save) | Signed in; online; Wi-Fi if Wi-Fi only | Headers and tombstones fetched; queue emptied | `SavesArrived` |
| ClaimIronmanHead | system | Ironman upload | Accepted or split detected | `IronmanLineSplit` |
| ResolveIronmanSplit | player | Split detected | One line kept, the other removed | `IronmanLineChosen` |
| ImportDemoSaves | system (full game first launch) | Demo saves in the shared folder | Copied into the full game folder | — |
| ShareSave | player | Signed in; online; under 50 shared saves | Shared save and its topic (or reply) made; code and link back | `SaveShared` |
| OpenSharedSave | player | Online; the code names a shared save | A copy joins the Manual saves as a new campaign and opens | `SaveWritten(manual)`, `SaveLoaded` |
| RemoveSharedSave | player (who shared it) | Confirmed | Shared save refused from then on; bytes deleted | — |
| BuyFullGame | player (Unlock card) | Store bridge; online | The store's sheet; the proof sent to the server when signed in | `FullGameUnlocked` |
| RestorePurchases | player (Unlock card, phones) | Store bridge; online | The store's past purchase found and sent to the server | `FullGameUnlocked`, or nothing found |
| CheckEntitlement | system (launch, sign-in) | Store bridge; cloud server named | The store's and the server's answers decide the unlock | `FullGameUnlocked` / `FullGameLocked` |
| AddSignIn | player (Account card) | Signed in; online; the store's or email's check passes | Sign-in added, or the offer to combine (SAVE-186) | — |
| CombineAccounts | player (Account card) | A combine token under 10 minutes old for this account; no store held by both | Everything of the other account moved here; the other deleted | `AccountsCombined` |
| RemoveSignIn | player (Account card) | Confirmed; another sign-in remains | Sign-in removed | — |
| RecordStoreNotification | store (App Store, Pub/Sub) | Signed, or carrying the push token | Entitlement marked refunded, revoked or active | — |

Save commands are local to one player's device and never change the simulation; they carry no game orders.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `SaveWritten` | A save file landed | header | game-shell (toast, Continue label), settings (none) |
| `SaveRemoved` | A save removed or replaced | save id | game-shell (Load list) |
| `CampaignDeleted` | Campaign deleted | campaign id | game-shell |
| `SaveLoaded` | Load finished | world snapshot, campaign options, modified mark | game-shell, time-and-turns, achievements |
| `SaveRejected` | Newer format, damaged, or no space | reason, fallback save | game-shell (X1 or message) |
| `LockedNationSaveOpened` | Locked nation without full game | nation | game-shell (unlock screen) |
| `SavesArrived` | Cloud headers fetched | headers, device names | game-shell (Load list, Continue "from Steam Deck") |
| `IronmanLineSplit` | Server rejected an ironman upload | both lines' device and date | game-shell (the one prompt) |
| `AccountSignedIn` / `AccountSignedOut` / `AccountDeleted` | Account changes | account id | settings (Account row, personal settings sync) |
| `SaveShared` | A shared save was posted | code, link, topic | game-shell (the Share sheet's result) |
| `AccountsCombined` | Two accounts became one | staying account id, the closed account id, what moved | settings (Account card), game-shell (Load list after the sync) |
| `FullGameUnlocked` / `FullGameLocked` | The unlock on this store changed (purchase, restore, refund, revocation) | store | game-shell (ribbon, Unlock card, realm picker, locked saves) |

## 8. Policies (reactions to other contexts)

- When `game-shell` reports End turn pressed (`EndTurnPressed`), write the Resume or Ironman save for the new turn when the turn completes, and the autosave at turn start on the interval.
- When `game-shell` reports `AppBackgrounded`, write the orders journal (and nothing new if a turn is running).
- When `game-shell` reports `CampaignStarted`, create the campaign with a random id, its options and ironman flag.
- When `settings` changes the autosave interval or the number kept, apply it from the next autosave.
- When `settings` changes "Sync on Wi-Fi only" or Cloud saves on/off, adjust syncing.
- When the store reports a purchase, refund or revoke, update which saves need the full game (saves stay).
- When `game-shell` reports `PlayedOnAsAnotherRealm`, record it in the campaign; the next save's header sets `switched_country` (D-SAVE-1).

## 9. Each turn

Per turn:
1. At turn start, if a new month begins in the turn and the interval says so (and not ironman): write an autosave.
2. During orders: keep the orders journal; write it on lifecycle events and every 30 s while orders change.
3. Pre-turn: the current Resume save plus journal describe the world before the turn (used if the app dies mid-turn).
4. After the turn: the worker writes the Resume (or Ironman) save for the new turn; the journal is cleared for the new turn; the upload is queued.
Depends on: `time-and-turns` finishing the turn deterministically (`processTurn` with a seeded `Rng`).

## 10. Configuration

From `save-system/save-config.example.yaml` ("numbers here are the defaults the design recommends").

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `format.extension` | File extension | `.phsave` | no | save-config.yaml |
| `format.magic` | Magic | `PHSV` | no | save-config.yaml |
| `format.compression` | Compression | deflate (bundled library) | no | save-config.yaml |
| `format.thumbnail` | Thumbnail size | 96 × 64 | no | save-config.yaml |
| `kinds.resume.keep` | Resume saves kept | 2 (newest plus backup) | no | save-config.yaml |
| `kinds.resume.write_on` | Resume write triggers | end_turn, pause, quit, suspend, background | no | save-config.yaml |
| `kinds.autosave.interval_months` | Autosave interval, in months | 12 | default (decided) | save-config.yaml |
| `kinds.autosave.interval_options` | Offered intervals | 1, 6, 12, off | no | save-config.yaml |
| `kinds.autosave.keep` | Autosaves kept | 3 | default | save-config.yaml |
| `kinds.autosave.keep_options` | Offered counts | 1, 3, 5 | no | save-config.yaml |
| `kinds.manual.max_per_campaign` | Manual per campaign | 20 | yes | save-config.yaml |
| `kinds.manual.max_total` | Manual in total | 100 | yes | save-config.yaml |
| `kinds.ironman.keep` | Ironman saves kept | 2 | no | save-config.yaml |
| `kinds.ironman.write_on` | Ironman write triggers | end_turn, pause, quit, suspend, background | no | save-config.yaml |
| `orders_journal.write_on` | Journal write triggers | pause, quit, suspend, background | no | save-config.yaml |
| `orders_journal.safety_interval_seconds` | Journal safety net | 30 | yes | save-config.yaml |
| `budgets.file_kb_start` | Size target at 1444 | 400 KB | target | save-config.yaml |
| `budgets.file_kb_late` | Size target late game | 2048 KB (server cap) | target | save-config.yaml |
| `budgets.write_ms` | Save write | 300 ms | target | save-config.yaml |
| `budgets.journal_write_ms` | Journal write | 20 ms | target | save-config.yaml |
| `budgets.header_read_ms` | Header read | 5 ms | target | save-config.yaml |
| `budgets.load_ms` | Load incl. migrations | 1500 ms | target | save-config.yaml |
| `cloud.synced` | Synced set | manual all; resume, ironman, autosave latest | no | save-config.yaml |
| `cloud.local_only` | Local only | older autosaves, resume backup, orders journal | no | save-config.yaml |
| `cloud.server.enabled` | Server cloud on | true | no | save-config.yaml |
| `cloud.server.max_save_mb` | Upload cap | 2 | yes | save-config.yaml |
| `cloud.server.quota_saves` | Saves per account | 300 | yes (decide later) | save-config.yaml |
| `cloud.server.quota_mb` | Storage per account | 200 | yes (decide later) | save-config.yaml |
| `cloud.server.tombstone_purge_days` | Purge delay | 30 | yes | save-config.yaml |
| `cloud.server.sync_on` | Sync triggers | launch, resume, after_save | no | save-config.yaml |
| `cloud.server.wifi_only_default` | Wi-Fi only default | false | no | save-config.yaml |
| `cloud.server.ironman_head_check` | Ironman head check | true | no | save-config.yaml |
| `cloud.store_backups.steam` | Steam | auto_cloud, 500 MB, 2000 files, dynamic cloud sync | platform | save-config.yaml |
| `cloud.store_backups.steam.partner_site` | Auto-Cloud root path, pattern and overrides to enter in Steamworks (SAVE-145) | root `WinAppDataRoaming`, `Pocket Hegemony/saves`, `*.phsave`, recursive; macOS `MacAppSupport`; Linux `LinuxHome` `.config/Pocket Hegemony/saves` | no | saves.json |
| `cloud.store_backups.steam.app_id_env` | Where the build's Steam app id comes from (SAVE-140) | `PH_STEAM_APP_ID`, else Steam's `SteamAppId` | no | saves.json |
| `cloud.store_backups.steam.dev_app_id` | Valve's test app, for trying Steam out only (D-SAVE-21) | 480 (Spacewar) | no | saves.json |
| `sign_in.token_leeway_seconds` | Clock leeway when the server checks an Apple or Google token's expiry (SAVE-149, SAVE-150) | 60 | yes (provisional) | saves.json |
| `sign_in.browser_code_minutes` | How old Steam's browser answer may be, and how long the one-time code lasts (SAVE-151) | 5 | yes (provisional) | saves.json |
| `sign_in.app_return` | Where the browser sheet comes back to the phone app (SAVE-152) | `pockethegemony://auth/steam` | no | saves.json |
| `sign_in.combine_minutes` | How long the offer to combine two accounts lasts (SAVE-186) | 10 | yes (provisional) | saves.json |
| `cloud.store_backups.android` | Android | auto_backup (25 MB limit, journal excluded) | platform | save-config.yaml |
| `cloud.store_backups.ios` | iOS | device_backup | platform | save-config.yaml |
| `cloud.store_backups.web` | Web | indexeddb_persist | platform | save-config.yaml |
| `export_import` | Export and Import on | true | no (decided) | save-config.yaml |
| `ironman.allow_export` | Ironman export | true | no | save-config.yaml |
| `ironman.conflict` | Split handling | ask_once | no | save-config.yaml |
| `ironman.recommended_choice` | Recommended line | furthest_turn | no | save-config.yaml |
| `integrity.chunk_crc` | Chunk check | crc32 | no | save-config.yaml |
| `integrity.verify_world_hash` | Hash check | true | no | save-config.yaml |
| `integrity.modified_saves` | Hash-fail policy | allowed_outside_ironman_with_warning | no | save-config.yaml |
| `desktop_quit_wait_seconds` | Desktop quit wait | 2 s | yes | D-SAVE-12 |
| `kinds.autosave.every_6_months` | Months of "every 6 months" | January, July | yes | D-SAVE-9 |
| `cloud.synced_files` | Files beside saves in the account sync | `settings-personal.json` | no | D-SAVE-6 |
| `messages.ironman_import_offline` | Offline ironman import | "Connect to import an ironman save." | no | D-SAVE-15 |
| `cloud.shared.max_per_account` | Shared saves an account keeps | 50 | yes (provisional) | saves.json |
| `cloud.shared.boards` | Board each purpose posts to | show: strategy, help: saves, broke: bugs | no | saves.json |
| `cloud.shared.code_length` | Letters and digits in a share code | 8 | no | saves.json |
| `messages.shared` | After posting a share | "Shared. Your topic is on the community." | no | saves.json |
| `messages.no_shared_save` | A code that names no shared save | "There is no shared save with this code." | no | saves.json |
| `purchases.product_id` | The full game's product on the App Store and Google Play (SAVE-170) | `full_game` | no | saves.json |
| `purchases.stores` | The stores that sell the full game, each unlocking only itself (SAVE-170) | steam, apple, google | no | saves.json |
| `purchases.steam_recheck_hours` | How old the Steam check may be before it runs again (SAVE-173) | 24 (design: at most daily) | no | saves.json |
| `purchases.messages` | The Unlock card's results (SAVE-183) and the server's refusals (SAVE-171, SAVE-178) | see saves.json | no | saves.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| time-and-turns | upstream | Conformist | Deterministic `processTurn`, `Rng` state, turn number and date, `Order` values, the turn boundary |
| game-shell | downstream | Customer–Supplier | Continue target and label, Load list (campaigns, saves, devices), Save slots, toasts and messages, lifecycle events (background, resume, quit), unlock screen on locked saves, ironman split prompt; whether the full game is unlocked on this store (`FullGameUnlocked` / `FullGameLocked`) for the ribbon, the Unlock card and the realm picker |
| settings | partnership | Partnership | Autosave interval and count values, Cloud saves row, Wi-Fi only, account sign-in; personal settings ride the same account sync and store backups |
| achievements | downstream | Customer–Supplier | `ironman` flag, modified mark and the header flags `ironman_unbroken`, `cheat_marked`, `switched_country`, `began_as_tutorial` (X-16, D-SAVE-1); lifetime counters and the demo list live in the player profile |
| onboarding | downstream | Customer–Supplier | Tutorial progress and Needs attention mutes live in the player profile and sync with it, not in the save (X-16, D-SAVE-1); chapter saves shipped read-only; the `began_as_tutorial` flag |
| scenario-setup | upstream | Customer–Supplier | Campaign options, ironman choice and player nation at new game |
| world-map | upstream | Conformist | `mapHash`, province ids, the rename table from `tools/mapgen` |
| events | upstream | Conformist | Events fired, flags, pending choices and cooldowns (the `events` chunk) |
| every system context (province, realm, warfare, diplomacy, …) | upstream | Published Language | Each owns a chunk with its own version and migrations |

Changes the saves design asks of other documents (§9), and whether they were taken in:
- Screen flow: Continue (adopted), Save and Load in the pause menu (adopted), Load screen: campaigns first with S6's marks on each save (D-SAVE-4), ironman on new game (adopted).
- Settings: autosave options (adopted, settings §5.3), Cloud saves row (adopted, settings §5.7).
- Store and unlock screens: locked save leads to unlock screen (no design yet).
- Steam platform plan, Android release plan, iOS release plan, privacy, server, performance targets: no designs yet, except performance.md, which should list the save budgets; saves.json is their source (D-SAVE-11).
- Engine: `endTurn` returning the Resume save, `load`, `save`, migration list — not in today's code (`protocol.ts` has only `newGame` without options and `endTurn`); a request to the engine build (D-SAVE-10).

Changes other designs ask of saves, and whether they were taken in:
- Settings §8: personal settings ride the account sync and store backups; Auto-Cloud adds `settings-personal.json` — adopted: `settings-personal.json` is in the synced set (D-SAVE-6).
- Tutorial §12: tutorial progress and Attention mutes stored apart and synced; chapter saves read-only; tutorial save turned into a campaign save marked "began as the tutorial" — adopted: progress and mutes live in the player profile, chapter saves are read-only, `began_as_tutorial` is a header flag (D-SAVE-6, D-SAVE-1).
- Achievements: the save flags (adopted, D-SAVE-1); demo profile carry-over lives in the player profile.
- Screen flow: a save just before the turn runs, and on backgrounding "autosave if anything changed" — mapped to the Resume save plus the journal; X1's "Restore the last autosave" restores the Resume save (D-SAVE-3).

## 12. AI

None. AI countries' state is saved like any other (later an `ai` chunk); no AI decision touches saving.

## 13. Decisions and open questions

- **D-SAVE-1** (was OQ-SAVE-1) Achievement flags: X-16 decides it. The header gains `ironman_unbroken`, `cheat_marked`, `switched_country` and `began_as_tutorial`; tutorial progress, Needs attention mutes and lifetime counters live in the player profile and sync with it, never in the save; tutorial chapter saves are read-only.
- **D-SAVE-2** (was OQ-SAVE-2) Backgrounding writes only the orders journal; pause, quit and suspend from a menu write the Resume save (and the ironman save). The journal fits in the seconds the OS gives.
- **D-SAVE-3** (was OQ-SAVE-3) Screen flow's "autosave before the turn" is the Resume save plus the journal; "Restore the last autosave" on X1 restores the Resume save, or the newest rotating autosave if the Resume save is damaged. One mapping, no new save kind.
- **D-SAVE-4** (was OQ-SAVE-4) Load screen: campaigns first, then each campaign's saves newest first (SAVE-013), and every save carries screen flow S6's marks: autosave, ironman and the device it came from. The saves design owns the list and grouping keeps one campaign's saves together; screen flow's marks fit inside it.
- OQ-SAVE-5 (release task) The server quota (300 saves / 200 MB) is set once real sizes are measured, and which social sign-ins ship at launch is a store decision.
- **D-SAVE-6** (was OQ-SAVE-6) Tutorial progress and mutes live in the player profile (X-16); personal settings sync as one more file, `settings-personal.json`, in the account's synced set with the same rules as a save. No new endpoint.
- **D-SAVE-7** (was OQ-SAVE-7) Cheats: the game ships no cheats or console; `cheat_marked` is the existing "modified" mark (a save edited outside the game or written by a debug build). No new mechanic.
- **D-SAVE-8** (was OQ-SAVE-8) Header options hold every campaign rule from the new-game screen: difficulty, events, end date, AI temper, fog of war and the music-era rule. One place for all of them.
- **D-SAVE-9** (was OQ-SAVE-9) "Every 6 months" writes in January and July (in the turns in which they begin, X-18); an ironman campaign writes no rotating autosaves, only its ironman save. Simplest fixed months.
- **D-SAVE-10** (was OQ-SAVE-10) A choice made at a before-the-battle stop (X-1) is appended to the orders journal with its day, so a replay reaches the same result; the engine protocol's `save`, `load`, `newGame` and the Resume save in `endTurn` are a request to the engine build. Replays stay deterministic.
- **D-SAVE-11** (was OQ-SAVE-11) The save budgets live in saves.json and performance.md should list them (a request to that document). The config is the source.
- **D-SAVE-12** (was OQ-SAVE-12) The desktop quit wait of 2 s lives in saves.json as `desktop_quit_wait_seconds` (provisional). Numbers belong in config.
- **D-SAVE-13** (was OQ-SAVE-13) The header's `tier` holds the nation, whether it needs the full game, and the app that wrote it (`free`, `demo` or `full`), and no list of limits; the full game opens a demo or free save with no limits at all. What the demo limits are is a store decision, not a save-format one.
- **D-SAVE-14** (was OQ-SAVE-14) "Send a report" sits on the failure screen X1 only, as screen flow says. Latest design wins.
- **D-SAVE-15** (was OQ-SAVE-15) Importing an ironman save needs a connection: offline, the import is refused with "Connect to import an ironman save", so the head check always runs. It closes the split with no new state.
- **D-SAVE-16** (was OQ-SAVE-16) Every way out of an ironman campaign is an exit: "Save and quit", "Exit to main menu" and the app being closed write the ironman save; a kill mid-turn resumes from the Resume save and journal like any campaign. One rule for all exits.
- **D-SAVE-17** The Load card lists each campaign's Resume save as its first line, "Where you left off", although SAVE-013 keeps Resume saves out of Load: with several campaigns and no manual saves, Continue alone reaches only the newest, and the player would have no way back to the others. One line per campaign, so the list stays short (X-19).
- **D-SAVE-18** (Leroy, 19 Oct) Store sign-ins at launch, replacing "email and password only" in SAVE-059: on a Steam Deck or a phone a password is the step most players skip, and Steam sign-in on the phone links a Steam account to the phone with no email. One account gathers several sign-ins (SAVE-112), and purchases stay per store (SAVE-072, decided again on 19 Oct). Source: `accounts/accounts-design.md`.
- **D-SAVE-19** (accounts-design §7, X-19) After Post to the community, the Share sheet itself turns into the result ("Shared. Your topic is on the community." with Copy link, Share link and Open the topic) instead of a toast with buttons: the game's toasts go after two seconds, too soon for a thumb on a phone held sideways, and the sheet is where the player's eyes already are. Until app links exist (SAVE-137), the website's Play this save opens the web game (`PLAY_URL?shared=<code>`), and Open a shared save on the Load card takes the code in any build.
- **D-SAVE-20** The server answers the share with the code, not the bytes back, and makes the post itself, so a share is one call; the file travels base64 in the JSON body with the title and note, inside the 2 MB cap (SAVE-068). The shared copy's header has an empty `device`; the copy a player opens names their own device. Simplest single request.
- **D-SAVE-21** (accounts-design §9, step 4) Steam on the desktop: the app id comes from `--steam-app-id`, the build's `PH_STEAM_APP_ID` or Steam's own `SteamAppId`, never from a constant in the code, so a build without either is the plain desktop game; Valve's test app 480 (Spacewar) is used only by `pnpm --filter @ph/desktop steam` for trying it out. Auto-Cloud takes every `.phsave` file in the save folder (SAVE-145), not only the synced set of SAVE-073: the files on disk are already bounded by the kept counts (2 Resume, 3 autosaves per campaign, 100 manual), an Auto-Cloud pattern cannot tell the kinds apart without a second folder, and the extra files are the older autosaves and the backup Resume save, which are harmless on the other computer. The orders journal is not a `.phsave` file, so it stays local. Simpler rule (DECISIONS rule 2).
- **D-SAVE-22** (accounts-design §4, §8, §11 step 5) Phones and the web: (1) the game hands Apple and Google the SHA-256 of its nonce and sends the server the nonce itself, for both stores, so one rule checks both tokens and a token copied on its own cannot be used without the nonce; (2) the game asks `POST /api/sessions/steam-openid` for Steam's address instead of opening a bare `/auth/steam/start`, so "Steam sign-in is not available." shows on the card as SAVE-118 does instead of on a browser error page; (3) the one-time code is a row the server marks used in one update, so two exchanges of the same code cannot both win, and the row keeps Steam's response nonce so the same answer is never taken twice; (4) the tokens are checked with PHP's own OpenSSL against the stores' key sets, with no new library; (5) on phones the bridge starts the stores through small Capacitor plugins (`SocialLogin` for Sign in with Apple on iOS and Google's Credential Manager on Android, since the community Apple plugin does not build with Capacitor 8's Swift packages; `Browser` and `App` for the browser sheet and the return link), shown only when the build has them, and on the web through Apple's and Google's own sign-in scripts, shown only when the build names its Apple Services ID and Google client id. Revoking the Apple token on account deletion (accounts-design §8) comes with Delete account. Fewest moving parts that keep each check on the server.

- **D-SAVE-23** (accounts-design §6, §8, §11 step 6) Purchases. The design's `purchase` table is kept as one **entitlement per account and store**: a player buys the full game once per store, so a second purchase on the same store after a refund takes the place of the first (its reference changes) instead of adding a row; the store reference stays unique, so one purchase is never claimed by two accounts. Steam ownership is checked when the game asks for the Steam entitlement (at most daily) rather than inside sign-in and token refresh, so sign-in stays as it is and the answer is the same. On Steam the server never locks the running paid app, because Steam itself keeps the licence and a refunded app does not start. The Pub/Sub push is checked with a secret token in the push URL, which Google's push subscriptions support, rather than Google's signed OIDC token, so the server fetches no Google keys; a notification never creates an entitlement the server cannot match to a purchase it holds. The App Store Server API confirmation (design §6) is left for later: the signed transaction's chain to Apple's root is Apple's own way to check it offline. Sandbox transactions are refused unless the server is set to accept them (`APPLE_ACCEPT_SANDBOX`), so a production server never unlocks a test purchase. Simplest rules that keep the design's guarantees (DECISIONS rule 2).

- **D-SAVE-24** (accounts-design §5, §8, §11 step 7) Combining accounts. (1) The account the player is in stays, as the design says, keeping its id and display name, so the device doing it never signs in again. (2) The proof is the sign-in the player just passed: the refusal carries a combine token, an HMAC with the server's secret over both account ids and its expiry (10 minutes, provisional), so no new table is needed and a token is useless to anyone else; replaying it after the merge finds nothing to combine. (3) Two sign-ins of one store (or two emails) refuse the merge instead of dropping one: dropping would leave a way in that opens a new, empty account, and an account holds one per store everywhere else; removing a sign-in (SAVE-193) is the way out. (4) The quota never blocks combining: the design promises "All saves are kept" and INV-SAVE-14 says the server never drops a save, so the account is combined and the usual full-account refusal applies. (5) The same save id on both is the same file; the live copy wins, so combining never loses a save. Ironman: the newer head stays, and the existing one-line rule (SAVE-089) settles the rest. (6) Entitlements: the one that unlocks wins; per store either unlocks the same full game. (7) Devices move rather than sign out, as the design says; each moved device is marked so its next `GET /api/saves` starts the change log over with `reset`, and moved saves get new change entries above every cursor. The bytes are copied to the staying account's keys before the transaction commits and the old keys removed after it, so a failure leaves the other account whole. (8) The endpoints are the design's `POST /api/account/merge`, and `DELETE /api/account/sign-ins/{provider}` in place of `/identities/{id}`: sign-ins are already one per store and email is not an identity row. (9) The card has no "Add email" yet, so combining through an email sign-in works on the server only. Simplest rules that keep every save (DECISIONS rule 2).

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| SAVE-001 | save-kinds-and-continue.feature | A save is always a turn boundary |
| SAVE-002 | resume-and-orders-journal.feature | Killed in the background, nothing lost |
| SAVE-003 | safe-writing.feature | Files are never changed |
| SAVE-003 | saving-by-hand.feature | Replacing writes a new file first |
| SAVE-004 | save-file-format.feature | Identical bytes on every platform |
| SAVE-004 | save-file-format.feature | A save made on Steam opens on a phone |
| SAVE-005 | migrations.feature | Migrations run in order |
| SAVE-005 | migrations.feature | Test saves gate every release |
| SAVE-006 | save-kinds-and-continue.feature | Only game state goes in a save |
| SAVE-007 | save-kinds-and-continue.feature | The Resume save follows every lifecycle point; Backgrounding writes only the orders journal |
| SAVE-008 | save-kinds-and-continue.feature | Autosaves rotate on the chosen interval |
| SAVE-009 | save-kinds-and-continue.feature | Manual saves have limits |
| SAVE-010 | ironman.feature | Ironman writes on every exit |
| SAVE-010 | save-kinds-and-continue.feature | Ironman save |
| SAVE-011 | save-kinds-and-continue.feature | Exported files leave the game; imported ones join Manual |
| SAVE-012 | save-kinds-and-continue.feature | One new game is one campaign |
| SAVE-013 | save-kinds-and-continue.feature | Load lists campaigns, then their saves |
| SAVE-014 | save-kinds-and-continue.feature | Continue opens the newest Resume or Ironman save |
| SAVE-015 | save-kinds-and-continue.feature | Autosaves rotate on the chosen interval |
| SAVE-015 | save-kinds-and-continue.feature | Autosave defaults |
| SAVE-016 | save-kinds-and-continue.feature | Off stops autosaves but never the Resume save |
| SAVE-017 | saving-by-hand.feature | Save opens the campaign's slots |
| SAVE-018 | saving-by-hand.feature | Default name needs no typing |
| SAVE-019 | saving-by-hand.feature | Replacing writes a new file first |
| SAVE-020 | saving-by-hand.feature | At the slot limit Save asks |
| SAVE-021 | saving-by-hand.feature | Deleting asks first |
| SAVE-022 | saving-by-hand.feature | A small toast |
| SAVE-023 | saving-by-hand.feature | No space |
| SAVE-024 | resume-and-orders-journal.feature | The Resume save is written in the worker |
| SAVE-025 | resume-and-orders-journal.feature | The journal holds the queued orders |
| SAVE-026 | resume-and-orders-journal.feature | When the journal is written |
| SAVE-027 | resume-and-orders-journal.feature | Killed in the background, nothing lost |
| SAVE-028 | resume-and-orders-journal.feature | A journal that doesn't match is ignored |
| SAVE-029 | resume-and-orders-journal.feature | Platform hooks write the journal |
| SAVE-030 | resume-and-orders-journal.feature | Backgrounded during a turn |
| SAVE-031 | resume-and-orders-journal.feature | Desktop quit waits for the write |
| SAVE-032 | safe-writing.feature | The write steps |
| SAVE-032 | safe-writing.feature | Killed during a write |
| SAVE-033 | safe-writing.feature | The newest two Resume saves are kept |
| SAVE-033 | safe-writing.feature | A damaged Resume save falls back |
| SAVE-034 | safe-writing.feature | Budgets |
| SAVE-035 | save-file-format.feature | File layout |
| SAVE-036 | save-file-format.feature | The Load list reads headers only |
| SAVE-037 | save-file-format.feature | Identical bytes on every platform |
| SAVE-038 | save-file-format.feature | Header fields |
| SAVE-039 | save-file-format.feature | worldHash is recomputed on load |
| SAVE-040 | save-file-format.feature | Each system owns a chunk |
| SAVE-040 | save-file-format.feature | A new system adds a chunk without touching others |
| SAVE-041 | save-file-format.feature | Each system owns a chunk |
| SAVE-042 | save-file-format.feature | Build data is never saved |
| SAVE-043 | save-file-format.feature | Typed arrays through the ids chunk |
| SAVE-044 | save-file-format.feature | Only a mid-turn Resume save carries orders |
| SAVE-045 | migrations.feature | Format version goes up with any layout change |
| SAVE-046 | migrations.feature | Migrations run in order |
| SAVE-047 | migrations.feature | Mapping step when the map changed |
| SAVE-047 | migrations.feature | Dropped nations |
| SAVE-048 | migrations.feature | Dropped nations |
| SAVE-049 | migrations.feature | A save from a newer version |
| SAVE-050 | migrations.feature | Test saves gate every release |
| SAVE-050 | migrations.feature | The changelog names format changes |
| SAVE-051 | migrations.feature | Balance patch mid-campaign |
| SAVE-052 | cloud-sync.feature | Cloud is optional and the game plays offline |
| SAVE-052 | cloud-sync.feature | Two devices that played offline keep both sets |
| SAVE-053 | cloud-sync.feature | Two devices that played offline keep both sets |
| SAVE-054 | cloud-sync.feature | Two lines of one campaign are not an error |
| SAVE-055 | cloud-sync.feature | What is synced |
| SAVE-056 | cloud-sync.feature | Deleting a campaign deletes it from the cloud |
| SAVE-057 | cloud-sync.feature | Signing in |
| SAVE-057 | cloud-sync.feature | Signing out another device |
| SAVE-058 | cloud-sync.feature | Password reset and account deletion |
| SAVE-059 | cloud-sync.feature | Sign-in options at launch |
| SAVE-059 | cloud-sync.feature | Google on iOS needs Apple too |
| SAVE-060 | cloud-sync.feature | Where sign-in sits |
| SAVE-061 | cloud-sync.feature | How the server stores a save |
| SAVE-062 | cloud-sync.feature | Tombstones and purge |
| SAVE-063 | cloud-sync.feature | Server calls |
| SAVE-063 | cloud-sync.feature | Uploads are write-once |
| SAVE-064 | cloud-sync.feature | When the game fetches changes |
| SAVE-065 | cloud-sync.feature | The upload queue |
| SAVE-066 | cloud-sync.feature | Backgrounding uploads nothing extra |
| SAVE-067 | cloud-sync.feature | Wi-Fi only |
| SAVE-068 | cloud-sync.feature | Server checks |
| SAVE-069 | cloud-sync.feature | Quota |
| SAVE-070 | cloud-sync.feature | Rate limits |
| SAVE-071 | cloud-sync.feature | Later, the server can check a save with the engine |
| SAVE-072 | cloud-sync.feature | Purchases stay in each store |
| SAVE-073 | backups-export-import.feature | Steam Auto-Cloud |
| SAVE-073 | backups-export-import.feature | Steam Cloud and our server share the folder without clashes |
| SAVE-074 | backups-export-import.feature | Android Auto Backup |
| SAVE-075 | backups-export-import.feature | iOS device backup |
| SAVE-076 | backups-export-import.feature | Web saves |
| SAVE-077 | backups-export-import.feature | No native cloud plugins |
| SAVE-078 | backups-export-import.feature | Export |
| SAVE-079 | backups-export-import.feature | Import |
| SAVE-079 | backups-export-import.feature | Imported saves face the nation lock |
| SAVE-080 | free-tier-saves.feature | One app on phones |
| SAVE-080 | free-tier-saves.feature | The header records the lock |
| SAVE-081 | backups-export-import.feature | Imported saves face the nation lock |
| SAVE-081 | free-tier-saves.feature | A locked nation's save shows the unlock screen |
| SAVE-082 | free-tier-saves.feature | Refunds keep saves |
| SAVE-083 | free-tier-saves.feature | Steam demo saves on the same computer |
| SAVE-084 | free-tier-saves.feature | Demo saves on another device |
| SAVE-085 | free-tier-saves.feature | The full game opens a demo save with no limits |
| SAVE-086 | ironman.feature | Ironman is chosen at the start and kept |
| SAVE-087 | ironman.feature | What ironman forbids |
| SAVE-088 | ironman.feature | Export and Import of an ironman save |
| SAVE-089 | ironman.feature | The ironman head check |
| SAVE-090 | ironman.feature | Two devices played one ironman campaign offline |
| SAVE-091 | ironman.feature | A damaged ironman save |
| SAVE-092 | integrity-and-testing.feature | Damage and edits are caught |
| SAVE-093 | integrity-and-testing.feature | Saves are not encrypted |
| SAVE-094 | integrity-and-testing.feature | A save that fails the hash check |
| SAVE-095 | integrity-and-testing.feature | A save that fails the hash check |
| SAVE-095 | integrity-and-testing.feature | Achievements can read the flags |
| SAVE-096 | integrity-and-testing.feature | A file cut short |
| SAVE-096 | safe-writing.feature | A damaged Resume save falls back |
| SAVE-097 | integrity-and-testing.feature | Send a report |
| SAVE-098 | integrity-and-testing.feature | Release tests |
| SAVE-099 | integrity-and-testing.feature | The engine worker reads and writes the bytes (todo: engine core protocol, D-SAVE-10) |
| SAVE-100 | save-kinds-and-continue.feature | Autosaves rotate on the chosen interval |
| SAVE-101 | save-kinds-and-continue.feature | Restore the last autosave |
| SAVE-102 | ironman.feature | An ironman save is not imported offline |
| SAVE-103 | resume-and-orders-journal.feature | A choice at a before-the-battle stop goes into the journal |
| SAVE-104 | cloud-sync.feature | Personal settings ride the account sync |
| SAVE-105 … SAVE-110 | — | Client screens; checked by apps/client/scripts/saves-shots.mjs |
| SAVE-111 | — | engine unit test `saves-start.test.ts` (the header names the start; a save from another start is refused); the client reopens in the save's start (main.ts `loadSave`) |
| SAVE-112 … SAVE-118 | sign-in.feature | Server sign-in; checked by `server/tests/Controller/SessionTest.php` |
| SAVE-061 … SAVE-070 | cloud-sync.feature | The server's side as well: `server/tests/Controller/SavesTest.php` (`App\Controller\SavesController`) |
| SAVE-119 … SAVE-123 | — | Client screens; checked by `apps/client/src/cloud/sync.test.ts` (the card) and `api.test.ts` (sign-in messages) |
| SAVE-124 … SAVE-131 | shared-saves.feature | Server: `server/tests/Controller/SharedSavesTest.php`; the copy (SAVE-128, SAVE-129) also by engine steps |
| SAVE-132 … SAVE-136 | shared-saves.feature | Client screens; checked by `apps/client/src/cloud/share.test.ts` (the sheet, the copy) and the website's `SharedSavesTest.php` (the save card) |
| SAVE-137 … SAVE-139 | shared-saves.feature | Not built yet: app links, the website's attachment and Workshop mods come later (todo) |
| SAVE-140 | steam-desktop.feature | Without Steam the desktop game plays as before |
| SAVE-140 | — | Also `apps/desktop/test/steam.test.mjs` (no app id, missing library, Steam not running) |
| SAVE-141 | steam-desktop.feature | The Steam build signs in by itself |
| SAVE-141 | steam-desktop.feature | A player who signed out is not signed in again |
| SAVE-141 | steam-desktop.feature | A silent sign-in that fails says nothing at launch |
| SAVE-141 | — | Also `apps/client/src/cloud/steam.test.ts` |
| SAVE-142 | steam-desktop.feature | A Steam Deck names itself |
| SAVE-143 | steam-desktop.feature | The device token on the desktop |
| SAVE-144 | steam-desktop.feature | Saves are files in the save folder |
| SAVE-144 | steam-desktop.feature | Saves kept in IndexedDB move into the folder once |
| SAVE-144 | — | Also `apps/desktop/test/saves.test.mjs` and `apps/client/src/saves/fileStore.test.ts` |
| SAVE-145 | steam-desktop.feature | The Auto-Cloud settings in the partner site |
| SAVE-146 … SAVE-148 | steam-desktop.feature | Client screens; checked by `apps/client/src/cloud/steam.test.ts` (the card) |
| SAVE-149 … SAVE-154 | store-sign-in.feature | Server: `server/tests/Controller/StoreSignInTest.php`, `server/tests/IdTokensTest.php` and `server/tests/SteamOpenIdTest.php` (local keys, mocked HTTP) |
| SAVE-155 … SAVE-157 | store-sign-in.feature | Client screens; checked by `apps/client/src/cloud/storeSignIn.test.ts` (the card, the bridge) |
| SAVE-170 | purchases.feature | A purchase unlocks only its own store |
| SAVE-171 | purchases.feature | One purchase, one account |
| SAVE-172 … SAVE-178 | purchases.feature | The server's side; checked by `server/tests/Controller/PurchasesTest.php`, `server/tests/Controller/StoreNotificationsTest.php` and `server/tests/Purchases/*Test.php`, every store call mocked and every key and certificate made in the test |
| SAVE-179 | purchases.feature | The game decides from its store and the server |
| SAVE-179 | purchases.feature | The store's proof goes up first |
| SAVE-180 | purchases.feature | Without a cloud server or a store bridge nothing changes |
| SAVE-181 | purchases.feature | A locked realm or save opens the Unlock card |
| SAVE-179 … SAVE-181 | — | Also `apps/client/src/cloud/purchases.test.ts` (the bridge, the decision, the card) |
| SAVE-182 … SAVE-185 | — | Client screens; checked by `apps/client/src/cloud/purchases.test.ts` (the Unlock card's lines, buttons and messages) |
| SAVE-186 | combine-accounts.feature | A sign-in of another account offers to combine |
| SAVE-186 | combine-accounts.feature | An email of another account offers to combine only with its password |
| SAVE-187 | combine-accounts.feature | Combining moves everything to the account the player is in |
| SAVE-187 | combine-accounts.feature | An old or altered offer combines nothing |
| SAVE-188 | combine-accounts.feature | Two sign-ins of one store are not combined |
| SAVE-189 | combine-accounts.feature | The same campaign on both accounts keeps every save |
| SAVE-189 | combine-accounts.feature | Two ironman heads for one campaign |
| SAVE-190 | combine-accounts.feature | Two purchases on one store |
| SAVE-191 | combine-accounts.feature | Combining over the quota keeps every save |
| SAVE-192 | combine-accounts.feature | The other account's devices learn of it on their next sync |
| SAVE-193 | combine-accounts.feature | Removing a sign-in, never the last |
| SAVE-186 … SAVE-193 | — | Also `server/tests/Controller/CombineAccountsTest.php` (Steam tickets and email, the bytes on disk, every conflict) |
| SAVE-194 … SAVE-197 | combine-accounts.feature | The card asks once what combining does |
| SAVE-194 … SAVE-197 | — | Client screens; checked by `apps/client/src/cloud/combine.test.ts` (the question, its buttons, Remove on the Sign-ins row) |
