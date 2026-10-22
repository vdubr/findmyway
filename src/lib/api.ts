// Datová vrstva nad Supabase – jediné místo, které zná tvar řádků v DB.
// Řádky převádí přes lib/mappers.ts na aplikační typy (Game, Checkpoint, GameSession…).

import type {
  ActivePlayer,
  Checkpoint,
  CheckpointWithSecret,
  CreateGameInput,
  GameDetail,
  GameSession,
  GameWithCheckpointSummary,
  PlayerLocation,
  Profile,
  SaveCheckpointInput,
  SessionMetadata,
  UpdateGameInput,
} from '../types';
import {
  createAnonymousSession,
  extractGameIdFromAnonymousSessionId,
  getAnonymousSession,
  isAnonymousSessionId,
  updateAnonymousSession,
} from './anonymousSessions';
import type { Json } from './database.types';
import {
  EMPTY_SESSION_METADATA,
  toCheckpoint,
  toCheckpointWithSecret,
  toGame,
  toGameSession,
  toGameWithCreator,
} from './mappers';
import {
  cacheCheckpoints,
  cacheGame,
  getCachedCheckpoints,
  getCachedGame,
  removeCachedGame,
} from './offlineStorage';
import { supabase } from './supabase';

// ============================================================================
// HELPERS
// ============================================================================

// Identita z lokálně uložené session – bez síťového požadavku, funguje i offline.
// getUser() při výpadku sítě vrací user: null, takže přihlášený hráč by se tvářil jako anonym.
// Oprávnění stejně ověřuje server (RLS) podle JWT.
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

// Veřejné údaje o tvůrci – e-mail se do seznamů her ani do offline cache nenačítá
const CREATOR_SELECT = 'creator:profiles!creator_id(id, username, avatar_url)';

// Seznam her potřebuje z checkpointů jen polohu a pořadí (pin na mapě, vzdálenost)
const CHECKPOINT_SUMMARY_SELECT = 'checkpoints(id, order_index, latitude, longitude)';

// Síťová chyba = fetch vůbec neproběhl. PostgREST chyby (např. PGRST116 – řádek neexistuje
// nebo k němu uživatel nemá přístup) mají code, síťové chyby z postgrest-js prázdný code.
function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  const code = (err as { code?: unknown } | null)?.code;
  return err != null && !code;
}

function errorCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}

function warnCacheError(err: unknown) {
  console.warn('Zápis do offline cache selhal:', err);
}

interface FetchOptions {
  // Při výpadku sítě vrátit data z offline cache (hraní v terénu).
  // Editor ji vypíná, aby neupravoval zastaralou kopii.
  offlineFallback?: boolean;
}

// ============================================================================
// PROFILES
// ============================================================================

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// ============================================================================
// GAMES
// ============================================================================

// Veřejné publikované hry s polohou checkpointů (seznam her, mapa)
export async function getPublicGamesWithCheckpoints(): Promise<GameWithCheckpointSummary[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CHECKPOINT_SUMMARY_SELECT}`)
    .eq('is_public', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((row) => ({ ...toGame(row), checkpoints: row.checkpoints }));
}

// Draft hry přihlášeného uživatele s polohou checkpointů (pro seznam her)
export async function getMyDraftGamesWithCheckpoints(): Promise<GameWithCheckpointSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CHECKPOINT_SUMMARY_SELECT}`)
    .eq('creator_id', userId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((row) => ({ ...toGame(row), checkpoints: row.checkpoints }));
}

export async function getGameById(
  gameId: string,
  { offlineFallback = true }: FetchOptions = {}
): Promise<GameDetail> {
  let game: GameDetail | null = null;
  let error: unknown = null;
  try {
    const result = await supabase
      .from('games')
      .select(`*, ${CREATOR_SELECT}, checkpoints(*)`)
      .eq('id', gameId)
      .order('order_index', { referencedTable: 'checkpoints', ascending: true })
      .single();
    error = result.error;
    if (result.data) {
      game = {
        ...toGameWithCreator(result.data),
        checkpoints: result.data.checkpoints.map(toCheckpoint),
      };
    }
  } catch (err) {
    error = err;
  }

  if (game) {
    // Zápis do cache je best-effort – selhání úložiště nesmí shodit úspěšný online fetch
    cacheGame(game).catch(warnCacheError);
    cacheCheckpoints(gameId, game.checkpoints).catch(warnCacheError);
    return game;
  }

  if (offlineFallback && isNetworkError(error)) {
    const cachedGame = await getCachedGame(gameId);
    if (cachedGame) {
      console.warn('Offline – používám hru z cache');
      return cachedGame;
    }
  } else if (errorCode(error) === 'PGRST116') {
    // Hra neexistuje nebo k ní uživatel už nemá přístup – zastaralou kopii smazat
    removeCachedGame(gameId).catch(warnCacheError);
  }

  throw error;
}

