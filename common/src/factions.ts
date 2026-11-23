export const EXPANSIONS = [
  { id: 'base', name: 'Base game' },
  { id: 'ixians-tleilaxu', name: 'Ixians & Tleilaxu' },
  { id: 'choam-richese', name: 'CHOAM & Richese' },
] as const;

export type ExpansionId = (typeof EXPANSIONS)[number]['id'];

export interface Faction {
  id: string;
  name: string;
  expansion: ExpansionId;
  /** Primary colour for the faction's badge. */
  color: string;
  /** Accent colour for the faction's emblem. */
  accent: string;
}

export const FACTIONS = [
  { id: 'atreides', name: 'Atreides', expansion: 'base', color: '#1F5E3A', accent: '#D9C27A' },
  { id: 'harkonnen', name: 'Harkonnen', expansion: 'base', color: '#1A1A1A', accent: '#C0392B' },
  { id: 'emperor', name: 'Emperor', expansion: 'base', color: '#8E1B1B', accent: '#E8C25A' },
  { id: 'spacing-guild', name: 'Spacing Guild', expansion: 'base', color: '#C4621B', accent: '#F6E3C2' },
  { id: 'fremen', name: 'Fremen', expansion: 'base', color: '#B8873B', accent: '#3B2A14' },
  { id: 'bene-gesserit', name: 'Bene Gesserit', expansion: 'base', color: '#1E2F5C', accent: '#C9D3EA' },
  { id: 'ixians', name: 'Ixians', expansion: 'ixians-tleilaxu', color: '#4B5B66', accent: '#D7DEE2' },
  { id: 'tleilaxu', name: 'Tleilaxu', expansion: 'ixians-tleilaxu', color: '#5B2C6F', accent: '#E7D3EE' },
  { id: 'choam', name: 'CHOAM', expansion: 'choam-richese', color: '#7A6A1E', accent: '#F4E9B0' },
  { id: 'richese', name: 'Richese', expansion: 'choam-richese', color: '#2E6F78', accent: '#D4F0F2' },
] as const satisfies readonly Faction[];

export type FactionId = (typeof FACTIONS)[number]['id'];

export const FACTION_IDS = FACTIONS.map((f) => f.id) as [FactionId, ...FactionId[]];

const byId = new Map<string, Faction>(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id: string): Faction | undefined {
  return byId.get(id);
}

export function factionName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export const DEFAULT_VOTES_PER_PLAYER = 2;
export const MIN_PLAYERS = 2;

/**
 * One player per faction in play: 6 for the base game, plus 2 for each expansion.
 */
export function maxPlayersFor(factionsInPlay: number): number {
  return factionsInPlay;
}
