import type { FactionId } from '../factions.js';
import { factionName } from '../factions.js';
import type { Hands, LogbookState, LoggedCard } from '../schemas/logbook.js';
import { getCardKind, handLimit, openingHandSize, type CardKindId } from '../treachery.js';

/**
 * Pure edits to an Atreides logbook. Each one records an undo snapshot, so the page can
 * apply it locally and save the whole state.
 */

export type NewId = () => string;

const MAX_UNDO = 30;

export function newLogbookState(factions: FactionId[], openingHands: boolean, newId: NewId): LogbookState {
  const hands: Hands = {};
  for (const f of factions) {
    hands[f] = openingHands
      ? Array.from({ length: openingHandSize(f) }, () => ({ id: newId(), kind: 'unknown' as const }))
      : [];
  }
  return { hands, discards: [], past: [] };
}

export function handOf(state: LogbookState, faction: FactionId): LoggedCard[] {
  return state.hands[faction] ?? [];
}

function label(kind: string): string {
  const k = getCardKind(kind);
  // "Snooper (poison defense)" reads as just "Snooper" in the history.
  return k.short ?? k.name.replace(/ \(.*\)$/, '');
}

function commit(state: LogbookState, description: string, hands: Hands, discards = state.discards): LogbookState {
  const snapshot = { label: description, hands: state.hands, discards: state.discards };
  return { hands, discards, past: [snapshot, ...state.past].slice(0, MAX_UNDO) };
}

function withHand(hands: Hands, faction: FactionId, cards: LoggedCard[]): Hands {
  return { ...hands, [faction]: cards };
}

export interface AddResult {
  state: LogbookState;
  /** True when a Harkonnen bonus card was added alongside the logged card. */
  addedBonus: boolean;
}

/**
 * Logs a card into a faction's hand. With `auction`, a Harkonnen purchase also adds their
 * unseen bonus draw, as long as their hand has room for it.
 */
export function addCard(
  state: LogbookState,
  faction: FactionId,
  kind: CardKindId,
  newId: NewId,
  opts: { auction?: boolean } = {}
): AddResult {
  const cards = [...handOf(state, faction), { id: newId(), kind }];
  const addedBonus = Boolean(opts.auction) && faction === 'harkonnen' && cards.length < handLimit(faction);
  if (addedBonus) cards.push({ id: newId(), kind: 'unknown' });
  const what = `${factionName(faction)} +${label(kind)}${addedBonus ? ' (+ bonus ?)' : ''}`;
  return { state: commit(state, what, withHand(state.hands, faction, cards)), addedBonus };
}

function findCard(state: LogbookState, faction: FactionId, cardId: string): LoggedCard | undefined {
  return handOf(state, faction).find((c) => c.id === cardId);
}

/** The card was played or discarded. It moves to the discard pile. */
export function discardCard(state: LogbookState, faction: FactionId, cardId: string): LogbookState {
  const card = findCard(state, faction, cardId);
  if (!card) return state;
  const cards = handOf(state, faction).filter((c) => c.id !== cardId);
  return commit(
    state,
    `${factionName(faction)} discarded ${label(card.kind)}`,
    withHand(state.hands, faction, cards),
    [card, ...state.discards]
  );
}

export function moveCard(state: LogbookState, from: FactionId, cardId: string, to: FactionId): LogbookState {
  const card = findCard(state, from, cardId);
  if (!card || from === to) return state;
  let hands = withHand(state.hands, from, handOf(state, from).filter((c) => c.id !== cardId));
  hands = withHand(hands, to, [...handOf(state, to), card]);
  return commit(state, `${label(card.kind)}: ${factionName(from)} → ${factionName(to)}`, hands);
}

/** Says what a card is, e.g. an unknown that turned out to be a Lasgun. */
export function identifyCard(state: LogbookState, faction: FactionId, cardId: string, kind: CardKindId): LogbookState {
  const card = findCard(state, faction, cardId);
  if (!card || card.kind === kind) return state;
  const cards = handOf(state, faction).map((c) => (c.id === cardId ? { ...c, kind } : c));
  return commit(
    state,
    `${factionName(faction)}: ${label(card.kind)} is ${label(kind)}`,
    withHand(state.hands, faction, cards)
  );
}

export function undo(state: LogbookState): LogbookState {
  const [last, ...rest] = state.past;
  if (!last) return state;
  return { hands: last.hands, discards: last.discards, past: rest };
}
