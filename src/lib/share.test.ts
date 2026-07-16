import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter, setMap } from "./build";
import { decodeBuild, encodeBuild, type KnownNames } from "./share";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";

const known: KnownNames = {
  characters: new Set(charactersJson.map((c) => c.name)),
  weapons: new Set(weaponsJson.map((w) => w.name)),
  tomes: new Set(tomesJson.map((t) => t.name)),
  items: new Set(itemsJson.map((i) => i.name)),
  maps: new Set(["Forest", "Desert", "Graveyard"]),
};

describe("build URL codec", () => {
  it("round-trips a partial build", () => {
    let b = setCharacter(emptyBuild(), "Ninja");
    b = setMap(b, "Desert");
    b = addToBuild(b, "weapon", "Katana");
    b = addToBuild(b, "tome", "Damage Tome");
    b = addToBuild(b, "item", "Credit Card Green");
    const decoded = decodeBuild(encodeBuild(b), known);
    expect(decoded).toEqual(b);
  });

  it("encodes an empty build to an empty string", () => {
    expect(encodeBuild(emptyBuild())).toBe("");
    expect(decodeBuild("", known)).toEqual(emptyBuild());
  });

  it("drops unknown names on decode", () => {
    const decoded = decodeBuild("#c=Nobody&w=Katana|Fake Sword&t=Damage Tome", known);
    expect(decoded.character).toBeNull();
    expect(decoded.weapons.filter(Boolean)).toEqual(["Katana"]);
    expect(decoded.tomes.filter(Boolean)).toEqual(["Damage Tome"]);
  });

  it("handles names with special characters", () => {
    let b = addToBuild(emptyBuild(), "item", "Bob's Light");
    const decoded = decodeBuild(encodeBuild(b), known);
    expect(decoded.items.filter(Boolean)).toEqual(["Bob's Light"]);
  });
});
