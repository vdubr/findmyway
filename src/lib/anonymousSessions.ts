// Anonymní session tracking pro nepřihlášené hráče pomocí localStorage
import type { GameSession } from '../types';

const ANONYMOUS_ID_PREFIX = 'anonymous_';

function getAnonymousSessionKey(gameId: string): string {
  return `geoquest_anonymous_session_${gameId}`;
}

/**
 * Vytvoří anonymní session ID ve formátu "anonymous_{gameId}"
 * Timestamp není součástí ID, protože je v session.start_time
 */
export function buildAnonymousSessionId(gameId: string): string {
  return `${ANONYMOUS_ID_PREFIX}${gameId}`;
}

/**
 * Zjistí zda je session ID anonymní
 */
export function isAnonymousSessionId(sessionId: string): boolean {
  return sessionId.startsWith(ANONYMOUS_ID_PREFIX);
}

/**
 * Extrahuje gameId z anonymního session ID
 */
export function extractGameIdFromAnonymousSessionId(sessionId: string): string | null {
  if (!isAnonymousSessionId(sessionId)) return null;
  const gameId = sessionId.slice(ANONYMOUS_ID_PREFIX.length);
  return gameId || null;
}

export function getAnonymousSession(gameId: string): GameSession | null {
  const sessionKey = getAnonymousSessionKey(gameId);
  const savedSession = localStorage.getItem(sessionKey);
  if (!savedSession) return null;

  try {
    const session = JSON.parse(savedSession) as GameSession;
    // Migrace: starší verze ukládaly ID ve tvaru "anonymous_{gameId}_{timestamp}",
    // ze kterého nešlo zpětně získat gameId a ukládání postupu selhávalo
    const expectedId = buildAnonymousSessionId(gameId);
    if (session.id !== expectedId) {
      session.id = expectedId;
      localStorage.setItem(sessionKey, JSON.stringify(session));
    }
    return session;
  } catch (err) {
    // Nevalidní JSON v localStorage - vyčistit a vrátit null
    console.warn('Neplatná anonymní session v localStorage, mažu:', err);
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export function createAnonymousSession(gameId: string): GameSession {
  const anonymousSession: GameSession = {
    id: buildAnonymousSessionId(gameId),
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
