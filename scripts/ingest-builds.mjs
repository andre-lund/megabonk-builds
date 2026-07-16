// Ingest community builds from megabonk.wiki's Cargo `builds` table into
// src/data/builds.json, ordered by community votes. Usage: npm run ingest:builds
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = "https://megabonk.wiki/api.php";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "builds.json");

const FIELDS = [
  "Page", "BuildName", "Author", "Votes", "PlayerCharacter", "CreatedAt",
  "StartingWeapon", "Weapon2", "Weapon3", "Weapon4",
  "Tome1", "Tome2", "Tome3", "Tome4",
  "Item1", "Item2", "Item3", "Item4", "Item5", "Item6",
];

async function cargoQuery(offset) {
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "builds",
    fields: FIELDS.map((f) => `builds.${f}=${f}`).join(","),
    "order by": "builds.Votes DESC,builds.CreatedAt DESC",
    limit: "500",
    offset: String(offset),
    format: "json",
  });
  const res = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": "megabonk-builds ingest (olund.dev@pm.me)" },
  });
  if (!res.ok) throw new Error(`${res.status} cargoquery`);
  const data = await res.json();
  return data.cargoquery.map((row) => row.title);
}

const take = (row, keys) => keys.map((k) => row[k] || null).filter(Boolean);

const rows = await cargoQuery(0);
const builds = rows.map((r) => ({
  name: r.BuildName || r.Page,
  page: r.Page,
  character: r.PlayerCharacter || null,
  author: r.Author || null,
  votes: Number(r.Votes ?? 0),
  created: r.CreatedAt || null,
  weapons: take(r, ["StartingWeapon", "Weapon2", "Weapon3", "Weapon4"]),
  tomes: take(r, ["Tome1", "Tome2", "Tome3", "Tome4"]),
  items: take(r, ["Item1", "Item2", "Item3", "Item4", "Item5", "Item6"]),
}));

writeFileSync(OUT, JSON.stringify(builds, null, 2) + "\n");
console.log(`wrote ${builds.length} community builds`);
