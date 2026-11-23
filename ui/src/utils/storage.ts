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
