// Heuristic build score — not a game sim (see plan decision log). Three
// components: active synergy pairs, archetype coverage classified from
// stat/effect text, and slot completeness.
import type { Build } from "./build";
import { pickedNames } from "./build";
import { activeSynergies } from "./synergy";

export const ARCHETYPES = ["damage", "defense", "mobility", "utility"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

const ARCHETYPE_PATTERNS: Record<Archetype, RegExp> = {
  damage: /damage|crit|precision|projectile|quantity|attack|cooldown|size|burn|fire|lightning|ice|freeze|poison|summon/i,
  defense: /armor|health|hp\b|max hp|evasion|evade|shield|heal|regen|lifesteal|leech|revive/i,
  mobility: /speed|agility|dash|movement|moving|jump/i,
  utility: /luck|xp|experience|gold|silver|money|magnet|attraction|pickup|duration|curse|reroll|choice|chest|reward|shrine/i,
};

export interface ScoredEntity {
  name: string;
  text: string;
}

/** name -> archetypes, classified from each entity's descriptive text. */
export function archetypeIndex(groups: ScoredEntity[][]): Map<string, Archetype[]> {
  const index = new Map<string, Archetype[]>();
  for (const e of groups.flat()) {
    index.set(
      e.name,
      ARCHETYPES.filter((a) => ARCHETYPE_PATTERNS[a].test(e.text)),
    );
  }
  return index;
}

export const SYNERGY_POINTS = 10;
export const ARCHETYPE_POINTS = 8;
export const SLOT_POINTS = 1;
// Per picked entity carrying a map-emphasized archetype — per-entity (not
// coverage-once) so stacking the emphasized archetype keeps paying.
export const MAP_POINTS = 3;

export interface Score {
  total: number;
  synergyPairs: number;
  covered: Archetype[];
  filledSlots: number;
  mapBonus: number;
}

const TIERS: [number, string][] = [
  [80, "S"],
  [60, "A"],
  [40, "B"],
  [20, "C"],
  [0, "D"],
];

export function tier(total: number): string {
  return TIERS.find(([min]) => total >= min)![1];
}

export function scoreBuild(
  build: Build,
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
  mapEmphasis: Archetype[] = [],
): Score {
  const picked = pickedNames(build);
  const synergyPairs = activeSynergies(picked, adj).length;
  const coveredSet = new Set<Archetype>();
  let mapBonus = 0;
  for (const name of picked) {
    const list = archetypes.get(name) ?? [];
    for (const a of list) coveredSet.add(a);
    mapBonus += list.filter((a) => mapEmphasis.includes(a)).length * MAP_POINTS;
  }
  const covered = ARCHETYPES.filter((a) => coveredSet.has(a));
  const filledSlots = picked.size;
  return {
    total: synergyPairs * SYNERGY_POINTS + covered.length * ARCHETYPE_POINTS + filledSlots * SLOT_POINTS + mapBonus,
    synergyPairs,
    covered,
    filledSlots,
    mapBonus,
  };
}
