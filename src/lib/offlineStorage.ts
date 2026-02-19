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
  try {
    await gamesStore.setItem(game.id, {
      ...game,
      cached_at: Date.now(),
    });
    console.log('Game cached for offline:', game.id);
  } catch (error) {
    console.error('Error caching game:', error);
  }
}

export async function getCachedGame(gameId: string): Promise<Game | null> {
  try {
    const game = await gamesStore.getItem<Game>(gameId);
    return game;
  } catch (error) {
    console.error('Error getting cached game:', error);
    return null;
  }
}

export async function getAllCachedGames(): Promise<Game[]> {
  try {
    const games: Game[] = [];
    await gamesStore.iterate<Game, void>((value) => {
      games.push(value);
    });
    return games;
  } catch (error) {
    console.error('Error getting all cached games:', error);
    return [];
  }
}

export async function removeCachedGame(gameId: string): Promise<void> {
  try {
    await gamesStore.removeItem(gameId);
    await checkpointsStore.removeItem(gameId);
    console.log('Game removed from cache:', gameId);
  } catch (error) {
    console.error('Error removing cached game:', error);
  }
}

// === CHECKPOINTS ===

export async function cacheCheckpoints(gameId: string, checkpoints: Checkpoint[]): Promise<void> {
  try {
    await checkpointsStore.setItem(gameId, {
      checkpoints,
      cached_at: Date.now(),
    });
    console.log('Checkpoints cached for offline:', gameId);
  } catch (error) {
    console.error('Error caching checkpoints:', error);
  }
}

export async function getCachedCheckpoints(gameId: string): Promise<Checkpoint[]> {
  try {
    const data = await checkpointsStore.getItem<{
      checkpoints: Checkpoint[];
      cached_at: number;
    }>(gameId);
    return data?.checkpoints || [];
  } catch (error) {
    console.error('Error getting cached checkpoints:', error);
    return [];
  }
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
  try {
    const key = `${session.game_id}_${session.user_id}`;
    await sessionsStore.setItem(key, session);
    console.log('Game session saved:', key);
  } catch (error) {
    console.error('Error saving game session:', error);
  }
}

export async function getGameSession(gameId: string, userId: string): Promise<GameSession | null> {
  try {
    const key = `${gameId}_${userId}`;
    const session = await sessionsStore.getItem<GameSession>(key);
    return session;
  } catch (error) {
    console.error('Error getting game session:', error);
    return null;
  }
}

export async function clearGameSession(gameId: string, userId: string): Promise<void> {
  try {
    const key = `${gameId}_${userId}`;
    await sessionsStore.removeItem(key);
    console.log('Game session cleared:', key);
  } catch (error) {
    console.error('Error clearing game session:', error);
  }
}

// === UTILITY ===

export async function clearAllOfflineData(): Promise<void> {
  try {
    await gamesStore.clear();
    await checkpointsStore.clear();
    await sessionsStore.clear();
    console.log('All offline data cleared');
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}

export async function getOfflineStorageSize(): Promise<number> {
  try {
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
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 0;
  }
}
