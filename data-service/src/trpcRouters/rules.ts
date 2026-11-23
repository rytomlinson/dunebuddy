import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { RuleEditSchema, SectionIdSchema } from 'common';
import { router, publicProcedure } from '../trpc.js';
import { editSection, listEdits, listSections, sectionHistory } from '../models/rules.js';

/**
 * The rules text is GF9's, so it's kept to the group: every rules call needs the shared
 * passcode (RULES_PASSCODE in .env), sent by the page in an x-rules-passcode header.
 */
function passcodeMatches(given: string | undefined): boolean {
  const expected = process.env.RULES_PASSCODE;
  if (!expected || !given) return false;
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(expected.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// Slows down guessing: after 10 wrong passcodes from one address, refuse for 15 minutes.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkPasscode(ip: string, given: string | undefined): void {
  const now = Date.now();
  const f = failures.get(ip);
  if (f && f.count >= MAX_FAILURES && f.until > now) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many wrong passcodes. Try again in 15 minutes.' });
  }
  if (!process.env.RULES_PASSCODE) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'The rules aren’t set up on this server yet.' });
  }
  if (!passcodeMatches(given)) {
    const count = f && f.until > now ? f.count + 1 : 1;
    failures.set(ip, { count, until: now + LOCKOUT_MS });
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Wrong passcode.' });
  }
  failures.delete(ip);
}

const rulesProcedure = publicProcedure.use(({ ctx, next }) => {
  const header = ctx.req.headers['x-rules-passcode'];
  checkPasscode(ctx.req.ip ?? 'unknown', Array.isArray(header) ? header[0] : header);
  return next();
});

export const rulesRouter = router({
  unlock: publicProcedure.input(z.object({ passcode: z.string().max(100) })).mutation(({ ctx, input }) => {
    checkPasscode(ctx.req.ip ?? 'unknown', input.passcode);
    return { ok: true };
  }),
  sections: rulesProcedure.query(() => listSections()),
  history: rulesProcedure.input(z.object({ sectionId: SectionIdSchema })).query(({ input }) => sectionHistory(input.sectionId)),
  edits: rulesProcedure.query(() => listEdits()),
  edit: rulesProcedure.input(RuleEditSchema).mutation(({ input }) => editSection(input)),
});
