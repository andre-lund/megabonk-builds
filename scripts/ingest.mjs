// Ingest game data from megabonk.wiki (MediaWiki API) into src/data/*.json.
// Usage: npm run ingest
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = "https://megabonk.wiki/api.php";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const ICONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const CATEGORIES = {
  weapons: "Weapons",
  tomes: "Tomes",
  characters: "Characters",
  items: "Items",
};

// Pages that belong in a kind but are missing its wiki category tag.
const EXTRA_PAGES = {
  weapons: ["Lightning Staff", "Bow"],
  characters: ["Roberto"],
};

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": "megabonk-builds ingest (olund.dev@pm.me)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function categoryMembers(category) {
  const data = await api({ action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmlimit: "500" });
  return data.query.categorymembers.filter((m) => m.ns === 0).map((m) => m.title);
}

async function wikitext(page) {
  const data = await api({ action: "parse", page, prop: "wikitext" });
  return data.parse.wikitext["*"];
}

// Batched pageimages lookup: title -> image URL (50 titles per request).
async function pageImages(titles) {
  const urls = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const data = await api({
      action: "query",
      titles: titles.slice(i, i + 50).join("|"),
      prop: "pageimages",
      piprop: "original",
    });
    for (const page of Object.values(data.query.pages)) {
      if (page.original) urls.set(page.title, page.original.source);
    }
  }
  return urls;
}

// Resolve File:<name> to a raw URL (used for infobox/seo fallbacks).
async function fileUrls(fileNames) {
  const urls = new Map();
  const names = [...new Set(fileNames)].filter(Boolean);
  for (let i = 0; i < names.length; i += 50) {
    const data = await api({
      action: "query",
      titles: names.slice(i, i + 50).map((n) => `File:${n}`).join("|"),
      prop: "imageinfo",
      iiprop: "url",
    });
    for (const page of Object.values(data.query.pages)) {
      if (page.imageinfo?.[0]) urls.set(page.title.replace(/^File:/, "").replaceAll(" ", "_"), page.imageinfo[0].url);
    }
  }
  return urls;
}

