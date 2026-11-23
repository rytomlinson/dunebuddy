import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { CreateGameSchema, SubmitBallotSchema } from 'common';
import {
  calculateDraw,
  createGame,
  getGameView,
  getMyBallot,
  listGames,
  resetDraw,
  submitBallot,
  withdrawBallot,
} from '../models/game.js';

const GameId = z.object({ gameId: z.string().min(1).max(16) });
const WithToken = GameId.extend({ editToken: z.string().min(1).max(64) });

export const gameRouter = router({
  list: publicProcedure.query(() => listGames()),
  get: publicProcedure.input(GameId).query(({ input }) => getGameView(input.gameId)),
  myBallot: publicProcedure.input(WithToken).query(({ input }) => getMyBallot(input.gameId, input.editToken)),
  create: publicProcedure.input(CreateGameSchema).mutation(({ input }) => createGame(input)),
  submitBallot: publicProcedure.input(SubmitBallotSchema).mutation(({ input }) => submitBallot(input)),
  withdrawBallot: publicProcedure
    .input(WithToken)
    .mutation(({ input }) => withdrawBallot(input.gameId, input.editToken)),
  calculate: publicProcedure.input(GameId).mutation(({ input }) => calculateDraw(input.gameId)),
  reset: publicProcedure.input(GameId).mutation(({ input }) => resetDraw(input.gameId)),
});
