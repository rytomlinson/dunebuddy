export * from './storage';

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatGameDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    // tRPC wraps zod failures as a JSON array of issues.
    try {
      const issues = JSON.parse(err.message) as { message: string }[];
      if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
    } catch {
      /* plain message */
    }
    return err.message;
  }
  return 'Something went wrong';
}
