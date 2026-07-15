import { describe, expect, it } from "vitest";
import { activeSynergies, synergizesWithBuild, synergyIndex } from "./synergy";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";

const FIXTURE = [
  [
    { name: "Axe", synergies: ["Noelle", "Ghost Page"] },
    { name: "Sword", synergies: [] },
  ],
  [{ name: "Noelle", synergies: [] }],
];

describe("synergy index", () => {
  it("is undirected and drops links to unknown pages", () => {
    const adj = synergyIndex(FIXTURE);
    expect(adj.get("Axe")?.has("Noelle")).toBe(true);
    expect(adj.get("Noelle")?.has("Axe")).toBe(true);
    expect(adj.get("Axe")?.has("Ghost Page")).toBe(false);
  });

  it("finds active pairs only when both endpoints are picked", () => {
    const adj = synergyIndex(FIXTURE);
    expect(activeSynergies(new Set(["Axe", "Sword"]), adj)).toEqual([]);
    expect(activeSynergies(new Set(["Axe", "Noelle", "Sword"]), adj)).toEqual([{ a: "Axe", b: "Noelle" }]);
  });

  it("flags candidates that would synergize with the current build", () => {
    const adj = synergyIndex(FIXTURE);
    const picked = new Set(["Noelle"]);
    expect(synergizesWithBuild("Axe", picked, adj)).toBe(true);
    expect(synergizesWithBuild("Sword", picked, adj)).toBe(false);
  });

  it("links known pairs in the real dataset (Axe↔Noelle, Damage Tome↔Precision Tome)", () => {
    const adj = synergyIndex([weaponsJson, tomesJson, charactersJson, itemsJson]);
    expect(adj.get("Axe")?.has("Noelle")).toBe(true);
    expect(adj.get("Precision Tome")?.has("Damage Tome")).toBe(true);
    expect(activeSynergies(new Set(["Axe", "Noelle"]), adj)).toEqual([{ a: "Axe", b: "Noelle" }]);
  });
});
