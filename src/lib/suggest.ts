// Slot suggestions: rank candidates by marginal score gain — the score with
// the candidate added minus the current score. Slots of a kind are
// interchangeable, so one ranking per kind covers all its open slots.
import { addToBuild, firstOpenSlot, pickedNames, setCharacter, type Build, type SlotKind } from "./build";
import type { Archetype } from "./score";
import { scoreBuild } from "./score";
import type { MetaIndex } from "./meta";

export interface Suggestion {
  name: string;
  gain: number;
}

export function suggestFor(
  build: Build,
  kind: SlotKind | "character",
  candidates: string[],
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
  mapEmphasis: Archetype[] = [],
  meta: MetaIndex | null = null,
): Suggestion[] {
  if (kind === "character" ? build.character !== null : firstOpenSlot(build, kind) === -1) return [];
  const picked = pickedNames(build);
  const base = scoreBuild(build, adj, archetypes, mapEmphasis, meta).total;
  return candidates
    .filter((name) => !picked.has(name))
    .map((name) => {
      const next = kind === "character" ? setCharacter(build, name) : addToBuild(build, kind, name);
      return { name, gain: scoreBuild(next, adj, archetypes, mapEmphasis, meta).total - base };
    })
    .sort((a, b) => b.gain - a.gain || a.name.localeCompare(b.name));
}
