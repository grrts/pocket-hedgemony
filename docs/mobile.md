# The phone apps

How the iOS and Android apps (`apps/mobile`) are built. They are Capacitor 8 shells around the web client
build (`apps/client/dist`): the game is the same, and a few plugins give it what only the phone has. The
rules are `domain/saves/spec.md` SAVE-149 to SAVE-156 (sign-in) and SAVE-170 to SAVE-185 (purchases); the
server side is `docs/purchases.md`.

## What is in the apps

- **The projects are in git**: `apps/mobile/android` (Gradle) and `apps/mobile/ios` (Xcode, with Swift
  packages, no CocoaPods). The web build is copied into them by `pnpm sync` and is not in git.
- **Landscape only**, on phones and tablets.
- **The `pockethegemony` link**, so Steam's sign-in page in the browser sheet comes back to the app
  (`pockethegemony://auth/steam`, `sign_in.app_return`).
- **Sign in with Apple** on iOS: the entitlement is in `ios/App/App/App.entitlements`.
- **Plugins**, all reached by the game through `globalThis.Capacitor` (the client imports none of them):

  | Plugin | Package | What for |
  |---|---|---|
  | `SocialLogin` | `@capgo/capacitor-social-login` | Sign in with Apple on iOS, Google's Credential Manager on Android (`apps/client/src/cloud/bridge.ts`). Facebook and Twitter are left out of the build in `capacitor.config.json`. |
  | `Browser`, `App` | `@capacitor/browser`, `@capacitor/app` | Steam's sign-in page in the browser sheet, and the link back. |
  | `NativePurchases` | `@capgo/native-purchases` | StoreKit 2 and Play Billing for the one non-consumable `full_game` (`capacitorStoreBridge` in `apps/client/src/cloud/purchases.ts`). It finishes and acknowledges each purchase itself, so a purchase holds even when the player is not signed in. |

  The community Sign in with Apple plugin is not used: it asks for Capacitor 7's Swift package and does not
  resolve beside Capacitor 8.

`scripts/native.mjs` puts the landscape lock, the link and the Apple entitlement into the projects. It runs
on every `pnpm sync` and changes nothing that is already there, so it only matters when a project is made
again with `cap add`.

## Building

```sh
pnpm --filter @ph/mobile sync      # build the client, copy it into both projects, patch them
pnpm --filter @ph/mobile android   # sync, then open Android Studio
pnpm --filter @ph/mobile ios       # sync, then open Xcode (macOS only)
```

Sign-in and purchases need a build with a cloud server: `VITE_CLOUD_API` (and `VITE_GOOGLE_CLIENT_ID` for
Google on Android) set when the client is built. Without `VITE_CLOUD_API` the app is the whole game with no
account and nothing to buy, as on the web.

CI (`.github/workflows/mobile.yml`) builds an unsigned Android debug APK and an unsigned iOS simulator build
whenever `apps/mobile` or the client's cloud code changes, and on every push to `main`.

## What Leroy sets up

### Signing

| Platform | What |
|---|---|
| Android | An upload key (`keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`). Put `storeFile`, `storePassword`, `keyAlias` and `keyPassword` in `apps/mobile/android/app/keystore.properties`, or set `PH_ANDROID_KEYSTORE`, `PH_ANDROID_KEYSTORE_PASSWORD`, `PH_ANDROID_KEY_ALIAS` and `PH_ANDROID_KEY_PASSWORD`. Neither is in git. Then `./gradlew bundleRelease` in `apps/mobile/android` makes the `.aab` for Play. Enrol in Play App Signing. |
| iOS | In Xcode, the App target → Signing & Capabilities: pick the team (this sets `DEVELOPMENT_TEAM`). Automatic signing makes the profiles; the App ID `com.pockethegemony.app` needs **Sign in with Apple** and **In-App Purchase** turned on in the Apple Developer portal. Product → Archive uploads to App Store Connect. |

### Store consoles

- The product `full_game` in App Store Connect and Play Console, and the server settings: `docs/purchases.md`.
- **Google sign-in on Android**: in Google Cloud, an **Android** OAuth client for `com.pockethegemony.app`
  with the SHA-1 of the upload key and of Play's app signing key (Play Console → App integrity), and a
  **Web** client whose id goes in `VITE_GOOGLE_CLIENT_ID` and in the server's `GOOGLE_CLIENT_IDS`. The
  Android client's id goes nowhere; Google matches it by package name and SHA-1.
- **Sign in with Apple**: the bundle id `com.pockethegemony.app` in the server's `APPLE_CLIENT_IDS`.
- **Steam in the browser**: `pockethegemony://auth/steam` in the server's `SIGN_IN_RETURN_URLS`.

### Before the first release

- App icons and the splash screen: `npx @capacitor/assets generate` from a 1024 px icon in
  `apps/mobile/assets`.
- The version: `versionCode` and `versionName` in `android/app/build.gradle`, `MARKETING_VERSION` and
  `CURRENT_PROJECT_VERSION` in the Xcode project.
