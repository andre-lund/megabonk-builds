export interface UpgradeRow {
  stat: string;
  common: string;
  uncommon: string;
  rare: string;
  epic: string;
  legendary: string;
}

export interface Weapon {
  icon: string | null;
  name: string;
  type: string;
  description: string;
  unlock: string;
  special: string;
  synergies: string[];
  upgrades: UpgradeRow[];
}

export interface Tome {
  icon: string | null;
  name: string;
  stat: string;
  effect: string;
  unlock: string;
  maxLevel: number | null;
  synergies: string[];
  upgrades: UpgradeRow[];
}

export interface Character {
  icon: string | null;
  name: string;
  weapon: string;
  blessing: string;
  role: string;
  unlock: string;
  synergies: string[];
}

export interface Item {
  icon: string | null;
  name: string;
  rarity: string;
  effect: string;
  unlock: string;
  synergies: string[];
}
