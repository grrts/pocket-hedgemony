# Achievements

Achievements are goals you can earn across your campaigns: a first harvest, a castle taken by terms, a century without a broken oath, Constantinople held past 1460, Moscow free of the khan after Kulikovo. There are 80 at launch, the same list on Steam, Game Center and Google Play Games. They are earned only in ironman campaigns, and they never give anything inside the game: no bonus, no unlocked nation, no cosmetic.

## How it works

### Fair and our own

- **One list everywhere.** Steam, Game Center and Google Play Games share the same achievements.
- **Our own goals.** Every achievement is written for Pocket Hegemony's own systems; no name, condition or icon is taken from another commercial game.
- **Situations, not countries.** A test describes a situation. Where a historical event is involved, it uses the event's role, so whoever holds that role can earn it. Only *One Island Realm* and *Lord of the River Bend* name a region.
- **Nothing for harm.** No achievement is tied to a narrative-only event, to conquering a named people, or to sacking or scorching land.
- **Grounded.** Every test reads a stat or a moment that an existing design defines; where the system is not designed yet, the row points at the gap list.
- **No luck-only goals.** Each goal can be planned for.

### Tiers and points

| Tier | Points | Meant for | At launch |
|---|---|---|---|
| Copper | 5 | One action, or a goal most players reach in their first campaign | 40 |
| Silver | 10 | A goal you aim for | 25 |
| Gold | 20 | A whole campaign shaped around it | 12 |
| Crown | 40 | The hardest | 3 |

Points show on Game Center and Google Play, not Steam. The list holds at most 100 achievements, ever, counting retired ones. Every achievement's points are a multiple of 5 and at most 40, and the total is at most 1,000. Launch ships 80 achievements worth 810 points, keeping 20 slots and 190 points for updates; after any update at least 10 slots and 100 points stay in reserve, and spare points should go mostly to new copper and silver goals. If a score or victory is added to the game, it gets its own achievements from the reserve. Names are at most 24 characters and texts at most 100.

These limits are the strictest of the three stores:

| Limit | Steam | Game Center | Google Play Games | Adopted |
|---|---|---|---|---|
| Number | 100 until Valve's confidence check | 100 | 200 to 400 | 100 at most, ever |
| Points | none | max 100 each, 1,000 total | multiples of 5, 5 to 200 each, 1,000 total (newer docs 2,000) | multiples of 5, max 40, 1,000 total |
| Hidden | yes | yes | yes | yes, spoilers only |
| Progress | stats at set steps | percent | incremental, up to 10,000 steps | one game counter, reported each store's way |
| Icon | 64 × 64 | 512 or 1024 | 512 | 32 × 32 pixel art, scaled by whole numbers |

### Scope and hidden achievements

Most achievements are **campaign** scope: the whole condition must be met inside one game. Seven are **lifetime**: their counter adds up across games in your player profile and is mirrored to the store's progress where it has one. There is no hidden achievement at launch; `hidden` is kept for later event chains whose very existence is the surprise. A hidden achievement shows as "Hidden achievement" with its tier, its name and text secret until earned.

Some achievements are **levels of a ladder**: one count at rising steps. The harvest ladder counts province harvests (each of your provinces that brings in its harvest adds one) across all your campaigns: *First Harvest* at 1, then *Ten Harvests*, *A Hundred Harvests*, *A Thousand Harvests* and *Ten Thousand Harvests*. Each level is its own achievement with its own points, as the stores have no levels, but the game shows the ladder as one badge marked with the level reached, such as 3/5.

### When tests run

Each achievement names a **moment**, and when that moment occurs only the tests of rows naming it run. A `date` row is checked once, on that day, and never for a day on or before the day your campaign started. Tests run after the turn's own systems, at the very end of the turn order, so they read final values. If the test does not hold when its moment comes, the achievement stays locked.

The moments are: turn end, year end, harvest, spring start, a date, battle end, sea battle end, siege end, war end, rebellion end, relation changed, province gained, invention done, regiment trained, lord created, charter granted, loan closed, style adopted, colony founded, contact made, fleet home, food policy changed, event choice, event end, 12 months after a succession, and campaign end.

