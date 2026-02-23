// Helper funkce pro práci s Supabase databází

import type {
  ActivePlayer,
  Checkpoint,
  CreateCheckpointInput,
  CreateGameInput,
  Game,
  GameSession,
  PlayerLocation,
  Profile,
  UpdateCheckpointInput,
  UpdateGameInput,
} from '../types';
import {
  createAnonymousSession,
  getAnonymousSession,
  updateAnonymousSession,
} from './anonymousSessions';
import { cacheCheckpoints, cacheGame, getCachedCheckpoints, getCachedGame } from './offlineStorage';
import { supabase } from './supabase';

// ============================================================================
// PROFILES
// ============================================================================

export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
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
    .select('*, creator:profiles!creator_id(*)')
    .eq('is_public', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMyGames() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('games')
    .select('*, creator:profiles!creator_id(*)')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getGameById(gameId: string) {
  // Offline-first strategie: zkusit cache, pak online, fallback na cache
  try {
    // 1. Zkusit načíst z Supabase (online)
    const { data, error } = await supabase
      .from('games')
      .select('*, creator:profiles!creator_id(*), checkpoints(*)')
      .eq('id', gameId)
      .single();

    if (!error && data) {
      // Úspěch - uložit do cache pro offline použití
      await cacheGame(data as Game);
      // @ts-expect-error - checkpoints jsou součástí select query
      if (data.checkpoints) {
        // @ts-expect-error - checkpoints jsou součástí select query
        await cacheCheckpoints(gameId, data.checkpoints);
      }
      return data;
    }

    // 2. Online selhalo - zkusit cache
    console.warn('Online fetch failed, trying cache:', error);
    const cachedGame = await getCachedGame(gameId);
    if (cachedGame) {
      console.log('Using cached game data');
      return cachedGame;
    }

    // 3. Cache není k dispozici - vyhodit chybu
    throw error;
  } catch (err) {
    // Poslední pokus - zkusit cache při jakékoli chybě
    const cachedGame = await getCachedGame(gameId);
    if (cachedGame) {
      console.log('Using cached game data (fallback)');
      return cachedGame;
    }
    throw err;
  }
}

export async function createGame(input: CreateGameInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('games')
    .insert({
      creator_id: user.id,
      title: input.title,
      description: input.description,
      is_public: input.is_public,
      difficulty: input.difficulty,
      settings: input.settings || {
        radius_tolerance: 10,
        allow_skip: false,
        max_players: null,
        time_limit: null,
      },
      status: 'draft',
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

export async function updateGame(gameId: string, updates: UpdateGameInput) {
  const { data, error } = await supabase
    .from('games')
    .update(updates as never)
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

export async function deleteGame(gameId: string) {
  const { error } = await supabase.from('games').delete().eq('id', gameId);

  if (error) throw error;
}

// ============================================================================
// CHECKPOINTS
// ============================================================================

export async function getCheckpointsByGameId(gameId: string) {
  // Offline-first strategie: zkusit cache, pak online, fallback na cache
  try {
    // 1. Zkusit načíst z Supabase (online)
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('game_id', gameId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      // Úspěch - uložit do cache pro offline použití
      await cacheCheckpoints(gameId, data as Checkpoint[]);
      return data as Checkpoint[];
    }

    // 2. Online selhalo - zkusit cache
    console.warn('Online fetch failed, trying cache:', error);
    const cachedCheckpoints = await getCachedCheckpoints(gameId);
    if (cachedCheckpoints.length > 0) {
      console.log('Using cached checkpoints data');
      return cachedCheckpoints;
    }

    // 3. Cache není k dispozici - vyhodit chybu
    throw error;
  } catch (err) {
    // Poslední pokus - zkusit cache při jakékoli chybě
    const cachedCheckpoints = await getCachedCheckpoints(gameId);
    if (cachedCheckpoints.length > 0) {
      console.log('Using cached checkpoints data (fallback)');
      return cachedCheckpoints;
    }
    throw err;
  }
}

export async function createCheckpoint(input: CreateCheckpointInput) {
  const { data, error } = await supabase
    .from('checkpoints')
    .insert({
      game_id: input.game_id,
      order_index: input.order_index,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius || 10,
      type: input.type,
      content: input.content as never,
      secret_solution: input.secret_solution as never,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as Checkpoint;
}

export async function updateCheckpoint(checkpointId: string, updates: UpdateCheckpointInput) {
  const { data, error } = await supabase
    .from('checkpoints')
    .update(updates as never)
    .eq('id', checkpointId)
    .select()
    .single();

  if (error) throw error;
  return data as Checkpoint;
}

export async function deleteCheckpoint(checkpointId: string) {
  const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId);

  if (error) throw error;
}

// ============================================================================
// GAME SESSIONS
// ============================================================================

export async function getActiveSession(gameId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymní uživatel - použít localStorage
  if (!user) {
    return getAnonymousSession(gameId);
  }

  // Přihlášený uživatel - použít Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data as GameSession | null;
}

export async function startGameSession(gameId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if there's already an active session
  const existingSession = await getActiveSession(gameId);
  if (existingSession) {
    return existingSession;
  }

  // Anonymní uživatel - vytvořit localStorage session
  if (!user) {
    return createAnonymousSession(gameId);
  }

  // Přihlášený uživatel - vytvořit v Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: user.id,
      game_id: gameId,
      current_checkpoint_index: 0,
      status: 'active',
      metadata: {
        hints_used: 0,
        wrong_attempts: 0,
        checkpoints_completed: [],
      } as never,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as GameSession;
}

export async function updateSessionProgress(
  sessionId: string,
  checkpointIndex: number,
  metadata?: object
) {
  // Anonymní session - aktualizovat localStorage
  if (sessionId.startsWith('anonymous_')) {
    const session = getAnonymousSession(sessionId.split('_')[1]); // Extract gameId
    if (!session) {
      throw new Error('Anonymous session not found');
    }
    session.current_checkpoint_index = checkpointIndex;
    if (metadata) {
      session.metadata = metadata as never;
    }
    updateAnonymousSession(session);
    return session;
  }

  // Přihlášený uživatel - aktualizovat Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      current_checkpoint_index: checkpointIndex,
      ...(metadata && { metadata: metadata as never }),
    } as never)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as GameSession;
}

export async function completeGameSession(sessionId: string, score: number) {
  // Anonymní session - dokončit v localStorage
  if (sessionId.startsWith('anonymous_')) {
    const gameId = sessionId.split('_')[1]; // Extract gameId
    const session = getAnonymousSession(gameId);
    if (!session) {
      throw new Error('Anonymous session not found');
    }
    session.status = 'completed' as never;
    session.end_time = new Date().toISOString();
    session.score = score;
    updateAnonymousSession(session);
    return session;
  }

  // Přihlášený uživatel - dokončit v Supabase
  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      status: 'completed' as never,
      end_time: new Date().toISOString(),
      score,
    } as never)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as GameSession;
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
): Promise<PlayerLocation> {
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
      } as never,
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
  onUpdate: (players: ActivePlayer[]) => void
) {
  // Nejprve nacteme aktualni stav
  getActivePlayersForGame(gameId).then(onUpdate);

  // Pak naslouchame zmenam v tabulce player_locations
  const channel = supabase
    .channel(`player_locations_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_locations',
      },
      () => {
        // Pri jakekoli zmene znovu nacteme vsechny aktivni hrace
        // (jednodussi nez filtrovat podle game_id v realtime)
        getActivePlayersForGame(gameId).then(onUpdate);
      }
    )
    .subscribe();

  // Vratit funkci pro odhlaseni
  return () => {
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
