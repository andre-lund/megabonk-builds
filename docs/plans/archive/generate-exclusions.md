---
status: done
created: 2026-07-17
updated: 2026-07-17
completed: 2026-07-17
adrs: []
commit refs: [a68596c]
---

# Plan: Exclude entities from Generate

## Intent

Let the user tick off characters, weapons, tomes, and items they never want Generate to pick — personal dislikes, not ownership. Excluded entities stay pickable by hand; they are only removed from the auto-generate pools.

## Approach

`src/lib/exclude.ts`: a localStorage-persisted `Set<string>` mirroring the `unlocks.ts` pattern (load/save/toggle, empty by default). App keeps an `excluded` state; the pools passed to `generateBuild` are `activePools` minus the excluded names. Suggestions, gain badges, and ban recommendations are untouched — exclusion scopes to Generate only, as requested. Each browser entry (character/weapon/tome/item tabs) gets a small toggle chip next to the owned toggle; excluded entries show a dimmed marker.

## Tasks

- [x] **T1** — Exclusion lib + persistence + tests; App wiring (state, toggle chip, filtered generate pools) + CSS. **Done:** `src/lib/exclude.ts` (load/save/toggle/excludeFromPools, 3 tests); exclude chip on all entity tabs next to the owned toggle; Generate call wraps activePools in excludeFromPools.

## Decision log

- Named "exclusions", not "bans" — "ban" is already taken by the in-game disable-before-run recommendations (`bans.ts`).
- Exclusion filters only the Generate pools, not suggestions/gains/ban recs — the request scopes to "when I use the generate option"; a broader filter can come later if wanted.
