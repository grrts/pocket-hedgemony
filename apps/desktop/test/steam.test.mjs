// Steamworks is optional (domain/saves SAVE-140 … SAVE-142): every way it can
// be missing ends in the desktop game without Steam, never in a crash.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  builtInAppId,
  onSteamDeck,
  relaunchAppId,
  relaunchThroughSteam,
  startSteam,
  steamAppId,
} from "../src/steam.mjs";

test("the app id comes from the switch, the build, or Steam, and is never in the code", () => {
  assert.equal(steamAppId({}, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "480" }, []), 480);
  assert.equal(steamAppId({ SteamAppId: "3141590" }, []), 3141590);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "480", SteamAppId: "3141590" }, []), 480);
  assert.equal(steamAppId({}, ["electron", ".", "--steam-app-id=480"]), 480);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "off" }, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "0" }, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "48x" }, []), undefined);
  const source = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(builtInAppId(source), undefined);
});

test("a store build's built-in app id comes last, and 0 or off still turns Steam off", () => {
  // `dist:steam` writes it into the packaged package.json (extraMetadata).
  assert.equal(builtInAppId({ steamAppId: "3141590" }), 3141590);
  assert.equal(builtInAppId({ steamAppId: 3141590 }), 3141590);
  assert.equal(builtInAppId({ steamAppId: "off" }), undefined);
  assert.equal(builtInAppId(undefined), undefined);
  assert.equal(steamAppId({}, [], 3141590), 3141590);
  assert.equal(steamAppId({ SteamAppId: "3141600" }, [], 3141590), 3141600);
  assert.equal(steamAppId({}, ["--steam-app-id=480"], 3141590), 480);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "off" }, [], 3141590), undefined);
  assert.equal(steamAppId({}, ["--steam-app-id=0"], 3141590), undefined);
});

test("only a store build started outside Steam relaunches through Steam", () => {
  assert.equal(relaunchAppId({}, [], 3141590), 3141590);
  // Steam started it: SteamAppId is set.
  assert.equal(relaunchAppId({ SteamAppId: "3141590" }, [], 3141590), undefined);
  // A dev run or a build without an id.
  assert.equal(relaunchAppId({}, ["--steam-app-id=480"], undefined), undefined);
  assert.equal(relaunchAppId({}, [], undefined), undefined);
  // Steam turned off by hand.
  assert.equal(relaunchAppId({ PH_STEAM_APP_ID: "off" }, [], 3141590), undefined);
});

test("relaunching asks Steam with the built-in id and quits only when Steam says so", () => {
  const asked = [];
  const lib = (answer) => () => ({
    init() {},
    restartAppIfNecessary(id) {
      asked.push(id);
      return answer;
    },
  });
  assert.equal(relaunchThroughSteam({ appId: 3141590, load: lib(true) }), true);
  assert.equal(relaunchThroughSteam({ appId: 3141590, load: lib(false) }), false);
  assert.deepEqual(asked, [3141590, 3141590]);
  let loaded = false;
  assert.equal(relaunchThroughSteam({ appId: undefined, load: () => ((loaded = true), {}) }), false);
  assert.equal(loaded, false);
});

test("a relaunch that cannot be asked leaves the plain desktop game", () => {
  const log = [];
  const missing = () => {
    throw new Error("Cannot find module 'steamworks.js'");
  };
  assert.equal(relaunchThroughSteam({ appId: 3141590, load: missing, log: (l) => log.push(l) }), false);
  assert.match(log[0], /relaunch/);
  const broken = () => ({
    init() {},
    restartAppIfNecessary() {
      throw new Error("libsteam_api.so: cannot open shared object file");
    },
  });
  assert.equal(relaunchThroughSteam({ appId: 3141590, load: broken }), false);
  assert.equal(relaunchThroughSteam({ appId: 3141590, load: () => ({ init() {} }) }), false);
});

test("a Steam Deck is told by Steam's SteamDeck=1", () => {
  assert.equal(onSteamDeck({ SteamDeck: "1" }), true);
  assert.equal(onSteamDeck({}), false);
});

