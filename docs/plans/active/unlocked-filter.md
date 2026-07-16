---
status: active
created: 2026-07-16
updated: 2026-07-16
adrs: []
---

# Plan: Unlocked-only filtering

## Intent

The browser shows every entity in the game, but a player early in their unlock progression can't use most of them. Let the user mark what they own and toggle an "Only unlocked" filter — and when it's on, suggestions and Generate only draw from owned entities, so the optimizer answers "best build with what I have".

## Approach

`src/lib/unlocks.ts`: owned set persisted in localStorage, seeded with everything that's available by default (empty unlock or "Default"/"available at start" wording). Per-entry ownership toggle in the browser rows (does not trigger pick); "Only unlocked" checkbox in the browser header, also persisted. When active: entity tabs hide locked entries, suggestion gains and Generate pools are restricted to owned names. Community tab stays unfiltered (imports may contain locked entities — that's visible in the slots).

## Tasks

- [x] **T1** — Unlocks lib: default-owned seeding, load/save localStorage round-trip, toggle. Verify: tests incl. default seeding counts from real data. **Done:** `src/lib/unlocks.ts`; seed pattern covers Default/Starter Weapon/Starting Character/available-at-start wording (first pass missed the Starter/Starting variants — caught live, fixed); corrupt-storage fallback; 3 tests.
- [x] **T2** — UI: ownership toggle per entry + "Only unlocked" filter; suggestions + Generate restricted when active. Verify: live — lock a weapon, filter hides it, Generate never picks it. **Done:** owned/locked toggle chip per entry, persisted filter checkbox; gains + Generate pools switch to owned-only when active. Live-verified: fresh state owns 5 starter weapons + 2 starting characters, filter hides the rest, Generate fills all 15 slots using owned entities only (S tier).

## Decision log

- Ownership seeded optimistically (default-available entities owned) — a fresh visitor sees a working app, not an empty one.
- Suggestions/Generate honor the filter only when it's on — with it off, the app stays a full-catalog planner.
