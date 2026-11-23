import { z } from 'zod';
import { CARD_KIND_IDS } from '../treachery.js';
import { FactionIdSchema } from './game.js';

export const CardKindIdSchema = z.enum(CARD_KIND_IDS);

export const LoggedCardSchema = z.object({
  id: z.string().min(1).max(24),
  kind: CardKindIdSchema,
});

// Hands are capped well above any real hand limit so a bad client can't store junk.
const HandSchema = z.array(LoggedCardSchema).max(20);

export const HandsSchema = z.record(FactionIdSchema, HandSchema);

export const LogSnapshotSchema = z.object({
  label: z.string().max(120),
  hands: HandsSchema,
  discards: z.array(LoggedCardSchema).max(200),
});

export const LogbookStateSchema = LogSnapshotSchema.omit({ label: true }).extend({
  /** Most recent first; lets undo survive a page reload. */
  past: z.array(LogSnapshotSchema).max(30),
});

export const CreateLogbookSchema = z.object({
  name: z.string().trim().min(1).max(80),
  factions: z.array(FactionIdSchema).min(2),
  /** The faction draw this logbook was started from, if any. */
  gameId: z.string().max(16).optional(),
  /** Give every faction its unseen opening card(s) as unknowns. */
  openingHands: z.boolean(),
});

export const SaveLogbookSchema = z.object({
  id: z.string().min(1).max(24),
  /** The version this edit was based on; a stale version is rejected so two tabs can't clobber each other. */
  version: z.number().int().min(0),
  state: LogbookStateSchema,
});

export type LoggedCard = z.infer<typeof LoggedCardSchema>;
export type Hands = z.infer<typeof HandsSchema>;
export type LogSnapshot = z.infer<typeof LogSnapshotSchema>;
export type LogbookState = z.infer<typeof LogbookStateSchema>;
export type CreateLogbook = z.infer<typeof CreateLogbookSchema>;
export type SaveLogbook = z.infer<typeof SaveLogbookSchema>;

export interface LogbookView {
  id: string;
  name: string;
  factions: z.infer<typeof FactionIdSchema>[];
  gameId: string | null;
  version: number;
  state: LogbookState;
  updatedAt: string;
}
