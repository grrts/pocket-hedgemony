/**
 * Seeded xoshiro128** generator. Same seed, same sequence, on every platform,
 * which keeps turns reproducible for replays, saves and server-side checks.
 * Its whole state is four uint32s so it can live inside a save file.
 */
export class Rng {
  readonly state: Uint32Array;

  constructor(seed: number | Uint32Array) {
    if (seed instanceof Uint32Array) {
      this.state = new Uint32Array(seed);
      return;
    }
    this.state = new Uint32Array(4);
    // splitmix32 to spread a single seed over the four words.
    let s = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      this.state[i] = (z ^ (z >>> 16)) >>> 0;
    }
  }

  nextU32(): number {
    const s = this.state;
    let s0 = s[0]!, s1 = s[1]!, s2 = s[2]!, s3 = s[3]!;
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);
    s[0] = s0;
    s[1] = s1;
    s[2] = s2;
    s[3] = s3;
    return result;
  }

  /** Float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Integer in [0, max). */
  int(max: number): number {
    return Math.floor(this.next() * max);
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
