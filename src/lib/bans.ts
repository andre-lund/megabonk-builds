// Ban recommendations: which items to disable in-game before a run so they
// stop diluting the drop pool. An item earns "keep" fit from synergy links to
// picks, coverage of archetypes the build still lacks, alignment with
// archetypes the build already stacks, and intrinsic power (rarity prior) —
// only items below a fit cutoff are recommended, so the list size tracks how
// much actual dead weight exists. Independent of open slots (unlike
// suggestFor), since bans apply to the whole drop pool.
import type { Build } from "./build";
import { pickedNames } from "./build";
import type { Archetype } from "./score";
import { ARCHETYPE_POINTS, ARCHETYPES, SYNERGY_POINTS } from "./score";
import type { MetaIndex } from "./meta";

export interface BanCandidate {
  name: string;
  fit: number;
}

// Intrinsic power: a Legendary needs no build-specific reason to stay in the
// pool (prior equals one missing-archetype coverage).
export const RARITY_PRIOR: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 3,
  epic: 5,
  legendary: 8,
};

export const ALIGN_POINTS = 2;
export const BAN_CUTOFF = 4;
export const BAN_LIMIT = 20;
// Empirical keep-signal (ADR-0001): an item proven across top runs earns fit
// even without a build-specific reason, so genuinely popular items are not
// banned. Graded by usage (a binary "never used" rule is vacuous — nearly
// every item appears in ≥1 run), so only low-usage filler still falls through.
// 8 protects a ~50%+ usage item outright (past the cutoff on its own).
export const META_KEEP = 8;

export function recommendBans(
  build: Build,
  candidates: string[],
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
  rarityOf: Map<string, string>,
  meta: MetaIndex | null = null,
  limit: number = BAN_LIMIT,
): BanCandidate[] {
  const picked = pickedNames(build);
  const covered = new Set<Archetype>();
  for (const name of picked) for (const a of archetypes.get(name) ?? []) covered.add(a);
  const missing = ARCHETYPES.filter((a) => !covered.has(a));
  return candidates
    .filter((name) => !picked.has(name))
    .map((name) => {
      const links = adj.get(name);
      let synergyLinks = 0;
      if (links) for (const p of picked) if (links.has(p)) synergyLinks++;
      const kinds = archetypes.get(name) ?? [];
      const coversMissing = kinds.filter((a) => missing.includes(a)).length;
      const aligned = kinds.filter((a) => covered.has(a)).length;
      const rarity = RARITY_PRIOR[rarityOf.get(name)?.toLowerCase() ?? ""] ?? 0;
      const metaKeep = meta ? META_KEEP * meta.usageFrac(build.character, name) : 0;
      return {
        name,
        fit: synergyLinks * SYNERGY_POINTS + coversMissing * ARCHETYPE_POINTS + aligned * ALIGN_POINTS + rarity + metaKeep,
      };
    })
    .filter((c) => c.fit < BAN_CUTOFF)
    .sort((a, b) => a.fit - b.fit || a.name.localeCompare(b.name))
    .slice(0, limit);
}
