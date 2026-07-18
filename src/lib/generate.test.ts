import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, firstOpenSlot, pickedNames, setCharacter } from "./build";
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

  it("map emphasis shifts generation toward emphasized archetypes", () => {
    const base = setCharacter(emptyBuild(), "Ninja");
    const plain = generateBuild(base, pools, adj, archetypes);
    const desert = generateBuild(base, pools, adj, archetypes, ["mobility"]);
    const mobilityCount = (b: ReturnType<typeof generateBuild>) =>
      [b.character, ...b.weapons, ...b.tomes, ...b.items]
        .filter((n): n is string => n !== null)
        .filter((n) => (archetypes.get(n) ?? []).includes("mobility")).length;
    expect(mobilityCount(desert)).toBeGreaterThanOrEqual(mobilityCount(plain));
    expect(desert).not.toEqual(plain);
  });

  it("never lowers the score of what it completes", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    b = addToBuild(b, "weapon", "Katana");
    const before = scoreBuild(b, adj, archetypes).total;
    const after = scoreBuild(generateBuild(b, pools, adj, archetypes), adj, archetypes).total;
    expect(after).toBeGreaterThan(before);
  });
});

describe("seeded rerolls", () => {
  const base = setCharacter(emptyBuild(), "Ninja");
  const key = (b: ReturnType<typeof generateBuild>) => [...pickedNames(b)].sort().join("|");

  it("completes the build and keeps existing picks", () => {
    const g = generateBuild(base, pools, adj, archetypes, [], 1);
    expect(g.character).toBe("Ninja");
    for (const kind of ["weapon", "tome", "item"] as const) expect(firstOpenSlot(g, kind)).toBe(-1);
  });

  it("same seed reproduces the same build", () => {
    expect(generateBuild(base, pools, adj, archetypes, [], 3)).toEqual(
      generateBuild(base, pools, adj, archetypes, [], 3),
    );
  });

  it("different seeds produce different builds", () => {
    const keys = new Set([1, 2, 3, 4, 5].map((s) => key(generateBuild(base, pools, adj, archetypes, [], s))));
    expect(keys.size).toBeGreaterThan(1);
  });

  it("stays near the deterministic optimum", () => {
    const best = scoreBuild(generateBuild(base, pools, adj, archetypes), adj, archetypes).total;
    for (const s of [1, 2, 3, 4, 5]) {
      const total = scoreBuild(generateBuild(base, pools, adj, archetypes, [], s), adj, archetypes).total;
      expect(total).toBeGreaterThanOrEqual(best * 0.7);
    }
  });
});
