# megabonk-builds

A build planner for [Megabonk](https://store.steampowered.com/app/3405340/Megabonk/): assemble character/weapon/tome/item builds, see synergies light up, get a heuristic strength score, and let the optimizer fill your open slots. Static web app, no backend.

**Live: https://andre-lund.github.io/megabonk-builds/**

## Features

- **Build creator** — 1 character, 4 weapons, 4 tomes, 6 items (the wiki's own build template shape), plus map selection. The character's starting weapon is pinned automatically, like in the game.
- **Synergy display** — active synergy pairs listed live; browser entries that would link with your picks get a badge.
- **Build score** — heuristic tier (S–D) from synergy pairs, archetype coverage (damage/defense/mobility/utility), slot completeness, and map fit. Not a damage sim.
- **Suggestions** — every open slot's candidates ranked by marginal score gain; the browser sorts by it.
- **Generate** — greedily completes any partial build with the best picks, taking the selected map's emphasis into account.
- **Community builds** — vote-ranked builds from the wiki's Cargo database, browsable and importable.
- **Compare** — your build vs a community build or a pasted share link, side by side with pick diffs; load the compared build into the editor.
- **Shareable URLs** — the whole build lives in the URL hash; copy the link, get the build back.
- **Collection tracking** — mark what you own (or import your actual save files), filter to unlocked-only, track grind progress toward locked unlocks, and get disable-before-run recommendations for items that don't fit your build. Export/restore everything as a JSON backup.

## Save-file import

The Unlocks tab imports the game's own `progression.json` (unlocks) and `stats.json` (grind progress) from
`%appdata%\..\LocalLow\Ved\Megabonk\Saves\CloudDir\<id>\`.
Files are decrypted and parsed entirely in your browser (Web Crypto, AES-256-CBC with the key published in the community save editor) — nothing is uploaded anywhere.

## Data

Game data (28 weapons, 23 tomes, 20 characters, 85 items, icons) is ingested from [megabonk.wiki](https://megabonk.wiki)'s MediaWiki API and committed as static JSON, so the app has no runtime dependency on the wiki. After a game patch:

```sh
npm run ingest         # entities + icons
npm run ingest:builds  # community builds + votes
```

## Development

```sh
pnpm install
pnpm dev       # dev server
pnpm test      # vitest
pnpm build     # production build
```

Pushes to `main` deploy to GitHub Pages via Actions (tests must pass).

Project docs follow an ADR/plan standard — see `docs/`.

Unofficial fan project. Game data and icons belong to their respective owners; sourced from the community-maintained [megabonk.wiki](https://megabonk.wiki).
