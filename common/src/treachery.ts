import type { ExpansionId, FactionId } from './factions.js';

/**
 * Treachery cards as the Atreides logbook tracks them: by category for the interchangeable
 * cards (any projectile weapon is a 🗡), and by name for cards whose identity matters.
 */
export type CardGroup = 'weapon' | 'defense' | 'special' | 'worthless' | 'unknown';

export interface CardKind {
  id: string;
  name: string;
  /** Short label for chips; omitted when the glyph alone is clear. */
  short?: string;
  glyph: string;
  group: CardGroup;
  expansion: ExpansionId;
  /** Category cards sit in the main palette; named cards are picked from a list. */
  palette?: boolean;
}

// U+FE0F forces emoji presentation so iOS and Android draw these consistently.
const E = '️';

export const CARD_KINDS = [
  { id: 'projectile', name: 'Projectile weapon', glyph: `🗡${E}`, group: 'weapon', expansion: 'base', palette: true },
  { id: 'poison', name: 'Poison weapon', glyph: `☠${E}`, group: 'weapon', expansion: 'base', palette: true },
  { id: 'lasgun', name: 'Lasgun', glyph: `⚡${E}`, group: 'weapon', expansion: 'base', palette: true },
  { id: 'shield', name: 'Shield (projectile defense)', glyph: `🛡${E}`, group: 'defense', expansion: 'base', palette: true },
  { id: 'snooper', name: 'Snooper (poison defense)', glyph: `👃`, group: 'defense', expansion: 'base', palette: true },
  { id: 'worthless', name: 'Worthless', glyph: '∅', group: 'worthless', expansion: 'base', palette: true },
  { id: 'special', name: 'Special (not identified)', glyph: '✦', group: 'special', expansion: 'base', palette: true },
  { id: 'unknown', name: 'Unknown card', glyph: '?', group: 'unknown', expansion: 'base', palette: true },

  { id: 'karama', name: 'Karama', short: 'Karama', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'truthtrump', name: 'Truthtrump', short: 'Truth', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'cheap-hero', name: 'Cheap Hero', short: 'Cheap Hero', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'tleilaxu-ghola', name: 'Tleilaxu Ghola', short: 'Ghola', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'hajr', name: 'Hajr', short: 'Hajr', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'weather-control', name: 'Weather Control', short: 'Weather', glyph: '✦', group: 'special', expansion: 'base' },
  { id: 'family-atomics', name: 'Family Atomics', short: 'Atomics', glyph: '✦', group: 'special', expansion: 'base' },

  { id: 'poison-blade', name: 'Poison Blade', short: 'P.Blade', glyph: `🗡${E}`, group: 'weapon', expansion: 'ixians-tleilaxu' },
  { id: 'artillery-strike', name: 'Artillery Strike', short: 'Artillery', glyph: '💥', group: 'weapon', expansion: 'ixians-tleilaxu' },
  { id: 'weirding-way', name: 'Weirding Way', short: 'Weirding', glyph: `🗡${E}`, group: 'weapon', expansion: 'ixians-tleilaxu' },
  { id: 'shield-snooper', name: 'Shield Snooper', short: 'Shd.Snoop', glyph: `🛡${E}`, group: 'defense', expansion: 'ixians-tleilaxu' },
  { id: 'chemistry', name: 'Chemistry', short: 'Chemistry', glyph: '👃', group: 'defense', expansion: 'ixians-tleilaxu' },
  { id: 'amal', name: 'Amal', short: 'Amal', glyph: '✦', group: 'special', expansion: 'ixians-tleilaxu' },
  { id: 'harass-withdraw', name: 'Harass and Withdraw', short: 'Harass', glyph: '✦', group: 'special', expansion: 'ixians-tleilaxu' },
  { id: 'reinforcements', name: 'Reinforcements', short: 'Reinforce', glyph: '✦', group: 'special', expansion: 'ixians-tleilaxu' },
] as const satisfies readonly CardKind[];

export type CardKindId = (typeof CARD_KINDS)[number]['id'];

export const CARD_KIND_IDS = CARD_KINDS.map((k) => k.id) as [CardKindId, ...CardKindId[]];

const kindById = new Map<string, CardKind>(CARD_KINDS.map((k) => [k.id, k]));

export function getCardKind(id: string): CardKind {
  return kindById.get(id) ?? { id, name: id, glyph: '?', group: 'unknown', expansion: 'base' };
}

/** Kinds that only say what a card might be, so they can be identified later. */
export function isVague(kind: string): boolean {
  return kind === 'unknown' || kind === 'special';
}

export const DEFAULT_HAND_LIMIT = 4;

export function handLimit(faction: FactionId): number {
  return faction === 'harkonnen' ? 8 : DEFAULT_HAND_LIMIT;
}

/** Cards each faction holds before the first auction, none of which the Atreides sees. */
export function openingHandSize(faction: FactionId): number {
  return faction === 'harkonnen' ? 2 : 1;
}
