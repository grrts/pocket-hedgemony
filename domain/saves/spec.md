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
- Free tier and full game: locked-nation saves, refunds, Steam demo carry-over.
- Ironman: one line per campaign, ironman-head check, the offline split conflict.
- Integrity: CRCs, `worldHash`, the "modified" mark; bug-report attachments; release tests; the engine
  worker's save and load requests.

Not in scope (owned by …):
- Where Continue, Load and Save sit in the flow, the Load screen's place → `game-shell`.
- The autosave and cloud-save rows on the Settings screen, and the settings files themselves → `settings`
  (this context defines the values the rows can take).
- Whether achievements need ironman, and the flags they read → `achievements`.
- The unlock screen shown for a locked nation → store and unlock screens (no design yet).
- The order of a month and the determinism of `processTurn` → `time-and-turns`.
- Each system's own state (diplomacy, religion …) → its context; here only that it gets its own chunk.
- What the privacy policy allows to be sent → privacy (no design yet).
- Performance budgets as hard limits → performance (these are targets for it to confirm).

## 2. Sources

Newest decision first.

1. `save-system/README.md`, second draft 2026-10-16, §8 Decisions (settled by Leroy on 16 Oct: Export and
   Import yes; cloud saves on our Symfony server with optional accounts; default autosave every 12 turns plus
   the Resume save every turn; cross-store cloud saves at launch, purchases stay per store), and all of §1–§7, §9.
2. `save-system/save-config.example.yaml` (the configuration the rules describe).
3. `planning/gap-lists.md` "Decisions already made" (campaign to 31 August 1939; business model: paid full
   game, Steam demo, free mobile download with in-app purchases), List 2 item 3, List 3 items 2, 3, 7, 9, 13, 14.
4. Read for seams only: `achievements/achievements-design.md` v1.1 (16 Oct: every achievement is ironman-only;
   flags `ironman_unbroken`, `cheat_marked`, `switched_country`), `settings/settings-design.md` v2 §4, §5.3,
   §5.7, `screen-flow/screen-flow-design.md` §3 S4, S6, §4.5, §4.6, §6, `tutorial/tutorial-design.md` §9, §12.
5. Today's code: `packages/engine/src/protocol.ts` (`newGame` with seed and player nation only; `endTurn`
   with `Order[]`), `hashWorld`, `createEngineHost`; the server can only register accounts (`POST /api/accounts`).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Campaign | One new game, with a random `campaignId`; saves are grouped by it | A save |
| Save | One write-once `.phsave` file holding the world at the start of a turn plus queued orders | A setting; tutorial progress |
| Resume save | The save written after every End turn and on pause, quit, suspend or backgrounding; what Continue opens; 1 per campaign plus a backup | Autosave |
| Autosave | A rotating save at the start of a turn on the player's interval, marked "Auto" | Resume save |
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

**UploadQueue** (one per device)
- INV-SAVE-16: The queue survives restarts and empties oldest first when online, retrying with back-off.

### Entities and value objects

- **SaveKind** (value): `resume`, `autosave`, `manual`, `ironman`, exported (outside the game).
- **Header** (value): `saveId`, `campaignId`, `kind`, `name`, `savedAt`, `device`, `platform`, `gameVersion`,
  `formatVersion`, `rulesHash`, `mapHash`, `turn`, `date {y, m}`, `playerNation`, `ironman`, `playSeconds`,
  `options {difficulty, events, endDate}`, `tier {nation, needsFullGame}`, `worldHash`, `thumbnail` (base64 PNG
  96 × 64), and a modified mark (§6.3).
- **Chunk** (value): id, version, offset, length, CRC-32, deflate bytes. Ids: `core`, `ids`, `provinces`,
  `nations`, `armies`, `events`, `history`, `orders`, later `diplomacy`, `subjects`, `religion`, `culture`,
  `government`, `trade`, `ai` ….
- **AutosaveOptions** (value): interval ∈ {every turn, every 6 turns, every 12 turns (each January), off};
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

