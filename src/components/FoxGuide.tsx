// Komponenta lišky průvodce, která se mění podle situace
import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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

  // Odstranění zelené barvy pomocí Canvas API
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;

    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const processImage = () => {
      // Nastavit velikost canvasu podle obrázku
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Nakreslit obrázek
      ctx.drawImage(img, 0, 0);

      // Získat pixely
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Barva na odstranění: #c8df46 = RGB(200, 223, 70)
      const targetR = 200;
      const targetG = 223;
      const targetB = 70;
      const threshold = 30; // Tolerance pro podobné barvy

      // Projít všechny pixely a nastavit zelenou jako průhlednou
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Pokud je pixel podobný cílové zelené, nastavit alpha na 0
        const dr = Math.abs(r - targetR);
        const dg = Math.abs(g - targetG);
        const db = Math.abs(b - targetB);

        if (dr < threshold && dg < threshold && db < threshold) {
          data[i + 3] = 0; // Průhlednost
        }
      }

      // Zapsat zpět upravené pixely
      ctx.putImageData(imageData, 0, 0);
    };

    if (img.complete) {
      processImage();
    } else {
      img.onload = processImage;
    }
  }, [foxState]);

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
      {/* Skrytý img element pro načtení obrázku */}
      <img
        ref={imgRef}
        src={foxImages[foxState]}
        alt=""
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />

      {/* Canvas s odstraněnou zelenou */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
        }}
      />
    </Box>
  );
}