export async function createGame(input: CreateGameInput) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('games')
    .insert({
      creator_id: userId,
      title: input.title,
      description: input.description ?? null,
      is_public: input.is_public,
      difficulty: input.difficulty,
      settings: (input.settings ?? {}) as Json,
      status: 'draft',
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return toGame(data);
}

export async function updateGame(gameId: string, updates: UpdateGameInput) {
  const { settings, tags, ...rest } = updates;
  const { data, error } = await supabase
    .from('games')
    .update({
      ...rest,
      ...(settings !== undefined && { settings: settings as Json }),
      ...(tags !== undefined && { tags }),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return toGame(data);
}

export async function deleteGame(gameId: string) {
  // RLS při chybějícím oprávnění nevrací chybu, jen smaže 0 řádků – proto kontrola výsledku
  const { data, error } = await supabase.from('games').delete().eq('id', gameId).select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Hru se nepodařilo smazat. Nemáte k ní oprávnění, nebo už neexistuje.');
  }
  removeCachedGame(gameId).catch(warnCacheError);
}

// ============================================================================
// CHECKPOINTS
// ============================================================================

// Checkpointy pro hráče – bez řešení úkolů, jen hashe (viz utils/answerCheck.ts)
export async function getCheckpointsByGameId(
  gameId: string,
  { offlineFallback = true }: FetchOptions = {}
): Promise<Checkpoint[]> {
  let checkpoints: Checkpoint[] | null = null;
  let error: unknown = null;
  try {
    const result = await supabase
      .from('checkpoints')
      .select('*')
      .eq('game_id', gameId)
      .order('order_index', { ascending: true });
    error = result.error;
    if (result.data) checkpoints = result.data.map(toCheckpoint);
  } catch (err) {
    error = err;
  }

  if (checkpoints) {
    cacheCheckpoints(gameId, checkpoints).catch(warnCacheError);
    return checkpoints;
  }

  if (offlineFallback && isNetworkError(error)) {
    const cachedCheckpoints = await getCachedCheckpoints(gameId);
    if (cachedCheckpoints.length > 0) {
      console.warn('Offline – používám checkpointy z cache');
      return cachedCheckpoints;
    }
  }

  throw error;
}

// Checkpointy včetně řešení úkolů – pro editor. RLS vrátí secret jen tvůrci hry,
// ostatním přijde null (editor je pro ně stejně zavřený).
export async function getCheckpointsWithSecrets(gameId: string): Promise<CheckpointWithSecret[]> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*, secret:checkpoint_secrets(*)')
    .eq('game_id', gameId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data.map(toCheckpointWithSecret);
}

// Uloží všechny checkpointy hry v jedné transakci (RPC save_game_checkpoints):
// existující podle id aktualizuje, nové vloží, chybějící smaže, řešení zapíše do
// checkpoint_secrets. Vrací uložené checkpointy seřazené podle order_index.
export async function saveGameCheckpoints(
  gameId: string,
  checkpoints: SaveCheckpointInput[]
): Promise<Checkpoint[]> {
  const { data, error } = await supabase.rpc('save_game_checkpoints', {
    p_game_id: gameId,
    p_checkpoints: checkpoints as unknown as Json,
  });

  if (error) throw error;
  const saved = data.map(toCheckpoint);
  cacheCheckpoints(gameId, saved).catch(warnCacheError);
  return saved;
}

// ============================================================================
// GAME SESSIONS
// ============================================================================

async function getActiveSession(gameId: string): Promise<GameSession | null> {
  const userId = await getCurrentUserId();

  // Anonymní uživatel - použít localStorage (dokončená session se jako aktivní nevrací)
  if (!userId) {
    const session = getAnonymousSession(gameId);
    return session?.status === 'active' ? session : null;
  }

  // Přihlášený uživatel - použít Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data ? toGameSession(data) : null;
}

// Vrátí rozehranou session, nebo založí novou
export async function startGameSession(gameId: string): Promise<GameSession> {
  const userId = await getCurrentUserId();

  const existingSession = await getActiveSession(gameId);
  if (existingSession) {
    return existingSession;
  }

  // Anonymní uživatel - vytvořit localStorage session
  if (!userId) {
    return createAnonymousSession(gameId);
  }

  // Přihlášený uživatel - vytvořit v Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: userId,
      game_id: gameId,
      current_checkpoint_index: 0,
      status: 'active',
      metadata: EMPTY_SESSION_METADATA as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    // Souběžný start (dvě záložky, StrictMode) – aktivní session mezitím vznikla jinde
    if (error.code === '23505') {
      const concurrentSession = await getActiveSession(gameId);
      if (concurrentSession) return concurrentSession;
    }
    throw error;
  }
  return toGameSession(data);
}

export async function updateSessionProgress(
  sessionId: string,
  checkpointIndex: number,
  metadata?: SessionMetadata
): Promise<GameSession> {
  // Anonymní session - aktualizovat localStorage
  if (isAnonymousSessionId(sessionId)) {
    const gameId = extractGameIdFromAnonymousSessionId(sessionId);
    if (!gameId) throw new Error(`Invalid anonymous session ID: "${sessionId}"`);
    const session = getAnonymousSession(gameId);
    if (!session) {
      throw new Error('Anonymous session not found');
    }
    session.current_checkpoint_index = checkpointIndex;
    if (metadata) {
      session.metadata = metadata;
    }
    updateAnonymousSession(session);
    return session;
  }

  // Přihlášený uživatel - aktualizovat Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      current_checkpoint_index: checkpointIndex,
      ...(metadata && { metadata: metadata as unknown as Json }),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return toGameSession(data);
}

export async function completeGameSession(sessionId: string, score: number): Promise<GameSession> {
  // Anonymní session - dokončit v localStorage
  if (isAnonymousSessionId(sessionId)) {
    const gameId = extractGameIdFromAnonymousSessionId(sessionId);
    if (!gameId) throw new Error(`Invalid anonymous session ID: "${sessionId}"`);
    const session = getAnonymousSession(gameId);
    if (!session) {
      throw new Error('Anonymous session not found');
    }
    session.status = 'completed';
    session.end_time = new Date().toISOString();
    session.score = score;
    updateAnonymousSession(session);
    return session;
  }

  // Přihlášený uživatel - dokončit v Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      score,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return toGameSession(data);
}

// ============================================================================
// STORAGE
// ============================================================================

export async function uploadCheckpointImage(
  gameId: string,
  checkpointId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${gameId}/${checkpointId}/${fileName}`;

  const { error } = await supabase.storage.from('checkpoint-images').upload(filePath, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('checkpoint-images').getPublicUrl(filePath);

  return publicUrl;
}

// ============================================================================
// PLAYER LOCATIONS (Real-time tracking)
// ============================================================================

// Aktualizovat pozici hrace (upsert - insert nebo update)
export async function updatePlayerLocation(
  sessionId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  currentCheckpointIndex: number
): Promise<PlayerLocation | null> {
  // Anonymní session není v DB (sloupec session_id je UUID s FK) – nemá smysl posílat
  if (isAnonymousSessionId(sessionId)) return null;

  const { data, error } = await supabase
    .from('player_locations')
    .upsert(
      {
        session_id: sessionId,
        latitude,
        longitude,
        accuracy,
        current_checkpoint_index: currentCheckpointIndex,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'session_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PlayerLocation;
}

// Smazat pozici hrace (pri ukonceni hry)
export async function deletePlayerLocation(sessionId: string): Promise<void> {
  if (isAnonymousSessionId(sessionId)) return;

  const { error } = await supabase.from('player_locations').delete().eq('session_id', sessionId);

  if (error) throw error;
}

// Ziskat aktivni hrace pro danou hru (pro admina)
async function getActivePlayersForGame(gameId: string): Promise<ActivePlayer[]> {
  const { data, error } = await supabase
    .from('active_players_view')
    .select('*')
    .eq('game_id', gameId);

  if (error) throw error;
  return (data as ActivePlayer[]) || [];
}

// Subscripce na zmeny pozic hracu (pro real-time aktualizace)
export function subscribeToPlayerLocations(
  gameId: string,
  onUpdate: (players: ActivePlayer[]) => void,
  onError?: (err: unknown) => void
) {
  let active = true;
  // Pořadové číslo požadavku – pozdě doručená starší odpověď nesmí přepsat novější
  let latestRequest = 0;

  const refresh = () => {
    const requestId = ++latestRequest;
    getActivePlayersForGame(gameId)
      .then((players) => {
        if (active && requestId === latestRequest) onUpdate(players);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('Nepodařilo se načíst aktivní hráče:', err);
        onError?.(err);
      });
  };

  // Nejprve nacteme aktualni stav
  refresh();

  // Pak naslouchame zmenam v tabulce player_locations.
  // Unikátní název kanálu: supabase.channel() vrací existující kanál se stejným jménem,
  // a ten může být po rychlém zavření a znovuotevření ještě v odhlašování.
  const channel = supabase
    .channel(`player_locations_${gameId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_locations',
      },
      // Pri jakekoli zmene znovu nacteme vsechny aktivni hrace
      // (player_locations nemá game_id, realtime filtr podle hry tu nejde)
      refresh
    )
    .subscribe();

  // Vratit funkci pro odhlaseni
  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// PROFILE STATISTICS
// ============================================================================

export interface ProfileStats {
  gamesCreated: number;
  gamesPlayed: number;
  gamesCompleted: number;
}

// Ziskat statistiky profilu uzivatele
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  // Pocet vytvorenych her
  const { count: gamesCreated, error: createdError } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId);

  if (createdError) throw createdError;

  // Pocet odehranych her (unikatni game_id v sessions)
  const { data: playedData, error: playedError } = await supabase
    .from('game_sessions')
    .select('game_id')
    .eq('user_id', userId);

  if (playedError) throw playedError;

  // Unikatni hry
  const uniqueGamesPlayed = new Set((playedData ?? []).map((s) => s.game_id));

  // Pocet dokoncenych her
  const { count: gamesCompleted, error: completedError } = await supabase
    .from('game_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (completedError) throw completedError;

  return {
    gamesCreated: gamesCreated || 0,
    gamesPlayed: uniqueGamesPlayed.size,
    gamesCompleted: gamesCompleted || 0,
  };
}
