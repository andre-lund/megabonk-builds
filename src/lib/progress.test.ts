import { describe, expect, it } from "vitest";
import { loadProgress, parseGoal, saveProgress, setProgress } from "./progress";

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

describe("unlock progress", () => {
  it("parses goals from real unlock texts", () => {
    expect(parseGoal("Kill 2,000 enemies using the Sword.")).toBe(2000);
    expect(parseGoal("Kill 7,500 enemies.")).toBe(7500);
    expect(parseGoal("Get the Knockback Tome to Level 10.")).toBe(10);
    expect(parseGoal("Kill 12500 enemies using the Sword")).toBe(12500);
    // percentage is a drop chance, not a goal
    expect(parseGoal("5% drop chance from breaking a Tumbleweed on Desert Stage 1.")).toBe(1);
    expect(parseGoal("Find the hidden banana in the Forest.")).toBeNull();
  });

  it("round-trips progress through storage", () => {
    const storage = memoryStorage();
    expect(loadProgress(storage).size).toBe(0);
    saveProgress(new Map([["Axe", 1200]]), storage);
    expect(loadProgress(storage).get("Axe")).toBe(1200);
    storage.setItem("megabonk-progress", "garbage");
    expect(loadProgress(storage).size).toBe(0);
  });

  it("sets and clears immutably", () => {
    const a = new Map([["Axe", 100]]);
    const b = setProgress(a, "Revolver", 50);
    expect(b.get("Revolver")).toBe(50);
    expect(a.has("Revolver")).toBe(false);
    expect(setProgress(b, "Axe", 0).has("Axe")).toBe(false);
  });
});
