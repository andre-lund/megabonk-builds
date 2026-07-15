import { describe, expect, it } from "vitest";
import { addToBuild, clearSlot, emptyBuild, firstOpenSlot, pickedNames, setCharacter, setSlot } from "./build";

describe("build model", () => {
  it("creates an empty build with the wiki template's slot counts", () => {
    const b = emptyBuild();
    expect(b.character).toBeNull();
    expect(b.weapons).toHaveLength(4);
    expect(b.tomes).toHaveLength(4);
    expect(b.items).toHaveLength(6);
  });

  it("sets and clears slots immutably", () => {
    const b = emptyBuild();
    const b2 = setSlot(b, "weapon", 0, "Katana");
    expect(b2.weapons[0]).toBe("Katana");
    expect(b.weapons[0]).toBeNull();
    expect(clearSlot(b2, "weapon", 0).weapons[0]).toBeNull();
  });

  it("moves instead of duplicating within a kind", () => {
    let b = setSlot(emptyBuild(), "tome", 0, "Damage Tome");
    b = setSlot(b, "tome", 2, "Damage Tome");
    expect(b.tomes.filter((t) => t === "Damage Tome")).toHaveLength(1);
    expect(b.tomes[2]).toBe("Damage Tome");
  });

  it("addToBuild fills the first open slot and no-ops when full or duplicate", () => {
    let b = emptyBuild();
    b = addToBuild(b, "weapon", "Katana");
    b = addToBuild(b, "weapon", "Katana");
    expect(b.weapons.filter((w) => w === "Katana")).toHaveLength(1);
    b = addToBuild(b, "weapon", "Axe");
    b = addToBuild(b, "weapon", "Bone");
    b = addToBuild(b, "weapon", "Aura");
    expect(firstOpenSlot(b, "weapon")).toBe(-1);
    expect(addToBuild(b, "weapon", "Aegis")).toBe(b);
  });

  it("assembles the wiki's 'evasive ninja' build end to end", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    for (const w of ["Katana", "Flamewalker", "Slutty Rocket", "Firestaff"]) b = addToBuild(b, "weapon", w);
    for (const t of ["Precision Tome", "Evasion Tome", "Quantity Tome", "Bloody Tome"]) b = addToBuild(b, "tome", t);
    for (const i of ["Backpack", "Beefy Ring", "Slurp Gloves", "Credit Card Green", "Moldy Cheese", "Moldy Gloves"])
      b = addToBuild(b, "item", i);
    expect(b.character).toBe("Ninja");
    expect(firstOpenSlot(b, "weapon")).toBe(-1);
    expect(firstOpenSlot(b, "tome")).toBe(-1);
    expect(firstOpenSlot(b, "item")).toBe(-1);
    expect(pickedNames(b).size).toBe(15);
  });
});
