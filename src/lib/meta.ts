// Empirical meta signal from megabonk.leaderboard.gg (ADR-0001): how often each
// weapon/tome/item actually appears in video-verified top runs. Distinct from
// the wiki synergy/archetype model — this is observed usage, not editorial
// intent. Ingested by scripts/ingest-leaderboard.mjs into data/leaderboard.json.

export interface CharacterMeta {
  character: string;
  totalRuns: number;
  topKillCount: number;
  usage: { weapons: Record<string, number>; tomes: Record<string, number>; items: Record<string, number> };
}

export interface CoEdge {
  a: string;
  b: string;
  kind: string;
  support: number;
  lift: number;
}

export interface LeaderboardData {
  source: string;
  version: string;
  fetched: string;
  totalRuns: number;
  unmatched: Record<string, string[]>;
  characters: CharacterMeta[];
  cooccurrence: CoEdge[];
}

export interface MetaIndex {
  version: string;
  /**
   * Sample-shrunk fraction of a character's top runs that use `name` (0..1).
   * `character` null (or unknown) falls back to the pooled global fraction.
   */
  usageFrac(character: string | null, name: string): number;
  /** Undirected discovered co-occurrence adjacency (name -> co-occurring names). */
  cooAdj: Map<string, Set<string>>;
  /** Do `a` and `b` form a discovered co-occurrence edge? */
  hasCoo(a: string, b: string): boolean;
}

// Shrinkage strength: a character's per-item rate is pulled toward the global
// prior by K pseudo-runs. K ~= a mid-sized character's run count, so high-n
// characters (fox 177) barely move while low-n ones (ninja 9), where every
// appearing item reads as 1.0, are pulled toward the pooled rate.
export const SHRINK_K = 20;

/** Merge a character's per-kind usage counts into one name -> count map. */
function flattenUsage(usage: CharacterMeta["usage"]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const kind of ["weapons", "tomes", "items"] as const)
    for (const [name, count] of Object.entries(usage[kind])) counts.set(name, (counts.get(name) ?? 0) + count);
  return counts;
}

export function buildMetaIndex(data: LeaderboardData): MetaIndex {
  const perChar = new Map<string, { runs: number; counts: Map<string, number> }>();
  const globalCount = new Map<string, number>();
  for (const c of data.characters) {
    const counts = flattenUsage(c.usage);
    perChar.set(c.character, { runs: c.totalRuns, counts });
    for (const [name, count] of counts) globalCount.set(name, (globalCount.get(name) ?? 0) + count);
  }
  const globalRuns = data.totalRuns || 1;
  const globalFrac = (name: string) => (globalCount.get(name) ?? 0) / globalRuns;

  const cooAdj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!cooAdj.has(a)) cooAdj.set(a, new Set());
    cooAdj.get(a)!.add(b);
  };
  for (const e of data.cooccurrence) {
    link(e.a, e.b);
    link(e.b, e.a);
  }

  return {
    version: data.version,
    usageFrac(character, name) {
      const g = globalFrac(name);
      const c = character === null ? undefined : perChar.get(character);
      if (!c) return g;
      const count = c.counts.get(name) ?? 0;
      return (count + SHRINK_K * g) / (c.runs + SHRINK_K);
    },
    cooAdj,
    hasCoo: (a, b) => cooAdj.get(a)?.has(b) ?? false,
  };
}
