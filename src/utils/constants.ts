// Konstanty pro GeoQuest aplikaci

export const DEFAULT_CHECKPOINT_RADIUS = 10; // metry
export const MIN_GPS_ACCURACY = 20; // minimální přesnost GPS v metrech pro spolehlivé měření
export const GPS_UPDATE_INTERVAL = 1000; // interval aktualizace GPS v ms

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Velmi lehká',
  2: 'Lehká',
  3: 'Střední',
  4: 'Těžká',
  5: 'Velmi těžká',
};

export const CHECKPOINT_TYPE_LABELS: Record<string, string> = {
  info: 'Informační bod',
  puzzle: 'Hádanka',
  input: 'Zadání souřadnic',
};

// Výchozí pozice mapy (Praha - Staroměstské náměstí)
export const DEFAULT_MAP_CENTER = {
  latitude: 50.0875,
  longitude: 14.4213,
};

export const DEFAULT_MAP_ZOOM = 13;

// Intervalové konstanty
export const LOCATION_UPDATE_INTERVAL = 10_000; // ms mezi odesíláním polohy
export const CHECKPOINT_COMPLETE_DELAY = 2_000; // ms prodleva po správné odpovědi

// Zoom levely
export const MAP_PLAY_ZOOM = 15; // zoom při hraní
export const MAP_ZOOM_TO_LOCATION = 17; // zoom při přiblížení na konkrétní bod

// Prahy pohybu mapy
export const MAP_SIGNIFICANT_MOVE_THRESHOLD = 10; // px/m, pod tímto prahem se mapa necentruje

// Výchozí tolerance GPS
export const DEFAULT_RADIUS_TOLERANCE = 10; // metry tolerance navíc k radiusu checkpointu
