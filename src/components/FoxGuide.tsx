// Komponenta lišky průvodce, která se mění podle situace.
// Obrázky jsou WebP s průhledným pozadím (připravené offline), takže se nic nepřekresluje
// na canvasu za běhu – původní PNG měly zelené pozadí odstraňované pixel po pixelu.
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import foxPuzzle from '../assets/fox/liska_lusti_krizovky.webp';
import foxWaving from '../assets/fox/liska_mava.webp';
import foxTraveling from '../assets/fox/liska_na_cestach_sbatohem_a_buzolou.webp';
import foxStanding from '../assets/fox/liska_na_zadnich.webp';
import foxTreasure from '../assets/fox/liska_nasla_poklad.webp';
import foxSitting from '../assets/fox/liska_sedi.webp';

type FoxState = 'waving' | 'traveling' | 'sitting' | 'puzzle' | 'treasure' | 'standing';

interface FoxGuideProps {
  state?: FoxState;
  inline?: boolean; // Pokud true, nebude fixed position ale inline
}

const foxImages: Record<FoxState, string> = {
  waving: foxWaving,
  traveling: foxTraveling,
  sitting: foxSitting,
  puzzle: foxPuzzle,
  treasure: foxTreasure,
  standing: foxStanding,
};

// Stav lišky podle aktuální stránky (pokud není zadaný explicitně)
function foxStateForPath(path: string): FoxState {
  // Homepage - liška máva na uvítanou
  if (path === '/') return 'waving';

  // Auth stránka - liška sedí a čeká
  if (path === '/auth') return 'sitting';

  // Editace hry (/games/:gameId/edit/:tab) - liška luští křížovky (tvoření hry)
  if (/^\/games\/[^/]+\/edit(\/|$)/.test(path)) return 'puzzle';

  // Hraní hry (/games/:gameId/game) - liška cestuje s batohem
  if (/^\/games\/[^/]+\/game\/?$/.test(path)) return 'traveling';

  // Default - liška stojí
  return 'standing';
}

export default function FoxGuide({ state, inline = false }: FoxGuideProps) {
  const location = useLocation();
  const foxState = state ?? foxStateForPath(location.pathname);

  return (
    <Box
      sx={{
        position: inline ? 'relative' : 'fixed',
        top: inline ? 0 : 16,
        left: inline ? 0 : 16,
        zIndex: inline ? 1 : 1000,
        width: inline ? '100%' : { xs: 60, sm: 80, md: 100 },
        height: inline ? '100%' : { xs: 60, sm: 80, md: 100 },
        pointerEvents: 'none',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: inline ? 'none' : 'scale(1.1)',
        },
      }}
    >
      <img
        src={foxImages[foxState]}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        }}
      />
    </Box>
  );
}
