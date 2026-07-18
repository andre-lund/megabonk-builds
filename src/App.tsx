import { useEffect, useMemo, useState } from "react";
import "./App.css";
import weaponsJson from "./data/weapons.json";
import tomesJson from "./data/tomes.json";
import charactersJson from "./data/characters.json";
import itemsJson from "./data/items.json";
import buildsJson from "./data/builds.json";
import mapsJson from "./data/maps.json";
import type { Character, Item, Tome, UpgradeRow, Weapon } from "./types";
import {
  addToBuild,
  clearSlot,
  emptyBuild,
  pickedNames,
  setCharacter,
  setMap,
  type Build,
  type SlotKind,
} from "./lib/build";
import { activeSynergies, synergizesWithBuild, synergyIndex } from "./lib/synergy";
import { ARCHETYPES, archetypeIndex, scoreBuild, tier, type Archetype } from "./lib/score";
import { suggestFor } from "./lib/suggest";
import { toBuild, type CommunityBuild } from "./lib/community";
import { decodeBuild, encodeBuild, type KnownNames } from "./lib/share";
import { generateBuild, type GeneratePools } from "./lib/generate";
import { FILTER_KEY, defaultUnlocked, loadUnlocked, saveUnlocked, toggleUnlocked } from "./lib/unlocks";
import { excludeFromPools, loadExcluded, saveExcluded, toggleExcluded } from "./lib/exclude";
import { loadProgress, parseGoal, saveProgress, setProgress } from "./lib/progress";
import { decryptSave, mapPurchases, mapStats, saveKind } from "./lib/saveimport";
import { isBackup, restoreBackup, serializeBackup } from "./lib/backup";
import { enforceStartingWeapon, isStartingSlot, startingWeaponIndex } from "./lib/starting";
import { recommendBans } from "./lib/bans";
import { diffBuilds, parseSharedLink } from "./lib/compare";

const weapons = weaponsJson as Weapon[];
const tomes = tomesJson as Tome[];
const characters = charactersJson as Character[];
const items = itemsJson as Item[];
const communityBuilds = buildsJson as CommunityBuild[];

const synergyAdj = synergyIndex([weapons, tomes, characters, items]);

const iconOf = new Map<string, string>();
for (const e of [...weapons, ...tomes, ...characters, ...items]) {
  if (e.icon) iconOf.set(e.name, `${import.meta.env.BASE_URL}${e.icon}`);
}

function EntityIcon({ name, size }: { name: string; size: number }) {
  const src = iconOf.get(name);
  if (!src) return null;
  return <img className="entity-icon" src={src} alt="" width={size} height={size} />;
}

const rarityOf = new Map<string, string>(items.map((i) => [i.name, i.rarity]));

interface GameMap {
  name: string;
  tiers: number;
  unlock: string;
  icon: string;
  emphasis: string[];
}
const maps = mapsJson as GameMap[];

const knownNames: KnownNames = {
  characters: new Set(characters.map((c) => c.name)),
  weapons: new Set(weapons.map((w) => w.name)),
  tomes: new Set(tomes.map((t) => t.name)),
  items: new Set(items.map((i) => i.name)),
  maps: new Set(maps.map((m) => m.name)),
};

const generatePools: GeneratePools = {
  characters: characters.map((c) => c.name),
  weapons: weapons.map((w) => w.name),
  tomes: tomes.map((t) => t.name),
  items: items.map((i) => i.name),
};

const defaultOwned = defaultUnlocked([weapons, tomes, characters, items]);

const startingWeaponOf = startingWeaponIndex(characters);

const RARITY_COLUMNS = ["common", "uncommon", "rare", "epic", "legendary"] as const;

