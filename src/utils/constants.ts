// Konstanty pro GeoQuest aplikaci

// Výchozí pozice mapy (Praha - Staroměstské náměstí)
export const DEFAULT_MAP_CENTER = {
  latitude: 50.0875,
  longitude: 14.4213,
};

export const DEFAULT_MAP_ZOOM = 13;

// Intervalové konstanty
export const LOCATION_UPDATE_INTERVAL = 10_000; // ms mezi odesíláním polohy
export const CHECKPOINT_COMPLETE_DELAY = 2_000; // ms prodleva po správné odpovědi

// Prahy pohybu mapy
export const MAP_SIGNIFICANT_MOVE_THRESHOLD = 10; // px/m, pod tímto prahem se mapa necentruje

// Predefinované tagy her
export const GAME_TAGS = [
  { id: 'nature', label: 'Příroda' },
  { id: 'bike', label: 'Kolo' },
  { id: 'tasks', label: 'Úkoly' },
] as const;
