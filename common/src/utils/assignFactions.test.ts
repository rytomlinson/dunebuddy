import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignFactions, type RandomInt } from './assignFactions.js';
import type { RevealedBallot } from '../schemas/game.js';
import type { FactionId } from '../factions.js';

const BASE: FactionId[] = ['atreides', 'harkonnen', 'emperor', 'spacing-guild', 'fremen', 'bene-gesserit'];

/** Always picks the first option. */
const first: RandomInt = () => 0;
/** Always picks the last option. */
const last: RandomInt = (n) => n - 1;

function seatOf(result: ReturnType<typeof assignFactions>, name: string) {
  return result.assignments.find((a) => a.playerName === name);
}

test('highest bid wins the faction', () => {
  const ballots: RevealedBallot[] = [
    { playerName: 'Alice', votes: { fremen: 2 } },
    { playerName: 'Bob', votes: { fremen: 1, atreides: 1 } },
  ];
  const r = assignFactions({ factions: BASE, ballots, randomInt: first });
  assert.equal(seatOf(r, 'Alice')?.faction, 'fremen');
  assert.equal(seatOf(r, 'Alice')?.method, 'outbid');
  assert.deepEqual(seatOf(r, 'Alice')?.outbid, [{ playerName: 'Bob', votes: 1 }]);
  // Bob loses Fremen but still gets his other choice rather than a random faction.
  assert.equal(seatOf(r, 'Bob')?.faction, 'atreides');
  assert.equal(seatOf(r, 'Bob')?.method, 'uncontested');
});

test('ties are settled by a random draw', () => {
  const ballots: RevealedBallot[] = [
    { playerName: 'Alice', votes: { fremen: 2 } },
    { playerName: 'Bob', votes: { fremen: 2 } },
  ];
  const a = assignFactions({ factions: BASE, ballots, randomInt: first });
  assert.equal(seatOf(a, 'Alice')?.faction, 'fremen');
  assert.equal(seatOf(a, 'Alice')?.method, 'tie');
  assert.deepEqual(seatOf(a, 'Alice')?.tiedWith, ['Bob']);
  assert.equal(seatOf(a, 'Bob')?.method, 'random');

  const b = assignFactions({ factions: BASE, ballots, randomInt: last });
  assert.equal(seatOf(b, 'Bob')?.faction, 'fremen');
  assert.equal(seatOf(b, 'Alice')?.method, 'random');
});

test('a player is seated at most once', () => {
  const ballots: RevealedBallot[] = [
    { playerName: 'Alice', votes: { fremen: 1, atreides: 1 } },
    { playerName: 'Bob', votes: { emperor: 2 } },
  ];
  const r = assignFactions({ factions: BASE, ballots, randomInt: first });
  assert.equal(r.assignments.length, 2);
  assert.equal(seatOf(r, 'Bob')?.faction, 'emperor');
  assert.ok(['fremen', 'atreides'].includes(seatOf(r, 'Alice')!.faction));
  assert.equal(r.unclaimed.length, 4);
});

test('already-seated bidders are recorded but do not block', () => {
  const ballots: RevealedBallot[] = [
    { playerName: 'Alice', votes: { fremen: 2, atreides: 1 } },
    { playerName: 'Bob', votes: { atreides: 1, harkonnen: 1 } },
  ];
  // first: fremen(2) → Alice; then top=1 among {atreides: Bob, harkonnen: Bob} → atreides first
  const r = assignFactions({ factions: BASE, ballots, randomInt: first });
  assert.equal(seatOf(r, 'Alice')?.faction, 'fremen');
  assert.equal(seatOf(r, 'Bob')?.faction, 'atreides');
  assert.equal(seatOf(r, 'Bob')?.method, 'uncontested');
  assert.deepEqual(seatOf(r, 'Bob')?.alreadySeated, [{ playerName: 'Alice', votes: 1 }]);
});

test('bids on factions not in play are ignored', () => {
  const ballots: RevealedBallot[] = [
    { playerName: 'Alice', votes: { ixians: 2 } },
    { playerName: 'Bob', votes: { fremen: 2 } },
  ];
  const r = assignFactions({ factions: BASE, ballots, randomInt: first });
  assert.equal(seatOf(r, 'Alice')?.method, 'random');
  assert.notEqual(seatOf(r, 'Alice')?.faction, 'ixians');
});

test('every player gets a distinct faction from the pool', () => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let seed = 0; seed < 200; seed++) {
    let s = seed + 1;
    const rng: RandomInt = (n) => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s % n;
    };
    const ballots: RevealedBallot[] = names.map((playerName, i) => ({
      playerName,
      votes: { [BASE[i % 3]]: 1, [BASE[(i + seed) % 6]]: 1 } as RevealedBallot['votes'],
    }));
    const r = assignFactions({ factions: BASE, ballots, randomInt: rng });
    assert.equal(r.assignments.length, 6);
    assert.equal(new Set(r.assignments.map((a) => a.faction)).size, 6);
    assert.equal(new Set(r.assignments.map((a) => a.playerName)).size, 6);
    assert.ok(r.assignments.every((a) => BASE.includes(a.faction)));
    assert.deepEqual(r.unclaimed, []);
  }
});

test('throws if there are more players than factions', () => {
  const ballots: RevealedBallot[] = ['A', 'B', 'C'].map((playerName) => ({ playerName, votes: {} }));
  assert.throws(() => assignFactions({ factions: ['fremen', 'atreides'], ballots, randomInt: first }));
});
