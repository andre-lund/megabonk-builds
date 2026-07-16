import { describe, expect, it } from "vitest";
import { createCipheriv } from "node:crypto";
import { decryptSave, mapPurchases } from "./saveimport";
import weaponsJson from "../data/weapons.json";
import tomesJson from "../data/tomes.json";
import charactersJson from "../data/characters.json";
import itemsJson from "../data/items.json";

const wikiNames = [weaponsJson, tomesJson, charactersJson, itemsJson].flat().map((e) => e.name);

const KEY = Buffer.from([
  217, 64, 132, 13, 90, 231, 199, 144, 123, 9, 36, 55, 188, 12, 91, 68,
  170, 247, 14, 39, 62, 18, 208, 251, 77, 162, 184, 199, 103, 204, 145, 29,
]);
const IV = Buffer.from([55, 134, 78, 241, 92, 36, 188, 10, 203, 198, 14, 57, 120, 239, 31, 6]);

function encrypt(plain: string): string {
  const cipher = createCipheriv("aes-256-cbc", KEY, IV);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

describe("save import", () => {
  it("decrypts an AES-encrypted save", async () => {
    const save = { purchases: ["Axe", "Katana"] };
    const decrypted = await decryptSave(encrypt(JSON.stringify(save)));
    expect(decrypted).toEqual(save);
  });

  it("passes through already-decrypted JSON", async () => {
    expect(await decryptSave('{"purchases":[]}')).toEqual({ purchases: [] });
  });

  it("maps direct, cased, and aliased ids to wiki names; ignores skins and shop entries", () => {
    const save = {
      purchases: [
        "Axe", "BeefyRing", "Cl4nk", "SirOofie", "DamageTome", // direct (case/space-insensitive)
        "BloodTome", "BluetoothDagger", "Borgor", "GlovePoison", "Pot", // aliases
        "FoxGoldFox", "Boombox", "Refresh", "NoImplementation", // skins/shop -> ignored
      ],
    };
    const result = mapPurchases(save, wikiNames);
    expect(result.totalPurchases).toBe(14);
    expect(result.unlockedNames).toEqual([
      "Axe", "Beefy Ring", "Bloody Tome", "Borgar", "CL4NK", "Damage Tome",
      "Moldy Gloves", "Pot (Stainless Steel)", "Sir Oofie", "Wireless Dagger",
    ]);
  });

  it("handles malformed saves gracefully", () => {
    expect(mapPurchases({}, wikiNames).unlockedNames).toEqual([]);
    expect(mapPurchases(null, wikiNames).totalPurchases).toBe(0);
  });
});
