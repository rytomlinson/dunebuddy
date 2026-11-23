import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCard, discardCard, handOf, identifyCard, moveCard, newLogbookState, undo } from './logbook.js';
import type { FactionId } from '../factions.js';

const FACTIONS: FactionId[] = ['atreides', 'harkonnen', 'fremen'];

function ids() {
  let n = 0;
  return () => `c${++n}`;
}

const kinds = (state: ReturnType<typeof newLogbookState>, f: FactionId) => handOf(state, f).map((c) => c.kind);

test('opening hands are unknowns, two for Harkonnen', () => {
  const s = newLogbookState(FACTIONS, true, ids());
  assert.deepEqual(kinds(s, 'atreides'), ['unknown']);
  assert.deepEqual(kinds(s, 'harkonnen'), ['unknown', 'unknown']);
  assert.deepEqual(kinds(newLogbookState(FACTIONS, false, ids()), 'fremen'), []);
});

test('a Harkonnen auction purchase adds their bonus card', () => {
  const id = ids();
  const s0 = newLogbookState(FACTIONS, true, id);
  const { state, addedBonus } = addCard(s0, 'harkonnen', 'lasgun', id, { auction: true });
  assert.equal(addedBonus, true);
  assert.deepEqual(kinds(state, 'harkonnen'), ['unknown', 'unknown', 'lasgun', 'unknown']);

  // Added from the hand editor rather than the auction: no bonus.
  const manual = addCard(s0, 'harkonnen', 'lasgun', id);
  assert.equal(manual.addedBonus, false);

  // Other factions never get one.
  assert.equal(addCard(s0, 'fremen', 'shield', id, { auction: true }).addedBonus, false);
});

test('no Harkonnen bonus card when the purchase fills their hand', () => {
  const id = ids();
  let s = newLogbookState(['harkonnen'], false, id);
  for (let i = 0; i < 7; i++) s = addCard(s, 'harkonnen', 'worthless', id).state;
  const { state, addedBonus } = addCard(s, 'harkonnen', 'poison', id, { auction: true });
  assert.equal(addedBonus, false);
  assert.equal(handOf(state, 'harkonnen').length, 8);
});

test('discard, move, identify and undo', () => {
  const id = ids();
  let s = newLogbookState(FACTIONS, true, id);
  const fremenCard = handOf(s, 'fremen')[0];

  s = identifyCard(s, 'fremen', fremenCard.id, 'karama');
  assert.deepEqual(kinds(s, 'fremen'), ['karama']);

  s = moveCard(s, 'fremen', fremenCard.id, 'harkonnen');
  assert.deepEqual(kinds(s, 'fremen'), []);
  assert.deepEqual(kinds(s, 'harkonnen'), ['unknown', 'unknown', 'karama']);

  s = discardCard(s, 'harkonnen', fremenCard.id);
  assert.deepEqual(kinds(s, 'harkonnen'), ['unknown', 'unknown']);
  assert.deepEqual(s.discards.map((c) => c.kind), ['karama']);
  assert.equal(s.past[0].label, 'Harkonnen discarded Karama');

  s = undo(s);
  assert.deepEqual(kinds(s, 'harkonnen'), ['unknown', 'unknown', 'karama']);
  assert.deepEqual(s.discards, []);
  s = undo(undo(s));
  assert.deepEqual(kinds(s, 'fremen'), ['unknown']);
  assert.equal(s.past.length, 0);
  assert.equal(undo(s), s);
});
