/**
 * Builds the music's instrument packs (D-AUD-16, AUD-003): for each instrument
 * in `apps/client/src/audio/instruments.ts`, takes its notes from the Fluid R3
 * GM soundfont as rendered by midi-js-soundfonts (CC BY 3.0), cuts each to
 * its slot with a short fade, levels the instrument, and writes them one
 * after another as a mono 22,050 Hz MP3 in `apps/client/public/music/`.
 *
 * Usage: node --experimental-strip-types tools/music-samples/build.ts [cache-dir]
 * Needs ffmpeg and network access to raw.githubusercontent.com.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INSTRUMENTS, sampleNotes, type Instrument } from "../../apps/client/src/audio/instruments.ts";

const SOURCE = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM";
const SR = 22050;
const KBPS = "48k";
/** RMS every instrument's note onsets are levelled to (about -16 dBFS). */
const LOUDNESS = 0.16;
const cache = process.argv[2] ?? join(process.cwd(), "out", "soundfont");
const outDir = join(import.meta.dirname, "../../apps/client/public/music");
mkdirSync(cache, { recursive: true });
mkdirSync(outDir, { recursive: true });

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

async function soundfont(name: Instrument): Promise<string> {
  const file = join(cache, `${name}-mp3.js`);
  if (!existsSync(file)) {
    const res = await fetch(`${SOURCE}/${name}-mp3.js`);
    if (!res.ok) throw new Error(`${name}: ${res.status}`);
    writeFileSync(file, await res.text());
  }
  return readFileSync(file, "utf8");
}

/** One note decoded to mono floats at SR. */
function decode(js: string, midi: number): Float32Array {
  const m = new RegExp(`"${noteName(midi)}": "data:audio/mp3;base64,([^"]+)"`).exec(js);
  if (!m) throw new Error(`no note ${noteName(midi)}`);
  const tmp = join(cache, "note.mp3");
  writeFileSync(tmp, Buffer.from(m[1]!, "base64"));
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", tmp, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

for (const name of Object.keys(INSTRUMENTS) as Instrument[]) {
  const def = INSTRUMENTS[name];
  const js = await soundfont(name);
  const slot = Math.round(def.slot * SR);
  const notes = sampleNotes(name);
  const pack = new Float32Array(slot * notes.length);
  notes.forEach((midi, k) => {
    const x = decode(js, midi);
    // Skip the encoder's lead-in silence so each note starts on its slot.
    let start = 0;
    const peak = x.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
    while (start < x.length && Math.abs(x[start]!) < peak * 0.01) start++;
    const fade = Math.round(0.12 * SR);
    for (let i = 0; i < slot && start + i < x.length; i++) {
      const tail = slot - i < fade ? (slot - i) / fade : 1;
      pack[k * slot + i] = x[start + i]! * tail;
    }
  });
  // Every instrument is levelled by how loud its notes sound as they start
  // (the first 0.4 s), so a plucked string and a held flute sit together.
  const head = Math.min(slot, Math.round(0.4 * SR));
  let sum = 0;
  for (let k = 0; k < notes.length; k++) for (let i = 0; i < head; i++) sum += pack[k * slot + i]! ** 2;
  const rms = Math.sqrt(sum / (head * notes.length)) || 1e-6;
  const peak = pack.reduce((a, v) => Math.max(a, Math.abs(v)), 1e-6);
  const gain = Math.min(LOUDNESS / rms, 0.98 / peak);
  for (let i = 0; i < pack.length; i++) pack[i]! *= gain;
  const raw = join(cache, `${name}.f32`);
  writeFileSync(raw, Buffer.from(pack.buffer));
  const out = join(outDir, `${name}.mp3`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", raw, "-c:a", "libmp3lame", "-b:a", KBPS, out]);
  console.log(`${name}: ${notes.length} notes, ${(readFileSync(out).length / 1024).toFixed(0)} KB`);
}
