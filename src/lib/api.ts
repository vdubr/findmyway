// Helper funkce pro práci s Supabase databází

import type {
  ActivePlayer,
  Checkpoint,
  CreateCheckpointInput,
  CreateGameInput,
  Game,
  GameSession,
  GameWithCreator,
  PlayerLocation,
  Profile,
  SessionMetadata,
  UpdateCheckpointInput,
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

// Seznam her potřebuje z checkpointů jen polohu a pořadí (pin na mapě, vzdálenost),
// řešení úkolů se do seznamu nestahují
const CHECKPOINT_SUMMARY_SELECT = 'checkpoints(id, order_index, latitude, longitude)';

// Síťová chyba = fetch vůbec neproběhl. PostgREST chyby (např. PGRST116 – řádek neexistuje
// nebo k němu uživatel nemá přístup) mají code, síťové chyby z postgrest-js prázdný code.
function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  const code = (err as { code?: unknown } | null)?.code;
  return err != null && !code;
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

export async function getCurrentProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) throw error;
  return data as Profile;
}

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

export async function getPublicGames() {
  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CREATOR_SELECT}`)
    .eq('is_public', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Varianta s checkpointy pro zobrazení her na mapě (výpočet těžiště)
export async function getPublicGamesWithCheckpoints() {
  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CREATOR_SELECT}, ${CHECKPOINT_SUMMARY_SELECT}`)
    .eq('is_public', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Draft hry přihlášeného uživatele s checkpointy (pro seznam her)
export async function getMyDraftGamesWithCheckpoints() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CREATOR_SELECT}, ${CHECKPOINT_SUMMARY_SELECT}`)
    .eq('creator_id', userId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMyGames() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('games')
    .select(`*, ${CREATOR_SELECT}`)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export type GameWithCreatorAndCheckpoints = GameWithCreator & { checkpoints: Checkpoint[] };

export async function getGameById(
  gameId: string,
  { offlineFallback = true }: FetchOptions = {}
): Promise<GameWithCreatorAndCheckpoints> {
  let data: unknown = null;
  let error: unknown = null;
  try {
    ({ data, error } = await fetchGame(gameId));
  } catch (err) {
    error = err;
  }

  if (!error && data) {
    const game = data as GameWithCreatorAndCheckpoints;
    // Zápis do cache je best-effort – selhání úložiště nesmí shodit úspěšný online fetch
    cacheGame(game).catch(warnCacheError);
    if (game.checkpoints) {
      cacheCheckpoints(gameId, game.checkpoints).catch(warnCacheError);
    }
    return game;
  }

  if (offlineFallback && isNetworkError(error)) {
    const cachedGame = await getCachedGame(gameId);
    if (cachedGame) {
      console.warn('Offline – používám hru z cache');
      return cachedGame as GameWithCreatorAndCheckpoints;
    }
  } else if ((error as { code?: string } | null)?.code === 'PGRST116') {
    // Hra neexistuje nebo k ní uživatel už nemá přístup – zastaralou kopii smazat
    removeCachedGame(gameId).catch(warnCacheError);
  }

  throw error;
}

function fetchGame(gameId: string) {
  return supabase
    .from('games')
    .select(`*, ${CREATOR_SELECT}, checkpoints(*)`)
    .eq('id', gameId)
    .order('order_index', { referencedTable: 'checkpoints', ascending: true })
    .single();
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
      settings: (input.settings ?? {
        radius_tolerance: 10,
        allow_skip: false,
        max_players: null,
        time_limit: null,
      }) as Json,
      status: 'draft',
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Game;
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
  return data as unknown as Game;
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

export async function getCheckpointsByGameId(
  gameId: string,
  { offlineFallback = true }: FetchOptions = {}
): Promise<Checkpoint[]> {
  let data: unknown = null;
  let error: unknown = null;
  try {
    ({ data, error } = await fetchCheckpoints(gameId));
  } catch (err) {
    error = err;
  }

  if (!error && data) {
    const checkpoints = data as Checkpoint[];
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

function fetchCheckpoints(gameId: string) {
  return supabase
    .from('checkpoints')
    .select('*')
    .eq('game_id', gameId)
    .order('order_index', { ascending: true });
}

export async function createCheckpoint(input: CreateCheckpointInput) {
  const { data, error } = await supabase
    .from('checkpoints')
    .insert({
      game_id: input.game_id,
      order_index: input.order_index,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius ?? 10,
      type: input.type,
      content: input.content as unknown as Json,
      secret_solution: (input.secret_solution ?? null) as Json | null,
      is_fake: input.is_fake ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Checkpoint;
}

export async function updateCheckpoint(checkpointId: string, updates: UpdateCheckpointInput) {
  const { content, secret_solution, ...rest } = updates;
  const { data, error } = await supabase
    .from('checkpoints')
    .update({
      ...rest,
      ...(content !== undefined && { content: content as unknown as Json }),
      ...(secret_solution !== undefined && {
        secret_solution: secret_solution as unknown as Json | null,
      }),
    })
    .eq('id', checkpointId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Checkpoint;
}

// Pomocná funkce pro přesunutí order_index na dočasnou hodnotu (vyhnutí se unique constraint při reorder)
export async function shiftCheckpointOrderIndex(checkpointId: string, tempIndex: number) {
  const { error } = await supabase
    .from('checkpoints')
    .update({ order_index: tempIndex })
    .eq('id', checkpointId);

  if (error) throw error;
}

export async function deleteCheckpoint(checkpointId: string) {
  const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId);

  if (error) throw error;
}

// ============================================================================
// GAME SESSIONS
// ============================================================================

export async function getActiveSession(gameId: string) {
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
  return data as unknown as GameSession | null;
}

export async function startGameSession(gameId: string) {
  const userId = await getCurrentUserId();

  // Existující aktivní session – pokračovat v rozehrané hře
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
      metadata: {
        hints_used: 0,
        wrong_attempts: 0,
        checkpoints_completed: [],
      } as unknown as Json,
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
  return data as unknown as GameSession;
}

export async function updateSessionProgress(
  sessionId: string,
  checkpointIndex: number,
  metadata?: SessionMetadata
) {
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
  return data as unknown as GameSession;
}

export async function completeGameSession(sessionId: string, score: number) {
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
  return data as unknown as GameSession;
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

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `avatar.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Smazat starý avatar pokud existuje
  await supabase.storage.from('avatars').remove([filePath]);

  const { error } = await supabase.storage.from('avatars').upload(filePath, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteCheckpointImage(imageUrl: string) {
  // Extract path from URL
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split('/checkpoint-images/');
  if (pathParts.length < 2) throw new Error('Invalid image URL');

  const filePath = pathParts[1];
  const { error } = await supabase.storage.from('checkpoint-images').remove([filePath]);

  if (error) throw error;
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
export async function getActivePlayersForGame(gameId: string): Promise<ActivePlayer[]> {
  const { data, error } = await supabase
    .from('active_players_view')
    .select('*')
    .eq('game_id', gameId);

  if (error) throw error;
  return (data as ActivePlayer[]) || [];
}

// Pocet aktivnich hracu pro danou hru
export async function getActivePlayersCount(gameId: string): Promise<number> {
  const { count, error } = await supabase
    .from('active_players_view')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId);

  if (error) throw error;
  return count || 0;
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
  const uniqueGamesPlayed = new Set(
    (playedData as { game_id: string }[] | null)?.map((s) => s.game_id) || []
  );

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