### Which games count

A campaign earns achievements only while all three hold:

| Save flag | Must be |
|---|---|
| `ironman_unbroken` | true: the campaign started as ironman and never left it |
| `cheat_marked` | false: no debug, editor or "free play" cheat was used, even once |
| `switched_country` | false: you still play the realm you started with |

A campaign that is not ironman earns nothing, for good. A cheat marks the save for good, and nothing from it is awarded, in-game or on any store. Playing on as another country after game over stops achievements from that moment. Any difficulty counts, with historical or free events. The tutorial earns none, and its last card tells you achievements start in a real campaign. Lifetime counters only count campaigns that pass all three flags. The pause menu and the new game screen show whether the campaign can earn achievements, and you are warned once before an action that would end eligibility (turning on a cheat, switching country after game over).

### Progress bars

18 rows have a progress bar: a game counter reported to each store against its target.

| Store | How progress is reported |
|---|---|
| Google Play | An incremental achievement; targets above 10,000 are reported in steps (people in tens of thousands, gold in tens) |
| Game Center | Percent complete |
| Steam | A stat bound to the achievement, with a progress popup at 25, 50 and 75 percent |

Campaign counters reset with each new game, and progress goes to a store only when it beats the best value already reported there, so a store's progress never goes down. The in-game list shows this campaign's own value.

### Offline and failed calls

An unlock is written to your profile and shown in-game at once, whether or not a store is reachable. Unlocks that have not reached a store wait in a queue, sent whenever the store is reachable and retried at start-up and every few minutes. On start-up the game reads the store's list and sends anything it is missing, so a new phone or a reinstall catches up.

### Free tier and Steam demo

The free iOS and Android download awards achievements as the full game does, and you keep them when you buy. A row marked full game cannot be earned with the free tier's countries alone; the free countries are the Ottomans and France, so at launch these are *Our Own Banner*, *Free of the Khan*, *Blackbird Field*, *The Walls Held*, *The Conqueror's Heirs*, *The Four Quarters Hold*, *From One Hall*, *Many Tents, One People*, *Many Crowns* and *Crowns of the World*. The Steam demo awards nothing to Steam directly; it keeps a local list from its ironman games, and when you buy the full game it reads the demo's profile and awards what you earned there.

### Store ids and retiring

An achievement's `id` is never renamed after release, and every store id comes from it: Steam uses `ACH_` plus the id in capitals; Game Center uses the bundle id plus `.ach.` plus the id; Google Play's console-generated ids are kept in `achievements.google.json`. A build step writes each store's upload file (Steam's VDF or web form, App Store Connect's list, Google's CSV) from the YAML, with localised names and texts. A retired achievement is hidden in every store and its test turned off, but never deleted, so you keep what you earned.

### Icons

Each achievement has one 32 × 32 icon in the game's pixel-art palette, with a 2-pixel frame in its tier's colour (copper, silver, gold, crown purple-gold). Icons are scaled with nearest-neighbour and no smoothing: × 2 for Steam (64) and × 16 for Game Center and Google Play (512). Steam's locked image uses the grey "unknown land" parchment tones of the map's fog. Each icon shows what the achievement is about, never a real flag or coat of arms.

### The 80 achievements

All thresholds are provisional placeholders for balancing. Every campaign starts on 20 September 1378 ([The 1378 start](The-1378-Start)); the dates below are calendar days, so they read the same from any start, and the start facts (one province, a decentralised people, starting as a subject, starting outside Europe) are taken on the day your campaign begins.

**First steps** (8, 40 points)

| Name | Tier | Earned when |
|---|---|---|
| First Harvest | copper | You see your first harvest |
| Set the Table | copper | You change your food policy |
| Mustered | copper | You train your first regiment |
| Ink and Candle | copper | You finish your first invention |
| Stone upon Stone | copper | You gain your first castle (built, or taken in a siege) |
| A Letter Sealed | copper | You form an alliance |
| Ink on the Treaty | copper | A war ends with a peace treaty you signed |
| A Year in the Ledger | copper | You have played 12 months |

