// Import unlocks from the game's progression.json save file.
// AES-256-CBC with the fixed key/IV published in the community save editor
// (ViniGreen/megabonk_file_save); decryption happens client-side only.
const SAVE_KEY = new Uint8Array([
  217, 64, 132, 13, 90, 231, 199, 144, 123, 9, 36, 55, 188, 12, 91, 68,
  170, 247, 14, 39, 62, 18, 208, 251, 77, 162, 184, 199, 103, 204, 145, 29,
]);
const SAVE_IV = new Uint8Array([55, 134, 78, 241, 92, 36, 188, 10, 203, 198, 14, 57, 120, 239, 31, 6]);

// Save IDs whose PascalCase doesn't line up with the wiki name.
const ALIASES: Record<string, string> = {
  bloodtome: "Bloody Tome",
  movementtome: "Agility Tome",
  bluetoothdagger: "Wireless Dagger",
  corruptsword: "Corrupted Sword",
  demonblade: "Demonic Blade",
  bobslantern: "Bob's Light",
  borgor: "Borgar",
  flappyfeathers: "Feathers",
  shatteredwisdom: "Shattered Knowledge",
  glovepower: "Power Gloves",
  glovecurse: "Cursed Grabbies",
  gloveblood: "Slurp Gloves",
  glovelightning: "Thunder Mitts",
  glovepoison: "Moldy Gloves",
  pot: "Pot (Stainless Steel)",
  sniper: "Sniper Rifle",
};

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function decryptSave(fileText: string): Promise<unknown> {
  const trimmed = fileText.trim();
  // Already-decrypted saves (e.g. edited ones) are plain JSON.
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const ciphertext = Uint8Array.from(atob(trimmed), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", SAVE_KEY, "AES-CBC", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: SAVE_IV }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain));
}

export interface ImportResult {
  /** Wiki entity names found unlocked in the save. */
  unlockedNames: string[];
  /** Total purchase entries in the save (incl. skins/shop items we ignore). */
  totalPurchases: number;
}

export function mapPurchases(save: unknown, wikiNames: Iterable<string>): ImportResult {
  const purchases =
    save && typeof save === "object" && Array.isArray((save as { purchases?: unknown }).purchases)
      ? ((save as { purchases: unknown[] }).purchases.filter((p): p is string => typeof p === "string"))
      : [];
  const byNormalized = new Map<string, string>();
  for (const name of wikiNames) byNormalized.set(normalize(name), name);
  const unlocked = new Set<string>();
  for (const id of purchases) {
    const key = normalize(id);
    const name = byNormalized.get(normalize(ALIASES[key] ?? key));
    if (name) unlocked.add(name);
  }
  return { unlockedNames: [...unlocked].sort(), totalPurchases: purchases.length };
}
