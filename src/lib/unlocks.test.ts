import { describe, expect, it } from "vitest";
import { defaultUnlocked, loadUnlocked, saveUnlocked, toggleUnlocked } from "./unlocks";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";

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

describe("unlocks", () => {
  it("seeds default-available entities from real data", () => {
    const defaults = defaultUnlocked([weaponsJson, tomesJson, charactersJson, itemsJson]);
    expect(defaults.has("Damage Tome")).toBe(true); // "Default (available at start)"
    expect(defaults.has("Clover")).toBe(true); // default item, empty unlock
    expect(defaults.has("Sword")).toBe(true); // "Starter Weapon"
    expect(defaults.has("Fox")).toBe(true); // "Starting Character"
    expect(defaults.has("Axe")).toBe(false); // kill 2000 with Sword
    expect(defaults.has("Noelle")).toBe(false); // microwave quest
    expect(defaults.size).toBeGreaterThan(10);
  });

  it("round-trips through storage and falls back to defaults", () => {
    const storage = memoryStorage();
    const defaults = new Set(["Sword"]);
    expect(loadUnlocked(defaults, storage)).toEqual(defaults);
    saveUnlocked(new Set(["Sword", "Axe"]), storage);
    expect(loadUnlocked(defaults, storage)).toEqual(new Set(["Sword", "Axe"]));
    storage.setItem("megabonk-unlocked", "not json");
    expect(loadUnlocked(defaults, storage)).toEqual(defaults);
  });

  it("toggles immutably", () => {
    const a = new Set(["Sword"]);
    const b = toggleUnlocked(a, "Axe");
    expect(b.has("Axe")).toBe(true);
    expect(a.has("Axe")).toBe(false);
    expect(toggleUnlocked(b, "Axe").has("Axe")).toBe(false);
  });
});
