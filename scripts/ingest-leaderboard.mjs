// Ingest empirical run data from megabonk.leaderboard.gg into
// src/data/leaderboard.json (ADR-0001). The site has no API: every page
// server-renders the full dataset inline as a Nuxt `__NUXT_DATA__` devalue
// payload. We decode it, reconcile ids to our canonical wiki names, and emit
// per-character usage counts + thresholded global within-kind co-occurrence
// edges. Usage: npm run ingest:leaderboard
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "src", "data");
const OUT = join(DATA, "leaderboard.json");
// A character build page embeds the full aggregated state for ALL characters
// (site-authoritative `counts` + weapon/tome loadout `builds`) keyed by the
// clean patch version. `fox` is a stable base-character slug; override via env.
const PAGE = process.env.LEADERBOARD_URL ?? "https://megabonk.leaderboard.gg/builds/fox";
// A real browser UA is required — the default fetch UA gets a Cloudflare 403.
const UA = "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0";

// Co-occurrence edge thresholds (see plan decision log): raw support just
// re-surfaces universally-popular staples, so we require elevated lift too.
const LIFT_MIN = 1.25;
const SUPPORT_MIN = 8;

// Leaderboard id -> our canonical name, for the handful that don't match by
// normalized name. `null` = a genuine gap we refuse to force-map (recorded).
const ALIASES = {
  characters: { astronat: "Spaceman" },
  weapons: { mine: "Mines", sniper: "Sniper Rifle", scythe: null },
  tomes: { hp: "Health Tome" },
  items: { pot: "Pot (Stainless Steel)", cryptkey: null },
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Minimal devalue resolver: __NUXT_DATA__ is a flat array; objects/arrays hold
// integer indices into it. Reactive wrappers are 2-tuples tagged with a string.
const REACTIVE = new Set(["Reactive", "ShallowReactive", "Ref", "ShallowRef", "EmptyRef", "NuxtError"]);
function makeResolver(flat) {
  const memo = new Map();
  const resolve = (i, seen) => {
    if (typeof i !== "number") return i;
    if (i < 0) return i === -1 ? undefined : NaN; // devalue holes/specials (unused here)
    if (memo.has(i)) return memo.get(i);
    if (seen.has(i)) return null; // cycle guard
    const next = new Set(seen).add(i);
    const v = flat[i];
    let out;
    if (Array.isArray(v)) {
      if (v.length === 2 && typeof v[0] === "string" && REACTIVE.has(v[0])) out = resolve(v[1], next);
      else out = v.map((x) => resolve(x, next));
    } else if (v && typeof v === "object") {
      out = {};
      for (const [k, val] of Object.entries(v)) out[k] = resolve(val, next);
    } else out = v;
    memo.set(i, out);
    return out;
  };
  return (i) => resolve(i, new Set());
}

function extractCharacters(html) {
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no __NUXT_DATA__ payload in page");
  const resolve = makeResolver(JSON.parse(m[1]));
  const root = resolve(1);
  const data = root?.data ?? {};
  const key = Object.keys(data).find((k) => k.startsWith("leaderboard:"));
  if (!key) throw new Error(`no leaderboard state in payload (keys: ${Object.keys(data).join(", ")})`);
  // The version comes from an untrusted payload key; keep only sane patch-like
  // strings out of the committed JSON (also catches a mis-parsed key).
  const version = key.slice("leaderboard:".length);
  if (!/^[\w.\-]{1,32}$/.test(version)) throw new Error(`unexpected patch version in payload: ${JSON.stringify(version)}`);
  return { version, characters: data[key] };
}

function loadReconcilers() {
  const load = (f) => JSON.parse(readFileSync(join(DATA, f), "utf-8"));
  const index = (rows) => new Map(rows.map((r) => [norm(r.name), r.name]));
  const byName = {
    characters: index(load("characters.json")),
    weapons: index(load("weapons.json")),
    tomes: index(load("tomes.json")),
    items: index(load("items.json")),
  };
  return (kind, id) => {
    const alias = ALIASES[kind];
    if (alias && Object.prototype.hasOwnProperty.call(alias, id)) return alias[id]; // may be null
    const table = byName[kind];
    // Tomes are named "<X> Tome" in our data but bare stat slugs on the board.
    const candidate = kind === "tomes" ? norm(id) + "tome" : norm(id);
    return table.get(candidate) ?? null;
  };
}

function cooccurrence(characters, reconcile) {
  const edges = [];
  // Weapons/tomes only: those loadouts are small deliberate choices (4 slots
  // each). Items are collected en masse per run, so item co-occurrence is
  // near-dense noise — items contribute through the usage prior instead.
  for (const kind of ["weapons", "tomes"]) {
    let runs = 0;
    const solo = new Map();
    const pair = new Map();
    for (const c of characters) {
      for (const b of c.builds?.[kind] ?? []) {
        const names = b.loadout.map((id) => reconcile(kind, id)).filter(Boolean);
        runs += b.count;
        for (const n of names) solo.set(n, (solo.get(n) ?? 0) + b.count);
        for (let i = 0; i < names.length; i++)
          for (let j = i + 1; j < names.length; j++) {
            // Store the endpoints on the entry; the key only dedupes. Names
            // carry spaces ("Blood Magic"), so a tab (never in a name) keys it.
            const [a, z] = [names[i], names[j]].sort();
            const key = `${a}\t${z}`;
            const entry = pair.get(key);
            if (entry) entry.support += b.count;
            else pair.set(key, { a, z, support: b.count });
          }
      }
    }
    for (const { a, z, support } of pair.values()) {
      if (support < SUPPORT_MIN) continue;
      const lift = (support * runs) / (solo.get(a) * solo.get(z));
      if (lift < LIFT_MIN) continue;
      edges.push({ a, b: z, kind, support, lift: Math.round(lift * 100) / 100 });
    }
  }
  return edges.sort((x, y) => y.lift - x.lift || y.support - x.support);
}

async function main() {
  const res = await fetch(PAGE, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`${res.status} ${PAGE}`);
  const { version, characters } = extractCharacters(await res.text());
  const reconcile = loadReconcilers();

  const unmatched = { characters: new Set(), weapons: new Set(), tomes: new Set(), items: new Set() };
  const out = [];
  let totalRuns = 0;
  for (const c of characters) {
    const character = reconcile("characters", c.character);
    if (!character) {
      unmatched.characters.add(c.character);
      continue;
    }
    totalRuns += c.totalRuns;
    const usage = { weapons: {}, tomes: {}, items: {} };
    for (const kind of ["weapons", "tomes", "items"])
      for (const e of c.counts?.[kind] ?? []) {
        const name = reconcile(kind, e.id);
        if (name) usage[kind][name] = e.count;
        else unmatched[kind].add(e.id);
      }
    out.push({ character, totalRuns: c.totalRuns, topKillCount: c.topKillCount, usage });
  }

  const doc = {
    source: "https://megabonk.leaderboard.gg",
    version,
    fetched: new Date().toISOString(),
    totalRuns,
    unmatched: Object.fromEntries(Object.entries(unmatched).map(([k, v]) => [k, [...v].sort()])),
    characters: out.sort((a, b) => b.totalRuns - a.totalRuns),
    cooccurrence: cooccurrence(characters, reconcile),
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log(`patch ${version}: ${out.length} characters, ${totalRuns} runs, ${doc.cooccurrence.length} co-occurrence edges`);
  for (const [kind, ids] of Object.entries(doc.unmatched)) if (ids.length) console.log(`  unmatched ${kind}: ${ids.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
