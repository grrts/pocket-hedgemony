# Steam on the desktop

How the Electron app (`apps/desktop`) works with Steam: Steamworks, Steam sign-in, saves as files and
Steam Auto-Cloud. The rules are `domain/saves/spec.md` SAVE-140 to SAVE-148 and D-SAVE-21; the design is
`accounts/accounts-design.md` §4, §9 and §11 step 4.

## What happens

- **Steamworks** comes from [`steamworks.js`](https://github.com/ceifa/steamworks.js) 0.4.0, an optional
  dependency of `@ph/desktop`. The main process loads it only when the game has a Steam app id, and every
  failure (no app id, the library or its native part missing, Steam not running) leaves the plain desktop
  game: email sign-in and the same save folder, with nothing shown to the player (SAVE-140).
- **The app id** comes from, in order: `--steam-app-id=<id>` on the command line, the `PH_STEAM_APP_ID`
  environment variable, the `SteamAppId` that Steam sets when it starts the game, or, in a packaged store
  build only, the id the build was made with (`steamAppId` in its `package.json`, see Packaging). No id is in
  the code. `0` or `off` turns Steam off, the built-in id too.
- **Relaunching through Steam.** A store build started outside Steam (from its folder or a shortcut, so no
  `SteamAppId`) asks Steamworks `restartAppIfNecessary(<built-in id>)` before it opens a window; when that
  answers true, Steam starts the game itself and this copy quits. If the library cannot load, the game
  carries on without Steam. Dev runs (`pnpm desktop`, `pnpm --filter @ph/desktop steam`) have no built-in
  id and never relaunch.
- **The Steam overlay** (Shift+Tab) is turned on with `electronEnableSteamOverlay()` once Steamworks has
  started. It adds Chromium switches (`in-process-gpu`, `disable-direct-composition`), so the main process
  starts Steamworks before Electron is ready (a top-level `await`, which holds back the ready event), and it
  keeps the game window repainting so the overlay can draw over it.
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

## Packaging

[electron-builder](https://www.electron.build) 26 packages the game; its settings are in
`apps/desktop/electron-builder.yml` and `apps/desktop/scripts/package.mjs` runs it. Build the client first,
with `VITE_CLOUD_API` pointing at the live server; the scripts stop if `apps/client/dist` is missing.

```sh
pnpm --filter @ph/client build
pnpm --filter @ph/desktop package                         # a plain folder for this OS, no Steam app id
pnpm --filter @ph/desktop dist                            # the installers for this OS, no Steam app id
PH_STEAM_APP_ID=<id> pnpm --filter @ph/desktop dist:steam # the Steam store folder, with the app id built in
pnpm desktop:package                                      # client build and `package` in one go
```

Anything after the script name goes to electron-builder: `--win`, `--linux` or `--mac` for another OS,
`--x64` or `--arm64`, `--mac --universal` for one Mac app for Intel and Apple silicon. Windows and Linux
folders build on any OS (checked on Linux); the Mac `.dmg`, signing and notarizing need a Mac.

What goes in:

- `src/` and `package.json` in `resources/app.asar`; the client build in `resources/client`, which
  `main.mjs` uses when `app.isPackaged` (`PH_CLIENT_DIST` still wins, and a dev run uses
  `apps/client/dist`).
- `steamworks.js` with only this OS's native files, unpacked from the asar into
  `resources/app.asar.unpacked/node_modules/steamworks.js/dist/<os>/` (the `.node` file and `libsteam_api`
  beside it), since a native library cannot load from inside an asar. electron-builder 26 follows pnpm's
  links itself; no `node-linker` setting is needed.
- No auto-update feed (`publish: null`): Steam updates the game.

**The app id gets in at build time**, never in the source: `dist:steam` passes
`-c.extraMetadata.steamAppId=$PH_STEAM_APP_ID`, so the packaged `package.json` has `"steamAppId": <id>`.
That is the last place `steamAppId()` looks, and only in a packaged build. The demo is the same build made
with the demo's app id; with the same product name its saves are in the same folder, which is what
SAVE-083's carry-over needs. `package` and `dist` carry no id: they are the plain desktop game unless
Steam starts them.

**Depots.** Upload the folder for each OS to that OS's depot (Steamworks → SteamPipe → Depots), from
`apps/desktop/release/` after `dist:steam` on that OS (or with `--win` / `--mac` / `--linux`):

| Depot | Folder to upload | Launch option (executable) |
|---|---|---|
| Windows | `release/win-unpacked/` | `Pocket Hegemony.exe` |
| macOS | `release/mac-universal/` with `--universal`, else `release/mac-arm64/` or `release/mac/` (x64) | `Pocket Hegemony.app` |
| Linux and Steam Deck | `release/linux-unpacked/` | `pocket-hegemony` |

For Linux, have the launch option run under the Steam Linux Runtime (the partner site's Installation
settings), the usual choice for Steam Deck. Chromium's sandbox may not start inside the runtime's
container; if the game does not open there, add `--no-sandbox` to the Linux launch option's arguments.
This still has to be tried on a Steam Deck.

`dist` makes the installers for selling or testing outside Steam: an NSIS setup and a `.zip` on Windows,
a `.dmg` and a `.zip` on macOS, a `.tar.gz` and an AppImage on Linux, named
`pocket-hegemony-<version>-<os>-<arch>.<ext>`.

**Signing comes later.** Without keys the builds are unsigned (the script sets
`CSC_IDENTITY_AUTO_DISCOVERY=false` when no certificate is given). When Leroy has the keys, he sets these
before `dist` or `dist:steam`; nothing in the config changes:

| Variable | For |
|---|---|
| `CSC_LINK` | the signing certificate: a `.p12`/`.pfx` file path, URL or base64 (Windows Authenticode; macOS Developer ID Application) |
| `CSC_KEY_PASSWORD` | its password |
| `CSC_NAME` | instead of `CSC_LINK` on a Mac: the name of a Developer ID identity already in the keychain |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | a separate Windows certificate when both are built on one machine |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | notarizing the Mac app (or `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` for an App Store Connect API key) |

The Mac app is built with the hardened runtime and `apps/desktop/build/entitlements.mac.plist` (JIT, and
library validation off so Valve's `libsteam_api.dylib` loads).

## Not done yet

- An app icon: the builds use Electron's default icon until `apps/desktop/build/icon.png` (1024×1024) is
  added.
- Ownership checks are done (`docs/purchases.md`); the demo itself (what it leaves out) belongs to the
  purchases step.
