// Steamworks is optional (domain/saves SAVE-140 … SAVE-142): every way it can
// be missing ends in the desktop game without Steam, never in a crash.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { onSteamDeck, startSteam, steamAppId } from "../src/steam.mjs";

test("the app id comes from the switch, the build, or Steam, and is never built in", () => {
  assert.equal(steamAppId({}, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "480" }, []), 480);
  assert.equal(steamAppId({ SteamAppId: "3141590" }, []), 3141590);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "480", SteamAppId: "3141590" }, []), 480);
  assert.equal(steamAppId({}, ["electron", ".", "--steam-app-id=480"]), 480);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "off" }, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "0" }, []), undefined);
  assert.equal(steamAppId({ PH_STEAM_APP_ID: "48x" }, []), undefined);
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
