import type { Assignment, RevealedBallot } from '../schemas/game.js';
import type { FactionId } from '../factions.js';

/** Returns a uniformly random integer in [0, n). */
export type RandomInt = (n: number) => number;

export interface AssignFactionsInput {
  /** Factions in play, in display order. */
  factions: readonly FactionId[];
  ballots: readonly RevealedBallot[];
  randomInt: RandomInt;
}

export interface AssignFactionsOutput {
  assignments: Assignment[];
  unclaimed: FactionId[];
}

interface Bid {
  playerName: string;
  faction: FactionId;
  votes: number;
}

function pick<T>(items: readonly T[], randomInt: RandomInt): T {
  if (items.length === 1) return items[0];
  return items[randomInt(items.length)];
}

function shuffle<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Seats each player at one faction.
 *
 * 1. Take the highest remaining bid among players not yet seated, on factions not yet
 *    taken. If several factions share that top vote count, one is drawn at random.
 * 2. Everyone tied at that count on that faction is entered in a random draw; the
 *    winner is seated there. Then repeat.
 * 3. When no live bids remain, players still unseated are dealt the leftover
 *    factions at random.
 */
export function assignFactions({ factions, ballots, randomInt }: AssignFactionsInput): AssignFactionsOutput {
  const pool = new Set<FactionId>(factions);
  const factionOrder = new Map(factions.map((f, i) => [f, i]));

  const bids: Bid[] = [];
  for (const ballot of ballots) {
    for (const [faction, votes] of Object.entries(ballot.votes) as [FactionId, number][]) {
      if (votes > 0 && pool.has(faction)) {
        bids.push({ playerName: ballot.playerName, faction, votes });
      }
    }
  }

  const seated = new Map<string, FactionId>();
  const taken = new Set<FactionId>();
  const assignments: Assignment[] = [];

  for (;;) {
    const live = bids.filter((b) => !seated.has(b.playerName) && !taken.has(b.faction));
    if (live.length === 0) break;

    const top = Math.max(...live.map((b) => b.votes));
    const topFactions = [...new Set(live.filter((b) => b.votes === top).map((b) => b.faction))].sort(
      (a, b) => factionOrder.get(a)! - factionOrder.get(b)!
    );
    const faction = pick(topFactions, randomInt);

    const contenders = live.filter((b) => b.faction === faction);
    const leaders = contenders.filter((b) => b.votes === top);
    const winner = pick(leaders, randomInt);

    const tiedWith = leaders.filter((b) => b !== winner).map((b) => b.playerName);
    const outbid = contenders
      .filter((b) => b.votes < top)
      .sort((a, b) => b.votes - a.votes)
      .map((b) => ({ playerName: b.playerName, votes: b.votes }));
    const alreadySeated = bids
      .filter((b) => b.faction === faction && seated.has(b.playerName))
      .map((b) => ({ playerName: b.playerName, votes: b.votes }));

    assignments.push({
      playerName: winner.playerName,
      faction,
      method: tiedWith.length > 0 ? 'tie' : outbid.length > 0 ? 'outbid' : 'uncontested',
      votes: top,
      tiedWith,
      outbid,
      alreadySeated,
    });
    seated.set(winner.playerName, faction);
    taken.add(faction);
  }

  const unseated = shuffle(
    ballots.map((b) => b.playerName).filter((name) => !seated.has(name)),
    randomInt
  );
  const remaining = shuffle(
    factions.filter((f) => !taken.has(f)),
    randomInt
  );
  if (unseated.length > remaining.length) {
    throw new Error('More players than factions');
  }

  unseated.forEach((playerName, i) => {
    const faction = remaining[i];
    assignments.push({
      playerName,
      faction,
      method: 'random',
      votes: 0,
      tiedWith: [],
      outbid: [],
      alreadySeated: bids
        .filter((b) => b.faction === faction && seated.has(b.playerName))
        .map((b) => ({ playerName: b.playerName, votes: b.votes })),
    });
    seated.set(playerName, faction);
    taken.add(faction);
  });

  return {
    assignments,
    unclaimed: factions.filter((f) => !taken.has(f)),
  };
}
