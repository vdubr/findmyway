// Převod řádků ze Supabase (sloupce JSONB jsou typované jako Json, text jako string)
// na aplikační typy. Jediné místo, kde se přetypovává – zbytek aplikace pracuje s Game,
// Checkpoint a GameSession bez `as unknown as`.
import type {
  Checkpoint,
  CheckpointContent,
  CheckpointSecret,
  CheckpointType,
  CheckpointWithSecret,
  Game,
  GameSession,
  GameSettings,
  GameStatus,
  GameWithCreator,
  SecretSolution,
  SessionMetadata,
} from '../types';
import type { Json, Tables } from './database.types';

type GameRow = Tables<'games'>;
type CheckpointRow = Tables<'checkpoints'>;
type SecretRow = Tables<'checkpoint_secrets'>;
type SessionRow = Tables<'game_sessions'>;
type CreatorRow = Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url'>;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  radius_tolerance: 10,
  allow_skip: false,
  max_players: null,
  time_limit: null,
  share_location_required: false,
  show_radius: true,
};

export const EMPTY_SESSION_METADATA: SessionMetadata = {
  hints_used: 0,
  wrong_attempts: 0,
  checkpoints_completed: [],
};

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toGameSettings(value: Json | null): GameSettings {
  const raw = asObject(value);
  return {
    radius_tolerance:
      typeof raw.radius_tolerance === 'number'
        ? raw.radius_tolerance
        : DEFAULT_GAME_SETTINGS.radius_tolerance,
    allow_skip: raw.allow_skip === true,
    max_players: typeof raw.max_players === 'number' ? raw.max_players : null,
    time_limit: typeof raw.time_limit === 'number' ? raw.time_limit : null,
    share_location_required: raw.share_location_required === true,
    show_radius: raw.show_radius !== false,
  };
}

function toDifficulty(value: number): Game['difficulty'] {
  const rounded = Math.min(5, Math.max(1, Math.round(value)));
  return rounded as Game['difficulty'];
}

export function toGame(row: GameRow): Game {
  return {
    id: row.id,
    creator_id: row.creator_id,
    title: row.title,
    description: row.description,
    is_public: row.is_public,
    difficulty: toDifficulty(row.difficulty),
    settings: toGameSettings(row.settings),
    tags: row.tags ?? [],
    status: row.status as GameStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toGameWithCreator(row: GameRow & { creator: CreatorRow | null }): GameWithCreator {
  return {
    ...toGame(row),
    creator: row.creator ?? { id: row.creator_id, username: null, avatar_url: null },
  };
}

function toCheckpointContent(value: Json): CheckpointContent {
  const raw = asObject(value);
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : null,
    image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
    clue: typeof raw.clue === 'string' ? raw.clue : null,
  };
}

export function toCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    game_id: row.game_id,
    order_index: row.order_index,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    type: row.type as CheckpointType,
    content: toCheckpointContent(row.content),
    is_fake: row.is_fake ?? false,
    answer_hash: row.answer_hash,
    solution_lat_hash: row.solution_lat_hash,
    solution_lng_hash: row.solution_lng_hash,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toSecretSolution(value: Json | null): SecretSolution | null {
  const raw = asObject(value);
  const latitude = asObject(raw.latitude);
  const longitude = asObject(raw.longitude);
  if (typeof latitude.degrees !== 'number' || typeof longitude.degrees !== 'number') return null;
  return {
    latitude: {
      degrees: latitude.degrees,
      minutes: typeof latitude.minutes === 'number' ? latitude.minutes : 0,
      seconds: typeof latitude.seconds === 'number' ? latitude.seconds : 0,
      direction: latitude.direction === 'S' ? 'S' : 'N',
    },
    longitude: {
      degrees: longitude.degrees,
      minutes: typeof longitude.minutes === 'number' ? longitude.minutes : 0,
      seconds: typeof longitude.seconds === 'number' ? longitude.seconds : 0,
      direction: longitude.direction === 'W' ? 'W' : 'E',
    },
  };
}

function toCheckpointSecret(row: SecretRow | null): CheckpointSecret | null {
  if (!row) return null;
  return {
    secret_solution: toSecretSolution(row.secret_solution),
    puzzle_answer: row.puzzle_answer,
  };
}

export function toCheckpointWithSecret(
  row: CheckpointRow & { secret: SecretRow | null }
): CheckpointWithSecret {
  return { ...toCheckpoint(row), secret: toCheckpointSecret(row.secret) };
}

function toSessionMetadata(value: Json | null): SessionMetadata {
  const raw = asObject(value);
  return {
    hints_used: typeof raw.hints_used === 'number' ? raw.hints_used : 0,
    wrong_attempts: typeof raw.wrong_attempts === 'number' ? raw.wrong_attempts : 0,
    checkpoints_completed: Array.isArray(raw.checkpoints_completed)
      ? raw.checkpoints_completed.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function toGameSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    user_id: row.user_id,
    game_id: row.game_id,
    current_checkpoint_index: row.current_checkpoint_index,
    status: row.status as GameSession['status'],
    start_time: row.start_time,
    end_time: row.end_time,
    score: row.score,
    metadata: toSessionMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
