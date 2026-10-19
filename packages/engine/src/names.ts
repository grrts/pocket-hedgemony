import type { CultureNames, Rank, Ruleset } from "@ph/rules";

/**
 * Names for the people of a realm, from its culture (feedback 33): officials,
 * the commanders commissioned from them, and hired captains. A province's
 * official is worked out from the province and its owner alone, so the same
 * official keeps the same name in every snapshot, takes it along when
 * commissioned, and brings it back to the post when released.
 */

/** A well-mixed 32-bit hash of two numbers. */
export function mix(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x6a09e667, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** The names a realm's people take, or null when the ruleset has none. */
export function cultureOf(rules: Ruleset, nation: number): CultureNames | null {
  const book = rules.names;
  if (!book) return null;
  const id = rules.nations[nation]?.id ?? "";
  return book.cultures[book.nations[id] ?? book.fallback] ?? book.cultures[book.fallback] ?? null;
}

/**
 * A person's name in a realm's culture, picked by `seed`; `place` names the
 * province for cultures that go by "of". `given` keeps a given name chosen
 * elsewhere (a free company's captain) and puts the culture's name around it.
 */
export function personName(rules: Ruleset, nation: number, seed: number, place: string, given?: string): string {
  const c = cultureOf(rules, nation);
  if (!c) {
    const names = rules.defines.recruit.commanderNames;
    return `${given ?? names[seed % names.length]} of ${place}`;
  }
  const pick = <T>(xs: readonly T[], salt: number) => xs[mix(seed, salt) % xs.length]!;
  given ??= pick(c.given, 1);
  switch (c.style) {
    case "family":
      return `${given} ${pick(c.family!, 2)}`;
    case "family_first":
      return `${pick(c.family!, 2)} ${given}`;
    case "patronym": {
      // The father is another name of the same list.
      const father = c.given.length > 1 ? c.given[(c.given.indexOf(given) + 1 + (mix(seed, 3) % (c.given.length - 1))) % c.given.length]! : given;
      return `${given} ${c.patronym ?? "son of"} ${father}`;
    }
    case "title":
      return `${given} ${pick(c.title!, 2)}`;
    case "of":
      return `${given} of ${place}`;
    default:
      return given;
  }
}

/** A member of a named house: the house as his family name where the culture has them, else as personName gives it. */
export function houseMemberName(rules: Ruleset, nation: number, seed: number, house: string): string {
  const c = cultureOf(rules, nation);
  const given = c ? c.given[mix(seed, 1) % c.given.length]! : undefined;
  if (c?.style === "family_first") return `${house} ${given}`;
  if (c?.style === "family") return `${given} ${house}`;
  return personName(rules, nation, seed, house);
}

/**
 * A name with its rank in the realm's language (feedback 125): "Almirante
 * Fernão Coutinho", "Hosokawa Katsumoto Taishō". A culture without that rank
 * gives the name alone.
 */
export function rankedName(rules: Ruleset, nation: number, name: string, rank: Rank): string {
  const pattern = cultureOf(rules, nation)?.ranks?.[rank];
  return pattern ? pattern.replace("{name}", name) : name;
}

/** The name of the official who holds province p's post for its owner. */
export function officialName(rules: Ruleset, p: number, owner: number): string {
  return personName(rules, owner, mix(p, owner + 1), rules.provinces[p]!.name);
}
