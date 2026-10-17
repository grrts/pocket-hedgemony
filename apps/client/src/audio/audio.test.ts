import { describe, expect, it } from "vitest";
import { PALETTES, trackList, peaceTrackId, MUSIC_ERAS } from "@ph/engine/domain/audio";
import { SR } from "./chip.ts";
import { lineBeats, renderTrack, TRACKS, writtenTrack, PALETTE_VOICES } from "./tracks.ts";
import { renderSound, SFX_IDS } from "./sfx.ts";

const now = () => Promise.resolve();

describe("music", () => {
  it("fits every part inside its track", () => {
    for (const [id, t] of Object.entries(TRACKS)) {
      for (const p of t.parts) expect((p.at ?? 0) + lineBeats(p.seq), `${id} ${p.v}`).toBeLessThanOrEqual(t.beats);
      for (const d of t.drums ?? []) expect((d.at ?? 0) + lineBeats(d.seq), `${id} drums`).toBeLessThanOrEqual(t.beats);
    }
  });

  it("quotes the Hegemony motif 1-5-4-5-8 in every loop (AUD-018 motif rule)", () => {
    for (const [id, t] of Object.entries(TRACKS)) {
      if (t.stinger) continue;
      const lines = t.parts.map((p) => p.seq.split(/\s+/).map((x) => x.split(":")[0]).join(" "));
      expect(lines.some((l) => / 1 5 4 5 8 |^1 5 4 5 8 /.test(` ${l} `) || l.startsWith("1 5 4 5 8")), id).toBe(true);
    }
  });

  it("has a written track or a stand-in for every track the director names", () => {
    const missing = trackList().filter((t) => !t.id.startsWith("age_") && !["event_good", "event_bad", "event_major", "discovery", "innovation", "ruler_new", "alliance"].includes(t.id) && !writtenTrack(t.id));
    expect(missing.map((t) => t.id)).toEqual([]);
    for (const p of PALETTES) for (const e of MUSIC_ERAS) expect(writtenTrack(peaceTrackId(p, e))).toMatch(/^peace_/);
  });

  it("renders loops to a whole number of bars, in every palette", async () => {
    for (const id of Object.keys(TRACKS)) {
      const r = await renderTrack(id, "europe_west", now);
      expect(r.layers.length).toBe(TRACKS[id]!.layers ?? 1);
      for (const [L] of r.layers) expect(L.every(Number.isFinite)).toBe(true);
      if (!r.stinger) expect(Math.abs(r.seconds / r.barSeconds - Math.round(r.seconds / r.barSeconds))).toBeLessThan(0.01);
    }
    for (const p of Object.keys(PALETTE_VOICES)) {
      const r = await renderTrack("peace_early", p as never, now);
      expect(r.seconds).toBeGreaterThan(40);
    }
  }, 60_000);
});

describe("effects", () => {
  it("are all under 2 seconds (AUD-100) and finite", () => {
    for (const id of SFX_IDS) {
      const x = renderSound(id);
      expect(x.length / SR, id).toBeLessThan(2);
      expect(x.length, id).toBeGreaterThan(0);
      expect(x.every(Number.isFinite), id).toBe(true);
    }
  });
});
