---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [f61697e]
---

# Plan: Map selection + floating inspect popup

## Intent

Two UX gaps: builds are map-specific (community builds even name maps) but the planner had no map concept; and the hover inspect card sat at the bottom of the left panel, unreadable when browsing long lists (85 items).

## Approach

Maps: `src/data/maps.json` (Forest/Desert/Graveyard with tiers, unlock, wiki icons — hand-pinned since the wiki's Maps page is a prose table, not a category; only 3 maps exist). `Build.map` field, `setMap`, URL `m=` param with validation. Picker renders as icon cards under Character; click toggles.

Popup: inspect state carries the hovered row's viewport `top`; the card renders in a `position: fixed` wrapper (immune to the list's overflow clipping that forced the old bottom-left placement) aligned with the row, viewport-clamped, `pointer-events: none`, dismissed on list mouseleave.

## Tasks

- [x] **T1** — Map dataset + Build.map + URL codec + picker UI. **Done:** share.test round-trips map; live-verified select→`#m=Desert`, link restore, toggle-off.
- [x] **T2** — Floating inspect popup replacing the bottom-left card. **Done:** live-verified popup tracks the hovered row at the bottom of the weapons list, stays in viewport, vanishes on leave.

## Decision log

- maps.json hand-pinned rather than ingested — the wiki Maps page is unstructured prose and the set is tiny; revisit if the game ships more maps.
- Popup is pointer-events: none — it can overlap the build panel briefly; letting it swallow clicks would be worse.
