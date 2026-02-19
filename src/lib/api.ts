// Helper funkce pro práci s Supabase databází

import type {
  Checkpoint,
  CreateCheckpointInput,
  CreateGameInput,
  Game,
  GameSession,
  Profile,
  UpdateCheckpointInput,
  UpdateGameInput,
} from '../types';
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
  if (!user) throw new Error('Not authenticated');

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
  if (!user) throw new Error('Not authenticated');

  // Check if there's already an active session
  const existingSession = await getActiveSession(gameId);
  if (existingSession) {
    // Return existing session instead of creating a new one
    return existingSession;
  }

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
