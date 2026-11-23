import { randomInt } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import {
  factionName,
  newLogbookState,
  type CreateLogbook,
  type FactionId,
  type LogbookState,
  type LogbookView,
  type SaveLogbook,
} from 'common';
import { getOne, query } from '../db.js';

interface LogbookRow {
  id: string;
  name: string;
  factions: FactionId[];
  game_id: string | null;
  state: LogbookState;
  version: number;
  updated_at: Date;
}

// The id is the only access control, so it's long enough not to be guessed (~80 bits).
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
function newLogbookId(): string {
  let id = '';
  for (let i = 0; i < 16; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

function cardId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

function toView(r: LogbookRow): LogbookView {
  return {
    id: r.id,
    name: r.name,
    factions: r.factions,
    gameId: r.game_id,
    version: r.version,
    state: r.state,
    updatedAt: r.updated_at.toISOString(),
  };
}

const COLUMNS = 'id, name, factions, game_id, state, version, updated_at';

export async function createLogbook(data: CreateLogbook): Promise<{ id: string }> {
  const factions = [...new Set(data.factions)];
  let gameId: string | null = null;
  if (data.gameId) {
    const { rows } = await query<{ id: string }>(`SELECT id FROM games WHERE id = :id`, { id: data.gameId });
    gameId = rows[0]?.id ?? null;
  }
  const state = newLogbookState(factions, data.openingHands, cardId);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO logbooks (id, name, factions, game_id, state)
     VALUES (:id, :name, :factions, :gameId, :state::jsonb)
     RETURNING id`,
    { id: newLogbookId(), name: data.name, factions, gameId, state: JSON.stringify(state) }
  );
  return rows[0];
}

export async function getLogbook(id: string): Promise<LogbookView> {
  const row = await getOne<LogbookRow, LogbookView>(`SELECT ${COLUMNS} FROM logbooks WHERE id = :id`, toView, { id });
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Logbook not found' });
  return row;
}

export async function saveLogbook({ id, version, state }: SaveLogbook): Promise<{ version: number }> {
  const current = await getLogbook(id);
  const inPlay = new Set(current.factions);
  const stray = Object.keys(state.hands).find((f) => !inPlay.has(f as FactionId));
  if (stray) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `${factionName(stray)} isn't in this game` });
  }
  const { rows } = await query<{ version: number }>(
    `UPDATE logbooks SET state = :state::jsonb, version = version + 1, updated_at = NOW()
     WHERE id = :id AND version = :version
     RETURNING version`,
    { id, version, state: JSON.stringify(state) }
  );
  if (!rows[0]) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This logbook was changed on another screen. Reloaded the latest version.',
    });
  }
  return rows[0];
}
