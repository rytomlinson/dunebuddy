import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { CreateLogbookSchema, SaveLogbookSchema } from 'common';
import { createLogbook, getLogbook, saveLogbook } from '../models/logbook.js';

export const logbookRouter = router({
  get: publicProcedure.input(z.object({ id: z.string().min(1).max(24) })).query(({ input }) => getLogbook(input.id)),
  create: publicProcedure.input(CreateLogbookSchema).mutation(({ input }) => createLogbook(input)),
  save: publicProcedure.input(SaveLogbookSchema).mutation(({ input }) => saveLogbook(input)),
});
