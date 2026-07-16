import { describe, expect, it } from "vitest";
import { isBackup, restoreBackup, serializeBackup } from "./backup";

const KNOWN = ["Axe", "Sword", "Damage Tome"];

describe("backup", () => {
  it("round-trips owned + progress", () => {
    const text = serializeBackup(new Set(["Axe", "Sword"]), new Map([["Axe", 1200]]), "2026-07-16T00:00:00Z");
    const data: unknown = JSON.parse(text);
    expect(isBackup(data)).toBe(true);
    const restored = restoreBackup(data as never, KNOWN);
    expect(restored.unlocked).toEqual(new Set(["Axe", "Sword"]));
    expect(restored.progress.get("Axe")).toBe(1200);
  });

  it("drops unknown names and invalid values on restore", () => {
    const data = {
      megabonkBuilds: 1 as const,
      exported: "x",
      unlocked: ["Axe", "Nonexistent Thing"],
      progress: { Axe: 5, "Nonexistent Thing": 9, Sword: -2 },
    };
    const restored = restoreBackup(data, KNOWN);
    expect(restored.unlocked).toEqual(new Set(["Axe"]));
    expect([...restored.progress.keys()]).toEqual(["Axe"]);
  });

  it("rejects non-backup data", () => {
    expect(isBackup({ purchases: [] })).toBe(false);
    expect(isBackup(null)).toBe(false);
    expect(isBackup({ megabonkBuilds: 2, unlocked: [] })).toBe(false);
  });
});
