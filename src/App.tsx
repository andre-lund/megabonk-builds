import { useMemo, useState } from "react";
import "./App.css";
import weaponsJson from "./data/weapons.json";
import tomesJson from "./data/tomes.json";
import charactersJson from "./data/characters.json";
import itemsJson from "./data/items.json";
import buildsJson from "./data/builds.json";
import type { Character, Item, Tome, UpgradeRow, Weapon } from "./types";
import {
  addToBuild,
  clearSlot,
  emptyBuild,
  pickedNames,
  setCharacter,
  type Build,
  type SlotKind,
} from "./lib/build";
import { activeSynergies, synergizesWithBuild, synergyIndex } from "./lib/synergy";
import { ARCHETYPES, archetypeIndex, scoreBuild, tier } from "./lib/score";
import { suggestFor } from "./lib/suggest";
import { toBuild, type CommunityBuild } from "./lib/community";

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

type Tab = "character" | SlotKind | "community";

const TABS: { id: Tab; label: string }[] = [
  { id: "character", label: "Characters" },
  { id: "weapon", label: "Weapons" },
  { id: "tome", label: "Tomes" },
  { id: "item", label: "Items" },
  { id: "community", label: "Community" },
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
  onClear: (kind: SlotKind, index: number) => void;
}) {
  return (
    <div className="slot-group">
      <h3>{props.label}</h3>
      <div className="slots">
        {props.slots.map((name, i) => (
          <button
            key={i}
            className={name ? "slot filled" : "slot"}
            data-rarity={props.kind === "item" && name ? rarityOf.get(name)?.toLowerCase() : undefined}
            title={name ? `Remove ${name}` : "Empty slot"}
            onClick={() => name && props.onClear(props.kind, i)}
          >
            {name && <EntityIcon name={name} size={20} />}
            {name ?? "—"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [build, setBuild] = useState<Build>(emptyBuild);
  const [tab, setTab] = useState<Tab>("character");
  const [query, setQuery] = useState("");
  const [inspect, setInspect] = useState<{ tab: Tab; name: string } | null>(null);

  const picked = useMemo(() => pickedNames(build), [build]);
  const synergies = useMemo(() => activeSynergies(picked, synergyAdj), [picked]);
  const score = useMemo(() => scoreBuild(build, synergyAdj, archetypes), [build]);

  const gains = useMemo(() => {
    if (tab === "community") return new Map<string, number>();
    const all = entriesFor(tab).map((e) => e.name);
    return new Map(suggestFor(build, tab, all, synergyAdj, archetypes).map((s) => [s.name, s.gain]));
  }, [tab, build]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = entriesFor(tab).filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q),
    );
    // Suggestion order: unpicked by marginal gain descending, picked entries last.
    if (gains.size > 0) {
      filtered.sort((a, b) => (gains.get(b.name) ?? -1) - (gains.get(a.name) ?? -1));
    }
    return filtered;
  }, [tab, query, gains]);

  function pick(name: string) {
    if (tab === "community") {
      const cb = communityBuilds.find((c) => c.name === name);
      if (cb) setBuild(toBuild(cb));
    } else if (tab === "character") {
      setBuild((b) => setCharacter(b, b.character === name ? null : name));
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
              onClick={() => build.character && setBuild((b) => setCharacter(b, null))}
            >
              {build.character && <EntityIcon name={build.character} size={20} />}
              {build.character ?? "—"}
            </button>
          </div>
        </div>
        <SlotRow label="Weapons" kind="weapon" slots={build.weapons} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
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
        <button className="reset" onClick={() => setBuild(emptyBuild())}>
          Reset build
        </button>
        {inspect && <InspectCard target={inspect} />}
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
          <input
            type="search"
            placeholder="Search name, stat, effect…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="entries">
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
                  onMouseEnter={() => tab !== "community" && setInspect({ tab, name: e.name })}
                >
                  <span className="entry-name">
                    <EntityIcon name={e.iconName ?? e.name} size={26} />
                    {e.name}
                    {linked && <span className="synergy-badge">synergy</span>}
                    {gain !== undefined && gain > 0 && <span className="gain-badge">+{gain}</span>}
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
    </div>
  );
}
