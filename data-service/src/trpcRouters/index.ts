import { router } from '../trpc.js';
import { gameRouter } from './game.js';
import { logbookRouter } from './logbook.js';
import { rulesRouter } from './rules.js';

export const appRouter = router({
  game: gameRouter,
  logbook: logbookRouter,
  rules: rulesRouter,
});

export type AppRouter = typeof appRouter;
