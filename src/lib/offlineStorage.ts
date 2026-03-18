// Offline storage pomocí IndexedDB pro ukládání her a checkpointů
import localforage from 'localforage';
import type { Checkpoint, Game } from '../types';

// Konfigurace IndexedDB stores
const gamesStore = localforage.createInstance({
  name: 'GeoQuest',
  storeName: 'games',
  description: 'Cached games for offline play',
});

const checkpointsStore = localforage.createInstance({
  name: 'GeoQuest',
  storeName: 'checkpoints',
  description: 'Cached checkpoints for offline play',
});

const sessionsStore = localforage.createInstance({
  name: 'GeoQuest',
  storeName: 'sessions',
  description: 'Game sessions for offline play',
});

// === GAMES ===

export async function cacheGame(game: Game): Promise<void> {
  await gamesStore.setItem(game.id, {
    ...game,
    cached_at: Date.now(),
  });
}

/**
 * Vrátí hru z cache nebo null pokud není uložena.
 * Vyhodí chybu pokud dojde k chybě úložiště (odlišit od "není v cache").
 */
export async function getCachedGame(gameId: string): Promise<Game | null> {
  const game = await gamesStore.getItem<Game>(gameId);
  return game;
}

export async function getAllCachedGames(): Promise<Game[]> {
  const games: Game[] = [];
  await gamesStore.iterate<Game, void>((value) => {
    games.push(value);
  });
  return games;
}

export async function removeCachedGame(gameId: string): Promise<void> {
  await gamesStore.removeItem(gameId);
  await checkpointsStore.removeItem(gameId);
}

// === CHECKPOINTS ===

export async function cacheCheckpoints(gameId: string, checkpoints: Checkpoint[]): Promise<void> {
  await checkpointsStore.setItem(gameId, {
    checkpoints,
    cached_at: Date.now(),
  });
}

/**
 * Vrátí checkpointy z cache nebo [] pokud nejsou uloženy.
 * Vyhodí chybu pokud dojde k chybě úložiště.
 */
export async function getCachedCheckpoints(gameId: string): Promise<Checkpoint[]> {
  const data = await checkpointsStore.getItem<{
    checkpoints: Checkpoint[];
    cached_at: number;
  }>(gameId);
  return data?.checkpoints ?? [];
}

// === SESSIONS ===

export interface GameSession {
  game_id: string;
  user_id: string;
  current_checkpoint_index: number;
  completed_checkpoints: string[];
  started_at: number;
  completed_at?: number;
}

export async function saveGameSession(session: GameSession): Promise<void> {
  const key = `${session.game_id}_${session.user_id}`;
  await sessionsStore.setItem(key, session);
}

export async function getGameSession(gameId: string, userId: string): Promise<GameSession | null> {
  const key = `${gameId}_${userId}`;
  const session = await sessionsStore.getItem<GameSession>(key);
  return session;
}

export async function clearGameSession(gameId: string, userId: string): Promise<void> {
  const key = `${gameId}_${userId}`;
  await sessionsStore.removeItem(key);
}

// === UTILITY ===

export async function clearAllOfflineData(): Promise<void> {
  await gamesStore.clear();
  await checkpointsStore.clear();
  await sessionsStore.clear();
}

export async function getOfflineStorageSize(): Promise<number> {
  let totalSize = 0;
  await gamesStore.iterate<Game, void>((value) => {
    totalSize += JSON.stringify(value).length;
  });
  await checkpointsStore.iterate<unknown, void>((value) => {
    totalSize += JSON.stringify(value).length;
  });
  await sessionsStore.iterate<GameSession, void>((value) => {
    totalSize += JSON.stringify(value).length;
  });
  return totalSize;
}