**Realm** (12, 130 points)

| Name | Tier | Earned when |
|---|---|---|
| Full Granaries | silver | With at least 10 provinces, 60 months with no hungry province (progress) |
| Famine Relief | copper | You release famine relief to a province and nobody there dies of famine that year |
| Seven Fat Years | copper | Your capital has a good harvest or better 7 years in a row (progress) |
| Clean Books | copper | You repay a loan of at least 1,000 |
| Counting House | silver | You hold 10,000 gold (progress) |
| Many Hearths | silver | Your realm has 10 million people (progress) |
| Where Roads Meet | copper | You own a trade hub |
| Long Reach | copper | Any castle reaches 3 rings |
| Ten Harvests | copper | Bring in 10 province harvests across your campaigns (lifetime; harvest ladder level 2) |
| A Hundred Harvests | silver | 100 province harvests (lifetime; level 3) |
| A Thousand Harvests | gold | 1,000 province harvests (lifetime; level 4) |
| Ten Thousand Harvests | crown | 10,000 province harvests (lifetime; level 5) |

**Lords and rule** (6, 35 points)

| Name | Tier | Earned when |
|---|---|---|
| Raised Up | copper | You create a lord |
| Not One Waverer | silver | You have at least 10 lords and none Wavering or Disloyal |
| A Clerk in Every Town | copper | 30 royal provinces have an official (progress) |
| Chartered Towns | copper | 5 charters are in force (progress) |
| Long Live the Ruler | copper | A ruler reigns 40 years |
| The Crown Passes | copper | No new rebellion in the 12 months after a succession |

**Learning** (7, 85 points)

| Name | Tier | Earned when |
|---|---|---|
| Halls of Learning | copper | You have 5 schools |
| A Hundred Pens | copper | You have 100 scholars (progress) |
| Quiet Years | silver | 10 inventions since your last war (progress) |
| First in the World | silver | You are first in the world to an invention of era III or later |
| Age of Reason's Tools | copper | You finish an era IV invention |
| Steam and Wire | silver | You finish an era VI invention |
| The Whole Tree | crown | You know every invention in scope (progress) |

**War** (8, 65 points)

| Name | Tier | Earned when |
|---|---|---|
| Fewer, Better | silver | You win a battle outnumbered two to one |
| Open the Gates | copper | A siege ends by terms |
| Over the Walls | copper | A siege ends by storm |
| A Purse at the Gate | copper | A castle is bought |
| Wintered Well | copper | An army of 10,000 or more in winter quarters loses at most 5 % over the winter |
| The Marshal | copper | A Marshal wins a battle for you |
| A New Way of War | silver | You adopt a commander style |
| Not One Field | gold | You win a defensive war against an enemy with twice your people, losing no province |

**Sea and the wider world** (6, 55 points)

| Name | Tier | Earned when |
|---|---|---|
| Master of the Swell | copper | You win a sea battle |
| Merchant Fleet | silver | You have 100 trade ships (progress) |
| Beyond the Horizon | copper | A fleet crosses an ocean and comes home |
| Strangers on the Shore | copper | You make contact by sea with another macro-region |
| Treaty on the Shore | silver | You found a colony with the consent of the local people |
| All the Way Round | gold | A fleet sails round the world and comes home |

**Order** (3, 35 points)

| Name | Tier | Earned when |
|---|---|---|
| Heard Them Out | copper | A rebellion ends because you granted its demand |
| The Realm Holds | silver | You beat a great revolt |
| A Quiet Land | gold | With at least 20 provinces, 300 months with no unrest tier (progress) |

**Abroad** (5, 45 points)

| Name | Tier | Earned when |
|---|---|---|
| Friends in Many Courts | copper | You have 3 alliances |
| Old Grudges Buried | silver | A rival becomes an ally |
| My Word Is Iron | silver | 100 years played with no oath broken (progress) |
| Our Own Banner | silver | You started as a subject and are no longer anyone's subject |
| Tribute Roads | silver | You have 5 tributaries |

