import { describe, expect, it } from "vitest";
import { buildMetaIndex, SHRINK_K, type LeaderboardData } from "./meta";
import leaderboardJson from "../data/leaderboard.json";

const data = leaderboardJson as unknown as LeaderboardData;
const meta = buildMetaIndex(data);

// Global pooled count for a name across every character's usage (all kinds).
function globalCount(name: string): number {
  let n = 0;
  for (const c of data.characters)
    for (const kind of ["weapons", "tomes", "items"] as const) n += c.usage[kind][name] ?? 0;
  return n;
}

describe("meta index", () => {
  it("exposes the ingested patch version", () => {
    expect(meta.version).toBe(data.version);
  });

  it("usageFrac stays within [0,1] for every name and character", () => {
    const names = new Set<string>();
    for (const c of data.characters)
      for (const kind of ["weapons", "tomes", "items"] as const) for (const n of Object.keys(c.usage[kind])) names.add(n);
    for (const character of [null, ...data.characters.map((c) => c.character)])
      for (const n of names) {
        const f = meta.usageFrac(character, n);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
  });

  it("null character returns the pooled global fraction", () => {
    const name = "Anvil";
    expect(meta.usageFrac(null, name)).toBeCloseTo(globalCount(name) / data.totalRuns, 10);
  });

  it("applies the exact shrinkage formula for a character", () => {
    const fox = data.characters.find((c) => c.character === "Fox")!;
    const name = "Firestaff";
    const count = fox.usage.weapons[name] ?? 0;
    const global = globalCount(name) / data.totalRuns;
    const expected = (count + SHRINK_K * global) / (fox.totalRuns + SHRINK_K);
    expect(meta.usageFrac("Fox", name)).toBeCloseTo(expected, 10);
  });

  it("shrinks a low-n character's rate toward the global prior", () => {
    // Fox uses Firestaff in every run (raw rate 1.0); the shrunk value is pulled
    // below 1.0 toward the (lower) global Firestaff rate.
    const raw = 1.0;
    const global = globalCount("Firestaff") / data.totalRuns;
    const shrunk = meta.usageFrac("Fox", "Firestaff");
    expect(shrunk).toBeLessThan(raw);
    expect(shrunk).toBeGreaterThan(global);
  });

  it("falls back to global for an unknown character and 0 for an unknown name", () => {
    const name = "Anvil";
    expect(meta.usageFrac("Nobody", name)).toBeCloseTo(meta.usageFrac(null, name), 10);
    expect(meta.usageFrac("Fox", "Not A Real Item")).toBe(0);
  });

  it("exposes discovered co-occurrence edges symmetrically", () => {
    const edge = data.cooccurrence[0];
    expect(meta.hasCoo(edge.a, edge.b)).toBe(true);
    expect(meta.hasCoo(edge.b, edge.a)).toBe(true);
    expect(meta.hasCoo(edge.a, "Not A Real Weapon")).toBe(false);
  });
});
