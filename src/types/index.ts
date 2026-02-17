// TypeScript typy pro GeoQuest aplikaci
// Synchronizováno s databázovým schématem z KROK 2

// ============================================================================
// DATABASE TYPES (odpovídají SQL schématu)
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type GameStatus = 'draft' | 'published' | 'archived';

export interface Game {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  settings: GameSettings;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}

export interface GameSettings {
  radius_tolerance: number; // v metrech, výchozí 10m
  allow_skip: boolean;
  max_players: number | null;
  time_limit: number | null; // v minutách
}

export type CheckpointType = 'info' | 'puzzle' | 'input';

export interface Checkpoint {
  id: string;
  game_id: string;
  order_index: number;
  latitude: number;
  longitude: number;
  radius: number; // v metrech
  type: CheckpointType;
  content: CheckpointContent;
  secret_solution: SecretSolution | null;
  is_fake?: boolean; // Fake checkpoint (nebude brán v potaz při dokončování hry)
  created_at: string;
  updated_at: string;
}

export interface CheckpointContent {
  title: string;
  description: string | null;
  image_url: string | null;
  clue: string | null;
  puzzle_answer?: string | null; // Správná odpověď pro typ 'puzzle'
}

// Secret solution obsahuje OBOJE: latitude a longitude v DMS formátu
export interface SecretSolution {
  latitude: CoordinateDMS;
  longitude: CoordinateDMS;
}

export interface CoordinateDMS {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

export type GameSessionStatus = 'active' | 'completed' | 'abandoned';

export interface GameSession {
  id: string;
  user_id: string;
  game_id: string;
  current_checkpoint_index: number;
  status: GameSessionStatus;
  start_time: string;
  end_time: string | null;
  score: number | null;
  metadata: SessionMetadata;
  created_at: string;
  updated_at: string;
}

export interface SessionMetadata {
  hints_used: number;
  wrong_attempts: number;
  checkpoints_completed: string[]; // Array of checkpoint IDs
}

export interface CheckpointCompletion {
  id: string;
  session_id: string;
  checkpoint_id: string;
  entered_at: string;
  completed_at: string | null;
  attempts: number;
  entry_latitude: number | null;
  entry_longitude: number | null;
  entry_accuracy: number | null;
  created_at: string;
}

// ============================================================================
// HELPER TYPES (pro práci s daty v aplikaci)
// ============================================================================

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// ============================================================================
// API TYPES (pro formuláře a API requesty)
// ============================================================================

export interface CreateGameInput {
  title: string;
  description?: string;
  is_public: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  settings?: Partial<GameSettings>;
}

export interface UpdateGameInput {
  title?: string;
  description?: string;
  is_public?: boolean;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  settings?: Partial<GameSettings>;
  status?: GameStatus;
}

export interface CreateCheckpointInput {
  game_id: string;
  order_index: number;
  latitude: number;
  longitude: number;
  radius?: number;
  type: CheckpointType;
  content: CheckpointContent;
  secret_solution?: SecretSolution;
}

export interface UpdateCheckpointInput {
  order_index?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  type?: CheckpointType;
  content?: Partial<CheckpointContent>;
  secret_solution?: SecretSolution | null;
}

export interface StartGameSessionInput {
  game_id: string;
}

export interface UpdateSessionProgressInput {
  current_checkpoint_index: number;
  metadata?: Partial<SessionMetadata>;
}

export interface CompleteCheckpointInput {
  session_id: string;
  checkpoint_id: string;
  entry_latitude: number;
  entry_longitude: number;
  entry_accuracy: number;
}

// ============================================================================
// VIEW MODELS (pro zobrazení v UI)
// ============================================================================

export interface GameWithCreator extends Game {
  creator: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
}

export interface GameWithCheckpoints extends Game {
  checkpoints: Checkpoint[];
}

export interface GameSessionWithDetails extends GameSession {
  game: Game;
  completions: CheckpointCompletion[];
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface UploadImageResult {
  path: string;
  url: string;
}

export type StorageBucket = 'checkpoint-images' | 'avatars';