- SAVE-007: When the player ends a turn, pauses, quits, or the app is suspended or backgrounded, the save system shall keep the campaign's Resume save current, keeping 1 per campaign plus the one before it as a backup, and shall not list it in Load. [save-system §2.1; config `kinds.resume`; see OQ-SAVE-2]
- SAVE-008: When a turn starts on the player's autosave interval, the save system shall write an autosave, keep the chosen number per campaign rotating out the oldest, and list them in Load marked "Auto". [save-system §2.1]
- SAVE-009: When the player taps Save, the save system shall write a manual save with the player's name for it, allowing up to 20 per campaign and 100 in total, listed in Load. [save-system §2.1; config `kinds.manual`]
- SAVE-010: While a campaign is ironman, the save system shall write its ironman save after every End turn and on every exit, keep 1 per campaign plus a backup, and list it in Load as the campaign itself. [save-system §2.1, §6.2]
- SAVE-011: When the player taps Export, the save system shall write an exported file that leaves the game, with no limit on how many; imported files shall join the Manual saves. [save-system §2.1, §5.4]
- SAVE-012: The save system shall group saves by campaign, one new game being one campaign with a random id. [save-system §2.1]
- SAVE-013: The Load screen shall list campaigns first, each with nation banner, nation name, in-game date, turn, play time and a small map crop, and opening a campaign shall list its saves newest first. [save-system §2.1]
- SAVE-014: Continue shall open the newest Resume or Ironman save across all campaigns, on this device or arrived from the cloud; if that save came from another device, the button shall say so ("Continue: Portugal, March 1512 (from Steam Deck)"). [save-system §2.2]
- SAVE-015: The save system shall offer the autosave interval values every turn, every 6 turns, every 12 turns (each January) and off, default every 12 turns, and the autosaves kept per campaign values 1, 3 and 5, default 3. [save-system §2.3, §8.3; config `kinds.autosave`]
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
- SAVE-031: When the player quits on desktop, the game shall wait for the write, up to 2 s. [save-system §3.2; placeholder]

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

### 5.8 Cloud saves

- SAVE-052: The save system shall run cloud saves on our own Symfony server, so one optional account carries a campaign across Steam, iPhone, iPad, Android and the web, and the game shall still play fully offline. [save-system §5, §8.2, §8.4]
- SAVE-053: The save system shall name every file `<campaignId>/<savedAt>-<saveId>.phsave`, so two devices that played offline end up with both sets, the Load screen shows them all marked with the device that made each, and Continue picks the newest. [save-system §5.1]
- SAVE-054: When two devices continue the same non-ironman campaign, the save system shall keep both lines of play as separate saves and treat it as no error. [save-system §5.1]
- SAVE-055: The save system shall sync all Manual saves, the latest Resume and Ironman save per campaign, and the newest autosave per campaign, and keep older autosaves, the backup Resume save and the orders journal local only. [save-system §5.1; config `cloud.synced`, `cloud.local_only`]
- SAVE-056: When the player deletes a campaign, the save system shall delete it from the cloud too. [save-system §5.1]
- SAVE-057: When the player signs in with email and password (`POST /api/sessions`), the server shall return a short-lived access token and a long-lived device token, kept in the platform's secure storage (Keychain on iOS, Keystore on Android, `safeStorage` in Electron); each device shall show in the account's device list and can be signed out from any other. [save-system §5.2]
- SAVE-058: The server shall offer password reset by email, and account deletion that also deletes every save. [save-system §5.2]
- SAVE-059: The save system shall launch with email and password sign-in only; Sign in with Apple, Google and a Steam session ticket come later, and if Google sign-in is offered on iOS, Sign in with Apple shall be offered too. [save-system §5.2, §8.7]
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

### 5.9 Store backups, Export and Import

- SAVE-073: Where the game runs on Steam, the save folder (`<Electron userData>/saves`) shall be covered by Steam Auto-Cloud with root overrides mapping the Windows, macOS and Linux paths to one cloud folder, a quota of 500 MB and 2,000 files for the synced set only, and Dynamic Cloud Sync on so a suspended Deck uploads its saves. [save-system §5.3; config `store_backups.steam`]
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
- SAVE-085: The save system shall store the demo's limits in the header, and the full game shall drop them on load. [save-system §6.1]

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
- SAVE-095: The header shall carry the `ironman` flag and the modified mark so the achievements context can check them. [save-system §6.3, §8.5; see OQ-SAVE-1]
- SAVE-096: If a save is damaged or cut short, then the save system shall reject it cleanly and open or offer the previous save ("This save is damaged. The previous save from Dec 1511 was opened instead."). [save-system §2.5, §3.3, §7]

### 5.13 Bug reports, tests and the engine

- SAVE-097: When the player chooses Send a report, the report shall attach the Resume save and the orders journal, and sending shall always be the player's choice under the privacy design. [save-system §7]
- SAVE-098: Before release, the save code shall pass: every save in `test/saves/` loads, migrates and plays a turn; save, load and save again gives byte-identical chunks and the same `worldHash`; a file cut short at any byte is rejected cleanly and the previous save offered; the app killed during a write leaves the old save intact (desktop and both phones); backgrounding, killing and relaunching on a real iPhone and Android phone resumes with the queued orders; two devices with cloud on, played offline and reconnected, show both lines of play, and for ironman the one prompt. [save-system §7]
- SAVE-099: The engine worker shall produce and read the save bytes (a `save` request returning file bytes, a `load` request that migrates, validates and returns a snapshot, `newGame` carrying the game options, and `endTurn` also returning the serialised Resume save); each platform's storage layer shall only store and list them, and the sync queue shall upload them. [save-system §9 Engine]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| WriteResumeSave | system (after End turn, pause, quit, suspend) | Campaign loaded; not mid-turn | New Resume save; older beyond backup removed | `SaveWritten(resume)` |
| WriteAutosave | system (turn start on interval) | Interval not off; not ironman | New autosave; oldest beyond keep removed | `SaveWritten(autosave)` |
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

