// Build shape mirrors the wiki's {{Build}} template: 1 character,
// 4 weapon slots (slot 0 = starting weapon), 4 tomes, 6 items.
export const WEAPON_SLOTS = 4;
export const TOME_SLOTS = 4;
export const ITEM_SLOTS = 6;

export type SlotKind = "weapon" | "tome" | "item";

export interface Build {
  character: string | null;
  map: string | null;
  weapons: (string | null)[];
  tomes: (string | null)[];
  items: (string | null)[];
}

export function emptyBuild(): Build {
  return {
    character: null,
    map: null,
    weapons: Array(WEAPON_SLOTS).fill(null),
    tomes: Array(TOME_SLOTS).fill(null),
    items: Array(ITEM_SLOTS).fill(null),
  };
}

export function setMap(build: Build, map: string | null): Build {
  return { ...build, map };
}

function slotArray(build: Build, kind: SlotKind): (string | null)[] {
  return kind === "weapon" ? build.weapons : kind === "tome" ? build.tomes : build.items;
}

/** Set a slot; a name already present in another slot of the same kind moves, never duplicates. */
export function setSlot(build: Build, kind: SlotKind, index: number, name: string): Build {
  const next = { ...build, weapons: [...build.weapons], tomes: [...build.tomes], items: [...build.items] };
  const slots = slotArray(next, kind);
  const existing = slots.indexOf(name);
  if (existing !== -1) slots[existing] = null;
  slots[index] = name;
  return next;
}

export function clearSlot(build: Build, kind: SlotKind, index: number): Build {
  const next = { ...build, weapons: [...build.weapons], tomes: [...build.tomes], items: [...build.items] };
  slotArray(next, kind)[index] = null;
  return next;
}

/** First open slot of a kind, or -1 when full. */
export function firstOpenSlot(build: Build, kind: SlotKind): number {
  return slotArray(build, kind).indexOf(null);
}

/** Add to the first open slot (no-op when full or already picked). Returns the same build if unchanged. */
export function addToBuild(build: Build, kind: SlotKind, name: string): Build {
  if (slotArray(build, kind).includes(name)) return build;
  const index = firstOpenSlot(build, kind);
  if (index === -1) return build;
  return setSlot(build, kind, index, name);
}

export function setCharacter(build: Build, name: string | null): Build {
  return { ...build, character: name };
}

export function pickedNames(build: Build): Set<string> {
  return new Set(
    [build.character, ...build.weapons, ...build.tomes, ...build.items].filter((n): n is string => n !== null),
  );
}
