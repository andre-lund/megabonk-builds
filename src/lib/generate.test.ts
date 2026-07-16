import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, firstOpenSlot, setCharacter } from "./build";
import { synergyIndex } from "./synergy";
import { archetypeIndex, scoreBuild, type ScoredEntity } from "./score";
import { generateBuild, type GeneratePools } from "./generate";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";

const groups: ScoredEntity[][] = [
  weaponsJson.map((w) => ({ name: w.name, text: `${w.type} ${w.description}` })),
  tomesJson.map((t) => ({ name: t.name, text: `${t.stat} ${t.effect}` })),
  charactersJson.map((c) => ({ name: c.name, text: `${c.role} ${c.blessing}` })),
  itemsJson.map((i) => ({ name: i.name, text: i.effect })),
];
const adj = synergyIndex([weaponsJson, tomesJson, charactersJson, itemsJson]);
const archetypes = archetypeIndex(groups);
const pools: GeneratePools = {
  characters: charactersJson.map((c) => c.name),
  weapons: weaponsJson.map((w) => w.name),
  tomes: tomesJson.map((t) => t.name),
  items: itemsJson.map((i) => i.name),
};

describe("generate best combo", () => {
  it("completes an empty build to full 15 slots + character", () => {
    const g = generateBuild(emptyBuild(), pools, adj, archetypes);
    expect(g.character).not.toBeNull();
    for (const kind of ["weapon", "tome", "item"] as const) expect(firstOpenSlot(g, kind)).toBe(-1);
  });

  it("keeps existing picks untouched", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    b = addToBuild(b, "weapon", "Katana");
    b = addToBuild(b, "tome", "Evasion Tome");
    const g = generateBuild(b, pools, adj, archetypes);
    expect(g.character).toBe("Ninja");
    expect(g.weapons).toContain("Katana");
    expect(g.tomes).toContain("Evasion Tome");
  });

  it("is deterministic", () => {
    const b = setCharacter(emptyBuild(), "Noelle");
    expect(generateBuild(b, pools, adj, archetypes)).toEqual(generateBuild(b, pools, adj, archetypes));
  });

  it("never lowers the score of what it completes", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    b = addToBuild(b, "weapon", "Katana");
    const before = scoreBuild(b, adj, archetypes).total;
    const after = scoreBuild(generateBuild(b, pools, adj, archetypes), adj, archetypes).total;
    expect(after).toBeGreaterThan(before);
  });
});
