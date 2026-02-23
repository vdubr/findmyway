# GeoQuest - Projektovy kontext

GPS treasure hunt aplikace pro vytvareni a hrani her s checkpointy v realnem svete.

## Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **UI:** Material-UI (MUI)
- **State Management:** Zustand
- **Routing:** React Router
- **Maps:** OpenLayers

### Backend
- **Service:** Supabase
- **Database:** PostgreSQL
- **Auth:** Supabase Auth (Email + Google OAuth)
- **Storage:** Supabase Storage

### Deployment
- **Platform:** Vercel
- **CI:** GitHub Actions (via Vercel)
- **Repo:** https://github.com/vdubr/findmyway

## Konvence

- **Jazyk:** Cestina - komentare v cestine, vsechny texty v UI v cestine
- **Commit format:** `Type: Strucny popis v cestine` (typy: Feature, Fix, Refactor, Docs, Style, Test)
- **File structure:** Feature-based structure (src/features/)
- **Naming:** PascalCase pro komponenty, camelCase pro utility funkce

## Theme

- **Styl:** Prirodni zelene tema evokujici cestu do prirody
- **Primary:** #2D6A4F (Lesni zelena)
- **Secondary:** #52B788 (Svezi zelena)
- **Background:** #F1FAEE (Jemne kremova)
- **Border radius:** 12px (zaoblene rohy)
- **Komponenty:** Material-UI s custom theme

## Features

### Aktualni
- Prihlaseni (Email/Password + Google OAuth)
- Vytvareni her s checkpointy
- Editace existujicich her
- Hrani her s GPS navigaci
- Mapa s OpenLayers
- Admin panel pro spravu her

### Planovane
- Mazani her
- Publikovani/unpublikovani her
- QR kod sdileni
- Statistiky a leaderboardy
- Notifikace

## Development

- Commitovat jen kdyz uzivatel explicitne pozada
- Nasadit jen kdyz uzivatel explicitne pozada
- Build test pred kazdym commitem
- main branch pro production

## Preferences

- Nepouzivat emoji v kodu ani commitech (pokud uzivatel explicitne nepozada)
- Vsechny formulare musi mit spravne autocomplete atributy
- Dodrzovat zakladni accessibility standardy
- Mobile-first pristup, aplikace musi fungovat na mobilech

## Environment

- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Config files: `.env` (local, gitignored), `vercel.json` (deployment config)

## Database

- Migrace: `supabase/migrations/`
- Tabulky: profiles, games, checkpoints, game_sessions, checkpoint_completions
- Row Level Security enabled na vsech tabulkach
