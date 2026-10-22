// Offline storage pomocí IndexedDB pro ukládání her a checkpointů
import localforage from 'localforage';
import type { Checkpoint, GameDetail } from '../types';

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

// Session se do IndexedDB už neukládají (postup drží DB / localStorage); store zůstává jen kvůli
// smazání dat ze starších verzí v clearAllOfflineData
const sessionsStore = localforage.createInstance({
  name: 'GeoQuest',
  storeName: 'sessions',
  description: 'Game sessions (legacy, jen úklid starých dat)',
});

// === GAMES ===

export async function cacheGame(game: GameDetail): Promise<void> {
  await gamesStore.setItem(game.id, {
    ...game,
    cached_at: Date.now(),
  });
}

/**
 * Vrátí hru z cache nebo null pokud není uložena.
 * Vyhodí chybu pokud dojde k chybě úložiště (odlišit od "není v cache").
 */
export async function getCachedGame(gameId: string): Promise<GameDetail | null> {
  const game = await gamesStore.getItem<GameDetail>(gameId);
  return game;
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
  // Řadit i tady – do cache se mohou dostat checkpointy v libovolném pořadí
  return [...(data?.checkpoints ?? [])].sort((a, b) => a.order_index - b.order_index);
}

// === SESSIONS ===

// === UTILITY ===

export async function clearAllOfflineData(): Promise<void> {
  await gamesStore.clear();
  await checkpointsStore.clear();
  await sessionsStore.clear();
}
