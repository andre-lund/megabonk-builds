import { describe, expect, it } from "vitest";
import buildsJson from "../data/builds.json";
import { toBuild, type CommunityBuild } from "./community";

const builds = buildsJson as CommunityBuild[];

describe("community builds", () => {
  it("dataset is ordered by votes descending", () => {
    for (let i = 1; i < builds.length; i++) expect(builds[i - 1].votes).toBeGreaterThanOrEqual(builds[i].votes);
  });

  it("imports the evasive ninja build into the creator model", () => {
    const cb = builds.find((b) => b.name === "evasive ninja")!;
    const b = toBuild(cb);
    expect(b.character).toBe("Ninja");
    expect(b.weapons).toEqual(["Katana", "Flamewalker", "Slutty Rocket", "Firestaff"]);
    expect(b.tomes).toEqual(["Precision Tome", "Evasion Tome", "Quantity Tome", "Bloody Tome"]);
    expect(b.items.filter(Boolean)).toHaveLength(6);
  });

  it("tolerates partial builds", () => {
    const pacifist = builds.find((b) => b.weapons.length === 0)!;
    const b = toBuild(pacifist);
    expect(b.weapons.every((w) => w === null)).toBe(true);
    expect(b.tomes.filter(Boolean).length).toBeGreaterThan(0);
  });
});
