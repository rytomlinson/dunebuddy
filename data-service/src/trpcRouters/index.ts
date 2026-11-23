import { router } from '../trpc.js';
import { gameRouter } from './game.js';

export const appRouter = router({
  game: gameRouter,
});

export type AppRouter = typeof appRouter;
