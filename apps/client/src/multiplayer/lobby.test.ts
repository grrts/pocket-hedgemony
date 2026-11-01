import { describe, expect, it } from "vitest";
import { activeIn, limitName, timeLeft, weekDue } from "./lobby.ts";

describe("online game rules on the device (domain/multiplayer MP-080, MP-081)", () => {
  const game = { humans: ["castile", "england", "france"], dropped: { england: 3 } };

  it("plays a realm handed to the AI as a person's until its week, then as the AI's", () => {
    expect(activeIn(game, 2)).toEqual(["castile", "england", "france"]);
    expect(activeIn(game, 3)).toEqual(["castile", "france"]);
    expect(activeIn({ humans: ["castile"] }, 9)).toEqual(["castile"]);
  });

  it("closes a week its turn limit after it opened, and never without a limit", () => {
    expect(weekDue({ turnLimit: 300, weekOpened: 1_000 })).toBe(301_000);
    expect(weekDue({ turnLimit: null, weekOpened: 1_000 })).toBeNull();
    expect(weekDue({ turnLimit: 300, weekOpened: null })).toBeNull();
  });

  it("reads the time left as a clock does", () => {
    expect(timeLeft(245_000)).toBe("4:05");
    expect(timeLeft(-5)).toBe("0:00");
    expect(timeLeft(2 * 3600_000 + 600_000)).toBe("2 h 10");
    expect(timeLeft(27 * 3600_000)).toBe("1 d 3 h");
  });

  it("names the host's choices", () => {
    expect([0, 300, 3600, 86400].map(limitName)).toEqual(["No limit", "5 min", "1 hour", "1 day"]);
  });
});
