import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld } from "../src/index.ts";
import { realmTitles } from "../src/government.ts";
import { titlesFor } from "../src/domain/realm/index.ts";

describe("titles by culture (REALM-242)", () => {
  it("takes the language family first, then the form family, then the default", () => {
    expect(titlesFor("japonic", "warriors")).toEqual({ lord: "daimyo", lords: "daimyo", official: "daikan", officials: "daikan" });
    expect(titlesFor("germanic", "kin").lord).toBe("chief");
    expect(titlesFor("latin", "house")).toEqual({ lord: "lord", lords: "lords", official: "official", officials: "officials" });
  });

  it("gives every 1444 realm its own words", () => {
    const rules = loadDefaultRuleset();
    const world = createWorld(rules, 1, loadMapTiles(rules));
    const t = realmTitles(world);
    const of = (id: string) => t[rules.nations.findIndex((n) => n.id === id)]!;
    expect(of("france").lord).toBe("lord");
    expect(of("ottomans")).toMatchObject({ lord: "bey", official: "subashi" });
    expect(of("japan")).toMatchObject({ lord: "daimyo", official: "daikan" });
    expect(of("muscovy").lord).toBe("boyar");
    expect(of("mali").lord).toBe("chief");
    expect(of("iroquois").lord).toBe("chief");
    expect(of("inca").lord).toBe("kuraka");
    expect(t.length).toBe(rules.nations.length);
  });
});
