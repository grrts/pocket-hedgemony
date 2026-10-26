// Runs electron-builder for the desktop game (docs/steam.md "Packaging").
//
//   node scripts/package.mjs --dir      a plain folder for this OS (`package`)
//   node scripts/package.mjs            the installers for this OS (`dist`)
//   node scripts/package.mjs --steam    the Steam store folder (`dist:steam`):
//                                       PH_STEAM_APP_ID is built into the
//                                       packaged package.json as `steamAppId`
//
// Anything after the options goes to electron-builder as it is, e.g. `--win`,
// `--linux`, `--mac --universal`, `--x64`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDist = join(desktop, "../client/dist");

const args = process.argv.slice(2);
const steam = args.includes("--steam");
const builderArgs = args.filter((a) => a !== "--steam" && a !== "--");

if (!existsSync(join(clientDist, "index.html"))) {
  fail(`No client build in ${clientDist}. Run \`pnpm --filter @ph/client build\` first (with VITE_CLOUD_API set).`);
}

if (steam) {
  const appId = String(process.env.PH_STEAM_APP_ID ?? "").trim();
  if (!/^[1-9][0-9]{0,9}$/.test(appId)) {
    fail("dist:steam needs the store app id: PH_STEAM_APP_ID=<id> pnpm --filter @ph/desktop dist:steam");
  }
  // A Steam depot takes the plain folder, never an installer.
  if (!builderArgs.includes("--dir")) builderArgs.unshift("--dir");
  builderArgs.push(`-c.extraMetadata.steamAppId=${appId}`);
  console.log(`Steam store build for app ${appId}`);
}

// Unsigned unless Leroy's keys are set: without CSC_LINK or CSC_NAME, do not
// look for a signing identity in the keychain either.
const env = { ...process.env };
if (!env.CSC_LINK && !env.CSC_NAME && env.CSC_IDENTITY_AUTO_DISCOVERY === undefined) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  console.log("No CSC_LINK or CSC_NAME: building unsigned");
}

const cli = createRequire(import.meta.url).resolve("electron-builder/cli.js");
const run = spawnSync(process.execPath, [cli, ...builderArgs], { cwd: desktop, env, stdio: "inherit" });
process.exit(run.status ?? 1);

function fail(message) {
  console.error(message);
  process.exit(1);
}
