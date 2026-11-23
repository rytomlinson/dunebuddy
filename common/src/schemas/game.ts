import { z } from 'zod';
import { FACTION_IDS, type FactionId } from '../factions.js';

export const FactionIdSchema = z.enum(FACTION_IDS);

export const PlayerNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(40, 'Name is too long');

/** Votes a player places, keyed by faction id. */
export const VotesSchema = z.record(FactionIdSchema, z.number().int().min(0).max(99));

export const CreateGameSchema = z.object({
  name: z.string().trim().min(1).max(80),
  gameDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  votesPerPlayer: z.number().int().min(1).max(20),
  factions: z.array(FactionIdSchema).min(2),
});

export const SubmitBallotSchema = z.object({
  gameId: z.string().min(1),
  playerName: PlayerNameSchema,
  votes: VotesSchema,
  /** Returned on first submit; required to change or withdraw that ballot later. */
  editToken: z.string().optional(),
});

export const AssignmentMethodSchema = z.enum(['uncontested', 'outbid', 'tie', 'random']);

export const AssignmentSchema = z.object({
  playerName: z.string(),
  faction: FactionIdSchema,
  method: AssignmentMethodSchema,
  /** Votes the player had on this faction (0 for random assignments). */
  votes: z.number(),
  /** Other players who tied at the same vote count and lost the draw. */
  tiedWith: z.array(z.string()),
  /** Other still-unseated players who bid fewer votes on this faction. */
  outbid: z.array(z.object({ playerName: z.string(), votes: z.number() })),
  /** Players who bid on this faction but were already seated elsewhere. */
  alreadySeated: z.array(z.object({ playerName: z.string(), votes: z.number() })),
});

export const RevealedBallotSchema = z.object({
  playerName: z.string(),
  votes: VotesSchema,
});

export const DrawResultSchema = z.object({
  calculatedAt: z.string(),
  assignments: z.array(AssignmentSchema),
  unclaimed: z.array(FactionIdSchema),
  ballots: z.array(RevealedBallotSchema),
});

export type CreateGame = z.infer<typeof CreateGameSchema>;
export type SubmitBallot = z.infer<typeof SubmitBallotSchema>;
export type Votes = z.infer<typeof VotesSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentMethod = z.infer<typeof AssignmentMethodSchema>;
export type RevealedBallot = z.infer<typeof RevealedBallotSchema>;
export type DrawResult = z.infer<typeof DrawResultSchema>;

export type GameStatus = 'open' | 'calculated';

/** What anyone can see about a game. Votes stay hidden until the draw is calculated. */
export interface GameView {
  id: string;
  name: string;
  gameDate: string;
  votesPerPlayer: number;
  factions: FactionId[];
  status: GameStatus;
  players: string[];
  result: DrawResult | null;
  /** Previous results discarded by a reset, newest first. */
  resetHistory: DrawResult[];
  createdAt: string;
}

export interface GameSummary {
  id: string;
  name: string;
  gameDate: string;
  status: GameStatus;
  playerCount: number;
}
