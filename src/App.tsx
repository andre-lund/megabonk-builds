import { useMemo, useState } from "react";
import "./App.css";
import weaponsJson from "./data/weapons.json";
import tomesJson from "./data/tomes.json";
import charactersJson from "./data/characters.json";
import itemsJson from "./data/items.json";
import type { Character, Item, Tome, Weapon } from "./types";
import {
  addToBuild,
  clearSlot,
  emptyBuild,
  pickedNames,
  setCharacter,
  type Build,
  type SlotKind,
} from "./lib/build";

const weapons = weaponsJson as Weapon[];
const tomes = tomesJson as Tome[];
const characters = charactersJson as Character[];
const items = itemsJson as Item[];

type Tab = "character" | SlotKind;

const TABS: { id: Tab; label: string }[] = [
  { id: "character", label: "Characters" },
  { id: "weapon", label: "Weapons" },
  { id: "tome", label: "Tomes" },
  { id: "item", label: "Items" },
];

interface BrowserEntry {
  name: string;
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
            title={name ? `Remove ${name}` : "Empty slot"}
            onClick={() => name && props.onClear(props.kind, i)}
          >
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

  const picked = useMemo(() => pickedNames(build), [build]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entriesFor(tab).filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q),
    );
  }, [tab, query]);

  function pick(name: string) {
    if (tab === "character") {
      setBuild((b) => setCharacter(b, b.character === name ? null : name));
    } else {
      setBuild((b) => addToBuild(b, tab, name));
    }
  }

  return (
    <div className="layout">
      <section className="panel build-panel">
        <h2>Build</h2>
        <div className="slot-group">
          <h3>Character</h3>
          <div className="slots">
            <button
              className={build.character ? "slot filled" : "slot"}
              title={build.character ? `Remove ${build.character}` : "Pick a character"}
              onClick={() => build.character && setBuild((b) => setCharacter(b, null))}
            >
              {build.character ?? "—"}
            </button>
          </div>
        </div>
        <SlotRow label="Weapons" kind="weapon" slots={build.weapons} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
        <SlotRow label="Tomes" kind="tome" slots={build.tomes} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
        <SlotRow label="Items" kind="item" slots={build.items} onClear={(k, i) => setBuild((b) => clearSlot(b, k, i))} />
        <button className="reset" onClick={() => setBuild(emptyBuild())}>
          Reset build
        </button>
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
          {entries.map((e) => (
            <li key={e.name}>
              <button className={picked.has(e.name) ? "entry picked" : "entry"} onClick={() => pick(e.name)}>
                <span className="entry-name">{e.name}</span>
                <span className="entry-subtitle">{e.subtitle}</span>
                <span className="entry-detail">{e.detail}</span>
              </button>
            </li>
          ))}
          {entries.length === 0 && <li className="no-results">No matches.</li>}
        </ul>
      </section>
    </div>
  );
}
