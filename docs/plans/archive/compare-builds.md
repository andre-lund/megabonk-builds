---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [PENDING]
---

# Plan: Side-by-side build comparison

## Intent

Comparing a planned build against a community build (or a friend's shared link) required flipping between states. Add a Compare tab: current build vs a second build, side by side, with scores and pick diffs.

## Approach

`src/lib/compare.ts`: `diffBuilds` (shared / unique pick sets from pickedNames) and `parseSharedLink` (accepts full URLs or raw hash params, reuses decodeBuild, null on garbage). Compare tab offers a community-build dropdown and a paste-link input; both run through `enforceStartingWeapon`. Two columns each render their own score card (scored with their own map's emphasis), map, and grouped pick lists; picks unique to a column are highlighted, shared picks stay plain.

## Tasks

- [x] **T1** — Compare lib + tab UI. **Done:** 3 tests (diff, URL/hash parsing, garbage rejection); live-verified community-build compare (C vs S tiers, Axe unique-highlighted, shared Ninja plain) and paste-link compare (Noelle/Desert column renders with map).

## Decision log

- Each column is scored with its own map emphasis — comparing a Desert build to a Graveyard build on either single map would misstate both.
- Compare target is view-only; loading it into the editor already exists via the Community tab / opening the link.
