import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAnonymousSession,
  createAnonymousSession,
  getAnonymousSession,
  updateAnonymousSession,
} from './anonymousSessions';

const GAME_ID = 'test-game-123';
const SESSION_KEY = `geoquest_anonymous_session_${GAME_ID}`;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('getAnonymousSession', () => {
  it('vrátí null pokud session neexistuje', () => {
    expect(getAnonymousSession(GAME_ID)).toBeNull();
  });

  it('vrátí session pokud existuje v localStorage', () => {
    const session = createAnonymousSession(GAME_ID);
    const result = getAnonymousSession(GAME_ID);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(session.id);
    expect(result?.game_id).toBe(GAME_ID);
  });

  it('vrátí null pro jiné game_id', () => {
    createAnonymousSession(GAME_ID);
    expect(getAnonymousSession('other-game')).toBeNull();
  });
});

describe('createAnonymousSession', () => {
  it('vytvoří session se správnými výchozími hodnotami', () => {
    const session = createAnonymousSession(GAME_ID);
    expect(session.game_id).toBe(GAME_ID);
    expect(session.user_id).toBe('anonymous');
    expect(session.status).toBe('active');
    expect(session.current_checkpoint_index).toBe(0);
    expect(session.score).toBeNull();
    expect(session.end_time).toBeNull();
    expect(session.metadata.hints_used).toBe(0);
    expect(session.metadata.wrong_attempts).toBe(0);
    expect(session.metadata.checkpoints_completed).toHaveLength(0);
  });

  it('ID obsahuje "anonymous" prefix a game_id', () => {
    const session = createAnonymousSession(GAME_ID);
    expect(session.id).toMatch(/^anonymous_test-game-123_/);
  });

  it('uloží session do localStorage', () => {
    createAnonymousSession(GAME_ID);
    const raw = localStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.game_id).toBe(GAME_ID);
  });

  it('každé volání vytvoří unikátní ID', async () => {
    const s1 = createAnonymousSession(GAME_ID);
    await new Promise((r) => setTimeout(r, 2));
    const s2 = createAnonymousSession(GAME_ID);
    expect(s1.id).not.toBe(s2.id);
  });
});

describe('updateAnonymousSession', () => {
  it('aktualizuje session v localStorage', () => {
    const session = createAnonymousSession(GAME_ID);
    session.current_checkpoint_index = 3;
    updateAnonymousSession(session);

    const updated = getAnonymousSession(GAME_ID);
    expect(updated?.current_checkpoint_index).toBe(3);
  });

  it('aktualizuje updated_at timestamp', async () => {
    const session = createAnonymousSession(GAME_ID);
    const originalUpdatedAt = session.updated_at;
    await new Promise((r) => setTimeout(r, 2));
    session.current_checkpoint_index = 1;
    updateAnonymousSession(session);

    const updated = getAnonymousSession(GAME_ID);
    expect(updated?.updated_at).not.toBe(originalUpdatedAt);
  });

  it('vyhodí chybu pokud chybí game_id', () => {
    const session = createAnonymousSession(GAME_ID);
    // @ts-expect-error – testujeme runtime guard
    session.game_id = undefined;
    expect(() => updateAnonymousSession(session)).toThrow('Game ID is required');
  });
});

describe('clearAnonymousSession', () => {
  it('smaže session z localStorage', () => {
    createAnonymousSession(GAME_ID);
    clearAnonymousSession(GAME_ID);
    expect(getAnonymousSession(GAME_ID)).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('je bezpečné volat i když session neexistuje', () => {
    expect(() => clearAnonymousSession(GAME_ID)).not.toThrow();
  });

  it('smaže pouze správnou session', () => {
    createAnonymousSession(GAME_ID);
    createAnonymousSession('other-game');
    clearAnonymousSession(GAME_ID);
    expect(getAnonymousSession(GAME_ID)).toBeNull();
    expect(getAnonymousSession('other-game')).not.toBeNull();
  });
});
