import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter } from "./build";
import { synergyIndex } from "./synergy";
import { archetypeIndex, type ScoredEntity } from "./score";
import { recommendBans } from "./bans";
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
const itemNames = itemsJson.map((i) => i.name);

describe("ban recommendations", () => {
  it("ranks zero-fit items first and synergizing items last", () => {
    let b = setCharacter(emptyBuild(), "Noelle");
    b = addToBuild(b, "weapon", "Frostwalker");
    const all = recommendBans(b, itemNames, adj, archetypes, itemNames.length);
    // Ice Crystal synergizes with Noelle's kit — must not be an early ban.
    const iceCrystal = all.find((c) => c.name === "Ice Crystal");
    expect(iceCrystal).toBeDefined();
    expect(all[0].fit).toBe(0);
    expect(iceCrystal!.fit).toBeGreaterThan(0);
    expect(all.indexOf(iceCrystal!)).toBeGreaterThan(all.length / 2);
  });

  it("excludes items already in the build and respects the limit", () => {
    let b = emptyBuild();
    b = addToBuild(b, "item", "Anvil");
    const bans = recommendBans(b, itemNames, adj, archetypes, 10);
    expect(bans).toHaveLength(10);
    expect(bans.map((c) => c.name)).not.toContain("Anvil");
  });

  it("is deterministic with stable tiebreaks", () => {
    const b = setCharacter(emptyBuild(), "Ninja");
    expect(recommendBans(b, itemNames, adj, archetypes, 10)).toEqual(
      recommendBans(b, itemNames, adj, archetypes, 10),
    );
  });
});
