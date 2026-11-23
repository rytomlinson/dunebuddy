import { randomBytes, randomInt } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import {
  assignFactions,
  factionName,
  MIN_PLAYERS,
  maxPlayersFor,
  type CreateGame,
  type DrawResult,
  type FactionId,
  type GameStatus,
  type GameSummary,
  type GameView,
  type RevealedBallot,
  type SubmitBallot,
  type Votes,
} from 'common';
import { get, getOne, query, withTransaction, type TxQuery } from '../db.js';

interface GameRow {
  id: string;
  name: string;
  game_date: string;
  votes_per_player: number;
  factions: FactionId[];
  status: GameStatus;
  result: DrawResult | null;
  reset_history: DrawResult[];
  created_at: Date;
}

interface BallotRow {
  player_name: string;
  votes: Votes;
  edit_token: string;
  created_at: Date;
}

const GAME_COLUMNS = `id, name, game_date::text AS game_date, votes_per_player, factions, status,
  result, reset_history, created_at`;

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function newGameId(): string {
  let id = '';
  for (let i = 0; i < 10; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

function notFound(): TRPCError {
  return new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
}

function locked(): TRPCError {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Factions have already been drawn for this game. Reset the draw to change votes.',
  });
}

async function loadGame(id: string, q: TxQuery = query, forUpdate = false): Promise<GameRow> {
  const { rows } = await q<GameRow>(
    `SELECT ${GAME_COLUMNS} FROM games WHERE id = :id ${forUpdate ? 'FOR UPDATE' : ''}`,
    { id }
  );
  if (!rows[0]) throw notFound();
  return rows[0];
}

export async function createGame(data: CreateGame): Promise<{ id: string }> {
  const factions = [...new Set(data.factions)];
  const { rows } = await query<{ id: string }>(
    `INSERT INTO games (id, name, game_date, votes_per_player, factions)
     VALUES (:id, :name, :gameDate, :votesPerPlayer, :factions)
     RETURNING id`,
    { id: newGameId(), name: data.name, gameDate: data.gameDate, votesPerPlayer: data.votesPerPlayer, factions }
  );
  return rows[0];
}

export async function listGames(): Promise<GameSummary[]> {
  return get<GameRow & { player_count: number }, GameSummary>(
    `SELECT g.id, g.name, g.game_date::text AS game_date, g.status,
            (SELECT COUNT(*)::int FROM ballots b WHERE b.game_id = g.id) AS player_count
     FROM games g
     ORDER BY g.game_date DESC, g.created_at DESC
     LIMIT 30`,
    (row) => ({
      id: row.id,
      name: row.name,
      gameDate: row.game_date,
      status: row.status,
      playerCount: row.player_count,
    })
  );
}

export async function getGameView(id: string): Promise<GameView> {
  const game = await loadGame(id);
  const players = await get<{ player_name: string }, string>(
    `SELECT player_name FROM ballots WHERE game_id = :id ORDER BY created_at`,
    (r) => r.player_name,
    { id }
  );
  return {
    id: game.id,
    name: game.name,
    gameDate: game.game_date,
    votesPerPlayer: game.votes_per_player,
    factions: game.factions,
    status: game.status,
    players,
    result: game.result,
    resetHistory: game.reset_history,
    createdAt: game.created_at.toISOString(),
  };
}

export async function getMyBallot(
  gameId: string,
  editToken: string
): Promise<{ playerName: string; votes: Votes } | null> {
  return getOne<BallotRow, { playerName: string; votes: Votes }>(
    `SELECT player_name, votes FROM ballots WHERE game_id = :gameId AND edit_token = :editToken`,
    (r) => ({ playerName: r.player_name, votes: r.votes }),
    { gameId, editToken }
  );
}

