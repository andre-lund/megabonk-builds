---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [e3f149e]
---

# Plan: Map-aware scoring and generation

## Intent

Follow-on to map selection: Generate (and the score/suggestions) should account for the selected map, biasing toward what that map demands.

## Approach

No wiki-data signal exists (zero map mentions in effect/description text; only 2 low-vote community builds name maps), so map influence is hand-pinned game-meta judgment in `maps.json`: each map lists emphasized archetypes (Forest none, Desert mobility, Graveyard damage+defense). `scoreBuild` gains a `mapEmphasis` param paying MAP_POINTS (3) per picked entity carrying an emphasized archetype — per-entity, not coverage-once, so stacking keeps paying but synergy (10/pair) still dominates. Threaded through suggestFor and generateBuild; the score card shows "+N map fit".

## Tasks

- [x] **T1** — Emphasis data + scoring param + suggest/generate threading + score-card display. **Done:** 2 new tests (per-entity map bonus incl. stacking; generation shifts toward emphasized archetypes); live-verified Graveyard generation swaps Agility/Attraction/XP tomes for Armor/Shield/Bloody (+66 map fit) vs the map-less build, and an already-mobility-heavy Ninja build correctly stays optimal on Desert (+9 map fit shown).

## Decision log

- Emphasis values are meta judgment, not derived data — recorded per map in maps.json where they're trivially editable; MAP_POINTS=3 keeps map fit a tiebreaker/nudger below synergy weight, by design.
- Community-tab build scores stay map-neutral — votes ranked them, not our map guess.
