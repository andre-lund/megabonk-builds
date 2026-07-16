import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter, type Build } from "./build";
import { synergyIndex } from "./synergy";
import { archetypeIndex, scoreBuild, tier, type ScoredEntity } from "./score";
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

function makeBuild(character: string, weapons: string[], tomes: string[], items: string[]): Build {
  let b = setCharacter(emptyBuild(), character);
  for (const w of weapons) b = addToBuild(b, "weapon", w);
  for (const t of tomes) b = addToBuild(b, "tome", t);
  for (const i of items) b = addToBuild(b, "item", i);
  return b;
}

// Deterministic LCG so the random-build comparison is reproducible.
function lcg(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32), s / 2 ** 32);
}

function randomBuild(rand: () => number): Build {
  const pick = <T extends { name: string }>(pool: T[], n: number) =>
    [...pool].sort(() => rand() - 0.5).slice(0, n).map((e) => e.name);
  return makeBuild(
    pick(charactersJson, 1)[0],
    pick(weaponsJson, 4),
    pick(tomesJson, 4),
    pick(itemsJson, 6),
  );
}

describe("heuristic score", () => {
  it("classifies known entities into archetypes", () => {
    expect(archetypes.get("Damage Tome")).toContain("damage");
    expect(archetypes.get("Armor Tome")).toContain("defense");
    expect(archetypes.get("Agility Tome")).toContain("mobility");
    expect(archetypes.get("Clover")).toContain("utility");
  });

  it("scores empty < partial < full coverage", () => {
    const empty = scoreBuild(emptyBuild(), adj, archetypes);
    expect(empty.total).toBe(0);
    const partial = scoreBuild(makeBuild("Ninja", ["Katana"], [], []), adj, archetypes);
    expect(partial.total).toBeGreaterThan(0);
  });

  it("known meta build outscores seeded random builds", () => {
    const meta = makeBuild(
      "Ninja",
      ["Katana", "Flamewalker", "Slutty Rocket", "Firestaff"],
      ["Precision Tome", "Evasion Tome", "Quantity Tome", "Bloody Tome"],
      ["Backpack", "Beefy Ring", "Slurp Gloves", "Credit Card Green", "Moldy Cheese", "Moldy Gloves"],
    );
    const metaScore = scoreBuild(meta, adj, archetypes).total;
    const rand = lcg(42);
    const randomScores = Array.from({ length: 20 }, () => scoreBuild(randomBuild(rand), adj, archetypes).total);
    const avg = randomScores.reduce((a, b) => a + b, 0) / randomScores.length;
    expect(metaScore).toBeGreaterThan(avg);
  });

  it("map emphasis pays per picked entity carrying the archetype", () => {
    let b = makeBuild("Ninja", [], ["Agility Tome"], []);
    const plain = scoreBuild(b, adj, archetypes);
    const desert = scoreBuild(b, adj, archetypes, ["mobility"]);
    expect(plain.mapBonus).toBe(0);
    expect(desert.mapBonus).toBeGreaterThan(0);
    expect(desert.total).toBe(plain.total + desert.mapBonus);
    // stacking a second mobility entity keeps paying
    b = makeBuild("Ninja", [], ["Agility Tome", "Cooldown Tome"], ["Turbo Socks"]);
    const stacked = scoreBuild(b, adj, archetypes, ["mobility"]);
    expect(stacked.mapBonus).toBeGreaterThan(desert.mapBonus);
  });

  it("maps totals to tiers", () => {
    expect(tier(0)).toBe("D");
    expect(tier(45)).toBe("B");
    expect(tier(85)).toBe("S");
  });
});
