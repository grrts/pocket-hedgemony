# Steam on the desktop

How the Electron app (`apps/desktop`) works with Steam: Steamworks, Steam sign-in, saves as files and
Steam Auto-Cloud. The rules are `domain/saves/spec.md` SAVE-140 to SAVE-148 and D-SAVE-21; the design is
`accounts/accounts-design.md` §4, §9 and §11 step 4.

## What happens

- **Steamworks** comes from [`steamworks.js`](https://github.com/ceifa/steamworks.js) 0.4.0, an optional
  dependency of `@ph/desktop`. The main process imports it only when the game has a Steam app id, and every
  failure (no app id, the library or its native part missing, Steam not running) leaves the plain desktop
  game: email sign-in and the same save folder, with nothing shown to the player (SAVE-140).
- **The app id** comes from, in order: `--steam-app-id=<id>` on the command line, the `PH_STEAM_APP_ID`
  environment variable, or the `SteamAppId` that Steam sets when it starts the game. No id is built into the
  code. `0` or `off` turns Steam off.
- **Steam sign-in.** At launch, when the device is signed out, the game asks Steamworks for a Web API ticket
  (`GetAuthTicketForWebApi("pockethegemony")`, the identity in `saves.json` `sign_in.steam_ticket_identity`)
  and sends it as hex with the Steam name to `POST /api/sessions` (SAVE-141). After the player signs out on
  the device, the game waits for **Sign in with Steam** on the Account and cloud saves card. On a Steam Deck
  (`SteamDeck=1`) the device and its saves are named "Steam Deck"; on Steam the device's platform is `steam`
  (SAVE-142).
- **The device token** is kept encrypted with Electron's `safeStorage` in `<userData>/device-token.bin`, or
  in web storage where `safeStorage` cannot encrypt (SAVE-143).
- **Saves are files**: `<userData>/saves/<campaignId>/<savedAt>-<saveId>.phsave`, the same names as on our
  server, written to a `.tmp` file, flushed and renamed (SAVE-144). Saves an earlier desktop build kept in
  IndexedDB move into the folder on the first launch. `userData` is the folder named by the app's product
  name, "Pocket Hegemony":

  | OS | Save folder |
  |---|---|
  | Windows | `%APPDATA%\Pocket Hegemony\saves` |
  | macOS | `~/Library/Application Support/Pocket Hegemony/saves` |
  | Linux and Steam Deck | `~/.config/Pocket Hegemony/saves` (Electron follows `$XDG_CONFIG_HOME` when it is set) |

## Trying it with Steam

Valve's test app 480 (Spacewar) works for any Steam account, so Steam sign-in can be tried before the game
has its own app id:

```sh
pnpm --filter @ph/client build          # with VITE_CLOUD_API pointing at a server
pnpm --filter @ph/desktop steam         # electron . --steam-app-id=480, with the Steam client running
```

With 480 the game gets a real ticket and sends it, but our server can check a ticket only with a publisher
Web API key for the same app id (`STEAM_WEB_API_KEY` and `STEAM_APP_ID` in `server/.env`), which Spacewar's
publisher alone holds: the server answers "Steam did not accept the sign-in." and the card shows it. A full
sign-in needs the game's own app id and key (accounts-design §10). Without the Steam client running,
`pnpm desktop` and `pnpm --filter @ph/desktop steam` both start the plain desktop game.

## Steamworks partner site: Steam Cloud (SAVE-145)

Leroy enters these under **App Admin → Steam Cloud** for the full game's app id (and the same for the demo,
so SAVE-083's carry-over finds the files), then publishes:

| Setting | Value |
|---|---|
| Byte quota per user | 500 MB (524288000 bytes) |
| Number of files allowed per user | 2000 |
| Enable cloud support for developers only | off once it is tested |
| Dynamic Cloud Sync | on (so a suspended Steam Deck uploads its saves) |

**Root path** (Auto-Cloud, one row):

| Root | Subdirectory | Pattern | OS | Recursive |
|---|---|---|---|---|
| `WinAppDataRoaming` | `Pocket Hegemony/saves` | `*.phsave` | All OSes | yes |

**Root overrides:**

| Original root | OS | New root | Add/Replace path | Replace path |
|---|---|---|---|---|
| `WinAppDataRoaming` | macOS | `MacAppSupport` | (empty) | no |
| `WinAppDataRoaming` | Linux + SteamOS | `LinuxHome` | `.config/Pocket Hegemony/saves` | yes |

The pattern takes every `.phsave` file in the folder, so the older autosaves and the backup Resume save ride
along with the synced set; the files on disk are already bounded by the kept counts (D-SAVE-21). Temporary
files end in `.phsave.tmp` and do not match. Because the file names are the same as on our server
(SAVE-053), a save that arrives through Auto-Cloud and through our cloud is one file, and Steam's conflict
dialog does not appear.

The same values are in `packages/rules/data/domain/saves.json` under
`cloud.store_backups.steam.partner_site`; a spec scenario checks them.

## Not done yet

- `restartAppIfNecessary` (relaunching through Steam when started outside it) and the Steam overlay
  (`electronEnableSteamOverlay`): for the store build.
- Packaging (electron-builder or similar) with the native `steamworks.js` files unpacked from the asar.
- Ownership checks and the demo's carry-over (SAVE-083) belong to the purchases step.