// Image filename from the infobox `image` param or the {{#seo:}} block.
function imageParam(text, box) {
  if (box.image) return plain(box.image);
  const seo = text.match(/\{\{#seo:[\s\S]*?\|\s*image\s*=\s*([^\n|}]+)/);
  return seo ? seo[1].trim() : null;
}

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function downloadIcon(url, name) {
  const res = await fetch(url, { headers: { "User-Agent": "megabonk-builds ingest (olund.dev@pm.me)" } });
  if (!res.ok) return null;
  const ext = url.match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[1].toLowerCase() ?? "png";
  const file = `${slug(name)}.${ext}`;
  writeFileSync(join(ICONS_DIR, file), Buffer.from(await res.arrayBuffer()));
  return `icons/${file}`;
}

// Strip wiki markup: [[A|B]] -> B, [[A]] -> A, '''x''' -> x, [url label] -> label.
function plain(s) {
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+ ([^\]]*)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Extract [[link]] targets from a string.
function links(s) {
  return [...s.matchAll(/\[\[([^\]|#]+)(?:[^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

// Parse the first {{Infobox ...}} template into a key/value object (handles nested [[..]] and {{..}}).
function parseInfobox(text) {
  const start = text.search(/\{\{Infobox/i);
  if (start === -1) return {};
  let depth = 0, end = start;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") { depth++; i++; }
    else if (text[i] === "}" && text[i + 1] === "}") { depth--; i++; if (depth === 0) { end = i + 1; break; } }
  }
  const body = text.slice(start, end).replace(/\}\}$/, "");
  const fields = {};
  // Split on top-level pipes only.
  let level = 0, cur = "";
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{" || two === "[[") { level++; cur += two; i++; }
    else if (two === "}}" || two === "]]") { level--; cur += two; i++; }
    else if (body[i] === "|" && level === 1) { parts.push(cur); cur = ""; }
    else cur += body[i];
  }
  parts.push(cur);
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key) fields[key] = value;
  }
  return fields;
}

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

// Parse wikitable upgrade tables into [{stat, common, uncommon, rare, epic, legendary}].
// Weapon tables have a leading "Stat" column; tome tables are a single unnamed row.
function parseUpgradeTables(text, fallbackStat) {
  const tables = [...text.matchAll(/\{\|[\s\S]*?\|\}/g)].map((m) => m[0]);
  const upgrades = [];
  for (const table of tables) {
    const headers = [...table.matchAll(/^!(?:[^|\n]*\|)?\s*([^\n]+)$/gm)].map((m) => plain(m[1]).toLowerCase());
    if (!RARITIES.every((r) => headers.includes(r))) continue;
    const hasStatCol = headers[0] === "stat";
    // Rows: split on |- then collect | cells.
    for (const row of table.split(/\|-/).slice(1)) {
      const cells = [...row.matchAll(/^\|(?!\})(?:[^|\n]*\|)?\s*([^\n]*)$/gm)].map((m) => plain(m[1]));
      const expected = RARITIES.length + (hasStatCol ? 1 : 0);
      if (cells.length < expected) continue;
      const stat = hasStatCol ? cells[0] : fallbackStat;
      if (!stat) continue;
      const values = Object.fromEntries(RARITIES.map((r, i) => [r, cells[i + (hasStatCol ? 1 : 0)]]));
      upgrades.push({ stat, ...values });
    }
  }
  return upgrades;
}

// First paragraph of the "How to Unlock" section (items keep unlock there, not in the infobox).
function parseUnlockSection(text) {
  const m = text.match(/^==+\s*How to Unlock\s*==+\n+([\s\S]*?)(?=^==|(?![\s\S]))/m);
  if (!m) return "";
  const para = m[1].split(/\n{2,}/)[0].replace(/^\*\s*/gm, "").replace(/\n/g, " ");
  return plain(para);
}

// [[links]] inside any Synergies-titled section, excluding self/nav noise.
function parseSynergies(text, selfName) {
  const m = text.match(/^==+[^=\n]*Synerg[^=\n]*==+\n([\s\S]*?)(?=^==[^=]|(?![\s\S]))/m);
  if (!m) return [];
  return [...new Set(links(m[1]))].filter((l) => l !== selfName && !l.startsWith("Category:") && !l.startsWith("File:"));
}

async function ingest() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(ICONS_DIR, { recursive: true });
  const meta = { source: "https://megabonk.wiki", fetched: new Date().toISOString(), counts: {} };

  for (const [kind, category] of Object.entries(CATEGORIES)) {
    const titles = [...new Set([...(await categoryMembers(category)), ...(EXTRA_PAGES[kind] ?? [])])].sort();
    const entities = [];
    const fallbackImages = new Map();
    for (const title of titles) {
      const text = await wikitext(title);
      const box = parseInfobox(text);
      const fallback = imageParam(text, box);
      if (fallback) fallbackImages.set(title, fallback);
      const base = { name: title, synergies: parseSynergies(text, title) };
      if (kind === "weapons") {
        entities.push({
          ...base,
          type: plain(box.type ?? ""),
          description: plain(box.description ?? ""),
          unlock: plain(box.unlock ?? ""),
          special: plain(box.special ?? ""),
          upgrades: parseUpgradeTables(text),
        });
      } else if (kind === "tomes") {
        entities.push({
          ...base,
          stat: plain(box.stat ?? ""),
          effect: plain(box.effect ?? ""),
          unlock: plain(box.unlock ?? ""),
          maxLevel: box.max ? Number(plain(box.max)) : null,
          upgrades: parseUpgradeTables(text, plain(box.stat ?? "")),
        });
      } else if (kind === "characters") {
        entities.push({
          ...base,
          weapon: plain(box.weapon ?? ""),
          blessing: plain(box.blessing ?? ""),
          role: plain(box.role ?? ""),
          unlock: plain(box.unlock ?? ""),
        });
      } else {
        entities.push({
          ...base,
          rarity: plain(box.rarity ?? ""),
          effect: plain(box.effect ?? ""),
          unlock: plain(box.unlock ?? "") || parseUnlockSection(text),
        });
      }
      process.stdout.write(`\r${kind}: ${entities.length}/${titles.length}   `);
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log();

    // Icon resolution: pageimages, then infobox/seo image param, then the
    // wiki's <Title>.png naming convention (most weapon pages carry no image
    // reference in their own wikitext).
    const primary = await pageImages(titles);
    const guesses = new Map(titles.map((t) => [t, `${t.replaceAll(" ", "_")}.png`]));
    const fallbacks = await fileUrls([
      ...[...fallbackImages.values()].map((f) => f.replaceAll(" ", "_")),
      ...guesses.values(),
    ]);
    for (const entity of entities) {
      const url =
        primary.get(entity.name) ??
        fallbacks.get(fallbackImages.get(entity.name)?.replaceAll(" ", "_") ?? "") ??
        fallbacks.get(guesses.get(entity.name));
      entity.icon = url ? await downloadIcon(url, entity.name) : null;
    }
    const withIcons = entities.filter((e) => e.icon).length;
    console.log(`${kind}: ${withIcons}/${entities.length} icons`);

    meta.counts[kind] = entities.length;
    writeFileSync(join(OUT_DIR, `${kind}.json`), JSON.stringify(entities, null, 2) + "\n");
  }

  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log("done:", meta.counts);
}

ingest().catch((e) => { console.error(e); process.exit(1); });
