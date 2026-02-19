// Anonymní session tracking pro nepřihlášené hráče pomocí localStorage
import type { GameSession } from '../types';

function getAnonymousSessionKey(gameId: string): string {
  return `geoquest_anonymous_session_${gameId}`;
}

export function getAnonymousSession(gameId: string): GameSession | null {
  const sessionKey = getAnonymousSessionKey(gameId);
  const savedSession = localStorage.getItem(sessionKey);
  if (savedSession) {
    return JSON.parse(savedSession) as GameSession;
  }
  return null;
}

export function createAnonymousSession(gameId: string): GameSession {
  const anonymousSession: GameSession = {
    id: `anonymous_${gameId}_${Date.now()}`,
    user_id: 'anonymous',
    game_id: gameId,
    current_checkpoint_index: 0,
    status: 'active',
    start_time: new Date().toISOString(),
    end_time: null,
    score: null,
    metadata: {
      hints_used: 0,
      wrong_attempts: 0,
      checkpoints_completed: [],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sessionKey = getAnonymousSessionKey(gameId);
  localStorage.setItem(sessionKey, JSON.stringify(anonymousSession));
  return anonymousSession;
}

export function updateAnonymousSession(session: GameSession): void {
  if (!session.game_id) {
    throw new Error('Game ID is required for updating session');
  }
  const sessionKey = getAnonymousSessionKey(session.game_id);
  session.updated_at = new Date().toISOString();
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearAnonymousSession(gameId: string): void {
  const sessionKey = getAnonymousSessionKey(gameId);
  localStorage.removeItem(sessionKey);
}
