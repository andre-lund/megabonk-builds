// Synergy links come from the wiki's Synergies sections and are directional in
// the data (A lists B). For display they are treated as undirected: a synergy
// is active when both endpoints are picked.
export interface SynergyEntity {
  name: string;
  synergies: string[];
}

export interface SynergyPair {
  a: string;
  b: string;
}

/** Undirected adjacency over all known entities; links to unknown pages are dropped. */
export function synergyIndex(groups: SynergyEntity[][]): Map<string, Set<string>> {
  const known = new Set(groups.flat().map((e) => e.name));
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const entity of groups.flat()) {
    for (const target of entity.synergies) {
      if (!known.has(target) || target === entity.name) continue;
      link(entity.name, target);
      link(target, entity.name);
    }
  }
  return adj;
}

/** Pairs where both endpoints are picked, deduped, stable order. */
export function activeSynergies(picked: Set<string>, adj: Map<string, Set<string>>): SynergyPair[] {
  const pairs: SynergyPair[] = [];
  const names = [...picked].sort();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (adj.get(names[i])?.has(names[j])) pairs.push({ a: names[i], b: names[j] });
    }
  }
  return pairs;
}

/** Would picking `name` link with anything already picked? */
export function synergizesWithBuild(name: string, picked: Set<string>, adj: Map<string, Set<string>>): boolean {
  const targets = adj.get(name);
  if (!targets) return false;
  for (const p of picked) if (p !== name && targets.has(p)) return true;
  return false;
}