function UpgradeTable({ upgrades }: { upgrades: UpgradeRow[] }) {
  if (upgrades.length === 0) return null;
  return (
    <table className="upgrade-table">
      <thead>
        <tr>
          <th />
          {RARITY_COLUMNS.map((r) => (
            <th key={r} data-rarity={r}>
              {r.slice(0, 3)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {upgrades.map((u) => (
          <tr key={u.stat}>
            <td className="upgrade-stat">{u.stat}</td>
            {RARITY_COLUMNS.map((r) => (
              <td key={r}>{u[r]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InspectCard({ target }: { target: { tab: Tab; name: string } }) {
  const rows: [string, string][] = [];
  let upgrades: UpgradeRow[] = [];
  let rarity: string | undefined;
  if (target.tab === "weapon") {
    const w = weapons.find((x) => x.name === target.name);
    if (!w) return null;
    rows.push(["Type", w.type], ["Unlock", w.unlock]);
    if (w.special && w.special !== "None") rows.push(["Special", w.special]);
    upgrades = w.upgrades;
  } else if (target.tab === "tome") {
    const t = tomes.find((x) => x.name === target.name);
    if (!t) return null;
    rows.push(["Stat", t.stat], ["Effect", t.effect], ["Unlock", t.unlock]);
    if (t.maxLevel) rows.push(["Max level", String(t.maxLevel)]);
    upgrades = t.upgrades;
  } else if (target.tab === "character") {
    const c = characters.find((x) => x.name === target.name);
    if (!c) return null;
    rows.push(["Weapon", c.weapon], ["Blessing", c.blessing], ["Role", c.role], ["Unlock", c.unlock]);
  } else if (target.tab === "item") {
    const i = items.find((x) => x.name === target.name);
    if (!i) return null;
    rarity = i.rarity;
    rows.push(["Effect", i.effect], ["Unlock", i.unlock || "Default"]);
  } else {
    return null;
  }
  return (
    <div className="inspect-card">
      <h3 className="inspect-title">
        <EntityIcon name={target.name} size={26} />
        {target.name}
        {rarity && (
          <span className="rarity-tag" data-rarity={rarity.toLowerCase()}>
            {rarity}
          </span>
        )}
      </h3>
      <dl className="inspect-rows">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <UpgradeTable upgrades={upgrades} />
    </div>
  );
}

const archetypes = archetypeIndex([
  weapons.map((w) => ({ name: w.name, text: `${w.type} ${w.description}` })),
  tomes.map((t) => ({ name: t.name, text: `${t.stat} ${t.effect}` })),
  characters.map((c) => ({ name: c.name, text: `${c.role} ${c.blessing}` })),
  items.map((i) => ({ name: i.name, text: i.effect })),
]);

type Tab = "character" | SlotKind | "community" | "progress" | "compare";

const TABS: { id: Tab; label: string }[] = [
  { id: "character", label: "Characters" },
  { id: "weapon", label: "Weapons" },
  { id: "tome", label: "Tomes" },
  { id: "item", label: "Items" },
  { id: "community", label: "Community" },
  { id: "progress", label: "Unlocks" },
  { id: "compare", label: "Compare" },
];

interface LockableEntity {
  name: string;
  unlock: string;
  kind: string;
}

const lockableEntities: LockableEntity[] = [
  ...characters.map((c) => ({ name: c.name, unlock: c.unlock, kind: "Character" })),
  ...weapons.map((w) => ({ name: w.name, unlock: w.unlock, kind: "Weapon" })),
  ...tomes.map((t) => ({ name: t.name, unlock: t.unlock, kind: "Tome" })),
  ...items.map((i) => ({ name: i.name, unlock: i.unlock, kind: "Item" })),
];

interface BrowserEntry {
  name: string;
  iconName?: string;
  subtitle: string;
  detail: string;
}

function entriesFor(tab: Tab): BrowserEntry[] {
  switch (tab) {
    case "character":
      return characters.map((c) => ({ name: c.name, subtitle: c.role || c.weapon, detail: c.blessing }));
    case "weapon":
      return weapons.map((w) => ({ name: w.name, subtitle: w.type, detail: w.description }));
    case "tome":
      return tomes.map((t) => ({ name: t.name, subtitle: t.stat, detail: t.effect }));
    case "item":
      return items.map((i) => ({ name: i.name, subtitle: i.rarity, detail: i.effect }));
    case "progress":
    case "compare":
      return []; // rendered separately
    case "community":
      // Dataset is vote-ordered; score each build with our heuristic for the subtitle.
      return communityBuilds.map((cb) => {
        const s = scoreBuild(toBuild(cb), synergyAdj, archetypes);
        return {
          name: cb.name,
          iconName: cb.character ?? undefined,
          subtitle: `${cb.votes} votes · ${tier(s.total)} ${s.total} pts${cb.author ? ` · by ${cb.author}` : ""}`,
          detail: `${cb.character ?? "?"} — ${[...cb.weapons, ...cb.tomes].join(", ")}`,
        };
      });
  }
}

function SlotRow(props: {
  label: string;
  kind: SlotKind;
  slots: (string | null)[];
  pinnedIndex?: number;
  character?: string | null;
  onClear: (kind: SlotKind, index: number) => void;
}) {
  return (
    <div className="slot-group">
      <h3>{props.label}</h3>
      <div className="slots">
        {props.slots.map((name, i) => {
          const pinned = i === props.pinnedIndex;
          return (
            <button
              key={i}
              className={pinned ? "slot filled pinned" : name ? "slot filled" : "slot"}
              data-rarity={props.kind === "item" && name ? rarityOf.get(name)?.toLowerCase() : undefined}
              title={
                pinned
                  ? `${name} — ${props.character}'s starting weapon (locked)`
                  : name
                    ? `Remove ${name}`
                    : "Empty slot"
              }
              onClick={() => name && !pinned && props.onClear(props.kind, i)}
            >
              {name && <EntityIcon name={name} size={20} />}
              {name ?? "—"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [build, setBuildRaw] = useState<Build>(() =>
    enforceStartingWeapon(decodeBuild(window.location.hash, knownNames), startingWeaponOf),
  );
  const setBuild = (update: Build | ((b: Build) => Build)) =>
    setBuildRaw((prev) => enforceStartingWeapon(typeof update === "function" ? update(prev) : update, startingWeaponOf));
  const [tab, setTab] = useState<Tab>("character");
  const [query, setQuery] = useState("");
  const [inspect, setInspect] = useState<{ tab: Tab; name: string; top: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(() => loadUnlocked(defaultOwned, localStorage));
  const [onlyUnlocked, setOnlyUnlocked] = useState(() => localStorage.getItem(FILTER_KEY) === "1");
  const [excluded, setExcluded] = useState(() => loadExcluded(localStorage));
  const [progress, setProgressState] = useState(() => loadProgress(localStorage));
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [compareWith, setCompareWith] = useState<{ label: string; build: Build } | null>(null);
  const [compareInput, setCompareInput] = useState("");

  useEffect(() => saveUnlocked(unlocked, localStorage), [unlocked]);
  useEffect(() => localStorage.setItem(FILTER_KEY, onlyUnlocked ? "1" : "0"), [onlyUnlocked]);
  useEffect(() => saveProgress(progress, localStorage), [progress]);
  useEffect(() => saveExcluded(excluded, localStorage), [excluded]);

  const lockedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lockableEntities
      .filter((e) => !unlocked.has(e.name))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.unlock.toLowerCase().includes(q))
      .map((e) => {
        const goal = parseGoal(e.unlock);
        const current = progress.get(e.name) ?? 0;
        return { ...e, goal, current, ratio: goal ? Math.min(1, current / goal) : 0 };
      })
      .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
  }, [unlocked, progress, query]);

  const activePools = useMemo<GeneratePools>(() => {
    if (!onlyUnlocked) return generatePools;
    const own = (names: string[]) => names.filter((n) => unlocked.has(n));
    return {
      characters: own(generatePools.characters),
      weapons: own(generatePools.weapons),
      tomes: own(generatePools.tomes),
      items: own(generatePools.items),
    };
  }, [onlyUnlocked, unlocked]);

  useEffect(() => {
    const encoded = encodeBuild(build);
    history.replaceState(null, "", encoded ? `#${encoded}` : window.location.pathname + window.location.search);
  }, [build]);

  async function importSaves(files: File[]) {
    const messages: string[] = [];
    for (const file of files) {
      try {
        const save = await decryptSave(await file.text());
        if (isBackup(save)) {
          const restored = restoreBackup(save, lockableEntities.map((e) => e.name));
          setUnlocked(restored.unlocked);
          setProgressState(restored.progress);
          messages.push(`backup restored (${restored.unlocked.size} owned)`);
          continue;
        }
        const kind = saveKind(save);
        if (kind === "progression") {
          const result = mapPurchases(save, lockableEntities.map((e) => e.name));
          setUnlocked((u) => new Set([...u, ...result.unlockedNames]));
          messages.push(`${result.unlockedNames.length} unlocks`);
        } else if (kind === "stats") {
          const imported = mapStats(save, lockableEntities.map((e) => e.name));
          setProgressState((p) => {
            let next = p;
            for (const [name, value] of imported) next = setProgress(next, name, Math.max(p.get(name) ?? 0, value));
            return next;
          });
          messages.push(`progress for ${imported.size} unlock goals`);
        } else {
          messages.push(`${file.name}: not a recognized save file`);
        }
      } catch {
        messages.push(`${file.name}: could not read`);
      }
    }
    setImportStatus(`Imported ${messages.join(" + ")}.`);
  }

  function exportBackup() {
    const blob = new Blob([serializeBackup(unlocked, progress, new Date().toISOString())], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "megabonk-builds-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const picked = useMemo(() => pickedNames(build), [build]);
  const mapEmphasis = useMemo(
    () => (maps.find((m) => m.name === build.map)?.emphasis ?? []) as Archetype[],
    [build.map],
  );
  const bans = useMemo(
    () => (picked.size < 2 ? [] : recommendBans(build, activePools.items, synergyAdj, archetypes, rarityOf)),
    [build, picked, activePools],
  );
  const synergies = useMemo(() => activeSynergies(picked, synergyAdj), [picked]);
  const score = useMemo(() => scoreBuild(build, synergyAdj, archetypes, mapEmphasis), [build, mapEmphasis]);

  const gains = useMemo(() => {
    if (tab === "community" || tab === "progress" || tab === "compare") return new Map<string, number>();
    const pool = tab === "character" ? activePools.characters : activePools[`${tab}s`];
    return new Map(suggestFor(build, tab, pool, synergyAdj, archetypes, mapEmphasis).map((s) => [s.name, s.gain]));
  }, [tab, build, activePools]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = entriesFor(tab).filter(
      (e) =>
        (!onlyUnlocked || tab === "community" || unlocked.has(e.name)) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q)),
    );
    // Suggestion order: unpicked by marginal gain descending, picked entries last.
    if (gains.size > 0) {
      filtered.sort((a, b) => (gains.get(b.name) ?? -1) - (gains.get(a.name) ?? -1));
    }
    return filtered;
  }, [tab, query, gains, onlyUnlocked, unlocked]);

  function pick(name: string) {
    if (tab === "progress" || tab === "compare") {
      return;
    } else if (tab === "community") {
      const cb = communityBuilds.find((c) => c.name === name);
      if (cb) setBuild(toBuild(cb));
    } else if (tab === "character") {
      setBuild((b) => {
        if (b.character === name) {
          const wasPinned = isStartingSlot(b, "weapon", 0, startingWeaponOf);
          const next = setCharacter(b, null);
          return wasPinned ? clearSlot(next, "weapon", 0) : next;
        }
        const wasPinned = isStartingSlot(b, "weapon", 0, startingWeaponOf);
        return setCharacter(wasPinned ? clearSlot(b, "weapon", 0) : b, name);
      });
    } else {
      setBuild((b) => addToBuild(b, tab, name));
    }
  }

  return (
    <div className="layout">
      <section className="panel build-panel">
        <h2>Build</h2>
        <div className="score-card">
          <div className="score-main">
            <span className="score-tier" data-tier={tier(score.total)}>
              {tier(score.total)}
            </span>
            <span className="score-total">{score.total} pts</span>
          </div>
          <div className="score-breakdown">
            <span>{score.synergyPairs} synergies</span>
            <span>{score.filledSlots}/15 slots</span>
            {score.mapBonus > 0 && <span>+{score.mapBonus} map fit</span>}
          </div>
          <div className="archetype-chips">
            {ARCHETYPES.map((a) => (
              <span key={a} className={score.covered.includes(a) ? "chip covered" : "chip"}>
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="slot-group">
          <h3>Character</h3>
          <div className="slots">
            <button
              className={build.character ? "slot filled" : "slot"}
              title={build.character ? `Remove ${build.character}` : "Pick a character"}
              onClick={() =>
                build.character &&
                setBuild((b) => {
                  const wasPinned = isStartingSlot(b, "weapon", 0, startingWeaponOf);
                  const next = setCharacter(b, null);
                  return wasPinned ? clearSlot(next, "weapon", 0) : next;
                })
              }
            >
              {build.character && <EntityIcon name={build.character} size={20} />}
              {build.character ?? "—"}
            </button>
          </div>
        </div>
        <div className="slot-group">
          <h3>Map</h3>
          <div className="slots">
            {maps.map((m) => (
              <button
                key={m.name}
                className={build.map === m.name ? "map-pick active" : "map-pick"}
                title={`${m.name} — ${m.tiers} tier${m.tiers > 1 ? "s" : ""}. ${m.unlock}`}
                onClick={() => setBuild((b) => setMap(b, b.map === m.name ? null : m.name))}
              >
                <img src={`${import.meta.env.BASE_URL}${m.icon}`} alt="" width={54} height={40} />
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <SlotRow
          label="Weapons"
          kind="weapon"
          slots={build.weapons}
          pinnedIndex={isStartingSlot(build, "weapon", 0, startingWeaponOf) ? 0 : undefined}
          character={build.character}
          onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))}
        />
        <SlotRow label="Tomes" kind="tome" slots={build.tomes} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
        <SlotRow label="Items" kind="item" slots={build.items} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
        <div className="slot-group">
          <h3>Synergies ({synergies.length})</h3>
          {synergies.length === 0 ? (
            <p className="synergy-empty">No active synergies yet.</p>
          ) : (
            <ul className="synergy-list">
              {synergies.map((s) => (
                <li key={`${s.a}|${s.b}`}>
                  <span>{s.a}</span> ↔ <span>{s.b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {bans.length > 0 && (
          <div className="slot-group">
            <h3>Disable before run</h3>
            <p className="ban-hint">Items with the worst fit for this build — inactivate them in-game to clean up the drop pool.</p>
            <ul className="ban-list">
              {bans.map((c) => (
                <li key={c.name} data-rarity={rarityOf.get(c.name)?.toLowerCase()}>
                  <EntityIcon name={c.name} size={18} />
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="actions">
          <button
            className="action generate"
            onClick={() =>
              setBuild((b) => generateBuild(b, excludeFromPools(activePools, excluded), synergyAdj, archetypes, mapEmphasis))
            }
          >
            Generate
          </button>
          <button className="action" onClick={share}>
            {copied ? "Copied!" : "Share"}
          </button>
          <button className="action" onClick={() => setBuild(emptyBuild())}>
            Reset
          </button>
        </div>
      </section>

      <section className="panel browser-panel">
        <div className="browser-header">
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={t.id === tab ? "tab active" : "tab"} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="filter-row">
            <input
              type="search"
              placeholder="Search name, stat, effect…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="unlocked-filter">
              <input type="checkbox" checked={onlyUnlocked} onChange={(e) => setOnlyUnlocked(e.target.checked)} />
              Only unlocked
            </label>
          </div>
        </div>
        {tab === "compare" && (
          <div className="compare-view">
            <div className="compare-controls">
              <select
                value=""
                onChange={(ev) => {
                  const cb = communityBuilds.find((c) => c.name === ev.target.value);
                  if (cb) setCompareWith({ label: cb.name, build: enforceStartingWeapon(toBuild(cb), startingWeaponOf) });
                }}
              >
                <option value="" disabled>
                  Compare with a community build…
                </option>
                {communityBuilds.map((cb) => (
                  <option key={cb.name} value={cb.name}>
                    {cb.name} ({cb.votes} votes)
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="…or paste a share link"
                value={compareInput}
                onChange={(ev) => {
                  setCompareInput(ev.target.value);
                  const parsed = parseSharedLink(ev.target.value, knownNames);
                  if (parsed) setCompareWith({ label: "Pasted build", build: enforceStartingWeapon(parsed, startingWeaponOf) });
                }}
              />
            </div>
            {!compareWith ? (
              <p className="no-results">Pick a community build or paste a share link to compare against your current build.</p>
            ) : (
              (() => {
                const diff = diffBuilds(build, compareWith.build);
                const columns: { title: string; b: Build; unique: Set<string>; loadable?: boolean }[] = [
                  { title: "Current build", b: build, unique: diff.onlyA },
                  { title: compareWith.label, b: compareWith.build, unique: diff.onlyB, loadable: true },
                ];
                return (
                  <div className="compare-columns">
                    {columns.map(({ title, b, unique, loadable }) => {
                      const emphasis = (maps.find((m) => m.name === b.map)?.emphasis ?? []) as Archetype[];
                      const s = scoreBuild(b, synergyAdj, archetypes, emphasis);
                      const groups: [string, (string | null)[]][] = [
                        ["Character", [b.character]],
                        ["Map", [b.map]],
                        ["Weapons", b.weapons],
                        ["Tomes", b.tomes],
                        ["Items", b.items],
                      ];
                      return (
                        <div key={title} className="compare-column">
                          <h3>
                            {title}
                            {loadable && (
                              <button className="action load-compared" onClick={() => setBuild(compareWith.build)}>
                                Load into editor
                              </button>
                            )}
                          </h3>
                          <div className="score-main">
                            <span className="score-tier" data-tier={tier(s.total)}>
                              {tier(s.total)}
                            </span>
                            <span className="score-total">{s.total} pts</span>
                          </div>
                          <div className="score-breakdown">
                            <span>{s.synergyPairs} synergies</span>
                            <span>{s.filledSlots}/15 slots</span>
                            {s.mapBonus > 0 && <span>+{s.mapBonus} map fit</span>}
                          </div>
                          {groups.map(([label, names]) => (
                            <div key={label} className="compare-group">
                              <h4>{label}</h4>
                              <ul>
                                {names.filter((n): n is string => n !== null).map((n) => (
                                  <li key={n} className={unique.has(n) ? "compare-pick unique" : "compare-pick"}>
                                    <EntityIcon name={n} size={18} />
                                    {n}
                                  </li>
                                ))}
                                {names.every((n) => n === null) && <li className="compare-pick empty">—</li>}
                              </ul>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
            {compareWith && (
              <p className="compare-legend">
                Highlighted picks are unique to that build; unhighlighted picks are shared by both.
              </p>
            )}
          </div>
        )}
        {tab === "progress" && (
          <div className="import-bar">
            <label className="action import-save">
              Import save files
              <input
                type="file"
                accept=".json,application/json,text/plain"
                multiple
                hidden
                onChange={(ev) => {
                  const files = [...(ev.target.files ?? [])];
                  if (files.length) void importSaves(files);
                  ev.target.value = "";
                }}
              />
            </label>
            <button className="action" onClick={exportBackup}>
              Export backup
            </button>
            <span className="import-hint">
              {importStatus ??
                "progression.json (unlocks) + stats.json (progress) from %appdata%\\..\\LocalLow\\Ved\\Megabonk\\Saves\\CloudDir\\<id>\\ — read locally, never uploaded."}
            </span>
          </div>
        )}
        {tab === "progress" && (
          <ul className="entries progress-list">
            {lockedRows.map((row) => (
              <li key={row.name} className="progress-row">
                <div className="progress-head">
                  <span className="entry-name">
                    <EntityIcon name={row.name} size={26} />
                    {row.name}
                  </span>
                  <span className="entry-subtitle">{row.kind}</span>
                  <button
                    className="action own-now"
                    onClick={() => setUnlocked((u) => toggleUnlocked(u, row.name))}
                  >
                    Mark owned
                  </button>
                </div>
                <p className="progress-unlock">{row.unlock || "No unlock condition documented."}</p>
                {row.goal !== null && (
                  <div className="progress-track">
                    <input
                      type="number"
                      min={0}
                      value={row.current || ""}
                      placeholder="0"
                      onChange={(ev) =>
                        setProgressState((p) => setProgress(p, row.name, Number(ev.target.value) || 0))
                      }
                    />
                    <span className="progress-goal">/ {row.goal.toLocaleString()}</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${row.ratio * 100}%` }} />
                    </div>
                    <span className="progress-pct">{Math.round(row.ratio * 100)}%</span>
                  </div>
                )}
              </li>
            ))}
            {lockedRows.length === 0 && <li className="no-results">Everything is unlocked. Go bonk.</li>}
          </ul>
        )}
        <ul className="entries" hidden={tab === "progress" || tab === "compare"} onMouseLeave={() => setInspect(null)}>
          {entries.map((e) => {
            const isPicked = picked.has(e.name);
            const linked = !isPicked && synergizesWithBuild(e.name, picked, synergyAdj);
            const gain = gains.get(e.name);
            return (
              <li key={e.name}>
                <button
                  className={isPicked ? "entry picked" : linked ? "entry linked" : "entry"}
                  data-rarity={tab === "item" ? rarityOf.get(e.name)?.toLowerCase() : undefined}
                  onClick={() => pick(e.name)}
                  onMouseEnter={(ev) =>
                    tab !== "community" &&
                    setInspect({ tab, name: e.name, top: ev.currentTarget.getBoundingClientRect().top })
                  }
                >
                  <span className="entry-name">
                    <EntityIcon name={e.iconName ?? e.name} size={26} />
                    {e.name}
                    {linked && <span className="synergy-badge">synergy</span>}
                    {gain !== undefined && gain > 0 && <span className="gain-badge">+{gain}</span>}
                    {tab !== "community" && (
                      <span
                        role="checkbox"
                        aria-checked={unlocked.has(e.name)}
                        aria-label={`owned: ${e.name}`}
                        tabIndex={0}
                        className={unlocked.has(e.name) ? "own-toggle owned" : "own-toggle"}
                        title={unlocked.has(e.name) ? "Owned — click to mark locked" : "Locked — click to mark owned"}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setUnlocked((u) => toggleUnlocked(u, e.name));
                        }}
                      >
                        {unlocked.has(e.name) ? "owned" : "locked"}
                      </span>
                    )}
                    {tab !== "community" && (
                      <span
                        role="checkbox"
                        aria-checked={excluded.has(e.name)}
                        aria-label={`excluded from generate: ${e.name}`}
                        tabIndex={0}
                        className={excluded.has(e.name) ? "exclude-toggle excluded" : "exclude-toggle"}
                        title={
                          excluded.has(e.name)
                            ? "Excluded from Generate — click to allow"
                            : "Click to keep Generate from picking this"
                        }
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setExcluded((x) => toggleExcluded(x, e.name));
                        }}
                      >
                        {excluded.has(e.name) ? "excluded" : "exclude"}
                      </span>
                    )}
                  </span>
                  <span className="entry-subtitle">{e.subtitle}</span>
                  <span className="entry-detail">{e.detail}</span>
                </button>
              </li>
            );
          })}
          {entries.length === 0 && <li className="no-results">No matches.</li>}
        </ul>
      </section>
      {inspect && (
        <div className="inspect-popup" style={{ top: Math.max(8, Math.min(inspect.top, window.innerHeight - 420)) }}>
          <InspectCard target={inspect} />
        </div>
      )}
    </div>
  );
}
