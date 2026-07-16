// Starting-weapon rule: a selected character always carries their default
// weapon in weapon slot 0, mirroring the game (you cannot drop it). Applied
// on every build change so URL loads, imports, and Generate obey it too.
import type { Build } from "./build";

/** name -> default weapon, from the characters dataset. */
export function startingWeaponIndex(characters: { name: string; weapon: string }[]): Map<string, string> {
  return new Map(characters.filter((c) => c.weapon).map((c) => [c.name, c.weapon]));
}

export function enforceStartingWeapon(build: Build, weaponOf: Map<string, string>): Build {
  const w = build.character ? weaponOf.get(build.character) : undefined;
  if (!w || build.weapons[0] === w) return build;
  const weapons = [...build.weapons];
  const displaced = weapons[0];
  const existing = weapons.indexOf(w);
  if (existing !== -1) {
    // Swap the starting weapon into slot 0.
    weapons[existing] = displaced;
  } else {
    // Push the displaced weapon to the first open slot; drop it when full.
    const open = weapons.indexOf(null, 1);
    if (displaced !== null && open !== -1) weapons[open] = displaced;
  }
  weapons[0] = w;
  return { ...build, weapons };
}

/** Is this slot pinned by the starting-weapon rule? */
export function isStartingSlot(build: Build, kind: string, index: number, weaponOf: Map<string, string>): boolean {
  return (
    kind === "weapon" &&
    index === 0 &&
    build.character !== null &&
    weaponOf.get(build.character) === build.weapons[0] &&
    build.weapons[0] !== null
  );
}
