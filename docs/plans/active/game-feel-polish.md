---
status: active
created: 2026-07-16
updated: 2026-07-16
adrs: []
---

# Plan: Game-feel polish — rarity colors, font, tooltips

## Intent

Follow-on to game-icons: make the creator read like the game. Item rarity gets the game's color language, headings get a chunky game-style display font, and hovering any entity shows its full details (per-rarity upgrade tables, unlock, effect) without leaving the creator.

## Approach

Rarity palette lifted from the wiki's own upgrade-table headers (Common green #20854b, Uncommon blue #0c5582, Rare purple #7e0079, Epic red #7e1011, Legendary gold #897900), brightened for dark-bg borders/text. Display font: an OFL-licensed chunky font committed to the repo (no runtime fetch, matches the static-app decision). Tooltips are CSS hover popovers rendered per entry from the datasets already in memory.

## Tasks

- [x] **T1** — Rarity colors: item entries + item slot borders and rarity subtitle tinted by rarity; rarity color scale shared with tooltip tables. Verify: live check shows distinct colors per rarity tier. **Done:** left-accent border + tinted subtitle per rarity on item entries, rarity border on filled item slots, rarity tag in the inspect card; live-verified 5 distinct computed colors (game has no Uncommon items — Default/Common/Rare/Epic/Legendary only).
- [x] **T2** — Game font: OFL display font bundled locally, applied to headings, tabs, slot labels, score tier. Verify: font loads from repo asset, no external request. **Done:** Titan One latin woff2 (12K, OFL) at src/assets/fonts/, @font-face in index.css; live-verified document.fonts.check passes with zero external resource requests.
- [x] **T3** — Hover tooltips: per-kind detail card (weapons/tomes: per-rarity upgrade table + unlock + special; characters: blessing/unlock/default weapon; items: rarity/effect/unlock). Verify: live hover shows the Axe upgrade table matching the wiki. **Done:** hover-driven InspectCard in the build panel (see decision log) with per-kind rows + UpgradeTable using the wiki header colors; live-verified Axe table matches the wiki row-for-row, Anvil shows Legendary tag.

## Decision log

- Rarity hex values pinned from the wiki's table headers so app and wiki speak the same color language.
- T3 mechanism: hover *inspect card* in the build panel instead of per-entry popovers — the entry list's `overflow-y: auto` clips absolutely-positioned tooltips, and a fixed inspect panel reads more like a game anyway.
