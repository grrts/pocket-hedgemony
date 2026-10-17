// Splits the world's water into sea zones that ships sail through.
//
// Zones are small along coasts (where most trade and fighting happens) and
// larger in open ocean, but every zone is a similar distance across in
// kilometres, so the number of zones a ship crosses measures how long a
// voyage takes. Small enclosed water (lakes) is left out.

export interface SeaOptions {
  width: number;
  height: number;
  /** Land label per pixel; negative is water. */
  land: Int32Array;
  latOf: (y: number) => number;
  lonOf: (x: number) => number;
  /** Seed spacing in pixels (north-south) near coasts and in open ocean. */
  coastSpacing: number;
  oceanSpacing: number;
  /** Water within this many pixels of land counts as coastal. */
  coastBand: number;
  /** Connected water smaller than this many pixels is a lake, not sea. */
  minSeaSize: number;
  /** Optional name per water pixel (index into names), -1 if unnamed. */
  nameGrid: Int32Array;
  names: string[];
}

export interface SeaZone {
  cx: number;
  cy: number;
  size: number;
  /** Far from land: open ocean rather than coastal sea. */
  deep: boolean;
  name: string;
}

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function buildSeaZones(o: SeaOptions): { zoneOf: Int32Array; zones: SeaZone[] } {
  const { width: W, height: H, land } = o;
  const N = W * H;
  const neighbors = (p: number, fn: (q: number) => void) => {
    const x = p % W;
    const y = (p - x) / W;
    fn(y * W + ((x + 1) % W));
    fn(y * W + ((x - 1 + W) % W));
    if (y > 0) fn(p - W);
    if (y < H - 1) fn(p + W);
  };

  // 1. Water bodies; small ones are lakes.
  const body = new Int32Array(N).fill(-1);
  const bodySize: number[] = [];
  const stack: number[] = [];
  for (let s = 0; s < N; s++) {
    if (land[s]! >= 0 || body[s]! >= 0) continue;
    const id = bodySize.length;
    let size = 0;
    body[s] = id;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      neighbors(p, (q) => {
        if (land[q]! < 0 && body[q]! < 0) {
          body[q] = id;
          stack.push(q);
        }
      });
    }
    bodySize.push(size);
  }
  const isSea = (p: number) => land[p]! < 0 && bodySize[body[p]!]! >= o.minSeaSize;

  // 2. Distance to land, in pixels, by breadth-first search from the coast.
  const dist = new Int32Array(N).fill(-1);
  let queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  for (let p = 0; p < N; p++) {
    if (!isSea(p)) continue;
    let coast = false;
    neighbors(p, (q) => (coast ||= land[q]! >= 0));
    if (coast) {
      dist[p] = 0;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++]!;
    neighbors(p, (q) => {
      if (dist[q]! < 0 && isSea(q)) {
        dist[q] = dist[p]! + 1;
        queue[tail++] = q;
      }
    });
  }

  // 3. Seeds on two jittered lattices: fine near coasts, coarse in open ocean.
  //    East-west spacing widens with latitude so zones keep their size in km.
  const zoneOf = new Int32Array(N).fill(-1);
  const seeds: number[] = [];
  const seedBodies = new Set<number>();
  const plant = (spacing: number, wantCoast: boolean, seed: number) => {
    for (let gy = spacing / 2; gy < H; gy += spacing) {
      const cos = Math.max(0.25, Math.cos((o.latOf(gy) * Math.PI) / 180));
      const sx = spacing / cos;
      const cols = Math.max(1, Math.round(W / sx));
      for (let i = 0; i < cols; i++) {
        const jx = (hash(i, gy, seed) - 0.5) * sx * 0.6;
        const jy = (hash(i, gy, seed + 1) - 0.5) * spacing * 0.6;
        const x = (Math.round((i + 0.5) * (W / cols) + jx) + W) % W;
        const y = Math.min(H - 1, Math.max(0, Math.round(gy + jy)));
        const p = y * W + x;
        if (!isSea(p) || zoneOf[p]! >= 0) continue;
        const coastal = dist[p]! < o.coastBand;
        if (coastal !== wantCoast) continue;
        zoneOf[p] = seeds.length;
        seeds.push(p);
        seedBodies.add(body[p]!);
      }
    }
  };
  plant(o.coastSpacing, true, 11);
  plant(o.oceanSpacing, false, 23);
  // Every sea gets at least one zone, however it falls between lattice points.
  for (let p = 0; p < N; p++) {
    if (isSea(p) && !seedBodies.has(body[p]!)) {
      zoneOf[p] = seeds.length;
      seeds.push(p);
      seedBodies.add(body[p]!);
    }
  }

  // 4. Grow all seeds at once over water, so each zone is connected.
  head = 0;
  tail = 0;
  for (const s of seeds) queue[tail++] = s;
  while (head < tail) {
    const p = queue[head++]!;
    neighbors(p, (q) => {
      if (zoneOf[q]! < 0 && isSea(q)) {
        zoneOf[q] = zoneOf[p]!;
        queue[tail++] = q;
      }
    });
  }
  queue = new Int32Array(0);

  // 5. Fold slivers into the neighbour they share the longest edge with.
  const count = seeds.length;
  const size = new Int32Array(count);
  for (let p = 0; p < N; p++) if (zoneOf[p]! >= 0) size[zoneOf[p]!]!++;
  const minSize = (o.coastSpacing * o.coastSpacing) / 6;
  const shared = Array.from({ length: count }, () => new Map<number, number>());
  for (let p = 0; p < N; p++) {
    const a = zoneOf[p]!;
    if (a < 0) continue;
    neighbors(p, (q) => {
      const b = zoneOf[q]!;
      if (b >= 0 && b !== a) shared[a]!.set(b, (shared[a]!.get(b) ?? 0) + 1);
    });
  }
  const target = Int32Array.from({ length: count }, (_, i) => i);
  for (let z = 0; z < count; z++) {
    if (size[z]! >= minSize || !shared[z]!.size) continue;
    target[z] = [...shared[z]!.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }
  const resolve = (z: number) => {
    for (let k = 0; k < 8 && target[z] !== z; k++) z = target[z]!;
    return z;
  };
  const compact = new Int32Array(count).fill(-1);
  let next = 0;
  for (let p = 0; p < N; p++) {
    const z = zoneOf[p]!;
    if (z < 0) continue;
    const r = resolve(z);
    if (compact[r]! < 0) compact[r] = next++;
    zoneOf[p] = compact[r]!;
  }

  // 6. Centre, depth and name of each zone.
  const sx = new Float64Array(next);
  const sy = new Float64Array(next);
  const sz = new Int32Array(next);
  const deepCount = new Int32Array(next);
  const ref = new Int32Array(next).fill(-1);
  const nameVotes = Array.from({ length: next }, () => new Map<number, number>());
  for (let p = 0; p < N; p++) {
    const z = zoneOf[p]!;
    if (z < 0) continue;
    const x = p % W;
    if (ref[z]! < 0) ref[z] = x;
    // Unwrap around the zone's first pixel so zones on the date line average correctly.
    let ux = x;
    if (ux - ref[z]! > W / 2) ux -= W;
    if (ref[z]! - ux > W / 2) ux += W;
    sx[z] += ux;
    sy[z] += (p - x) / W;
    sz[z]++;
    if (dist[p]! >= o.coastBand) deepCount[z]++;
    const n = o.nameGrid[p]!;
    if (n >= 0) nameVotes[z]!.set(n, (nameVotes[z]!.get(n) ?? 0) + 1);
  }
  const zones: SeaZone[] = [];
  for (let z = 0; z < next; z++) {
    const votes = [...nameVotes[z]!.entries()];
    const best = votes.length ? votes.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : -1;
    zones.push({
      cx: (((sx[z]! / sz[z]!) % W) + W) % W,
      cy: sy[z]! / sz[z]!,
      size: sz[z]!,
      deep: deepCount[z]! > sz[z]! / 2,
      name: best >= 0 ? o.names[best]! : "Open Sea",
    });
  }
  nameZones(zones, o);
  return { zoneOf, zones };
}

