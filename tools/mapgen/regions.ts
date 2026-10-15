/**
 * Turns a grid of admin-region ids into game provinces of even-ish size:
 * tiny regions merge into a neighbour, huge ones split with k-means.
 * Everything is deterministic so re-running gives the same map.
 */

export interface RegionGrid {
  width: number;
  height: number;
  /** Region label per pixel, -1 for water. Rewritten in place. */
  label: Int32Array;
}

/** Labels 4-connected pixels that share a source id. Returns the component count. */
export function connectedComponents(width: number, height: number, source: Int32Array, out: Int32Array): number {
  out.fill(-1);
  let next = 0;
  const stack: number[] = [];
  for (let start = 0; start < source.length; start++) {
    if (source[start]! < 0 || out[start]! >= 0) continue;
    const id = next++;
    const src = source[start]!;
    out[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p - x) / width;
      const visit = (q: number) => {
        if (out[q]! < 0 && source[q] === src) {
          out[q] = id;
          stack.push(q);
        }
      };
      // The map wraps east-west.
      visit(y * width + ((x + 1) % width));
      visit(y * width + ((x - 1 + width) % width));
      if (y > 0) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
  }
  return next;
}

/** Calls fn(a, b) once per pair of 4-neighbouring pixels with different non-negative labels. */
export function forEachBorder(width: number, height: number, label: Int32Array, fn: (a: number, b: number) => void): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const a = label[p]!;
      if (a < 0) continue;
      const right = label[y * width + ((x + 1) % width)]!;
      if (right >= 0 && right !== a) fn(a, right);
      if (y < height - 1) {
        const down = label[p + width]!;
        if (down >= 0 && down !== a) fn(a, down);
      }
    }
  }
}

export interface MergeInput {
  count: number;
  size: number[];
  /** Merging prefers neighbours with the same group (country). */
  group: number[];
  /** Minimum acceptable size for each region. */
  minSize: number[];
}

/**
 * Merges every region below its minimum size into its smallest neighbour,
 * preferring neighbours in the same group. Returns the new id for each old id.
 */
export function mergeSmall(grid: RegionGrid, input: MergeInput): Int32Array {
  const parent = Int32Array.from({ length: input.count }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]!]!;
    return i;
  };
  const size = [...input.size];
  const neighbors: Map<number, number>[] = Array.from({ length: input.count }, () => new Map());
  forEachBorder(grid.width, grid.height, grid.label, (a, b) => {
    neighbors[a]!.set(b, (neighbors[a]!.get(b) ?? 0) + 1);
    neighbors[b]!.set(a, (neighbors[b]!.get(a) ?? 0) + 1);
  });

  const order = [...Array(input.count).keys()].sort((a, b) => size[a]! - size[b]! || a - b);
  for (const start of order) {
    const r = find(start);
    if (size[r]! >= input.minSize[r]!) continue;
    let best = -1;
    let bestScore = Infinity;
    for (const [nb] of neighbors[r]!) {
      const n = find(nb);
      if (n === r) continue;
      // Same-country neighbours always win; then the smallest.
      const score = (input.group[n] === input.group[r] ? 0 : 1e9) + size[n]!;
      if (score < bestScore || (score === bestScore && n < best)) {
        bestScore = score;
        best = n;
      }
    }
    if (best < 0) continue; // an island with no neighbours stays as it is
    parent[r] = best;
    size[best]! += size[r]!;
    for (const [nb, w] of neighbors[r]!) {
      const n = find(nb);
      if (n === best) continue;
      neighbors[best]!.set(n, (neighbors[best]!.get(n) ?? 0) + w);
      neighbors[n]!.set(best, (neighbors[n]!.get(best) ?? 0) + w);
    }
    // Small regions can now absorb this one's own small leftovers.
    input.minSize[best] = Math.max(input.minSize[best]!, input.minSize[r]!);
  }

  const remap = new Int32Array(input.count);
  for (let i = 0; i < input.count; i++) remap[i] = find(i);
  for (let p = 0; p < grid.label.length; p++) if (grid.label[p]! >= 0) grid.label[p] = remap[grid.label[p]!]!;
  return remap;
}

/**
 * Splits one region's pixels into k compact, connected parts with k-means.
 * Distances use real ground distance (longitude shrinks with latitude).
 * Returns a part index (0..k-1) per input pixel.
 */
export function splitRegion(pixels: Int32Array, k: number, width: number, latOfRow: (y: number) => number): Int32Array {
  const n = pixels.length;
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  let meanX = 0;
  for (let i = 0; i < n; i++) {
    const p = pixels[i]!;
    const y = Math.floor(p / width);
    py[i] = y;
    px[i] = p - y * width;
    meanX += px[i]!;
  }
  // Regions crossing the antimeridian: unwrap x around the mean.
  meanX /= n;
  for (let i = 0; i < n; i++) {
    if (px[i]! - meanX > width / 2) px[i]! -= width;
    else if (meanX - px[i]! > width / 2) px[i]! += width;
  }
  // Scale around the mean so the shrink doesn't skew rows against each other.
  for (let i = 0; i < n; i++) px[i] = (px[i]! - meanX) * Math.cos((latOfRow(py[i]!) * Math.PI) / 180);

  // Farthest-point seeding from the first pixel: deterministic and well spread.
  const cx = new Float64Array(k);
  const cy = new Float64Array(k);
  const dist = new Float64Array(n).fill(Infinity);
  let seed = 0;
  for (let c = 0; c < k; c++) {
    cx[c] = px[seed]!;
    cy[c] = py[seed]!;
    let far = 0;
    for (let i = 0; i < n; i++) {
      const d = (px[i]! - cx[c]!) ** 2 + (py[i]! - cy[c]!) ** 2;
      if (d < dist[i]!) dist[i] = d;
      if (dist[i]! > dist[far]!) far = i;
    }
    seed = far;
  }

  const assign = new Int32Array(n);
  for (let iter = 0; iter < 12; iter++) {
    const sx = new Float64Array(k);
    const sy = new Float64Array(k);
    const cnt = new Float64Array(k);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (px[i]! - cx[c]!) ** 2 + (py[i]! - cy[c]!) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
      sx[best]! += px[i]!;
      sy[best]! += py[i]!;
      cnt[best]!++;
    }
    for (let c = 0; c < k; c++) {
      if (cnt[c]! > 0) {
        cx[c] = sx[c]! / cnt[c]!;
        cy[c] = sy[c]! / cnt[c]!;
      }
    }
  }
  return assign;
}
