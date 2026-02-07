// Secure session management for multiplayer games
// Session tokens are stored in localStorage, never exposed in URLs

const SESSION_KEY_PREFIX = "bidcraft_session_";

interface GameSession {
  sessionToken: string;
  playerId: string;
  roomId: string;
  playerName: string;
  isHost: boolean;
}

export function saveGameSession(roomId: string, session: GameSession): void {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${roomId}`, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session");
  }
}

export function getGameSession(roomId: string): GameSession | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${roomId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameSession;
  } catch (e) {
    return null;
  }
}

export function clearGameSession(roomId: string): void {
  try {
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${roomId}`);
  } catch (e) {
    // ignore
  }
}

export function getSessionHeaders(roomId: string): Record<string, string> {
  const session = getGameSession(roomId);
  if (!session?.sessionToken) return {};
  return { Authorization: `Bearer ${session.sessionToken}` };
}
