import { describe, expect, it } from "vitest";
import { addToBuild, emptyBuild, setCharacter } from "./build";
import { synergyIndex } from "./synergy";
import { archetypeIndex, type ScoredEntity } from "./score";
import { BAN_CUTOFF, recommendBans } from "./bans";
import { buildMetaIndex, type LeaderboardData } from "./meta";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";
import leaderboardJson from "../data/leaderboard.json";

const metaIndex = buildMetaIndex(leaderboardJson as unknown as LeaderboardData);

const groups: ScoredEntity[][] = [
  weaponsJson.map((w) => ({ name: w.name, text: `${w.type} ${w.description}` })),
  tomesJson.map((t) => ({ name: t.name, text: `${t.stat} ${t.effect}` })),
  charactersJson.map((c) => ({ name: c.name, text: `${c.role} ${c.blessing}` })),
  itemsJson.map((i) => ({ name: i.name, text: i.effect })),
];
const adj = synergyIndex([weaponsJson, tomesJson, charactersJson, itemsJson]);
const archetypes = archetypeIndex(groups);
const itemNames = itemsJson.map((i) => i.name);
const rarityOf = new Map(itemsJson.map((i) => [i.name, i.rarity]));

function noelleBuild() {
  let b = setCharacter(emptyBuild(), "Noelle");
  return addToBuild(b, "weapon", "Frostwalker");
}

describe("ban recommendations", () => {
  it("only recommends items below the fit cutoff", () => {
    const bans = recommendBans(noelleBuild(), itemNames, adj, archetypes, rarityOf);
    expect(bans.length).toBeGreaterThan(0);
    for (const c of bans) expect(c.fit).toBeLessThan(BAN_CUTOFF);
    // Ice Crystal synergizes with Noelle's kit — must never be recommended.
    expect(bans.map((c) => c.name)).not.toContain("Ice Crystal");
  });

  it("never recommends epic or legendary items — rarity is intrinsic keep-value", () => {
    const bans = recommendBans(noelleBuild(), itemNames, adj, archetypes, rarityOf);
    expect(bans.map((c) => c.name)).not.toContain("Anvil");
    for (const c of bans) {
      expect(["epic", "legendary"]).not.toContain(rarityOf.get(c.name)?.toLowerCase());
    }
  });

  it("excludes items already in the build and respects the limit", () => {
    let b = noelleBuild();
    const first = recommendBans(b, itemNames, adj, archetypes, rarityOf)[0];
    b = addToBuild(b, "item", first.name);
    const bans = recommendBans(b, itemNames, adj, archetypes, rarityOf, null, 5);
    expect(bans.length).toBeLessThanOrEqual(5);
    expect(bans.map((c) => c.name)).not.toContain(first.name);
  });

  it("is deterministic with stable tiebreaks", () => {
    const b = setCharacter(emptyBuild(), "Ninja");
    expect(recommendBans(b, itemNames, adj, archetypes, rarityOf)).toEqual(
      recommendBans(b, itemNames, adj, archetypes, rarityOf),
    );
  });

  it("empirical usage protects proven items and never introduces new bans", () => {
    const b = addToBuild(setCharacter(emptyBuild(), "Fox"), "weapon", "Katana");
    const noMeta = recommendBans(b, itemNames, adj, archetypes, rarityOf).map((c) => c.name);
    const withMeta = recommendBans(b, itemNames, adj, archetypes, rarityOf, metaIndex).map((c) => c.name);
    expect(noMeta.length).toBeGreaterThan(0);
    // meta only raises fit, so it can shrink the ban list but never add to it.
    for (const name of withMeta) expect(noMeta).toContain(name);
    expect(withMeta.length).toBeLessThan(noMeta.length);
    // an item in >=50% of Fox's top runs clears the cutoff on usage alone (8 * 0.5 = 4).
    for (const name of noMeta) if (metaIndex.usageFrac("Fox", name) >= 0.5) expect(withMeta).not.toContain(name);
  });
});
