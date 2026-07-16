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

// Unlock-condition -> stats.json counter, for entities whose grind progress
// the game tracks globally. Only confident mappings; everything else stays manual.
const STAT_SOURCES: Record<string, string> = {
  Axe: "swordKills", // Kill 2,000 enemies using the Sword
  Dexecutioner: "swordKills", // Kill 12,500 enemies using the Sword
  Revolver: "kills", // Kill 7,500 enemies
  Mines: "rocketsKills", // Kill 7,500 enemies with the Slutty Rocket
  Frostwalker: "icecubeFreezes", // Freeze 1,000 enemies using the Ice Cube
  "Dragons Breath": "foxWispsKills", // Kill 1,000 Wisp as Fox on Desert
  Aegis: "damageReductionArmorAsKnight", // Block 500 damage with Armor as Sir Oofie
  Calcium: "skeletonKills", // Kill 1,000 Skeletons
  Ogre: "goblinKills", // Kill 15,000 Goblins
  Birdo: "killsInTornadoWithTornado", // Kill 100 enemies in a Tornado with the Tornado
  Amog: "moldyCheeseProcs", // Poison 50,000 enemies with Moldy Cheese
  Dicehead: "questsCompleted", // Complete 100 Quests
  Spaceman: "challengesCompleted", // Complete 6 Challenges
  "Tony McZoom": "challengesCompleted", // Complete 2 challenges
  Anvil: "challengesCompleted", // Complete 3 Challenges
};

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

/** Kind of save file, detected by content. */
export function saveKind(save: unknown): "progression" | "stats" | "unknown" {
  if (save && typeof save === "object") {
    if (Array.isArray((save as { purchases?: unknown }).purchases)) return "progression";
    const stats = (save as { stats?: unknown }).stats;
    if (stats && typeof stats === "object") return "stats";
  }
  return "unknown";
}

/** Map stats.json counters onto unlock progress for entities with a known stat source. */
export function mapStats(save: unknown, wikiNames: Iterable<string>): Map<string, number> {
  const result = new Map<string, number>();
  if (saveKind(save) !== "stats") return result;
  const stats = (save as { stats: Record<string, unknown> }).stats;
  const known = new Set(wikiNames);
  for (const [name, statKey] of Object.entries(STAT_SOURCES)) {
    if (!known.has(name)) continue;
    const entry = stats[statKey];
    const value =
      entry && typeof entry === "object" && typeof (entry as { value?: unknown }).value === "number"
        ? (entry as { value: number }).value
        : null;
    if (value !== null && value > 0) result.set(name, Math.floor(value));
  }
  return result;
}