## 8. Policies (reactions to other contexts)

- When `game-shell` reports End turn pressed (`EndTurnPressed`), write the Resume or Ironman save for the new turn when the turn completes, and the autosave at turn start on the interval.
- When `game-shell` reports `AppBackgrounded`, write the orders journal (and nothing new if a turn is running).
- When `game-shell` reports `CampaignStarted`, create the campaign with a random id, its options and ironman flag.
- When `settings` changes the autosave interval or the number kept, apply it from the next autosave.
- When `settings` changes "Sync on Wi-Fi only" or Cloud saves on/off, adjust syncing.
- When the store reports a purchase, refund or revoke, update which saves need the full game (saves stay).
- When `game-shell` reports `PlayedOnAsAnotherRealm`, record it in the campaign (achievements needs a `switched_country` flag; OQ-SAVE-1).

## 9. Monthly turn

Per turn:
1. At turn start, if the interval says so (and not ironman): write an autosave.
2. During orders: keep the orders journal; write it on lifecycle events and every 30 s while orders change.
3. Pre-turn: the current Resume save plus journal describe the world before the turn (used if the app dies mid-turn).
4. After the turn: the worker writes the Resume (or Ironman) save for the new turn; the journal is cleared for the new turn; the upload is queued.
Depends on: `time-and-turns` finishing the month deterministically (`processTurn` with a seeded `Rng`).

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
| `kinds.autosave.interval_turns` | Autosave interval | 12 | default (decided) | save-config.yaml |
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
| (none) | Desktop quit wait | 2 s | yes | not in config file (OQ-SAVE-12) |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| time-and-turns | upstream | Conformist | Deterministic `processTurn`, `Rng` state, turn number and date, `Order` values, the turn boundary |
| game-shell | downstream | Customer–Supplier | Continue target and label, Load list (campaigns, saves, devices), Save slots, toasts and messages, lifecycle events (background, resume, quit), unlock screen on locked saves, ironman split prompt |
| settings | partnership | Partnership | Autosave interval and count values, Cloud saves row, Wi-Fi only, account sign-in; personal settings ride the same account sync and store backups |
| achievements | downstream | Customer–Supplier | `ironman` flag, modified mark; achievements asks for `ironman_unbroken`, `cheat_marked`, `switched_country`; demo profile carry-over |
| onboarding | downstream | Customer–Supplier | Tutorial progress and Attention mutes stored apart from saves and synced; chapter saves shipped read-only; "began as the tutorial" mark |
| scenario-setup | upstream | Customer–Supplier | Campaign options, ironman choice and player nation at new game |
| world-map | upstream | Conformist | `mapHash`, province ids, the rename table from `tools/mapgen` |
| events | upstream | Conformist | Events fired, flags, pending choices and cooldowns (the `events` chunk) |
| every system context (province, realm, warfare, diplomacy, …) | upstream | Published Language | Each owns a chunk with its own version and migrations |

Changes the saves design asks of other documents (§9), and whether they were taken in:
- Screen flow: Continue (adopted), Save and Load in the pause menu (adopted), Load screen grouped by campaign (not adopted, OQ-SAVE-4), ironman on new game (adopted).
- Settings: autosave options (adopted, settings §5.3), Cloud saves row (adopted, settings §5.7).
- Store and unlock screens: locked save leads to unlock screen (no design yet).
- Steam platform plan, Android release plan, iOS release plan, privacy, server, performance targets: no designs yet, except performance.md, which does not list the save budgets (OQ-SAVE-11).
- Engine: `endTurn` returning the Resume save, `load`, `save`, migration list — not in today's code (`protocol.ts` has only `newGame` without options and `endTurn`) (OQ-SAVE-10).

Changes other designs ask of saves, and whether they were taken in:
- Settings §8: personal settings ride the account sync and store backups; Auto-Cloud adds `settings-personal.json` — not in the saves design (OQ-SAVE-6).
- Tutorial §12: tutorial progress and Attention mutes stored apart and synced; chapter saves read-only; tutorial save turned into a campaign save marked "began as the tutorial" — not in the saves design (OQ-SAVE-6, OQ-SAVE-1).
- Achievements: three save flags; demo profile carry-over — not in the saves design (OQ-SAVE-1).
- Screen flow: a save just before the turn runs, and on backgrounding "autosave if anything changed" (OQ-SAVE-3).

