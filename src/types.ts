export interface UpgradeRow {
  stat: string;
  common: string;
  uncommon: string;
  rare: string;
  epic: string;
  legendary: string;
}

export interface Weapon {
  name: string;
  type: string;
  description: string;
  unlock: string;
  special: string;
  synergies: string[];
  upgrades: UpgradeRow[];
}

export interface Tome {
  name: string;
  stat: string;
  effect: string;
  unlock: string;
  maxLevel: number | null;
  synergies: string[];
  upgrades: UpgradeRow[];
}

export interface Character {
  name: string;
  weapon: string;
  blessing: string;
  role: string;
  unlock: string;
  synergies: string[];
}

export interface Item {
  name: string;
  rarity: string;
  effect: string;
  unlock: string;
  synergies: string[];
}
