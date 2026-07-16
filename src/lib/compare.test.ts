import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter } from "./build";
import { diffBuilds, parseSharedLink } from "./compare";
import type { KnownNames } from "./share";
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

describe("build comparison", () => {
  it("diffs shared and unique picks", () => {
    let a = setCharacter(emptyBuild(), "Ninja");
    a = addToBuild(a, "weapon", "Katana");
    a = addToBuild(a, "tome", "Damage Tome");
    let b = setCharacter(emptyBuild(), "Ninja");
    b = addToBuild(b, "weapon", "Axe");
    b = addToBuild(b, "tome", "Damage Tome");
    const diff = diffBuilds(a, b);
    expect(diff.shared).toEqual(new Set(["Ninja", "Damage Tome"]));
    expect(diff.onlyA).toEqual(new Set(["Katana"]));
    expect(diff.onlyB).toEqual(new Set(["Axe"]));
  });

  it("parses full URLs and raw hashes", () => {
    const full = parseSharedLink("https://x.github.io/megabonk-builds/#c=Ninja&w=Katana", known);
    expect(full?.character).toBe("Ninja");
    expect(full?.weapons[0]).toBe("Katana");
    const raw = parseSharedLink("c=Noelle&m=Desert", known);
    expect(raw?.character).toBe("Noelle");
    expect(raw?.map).toBe("Desert");
  });

  it("returns null for empty or garbage input", () => {
    expect(parseSharedLink("", known)).toBeNull();
    expect(parseSharedLink("https://example.com/nothing", known)).toBeNull();
    expect(parseSharedLink("c=Nobody&w=Fake", known)).toBeNull();
  });
});
