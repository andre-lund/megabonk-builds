---
status: done
created: 2026-07-15
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [3f9ee56, e7e41f3, ad4de73, 503418e, 5ac1640, 61932d1]
---

# Plan: Megabonk build planner MVP

## Intent

A build planner for Megabonk: assemble character + weapon + tome builds, see synergies and a heuristic strength score, get suggestions for open slots, and browse the most popular community builds. Delivers the four phases scoped in the kickoff discussion: dataset → build creator → scoring/suggestions → community-build scraping.

## Approach

Web app (Vite + React + TS, already scaffolded) over a static JSON game-data dataset checked into the repo.

Primary dataset source per the 2026-07-15 research: **megabonk.wiki via its MediaWiki API** (verified working: `https://megabonk.wiki/api.php?action=query&list=allpages&format=json`) — weapon/tome/character/item pages carry base stats, per-rarity upgrade tables, unlocks, and synergy notes. Parse wikitext into our own JSON schema with an ingest script. Ground-truth option for later: a one-off MelonLoader dump mod (game is Unity IL2CPP, mature mod ecosystem) that serializes the game's ScriptableObjects to JSON; cross-check against BonkMaster's embedded data.

Community builds: megabonk.wiki Builds pages (same API) + Steam guide HTML; Reddit API optional later.

Scoring is heuristic (synergy coverage + stat archetype balance), not a game sim. [NEEDS CLARIFICATION: exact scoring formula — decide during T5 after playing with real data.]

## Tasks

- [x] **T1** — Data schema + wiki ingest script: pull all weapon/tome/character/item pages from the megabonk.wiki API, parse infoboxes/stat tables into `src/data/*.json`; commit the dataset with a regeneration script. Verify: every entity has name, slot type, stats, unlock; spot-check 5 against the wiki. **Done:** `scripts/ingest.mjs` (zero-dep Node, `npm run ingest`) → 27 weapons / 23 tomes / 20 characters / 85 items with infobox fields, per-rarity upgrade tables, synergy links; spot-checked Axe, Damage Tome, Noelle, Anvil, Clover; only gaps are 8 default items (no unlock exists) + Ice Cube unlock undocumented on the wiki.
- [x] **T2** — Build model + creator UI: character pick, weapon/tome slots, entity browser with search/filter. Verify: assemble a known meta build end to end. **Done:** build model mirrors the wiki `{{Build}}` template (1 char / 4 weapons / 4 tomes / 6 items; `src/lib/build.ts`, 5 vitest tests), creator UI with tabbed browser + search + slot panel; live-verified by assembling the wiki's "evasive ninja" build via Playwright clicks — all 15 slots read back correct.
- [x] **T3** — Synergy display: show synergy/evolution relationships lighting up as slots fill. Verify: a known synergy pair renders as linked. **Done:** undirected synergy index over all four datasets (`src/lib/synergy.ts`, 4 tests incl. real-data pairs), active-pairs list in the build panel + "synergy" badge on browser entries that would link with current picks; live-verified Axe↔Noelle and Damage Tome↔Precision Tome via Playwright.
- [x] **T4** — Heuristic build score: score = synergy count + archetype coverage (damage/defense/mobility/utility), shown live in the creator. Verify: known meta builds outscore random builds. **Done:** `src/lib/score.ts` — 10 pts/synergy pair + 8 pts/archetype covered (regex classifier over stat/effect text) + 1 pt/filled slot, with S–D tiers; score card with tier, breakdown, archetype chips in the build panel; test proves the evasive-ninja meta build outscores the average of 20 seeded random builds; live-verified D/0 empty → S/139 full.
- [x] **T5** — Slot suggestions: for a partial build, rank all candidates for each open slot by marginal score gain. Verify: suggestions for a half-built meta build include the build's actual remaining picks near the top. **Done:** `src/lib/suggest.ts` ranks unpicked candidates by score delta (per kind + character); browser entries get "+N" gain badges and sort by gain, badges vanish when the kind is full. Half-built meta build ranks Firestaff #2/25 and Quantity Tome #3/21; picks whose value isn't in wiki synergy links (Moldy Cheese/Gloves evade set) rank low — known heuristic ceiling, noted for T4's revisit clause. 4 tests; live-verified gain-sorted tabs.
- [x] **T6** — Community builds: scrape megabonk.wiki Builds pages (MediaWiki API) + selected Steam guides into a normalized builds list with popularity ordering; browsable + importable into the creator. Verify: top-10 list matches community consensus by eyeball. **Done:** `scripts/ingest-builds.mjs` queries the wiki's Cargo `builds` table (`action=cargoquery`) — structured rows with real community vote counts, no HTML scraping — into vote-ordered `src/data/builds.json` (39 builds); Community tab shows votes + our heuristic tier per build, click imports into the creator (partial builds tolerated). Live-verified: top build imports to all 15 slots, S/349. Steam guides dropped — see decision log.

## Decision log

- Primary dataset = megabonk.wiki MediaWiki API; MelonLoader game-file dump deferred as a later ground-truth pass — wiki is scriptable today, dump mod is a spike.
- Dataset checked into the repo as static JSON (no backend) — app stays a pure static web app until scraping needs a server.
- Scoring is heuristic, not a damage sim — a real sim requires reverse-engineered formulas; revisit only if the heuristic proves misleading.
- T6 scope: Steam-guide scraping dropped — the wiki's Cargo `builds` table carries real per-build community votes (the popularity signal the plan wanted), making prose scraping redundant. Reddit API remains a future option if wiki submissions go stale.
