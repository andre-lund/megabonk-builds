// Ownership tracking: which entities the player has unlocked. Persisted in
// localStorage; seeded with everything available by default.
export interface UnlockEntity {
  name: string;
  unlock: string;
}

const STORAGE_KEY = "megabonk-unlocked";
export const FILTER_KEY = "megabonk-only-unlocked";

/** Entities available without an unlock condition. */
export function defaultUnlocked(groups: UnlockEntity[][]): Set<string> {
  return new Set(
    groups
      .flat()
      .filter((e) => !e.unlock || /^default|^starter|^starting|available at start/i.test(e.unlock))
      .map((e) => e.name),
  );
}

export function loadUnlocked(defaults: Set<string>, storage: Storage): Set<string> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return new Set(defaults);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    // fall through to defaults on corrupt storage
  }
  return new Set(defaults);
}

export function saveUnlocked(unlocked: Set<string>, storage: Storage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
}

export function toggleUnlocked(unlocked: Set<string>, name: string): Set<string> {
  const next = new Set(unlocked);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  return next;
}