**History** (16, 215 points)

| Name | Tier | Earned when |
|---|---|---|
| As It Was Written | copper | You make 25 historical choices (progress) |
| Another Ending | silver | You make 10 non-historical choices in major events (progress) |
| Paths Not Taken | gold | Across your games, 50 different non-historical options (lifetime, progress) |
| Free of the Khan | silver | On 1 January 1400, having stood as the prince against the khan's horde at Kulikovo, you are nobody's subject (full game) |
| Blackbird Field | silver | On 1 January 1400, having faced the sultan as the prince at Kosovo, you are nobody's subject (full game) |
| The Storm Passes | silver | At the end of 1405, having met the conqueror's army as the sultan at Ankara, you are nobody's subject |
| The Walls Held | gold | On 31 December 1460, as the defender in the fall of Constantinople, you own Constantinople |
| The Conqueror's Heirs | gold | On 31 December 1507, as the empire left behind at Timur's death, you still own Samarkand (full game) |
| The Four Quarters Hold | gold | On 31 December 1600, holding a role in the Inca expansion, you own Cusco and are nobody's subject |
| Unconquered | gold | On 1 January 1914, having started outside Europe, your capital was never occupied by a realm whose capital lies in another of the 13 macro-regions (the Middle East counts as Asia) |
| The Presses Roll | copper | You know printing before 1470 |
| Chains Broken | silver | Your realm abolishes slavery before 1800 |
| Stayed Home | silver | With at least 50 provinces, you stay out of the First World War |
| Weathered the Crash | copper | Hit by the Great Depression, you do not default |
| One Island Realm | gold | You own all of Japan before 1600 |
| Lord of the River Bend | gold | You own the whole Niger bend before 1600 |

**Campaign** (9, 105 points)

| Name | Tier | Earned when |
|---|---|---|
| The Old Start | copper | You reach 11 November 1444, the day after Varna, where campaigns used to begin |
| New Century | copper | You reach 1500 |
| Three Centuries On | copper | You reach 1700 |
| The New Machine Age | silver | You reach 1900 |
| The Long Road | crown | You reach the campaign's end date |
| From One Hall | gold | Starting with one province, you hold 50 (progress) |
| Many Tents, One People | copper | Starting as a decentralised realm, you reach 1500 |
| Many Crowns | copper | Across your games, 10 different realms played 10 years each (lifetime, progress, full game) |
| Crowns of the World | silver | Across your games, realms in 6 world regions played 10 years each (lifetime, progress, full game) |

## What you see

- **The toast:** slides in at the top for three seconds with the icon, name and tier, and a short chip-tune sting. While a battle or event screen is open, it waits until the screen closes. With "Achievement toasts" off in [Settings](Settings), there is no toast but the achievement still unlocks.
- **The achievements screen:** reached from More on the main menu, a grid of icons grouped by category. Selecting one shows its text, progress and the date earned. An "earnable in this campaign" filter shows achievements not yet earned and not already ruled out (for example a date that has passed).
- **The turn report** gets one line per unlock, with a jump to where it happened when there is a place (the castle, the battlefield).
- **Eligibility** shows on the pause menu and the new game screen, with a one-time warning before you lose it.

### In the playable build today

