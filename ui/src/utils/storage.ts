// Per-device conveniences only; the server is the source of truth.

const NAME_KEY = 'dunebuddy:playerName';
const tokenKey = (gameId: string) => `dunebuddy:ballot:${gameId}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode etc.) — editing a ballot later just won't work on this device.
  }
}

export const loadPlayerName = () => read(NAME_KEY) ?? '';
export const savePlayerName = (name: string) => write(NAME_KEY, name);
export const loadEditToken = (gameId: string) => read(tokenKey(gameId));
export const saveEditToken = (gameId: string, token: string | null) => write(tokenKey(gameId), token);

// Atreides logbooks this device has opened, newest first. The link is the only way back in.
export interface SavedLogbook {
  id: string;
  name: string;
  createdAt: string;
}

const LOGBOOKS_KEY = 'dunebuddy:logbooks';
const gameLogbookKey = (gameId: string) => `dunebuddy:logbook-for:${gameId}`;

export function loadLogbooks(): SavedLogbook[] {
  try {
    const parsed = JSON.parse(read(LOGBOOKS_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SavedLogbook[]) : [];
  } catch {
    return [];
  }
}

export function rememberLogbook(book: SavedLogbook): void {
  const rest = loadLogbooks().filter((b) => b.id !== book.id);
  write(LOGBOOKS_KEY, JSON.stringify([book, ...rest].slice(0, 20)));
}

export const loadGameLogbook = (gameId: string) => read(gameLogbookKey(gameId));
export const saveGameLogbook = (gameId: string, logbookId: string) => write(gameLogbookKey(gameId), logbookId);