test("without an app id the binding is not even loaded", async () => {
  let loaded = false;
  assert.equal(await startSteam({ appId: undefined, load: async () => ((loaded = true), {}) }), undefined);
  assert.equal(loaded, false);
});

test("a binding that does not load means no Steam", async () => {
  const log = [];
  const steam = await startSteam({ appId: 480, load: () => Promise.reject(new Error("Cannot find module 'steamworks.js'")), log: (l) => log.push(l) });
  assert.equal(steam, undefined);
  assert.match(log[0], /did not load/);
});

test("Steam not running means no Steam", async () => {
  const steam = await startSteam({
    appId: 480,
    load: async () => ({
      init() {
        throw new Error("Steam is not running");
      },
    }),
  });
  assert.equal(steam, undefined);
});

/** A stand-in for steamworks.js's client. */
function fakeLib(calls) {
  return {
    default: {
      init(appId) {
        calls.push(["init", appId]);
        return {
          localplayer: { getName: () => "Bertrand" },
          auth: {
            async getAuthTicketForWebApi(identity) {
              calls.push(["ticket", identity]);
              return { getBytes: () => Buffer.from([0x14, 0x00, 0xab, 0xff]), cancel: () => calls.push(["cancel"]) };
            },
          },
        };
      },
    },
  };
}

test("with Steam, a Web API ticket comes back as hex for the server", async () => {
  const calls = [];
  const steam = await startSteam({ appId: 480, load: async () => fakeLib(calls) });
  assert.equal(steam.name, "Bertrand");
  assert.equal(await steam.webTicket("pockethegemony"), "1400abff");
  assert.deepEqual(calls.slice(0, 2), [["init", 480], ["ticket", "pockethegemony"]]);
  steam.close();
  assert.deepEqual(calls.at(-1), ["cancel"]);
  await assert.rejects(() => steam.webTicket("../bad identity"));
});

test("the Steam overlay is turned on once Steam is on, and only when asked", async () => {
  const calls = [];
  const withOverlay = (lib) => ({ ...lib.default, electronEnableSteamOverlay: (...args) => calls.push(["overlay", ...args]) });
  const steam = await startSteam({ appId: 480, load: () => withOverlay(fakeLib(calls)), overlay: true });
  assert.ok(steam);
  assert.deepEqual(calls.slice(0, 2), [["init", 480], ["overlay"]]);

  calls.length = 0;
  await startSteam({ appId: 480, load: () => withOverlay(fakeLib(calls)) });
  assert.deepEqual(calls, [["init", 480]]);

  calls.length = 0;
  const notRunning = { init() { throw new Error("Steam is not running"); }, electronEnableSteamOverlay: () => calls.push(["overlay"]) };
  assert.equal(await startSteam({ appId: 480, load: () => notRunning, overlay: true }), undefined);
  assert.deepEqual(calls, []);
});

test("an overlay that fails to turn on leaves Steam on", async () => {
  const log = [];
  const lib = {
    ...fakeLib([]).default,
    electronEnableSteamOverlay() {
      throw new Error("Electron module not found");
    },
  };
  const steam = await startSteam({ appId: 480, load: () => lib, overlay: true, log: (l) => log.push(l) });
  assert.equal(steam.name, "Bertrand");
  assert.match(log[0], /overlay off/);
});

test("the ticket identity the game asks for is the one the server checks", () => {
  const saves = JSON.parse(readFileSync(new URL("../../../packages/rules/data/domain/saves.json", import.meta.url), "utf8"));
  assert.equal(saves.sign_in.steam_ticket_identity, "pockethegemony");
});

test("the real binding, when installed, loads lazily and fails softly without Steam", async () => {
  // In CI there is no Steam client: init throws, and startSteam answers undefined.
  const steam = await startSteam({ appId: 480 });
  steam?.close();
  assert.ok(steam === undefined || typeof steam.webTicket === "function");
});
