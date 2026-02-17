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
