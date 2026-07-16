---
status: active
created: 2026-07-16
updated: 2026-07-16
adrs: []
---

# Plan: Game icons in the GUI

## Intent

The creator currently renders text-only entries and slots. Pull every entity's icon from the wiki and show it throughout the UI (browser entries, build slots, community builds) so the app reads like the game instead of a spreadsheet.

## Approach

Extend `scripts/ingest.mjs`: batch `prop=pageimages` for all entity pages, fall back to the infobox `image` / `{{#seo:}}` image param, resolve filenames to URLs via `prop=imageinfo`, download to `public/icons/<slug>.png`, and record `icon` on each entity in the JSON. UI renders the icons in browser rows, slot buttons, and the community tab (character icon per build). Icons are committed so the app stays static and wiki-independent at runtime.

## Tasks

- [x] **T1** — Ingest icons: pageimages + infobox/seo fallback, download to `public/icons/`, `icon` field in all four datasets. Verify: coverage count per kind; spot-check files are real PNGs. **Done:** three-tier resolution (pageimages → infobox/`{{#seo:}}` image param → `<Title>.png` naming convention; File-title space/underscore normalization fixed) — 154/155 icons (27/27 weapons, 23/23 tomes, 20/20 characters, 84/85 items; Bob's Light is `image = Missing` on the wiki itself).
- [x] **T2** — UI integration: icons in entry rows, slot buttons, and community build rows. Verify: live check shows icons in browser, slots after picking, and community list. **Done:** `EntityIcon` component + global name→icon map, `image-rendering: pixelated`; community rows use the character icon. Live-verified: all five tabs fully iconed, 0 broken images, slot icons render after picking.

## Decision log

- Icons committed to the repo (like the datasets) — runtime stays static, wiki outages/hotlinking irrelevant; `npm run ingest` refreshes both.
