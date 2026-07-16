import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter, type Build } from "./build";
import { synergyIndex } from "./synergy";
import { archetypeIndex, type ScoredEntity } from "./score";
import { suggestFor } from "./suggest";
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
const weaponNames = weaponsJson.map((w) => w.name);
const tomeNames = tomesJson.map((t) => t.name);

function halfMetaBuild(): Build {
  let b = setCharacter(emptyBuild(), "Ninja");
  for (const w of ["Katana", "Flamewalker"]) b = addToBuild(b, "weapon", w);
  for (const t of ["Precision Tome", "Evasion Tome"]) b = addToBuild(b, "tome", t);
  for (const i of ["Backpack", "Beefy Ring", "Slurp Gloves"]) b = addToBuild(b, "item", i);
  return b;
}

describe("slot suggestions", () => {
  it("excludes picked entities and sorts by gain descending", () => {
    const b = halfMetaBuild();
    const s = suggestFor(b, "weapon", weaponNames, adj, archetypes);
    expect(s.map((x) => x.name)).not.toContain("Katana");
    for (let i = 1; i < s.length; i++) expect(s[i - 1].gain).toBeGreaterThanOrEqual(s[i].gain);
  });

  it("returns nothing when the kind has no open slot", () => {
    let b = halfMetaBuild();
    for (const w of ["Slutty Rocket", "Firestaff"]) b = addToBuild(b, "weapon", w);
    expect(suggestFor(b, "weapon", weaponNames, adj, archetypes)).toEqual([]);
    expect(suggestFor(b, "character", ["Amog"], adj, archetypes)).toEqual([]);
  });

  it("ranks the meta build's synergy-linked remaining picks near the top", () => {
    const b = halfMetaBuild();
    const weaponRanks = suggestFor(b, "weapon", weaponNames, adj, archetypes).map((x) => x.name);
    // Firestaff (remaining meta pick, synergy-linked) in the top 3 of 25 candidates.
    expect(weaponRanks.indexOf("Firestaff")).toBeLessThan(3);
    const tomeRanks = suggestFor(b, "tome", tomeNames, adj, archetypes).map((x) => x.name);
    // Quantity Tome (remaining meta pick) in the top 3 of 21 candidates.
    expect(tomeRanks.indexOf("Quantity Tome")).toBeLessThan(3);
  });

  it("suggests characters only while the character slot is empty", () => {
    const b = emptyBuild();
    const s = suggestFor(b, "character", charactersJson.map((c) => c.name), adj, archetypes);
    expect(s.length).toBe(charactersJson.length);
  });
});
