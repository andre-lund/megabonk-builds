// Generate exclusions: entities the user never wants auto-picked by Generate.
// Persisted in localStorage; empty by default. Excluded entities stay pickable
// by hand — they are only removed from the generate pools.
import type { GeneratePools } from "./generate";

const STORAGE_KEY = "megabonk-excluded";

export function loadExcluded(storage: Storage): Set<string> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    // fall through to empty on corrupt storage
  }
  return new Set();
}

export function saveExcluded(excluded: Set<string>, storage: Storage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify([...excluded]));
}

export function toggleExcluded(excluded: Set<string>, name: string): Set<string> {
  const next = new Set(excluded);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  return next;
}

export function excludeFromPools(pools: GeneratePools, excluded: Set<string>): GeneratePools {
  if (excluded.size === 0) return pools;
  const keep = (names: string[]) => names.filter((n) => !excluded.has(n));
  return {
    characters: keep(pools.characters),
    weapons: keep(pools.weapons),
    tomes: keep(pools.tomes),
    items: keep(pools.items),
  };
}
