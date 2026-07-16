// Export/restore of the app's own state: owned unlocks + progress counters.
export interface Backup {
  megabonkBuilds: 1;
  exported: string;
  unlocked: string[];
  progress: Record<string, number>;
}

export function serializeBackup(unlocked: Set<string>, progress: Map<string, number>, exported: string): string {
  const backup: Backup = {
    megabonkBuilds: 1,
    exported,
    unlocked: [...unlocked].sort(),
    progress: Object.fromEntries(progress),
  };
  return JSON.stringify(backup, null, 2);
}

export function isBackup(data: unknown): data is Backup {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { megabonkBuilds?: unknown }).megabonkBuilds === 1 &&
    Array.isArray((data as { unlocked?: unknown }).unlocked)
  );
}

/** Parse a backup into state; unknown names are dropped against the given catalog. */
export function restoreBackup(data: Backup, knownNames: Iterable<string>): {
  unlocked: Set<string>;
  progress: Map<string, number>;
} {
  const known = new Set(knownNames);
  const unlocked = new Set(data.unlocked.filter((n) => typeof n === "string" && known.has(n)));
  const progress = new Map(
    Object.entries(data.progress ?? {}).filter(
      ([name, value]) => known.has(name) && typeof value === "number" && value > 0,
    ),
  );
  return { unlocked, progress };
}
