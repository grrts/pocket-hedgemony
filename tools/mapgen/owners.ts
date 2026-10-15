// Hands provinces to 1444 nations and rolls their development.

export interface NationSource {
  id: string;
  name: string;
  /** [lon, lat] of the capital city. */
  capital: [number, number];
  color?: string;
  commanders?: { name: string; fire: number; shock: number; maneuver: number; siege: number }[];
}

/**
 * First matching rule wins. Every listed condition must hold:
 * countries (modern ISO3 code), admin1 (modern state/province name),
 * regions (Natural Earth's grouping inside a country), bbox [w, s, e, n] on the
 * province centre. nation null leaves the land unowned.
 */
export interface OwnerRule {
  nation: string | null;
  countries?: string[];
  admin1?: string[];
  regions?: string[];
  bbox?: [number, number, number, number];
}

interface ProvinceIn {
  id: string;
  name: string;
  country: string;
  admin1: string;
  region: string;
  lon: number;
  lat: number;
  x: number;
  y: number;
  size: number;
  coastal: boolean;
  terrain: string;
  neighbors: string[];
}

const inBox = (lon: number, lat: number, b: number[]) => lon >= b[0]! && lat >= b[1]! && lon <= b[2]! && lat <= b[3]!;

/** Small deterministic hash so development doesn't change between runs. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function matchOwner(
  rules: OwnerRule[],
  p: { country: string; admin1: string; region: string; lon: number; lat: number },
): string | null {
  const rule = rules.find(
    (r) =>
      (!r.countries || r.countries.includes(p.country)) &&
      (!r.admin1 || r.admin1.includes(p.admin1)) &&
      (!r.regions || r.regions.includes(p.region)) &&
      (!r.bbox || inBox(p.lon, p.lat, r.bbox)),
  );
  return rule ? rule.nation : null;
}

export function assignOwners(
  provinces: ProvinceIn[],
  nations: NationSource[],
  rules: OwnerRule[],
  config: any,
  provinceAt: (lon: number, lat: number) => string | null,
) {
  const nationIds = new Set(nations.map((n) => n.id));
  for (const r of rules) if (r.nation !== null && !nationIds.has(r.nation)) throw new Error(`owners rule names unknown nation ${r.nation}`);

  const owner = new Map<string, string | null>();
  for (const p of provinces) {
    owner.set(p.id, matchOwner(rules, p));
  }

  const capitals = new Map<string, string>();
  for (const n of nations) {
    const at = provinceAt(n.capital[0], n.capital[1]);
    if (!at) throw new Error(`${n.id}: capital ${n.capital} is in the sea`);
    if (owner.get(at) !== n.id) console.warn(`warning: ${n.id} capital ${at} was owned by ${owner.get(at)}; giving it to ${n.id}`);
    owner.set(at, n.id);
    capitals.set(n.id, at);
  }
  const owned = new Map<string, number>();
  for (const o of owner.values()) if (o) owned.set(o, (owned.get(o) ?? 0) + 1);

  // Colours: fixed where a nation names one, else the first palette colour no neighbour uses.
  const nationNeighbors = new Map<string, Set<string>>();
  for (const p of provinces) {
    const a = owner.get(p.id);
    if (!a) continue;
    for (const nb of p.neighbors) {
      const b = owner.get(nb);
      if (b && b !== a) {
        if (!nationNeighbors.has(a)) nationNeighbors.set(a, new Set());
        nationNeighbors.get(a)!.add(b);
      }
    }
  }
  const color = new Map<string, string>();
  for (const n of nations) if (n.color) color.set(n.id, n.color);
  const bySize = [...nations].sort((a, b) => (owned.get(b.id) ?? 0) - (owned.get(a.id) ?? 0));
  for (const n of bySize) {
    if (color.has(n.id)) continue;
    const taken = new Set([...(nationNeighbors.get(n.id) ?? [])].map((m) => color.get(m)));
    const free = config.palette.filter((c: string) => !taken.has(c));
    color.set(n.id, free[Math.floor(hash(n.id) * free.length)] ?? config.palette[0]);
  }

  const outProvinces = provinces.map((p) => {
    const o = owner.get(p.id) ?? null;
    const zone = config.development.find((z: any) => inBox(p.lon, p.lat, z.bbox));
    let base = o ? (zone?.base ?? config.defaultDevelopment + 1) : config.defaultDevelopment;
    if (p.terrain === "mountains" || p.terrain === "desert" || p.terrain === "tundra") base = Math.max(1, base - 2);
    if (p.terrain === "farmland" || p.terrain === "marsh") base += 1;
    if (p.coastal && o) base += 1;
    const roll = (k: string) => Math.max(1, Math.round(base * (0.6 + 0.8 * hash(p.id + k))));
    const isCapital = o !== null && capitals.get(o) === p.id;
    const bonus = isCapital ? 3 : 0;
    return {
      id: p.id,
      name: p.name,
      owner: o,
      terrain: p.terrain,
      tax: roll("t") + bonus,
      production: roll("p") + bonus,
      manpower: roll("m") + bonus,
      x: p.x,
      y: p.y,
      coastal: p.coastal,
      neighbors: p.neighbors,
    };
  });

  const outNations = nations
    .filter((n) => (owned.get(n.id) ?? 0) > 0)
    .map((n) => ({
      id: n.id,
      name: n.name,
      color: color.get(n.id)!,
      capital: capitals.get(n.id)!,
      // Every nation fields at least one named commander, so every army on the map has a face.
      commanders: (n.commanders?.length ? n.commanders : [{ name: `General of ${n.name}`, fire: 1, shock: 1, maneuver: 1, siege: 1 }]).map((c, i) => ({
        id: `${n.id}_${i + 1}`,
        ...c,
      })),
    }));

  return { provinces: outProvinces, nations: outNations };
}