- Open the game menu (the three-line button at the top left) and tap **Achievements**, or *Achievements* on the start screen. The Achievements card opens in the side panel: earned of 80 and points of 810 at the top, the eligibility line, a filter (*All*, *Within reach*, *Earned*), then one row of badges per category with its own count. Tap a badge for its text, tier and points, this campaign's progress bar, and the date you earned it. The harvest ladder is one badge in First steps with its level in the corner (3/5); its detail lists every level with its target and date and a bar to the next level, counted across all your campaigns.
- A badge is the tier's frame round the category's sign (a coin for Realm, swords for War, an anchor for Sea…) until the icons are drawn. Grey means locked; a dashed frame means **Not in the game yet**: 23 rows read systems the build does not have yet (charters, rulers and succession, trade hubs, winter quarters, marshals, styles, voyages and colonies, rebellions, regions of the world), and they stay locked until those land. The four History rows of the decades after 1378 read the bridge events (Kulikovo, Kosovo, Ankara, Timur's death); they can be earned once those events run in your campaign.
- When you earn one, a banner slides in under the date bar for three seconds and a line goes into the News; tap the banner to open the card at it. The game menu button (and the Achievements line in it) carries a red dot until you have looked. *Achievement toasts* in Settings → Gameplay turns the banner off; achievements still unlock.
- Tests run at the end of each week's turn, after everything else. What you earn is kept on this device, apart from any campaign, so it stays when you start again or reload. The build has no saves yet, so every campaign counts as ironman.

## How it connects

- [Saving](Saving): the three save flags, the player profile and its cloud sync, demo carry-over.
- [How a turn works](Time-and-Turns): turn end, year end, harvest, spring, dates and campaign end; tests run last.
- [Screens and navigation](Screens-and-Navigation): the screen, toast, turn report line, eligibility indicator and the game-over warning.
- [Settings](Settings): the Achievement toasts switch.
- [Music and sound](Music-and-Sound): the unlock sound.
- [Tutorial and help](Tutorial-and-Help): tutorial saves are never ironman, so the tutorial earns none.
- [Your realm](Your-Realm): harvests, food policy, gold, loans, people, castle reach, lords, ruler years, succession, schools, scholars, trade ships, oaths.
- [Provinces](Provinces): hungry provinces, famine relief, officials, charters, provinces gained.
- [Research](Research): inventions, eras, first in the world.
- [Recruiting](Recruiting): regiments trained, the Marshal.
- [Warfare](Warfare): battles, sieges, wars, winter quarters, commander styles.
- [Naval](Naval): sea battles, fleets home, ocean crossings, circumnavigation.
- [Exploration and colonies](Exploration-and-Colonies): contact by sea, colonies founded with consent.
- [Diplomacy](Diplomacy) and [Subjects](Subjects): alliances, rivals, independence, tributaries.
- [Rebellions](Rebellions): how risings end, great revolts, unrest tiers.
- [Historical events](Historical-Events): historical and non-historical choices, event roles, realm flags.
- [The 1378 start](The-1378-Start): start province count, decentralised starts, start macro-region.
- [Trade](Trade): trade hubs.

Computer players have no part here; achievements are only for your realm.

## Numbers

| Key | Value | Status |
|---|---|---|
| `tiers.copper` / `silver` / `gold` / `crown` | 5 / 10 / 20 / 40 | fixed (store rule) |
| `achievements[].test` thresholds | as in the lists above | provisional placeholders |
| `achievements[].progress.target` | as in the lists above | provisional placeholders |
| Maximum achievements | 100 | fixed |
| Maximum points each / in total | 40 / 1,000 | fixed |
| Reserve after an update | 10 slots, 100 points | fixed |
| Name / text length | 24 / 100 characters | fixed |
| Google step threshold | 10,000 | store limit |
| Steam progress popups | 25, 50, 75 % | fixed |
| Toast duration | 3 seconds | |
| Store retry interval | 5 minutes | provisional |
| Icon | 32 × 32, 2-pixel frame | fixed |

## Still open

- Store figures (points and counts) are checked again in each store's console before upload.
- *The Walls Held*, *The Four Quarters Hold* and *The Conqueror's Heirs* get a sensitivity review of their names.
- Rows for the Western Schism's end, Florence and Pisa, and the Ottomans holding Edirne and Bursa through Ankara wait for their events and places.
- A last check before release that no achievement copies another game's list.

## For developers

- Spec: [`domain/achievements/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/achievements/spec.md), requirement code **ACH** (ACH-001 to ACH-091).
- Features: `domain/achievements/features/` (list-rules, unlock-catalogue, scope-and-progress, test-timing, eligibility, store-sync, free-tier-and-demo, icons, in-game-presentation).
- Code: `packages/engine/src/domain/achievements/`.
- The catalogue is `achievements.yaml` in the achievements design; its row ids (`first_harvest`, `walls_held_1453` …) are the stable ids every store id comes from.
