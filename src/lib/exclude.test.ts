import { describe, expect, it } from "vitest";
import { excludeFromPools, loadExcluded, saveExcluded, toggleExcluded } from "./exclude";
import type { GeneratePools } from "./generate";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

describe("exclude", () => {
  it("round-trips through storage and falls back to empty", () => {
    const storage = memoryStorage();
    expect(loadExcluded(storage)).toEqual(new Set());
    saveExcluded(new Set(["Sword", "Clover"]), storage);
    expect(loadExcluded(storage)).toEqual(new Set(["Sword", "Clover"]));
    storage.setItem("megabonk-excluded", "not json");
    expect(loadExcluded(storage)).toEqual(new Set());
  });

  it("toggles immutably", () => {
    const a = new Set(["Sword"]);
    const b = toggleExcluded(a, "Axe");
    expect(b.has("Axe")).toBe(true);
    expect(a.has("Axe")).toBe(false);
    expect(toggleExcluded(b, "Axe").has("Axe")).toBe(false);
  });

  it("filters excluded names out of every pool", () => {
    const pools: GeneratePools = {
      characters: ["Fox", "Noelle"],
      weapons: ["Sword", "Axe"],
      tomes: ["Damage Tome"],
      items: ["Clover", "Ice Crystal"],
    };
    const filtered = excludeFromPools(pools, new Set(["Noelle", "Axe", "Clover"]));
    expect(filtered).toEqual({
      characters: ["Fox"],
      weapons: ["Sword"],
      tomes: ["Damage Tome"],
      items: ["Ice Crystal"],
    });
    expect(excludeFromPools(pools, new Set())).toBe(pools);
  });
});
