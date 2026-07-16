// Unlock progress: user-entered counters toward unlock goals, persisted in
// localStorage. Goals are parsed heuristically from the wiki unlock text.
const STORAGE_KEY = "megabonk-progress";

/** First non-percentage number in the unlock text ("Kill 2,000 enemies" -> 2000), null if none. */
export function parseGoal(unlock: string): number | null {
  for (const m of unlock.matchAll(/(\d[\d,]*)(\s*%)?/g)) {
    if (m[2]) continue;
    const n = Number(m[1].replaceAll(",", ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function loadProgress(storage: Storage): Map<string, number> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return new Map();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return new Map(Object.entries(parsed).filter(([, v]) => typeof v === "number") as [string, number][]);
    }
  } catch {
    // corrupt storage -> empty
  }
  return new Map();
}

export function saveProgress(progress: Map<string, number>, storage: Storage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(progress)));
}

export function setProgress(progress: Map<string, number>, name: string, value: number): Map<string, number> {
  const next = new Map(progress);
  if (value > 0) next.set(name, value);
  else next.delete(name);
  return next;
}