## 12. AI

None. AI countries' state is saved like any other (later an `ai` chunk); no AI decision touches saving.

## 13. Open questions and contradictions

- OQ-SAVE-1: **Achievement flags.** Achievements v1.1 (16 Oct) makes every achievement ironman-only and asks for three save flags (`ironman_unbroken`, `cheat_marked`, `switched_country`); this supersedes the saves design's recommendation ("no"). The header only has `ironman` and a "modified" mark. The tutorial also asks for a "began as the tutorial" mark. Blocks SAVE-038, SAVE-095.
- OQ-SAVE-2: **What is written on backgrounding.** §2.1 and the config write the Resume save (and ironman save) on pause, quit, suspend and background; §3.1 and §5.2 say that on backgrounding only the orders journal is written, because serialising the whole world might not fit in the seconds the OS gives. Both can't be the rule for a mid-turn background.
- OQ-SAVE-3: **Screen flow's "autosave".** Screen flow says an autosave is taken just before the turn runs (G5), on backgrounding "if anything changed" (R1), and X1 offers "Restore the last autosave". In this design autosaves are only the rotating interval saves; the pre-turn state is the Resume save plus journal. The wording needs one mapping.
- OQ-SAVE-4: **Load screen.** Saves: campaigns first, then their saves, each marked with device. Screen flow S6: a flat list of saves newest first with an autosave or ironman mark. Not reconciled.
- OQ-SAVE-5: **Server quota and social sign-in.** 300 saves / 200 MB is a starting point to set once real sizes are measured (§8.6); Sign in with Apple, Google and Steam at launch or after (§8.7).
- OQ-SAVE-6: **Settings and tutorial progress storage.** Settings §4.2 says personal settings sync through the same account and store backups and that Steam Auto-Cloud covers `settings-personal.json`; tutorial §9/§12 asks saves to store tutorial progress and Attention mutes apart from saves and sync them. The saves design has no endpoint, file or synced-set entry for either (principle 6 only says they "live elsewhere").
- OQ-SAVE-7: **Cheats.** Ironman forbids "console or debug tools"; achievements mention "turning on a cheat" and a `cheat_marked` flag. No design says what cheats or a console exist outside ironman.
- OQ-SAVE-8: **Header options.** The header's `options` has difficulty, events and end date; the campaign rules (settings §4.3, screen flow S5) also include AI aggression / AI temper, fog of war and possibly the music-era rule. Not said where those are saved.
- OQ-SAVE-9: **Autosave timing.** "Every 12 turns (each January)" fixes the month; for "every 6 turns" the months are not said. Whether an autosave is written in an ironman campaign is implied (settings hide the rows) but not stated by the saves design.
- OQ-SAVE-10: **Mid-turn choices and the engine protocol.** Screen flow now stops the month at each player battle, where standing orders can be changed for that battle; the journal holds only orders queued before End turn, so after a kill the replay to the battle is deterministic but choices made at earlier stops in the same month are not recorded. Today's `protocol.ts` also lacks `save`, `load`, `newGame` options and the Resume save in the `endTurn` reply.
- OQ-SAVE-11: **Budgets not taken in.** `performance/performance.md` does not list the save budgets of §3.4.
- OQ-SAVE-12: **Desktop quit wait (2 s)** is a number in the design but not in the config file.
- OQ-SAVE-13: **Steam demo limits.** What limits the demo has (List 3, item 2) and how the header stores them are not designed; the free mobile tier's free nations (the Ottomans and France) are decided.
- OQ-SAVE-14: **"Send a report" location.** Saves §7 puts it in the pause menu; screen flow puts it only on the failure screen X1.
- OQ-SAVE-15: **Import of an ironman save while offline.** "Import starts it on this device" but the ironman-head check only runs on upload; an import offline followed by play on the old device recreates the split. The design only covers the split prompt.
- OQ-SAVE-16: **Ironman exits.** Ironman saves are written "on every exit"; the game menu's "Save and quit" (screen flow) is the only manual path. Whether "Exit to main menu" in ironman and the app being killed mid-turn count as exits is implied, not stated.

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
| SAVE-007 | save-kinds-and-continue.feature | The Resume save follows every lifecycle point |
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
| SAVE-085 | free-tier-saves.feature | Demo limits are dropped by the full game |
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
| SAVE-099 | integrity-and-testing.feature | The engine worker reads and writes the bytes |
