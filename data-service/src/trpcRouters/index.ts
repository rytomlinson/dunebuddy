import { router } from '../trpc.js';
import { gameRouter } from './game.js';
import { logbookRouter } from './logbook.js';

export const appRouter = router({
  game: gameRouter,
  logbook: logbookRouter,
});

export type AppRouter = typeof appRouter;
