// Ban recommendations: which items to disable in-game before a run so they
// stop diluting the drop pool. Candidates are ranked by fit with the current
// build — synergy links to picks plus coverage of archetypes the build still
// lacks — ascending; the worst fits are the best bans. Independent of open
// slots (unlike suggestFor), since bans apply to the whole drop pool.
import type { Build } from "./build";
import { pickedNames } from "./build";
import type { Archetype } from "./score";
import { ARCHETYPE_POINTS, ARCHETYPES, SYNERGY_POINTS } from "./score";

export interface BanCandidate {
  name: string;
  fit: number;
}

export function recommendBans(
  build: Build,
  candidates: string[],
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
  limit: number,
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
      const coversMissing = (archetypes.get(name) ?? []).filter((a) => missing.includes(a)).length;
      return { name, fit: synergyLinks * SYNERGY_POINTS + coversMissing * ARCHETYPE_POINTS };
    })
    .sort((a, b) => a.fit - b.fit || a.name.localeCompare(b.name))
    .slice(0, limit);
}