function cleanVotes(votes: Votes, game: GameRow): Votes {
  const pool = new Set(game.factions);
  const out: Votes = {};
  let total = 0;
  for (const [faction, n] of Object.entries(votes) as [FactionId, number][]) {
    if (n <= 0) continue;
    if (!pool.has(faction)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `${factionName(faction)} is not in play this game` });
    }
    out[faction] = n;
    total += n;
  }
  if (total !== game.votes_per_player) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Spend exactly ${game.votes_per_player} votes (you spent ${total})`,
    });
  }
  return out;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export async function submitBallot(data: SubmitBallot): Promise<{ editToken: string }> {
  try {
    return await withTransaction(async (q) => {
      const game = await loadGame(data.gameId, q, true);
      if (game.status !== 'open') throw locked();
      const votes = cleanVotes(data.votes, game);

      if (data.editToken) {
        const updated = await q(
          `UPDATE ballots SET player_name = :playerName, votes = :votes, updated_at = NOW()
           WHERE game_id = :gameId AND edit_token = :editToken`,
          { gameId: game.id, editToken: data.editToken, playerName: data.playerName, votes: JSON.stringify(votes) }
        );
        if (updated.rowCount > 0) return { editToken: data.editToken };
      }

      const { rows: countRows } = await q<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM ballots WHERE game_id = :gameId`,
        { gameId: game.id }
      );
      const maxPlayers = maxPlayersFor(game.factions.length);
      if (countRows[0].n >= maxPlayers) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `This game is full (${maxPlayers} players)` });
      }

      const editToken = randomBytes(24).toString('base64url');
      await q(
        `INSERT INTO ballots (game_id, player_name, votes, edit_token)
         VALUES (:gameId, :playerName, :votes, :editToken)`,
        { gameId: game.id, playerName: data.playerName, votes: JSON.stringify(votes), editToken }
      );
      return { editToken };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Someone named "${data.playerName}" has already voted. Pick another name, or change your vote from the device you voted on.`,
      });
    }
    throw err;
  }
}

export async function withdrawBallot(gameId: string, editToken: string): Promise<boolean> {
  return withTransaction(async (q) => {
    const game = await loadGame(gameId, q, true);
    if (game.status !== 'open') throw locked();
    const { rowCount } = await q(`DELETE FROM ballots WHERE game_id = :gameId AND edit_token = :editToken`, {
      gameId,
      editToken,
    });
    return rowCount > 0;
  });
}

export async function calculateDraw(gameId: string): Promise<DrawResult> {
  return withTransaction(async (q) => {
    const game = await loadGame(gameId, q, true);
    // Calculating twice returns the locked result rather than drawing again.
    if (game.status === 'calculated' && game.result) return game.result;

    const { rows } = await q<BallotRow>(
      `SELECT player_name, votes FROM ballots WHERE game_id = :gameId ORDER BY created_at`,
      { gameId }
    );
    if (rows.length < MIN_PLAYERS) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `At least ${MIN_PLAYERS} players need to vote first` });
    }
    if (rows.length > game.factions.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'More players than factions in play' });
    }

    const ballots: RevealedBallot[] = rows.map((r) => ({ playerName: r.player_name, votes: r.votes }));
    const { assignments, unclaimed } = assignFactions({
      factions: game.factions,
      ballots,
      randomInt: (n) => randomInt(n),
    });
    const result: DrawResult = {
      calculatedAt: new Date().toISOString(),
      assignments,
      unclaimed,
      ballots,
    };

    await q(
      `UPDATE games SET status = 'calculated', result = :result, updated_at = NOW() WHERE id = :gameId`,
      { gameId, result: JSON.stringify(result) }
    );
    return result;
  });
}

export async function resetDraw(gameId: string): Promise<void> {
  await withTransaction(async (q) => {
    const game = await loadGame(gameId, q, true);
    if (game.status !== 'calculated' || !game.result) return;
    await q(
      `UPDATE games
       SET status = 'open',
           reset_history = jsonb_build_array(result) || reset_history,
           result = NULL,
           updated_at = NOW()
       WHERE id = :gameId`,
      { gameId }
    );
  });
}
