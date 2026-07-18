---
status: active
created: 2026-07-18
updated: 2026-07-18
adrs: []
---

# Plan: Grounded ban recommendations

## Intent

The disable-before-run list is noisy: Anvil (a generically strong Legendary) headed it every build because its effect text only classifies as utility, it has no wiki synergy links, and the alphabetical tie-break at fit 0 always puts it first. The fit metric knows nothing about intrinsic item power, and the fixed top-10 shows exactly ten bans regardless of how much dead weight actually exists.

## Approach

Rework the fit metric in `src/lib/bans.ts`: keep build-synergy links (10) and missing-archetype coverage (8), add a rarity prior for intrinsic power (common 0 / uncommon 1 / rare 3 / epic 5 / legendary 8) and a small alignment credit (2) for items sharing an archetype the build already covers. Replace fixed top-10 with a cutoff: recommend items with fit < 4 (no synergy, no missing coverage, below-rare rarity, at best weak alignment), capped at 20. List size now tracks actual dead weight.

## Tasks

- [x] **T1** — Rarity-and-alignment-aware fit + cutoff-based list; tests; App wiring. **Done:** rarity prior + alignment credit + fit < 4 cutoff (cap 20) in `bans.ts`; archetype regexes widened (summon/jump/moving/money/chest/reward/shrine) so real effects classify; 4 tests incl. never-ban-epic/legendary; sample builds now show 9–10 build-specific filler bans, Anvil gone.

## Decision log

- Rarity prior of 8 for Legendary deliberately equals one missing-archetype coverage: a Legendary needs no build-specific reason to stay in the pool.
- Cutoff 4 / cap 20: rare+ items and anything with a synergy link or missing-archetype coverage are never recommended; aligned commons/uncommons (fit 1–3) still are, since off-synergy filler dilutes the pool.
- Part of the noise was archetype-classifier gaps, not the metric: items like Feathers ("jump"), Golden Sneakers ("money by moving"), Key ("chests"), Wrench ("Shrines/rewards"), Ghost ("Summons") matched no pattern and read as dead weight. Widened the regexes in `score.ts` — this deliberately touches the shared scoring surface (score, suggestions, generate) since the same misclassification affected them too.
