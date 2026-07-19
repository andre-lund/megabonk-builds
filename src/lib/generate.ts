// Greedy build completion: repeatedly take the single highest-gain suggestion
// across all kinds until nothing is open. Existing picks are never touched.
// A seed switches each step to gain-weighted sampling among near-best
// candidates, so rerolls yield different but still high-scoring builds.
import { addToBuild, firstOpenSlot, setCharacter, type Build, type SlotKind } from "./build";
import type { Archetype } from "./score";
import { suggestFor } from "./suggest";
import type { MetaIndex } from "./meta";

export interface GeneratePools {
  characters: string[];
  weapons: string[];
  tomes: string[];
  items: string[];
}

// Seeded rerolls consider the top candidates per kind whose gain is within
// this fraction of the step's best gain.
const REROLL_TOP = 5;
const REROLL_MARGIN = 0.75;

interface Candidate {
  kind: SlotKind | "character";
  name: string;
  gain: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePick(candidates: Candidate[], best: Candidate, rng: () => number): Candidate {
  if (best.gain <= 0) return best;
  const pool = candidates.filter((c) => c.gain >= best.gain * REROLL_MARGIN);
  let r = rng() * pool.reduce((sum, c) => sum + c.gain, 0);
  for (const c of pool) {
    r -= c.gain;
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

export function generateBuild(
  build: Build,
  pools: GeneratePools,
  adj: Map<string, Set<string>>,
  archetypes: Map<string, Archetype[]>,
  mapEmphasis: Archetype[] = [],
  seed?: number,
  meta: MetaIndex | null = null,
): Build {
  const rng = seed === undefined ? null : mulberry32(seed);
  let current = build;
  for (;;) {
    const open: [SlotKind | "character", string[]][] = [];
    if (current.character === null) open.push(["character", pools.characters]);
    for (const kind of ["weapon", "tome", "item"] as const) {
      if (firstOpenSlot(current, kind) !== -1) open.push([kind, pools[`${kind}s`]]);
    }
    if (open.length === 0) return current;
    const candidates: Candidate[] = [];
    for (const [kind, pool] of open) {
      for (const top of suggestFor(current, kind, pool, adj, archetypes, mapEmphasis, meta).slice(0, rng ? REROLL_TOP : 1))
        candidates.push({ kind, name: top.name, gain: top.gain });
    }
    if (candidates.length === 0) return current;
    let best = candidates[0];
    for (const c of candidates) if (c.gain > best.gain) best = c;
    const pick = rng ? samplePick(candidates, best, rng) : best;
    current = pick.kind === "character" ? setCharacter(current, pick.name) : addToBuild(current, pick.kind, pick.name);
  }
}
