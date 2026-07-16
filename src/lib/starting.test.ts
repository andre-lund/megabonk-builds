import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter } from "./build";
import { enforceStartingWeapon, isStartingSlot, startingWeaponIndex } from "./starting";
import charactersJson from "../data/characters.json";

const weaponOf = startingWeaponIndex(charactersJson);

describe("starting weapon rule", () => {
  it("fills slot 0 when a character is picked", () => {
    const b = enforceStartingWeapon(setCharacter(emptyBuild(), "Ninja"), weaponOf);
    expect(b.weapons[0]).toBe("Katana");
    expect(isStartingSlot(b, "weapon", 0, weaponOf)).toBe(true);
  });

  it("swaps the starting weapon into slot 0 if it sits elsewhere", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    b = addToBuild(b, "weapon", "Axe");
    b = addToBuild(b, "weapon", "Katana");
    b = enforceStartingWeapon(b, weaponOf);
    expect(b.weapons[0]).toBe("Katana");
    expect(b.weapons[1]).toBe("Axe");
  });

  it("pushes a displaced weapon to an open slot, drops it when full", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    for (const w of ["Axe", "Aura", "Bone"]) b = addToBuild(b, "weapon", w);
    const pushed = enforceStartingWeapon(b, weaponOf);
    expect(pushed.weapons[0]).toBe("Katana");
    expect(pushed.weapons).toContain("Axe");
    let full = setCharacter(emptyBuild(), "Ninja");
    for (const w of ["Axe", "Aura", "Bone", "Sword"]) full = addToBuild(full, "weapon", w);
    const dropped = enforceStartingWeapon(full, weaponOf);
    expect(dropped.weapons[0]).toBe("Katana");
    expect(dropped.weapons).not.toContain("Axe");
    expect(dropped.weapons.filter(Boolean)).toHaveLength(4);
  });

  it("no-ops without a character and keeps working for dataset-less weapons (Robinette's Bow)", () => {
    expect(enforceStartingWeapon(emptyBuild(), weaponOf)).toEqual(emptyBuild());
    const b = enforceStartingWeapon(setCharacter(emptyBuild(), "Robinette"), weaponOf);
    expect(b.weapons[0]).toBe("Bow");
  });

  it("is not a starting slot once the character is cleared", () => {
    let b = enforceStartingWeapon(setCharacter(emptyBuild(), "Ninja"), weaponOf);
    b = setCharacter(b, null);
    expect(isStartingSlot(b, "weapon", 0, weaponOf)).toBe(false);
  });
});
