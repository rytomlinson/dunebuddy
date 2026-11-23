import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'data-service';
import { loadRulesPasscode } from './utils/storage';

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        // The rules endpoints need the group passcode; other endpoints ignore it.
        headers() {
          const passcode = loadRulesPasscode();
          return passcode ? { 'x-rules-passcode': passcode } : {};
        },
      }),
    ],
  });
}
