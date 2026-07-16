// Greedy build completion: repeatedly take the single highest-gain suggestion
// across all kinds until nothing is open. Existing picks are never touched.
import { addToBuild, firstOpenSlot, setCharacter, type Build, type SlotKind } from "./build";
import type { Archetype } from "./score";
import { suggestFor } from "./suggest";

export interface GeneratePools {
  characters: string[];
  weapons: string[];
  tomes: string[];
  items: string[];
}

export function generateBuild(
  build: Build,
  pools: GeneratePools,
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
): Build {
  let current = build;
  for (;;) {
    const open: [SlotKind | "character", string[]][] = [];
    if (current.character === null) open.push(["character", pools.characters]);
    for (const kind of ["weapon", "tome", "item"] as const) {
      if (firstOpenSlot(current, kind) !== -1) open.push([kind, pools[`${kind}s`]]);
    }
    if (open.length === 0) return current;
    let best: { kind: SlotKind | "character"; name: string; gain: number } | null = null;
    for (const [kind, pool] of open) {
      const top = suggestFor(current, kind, pool, adj, archetypes)[0];
      if (top && (!best || top.gain > best.gain)) best = { kind, name: top.name, gain: top.gain };
    }
    if (!best) return current;
    current =
      best.kind === "character" ? setCharacter(current, best.name) : addToBuild(current, best.kind, best.name);
  }
}
