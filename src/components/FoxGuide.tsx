// Komponenta lišky průvodce, která se mění podle situace
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";

// Import obrázků lišky
import foxWaving from "../assets/fox/liska_mava.png";
import foxTraveling from "../assets/fox/liska_na_cestach_sbatohem_a_buzolou.png";
import foxSitting from "../assets/fox/liska_sedí.png";
import foxPuzzle from "../assets/fox/liska_lusti_krizovky.png";
import foxTreasure from "../assets/fox/liška_nasla_poklad.png";
import foxStanding from "../assets/fox/liska_na_zadnich.png";

type FoxState =
  | "waving"
  | "traveling"
  | "sitting"
  | "puzzle"
  | "treasure"
  | "standing";

interface FoxGuideProps {
  state?: FoxState;
  inline?: boolean; // Pokud true, nebude fixed position ale inline
}

export default function FoxGuide({ state, inline = false }: FoxGuideProps) {
  const location = useLocation();

  // Automaticky určit stav lišky podle aktuální stránky
  const getFoxState = (): FoxState => {
    if (state) return state;

    const path = location.pathname;

    // Homepage - liška máva na uvítanou
    if (path === "/") return "waving";

    // Auth stránka - liška sedí a čeká
    if (path === "/auth") return "sitting";

    // Admin stránky - liška luští křížovky (tvoření hry)
    if (path.startsWith("/admin")) return "puzzle";

    // Player page - liška cestuje s batohem
    if (path.startsWith("/player")) return "traveling";

    // Victory/completion - liška našla poklad
    if (path.includes("victory") || path.includes("complete"))
      return "treasure";

    // Default - liška stojí
    return "standing";
  };

  const foxState = getFoxState();

  const foxImages: Record<FoxState, string> = {
    waving: foxWaving,
    traveling: foxTraveling,
    sitting: foxSitting,
    puzzle: foxPuzzle,
    treasure: foxTreasure,
    standing: foxStanding,
  };

  return (
    <Box
      sx={{
        position: inline ? "relative" : "fixed",
        top: inline ? 0 : 16,
        left: inline ? 0 : 16,
        zIndex: inline ? 1 : 1000,
        width: inline ? "100%" : { xs: 60, sm: 80, md: 100 },
        height: inline ? "100%" : { xs: 60, sm: 80, md: 100 },
        pointerEvents: "none",
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          transform: inline ? "none" : "scale(1.1)",
        },
      }}
    >
      <Box
        component="img"
        src={foxImages[foxState]}
        alt="Liška průvodce"
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // CSS filtr pro "vymazání" zelené barvy a přidání stínu
          filter:
            "drop-shadow(2px 2px 4px rgba(0,0,0,0.2)) hue-rotate(0deg) saturate(1.2) contrast(1.1)",
        }}
      />
    </Box>
  );
}