/**
 * A sea with a handful of zones gets compass names (North Adriatic Sea);
 * a big ocean gets coordinates (North Atlantic Ocean 40°N 30°W).
 */
function nameZones(zones: SeaZone[], o: SeaOptions): void {
  const groups = new Map<string, SeaZone[]>();
  for (const z of zones) groups.set(z.name, [...(groups.get(z.name) ?? []), z]);
  const used = new Set<string>();
  for (const [base, list] of groups) {
    const mx = list.reduce((s, z) => s + z.cx, 0) / list.length;
    const my = list.reduce((s, z) => s + z.cy, 0) / list.length;
    for (const z of list) {
      let name = base;
      if (list.length > 6) {
        const lat = Math.round(o.latOf(z.cy));
        const lon = Math.round(o.lonOf(z.cx));
        name = `${base} ${Math.abs(lat)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon)}°${lon >= 0 ? "E" : "W"}`;
      } else if (list.length > 1) {
        const dx = z.cx - mx;
        const dy = z.cy - my;
        const ns = dy < -Math.abs(dx) * 0.5 ? "North" : dy > Math.abs(dx) * 0.5 ? "South" : "";
        const ew = dx > Math.abs(dy) * 0.5 ? "East" : dx < -Math.abs(dy) * 0.5 ? "West" : "";
        const dir = ns && ew ? `${ns}${ew.toLowerCase()}` : ns || ew || "Central";
        name = /^(North|South|East|West)\b/.test(base) ? `${base} (${dir.toLowerCase()})` : `${dir} ${base}`;
      }
      let unique = name;
      for (let k = 2; used.has(unique); k++) unique = `${name} ${k}`;
      used.add(unique);
      z.name = unique;
    }
  }
}
