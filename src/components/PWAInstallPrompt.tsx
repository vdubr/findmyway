// Komponenta pro zobrazení instalačního promptu pro PWA
import { Close as CloseIcon, GetApp as InstallIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Slide,
  type SlideProps,
  Snackbar,
} from "@mui/material";
import { useEffect, useState } from "react";

// Typ pro beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Kontrola, jestli už není nainstalováno
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - standalone je iOS specific property
      window.navigator.standalone === true;

    if (isInstalled) {
      return;
    }

    // Kontrola, jestli uživatel už prompt zavřel
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed === "true") {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Zabránit automatickému zobrazení
      e.preventDefault();
      // Uložit event pro pozdější použití
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Zobrazit vlastní prompt po 3 sekundách
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Zobrazit nativní instalační prompt
    await deferredPrompt.prompt();

    // Počkat na výběr uživatele
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("Uživatel nainstaloval PWA");
    } else {
      console.log("Uživatel odmítl instalaci PWA");
    }

    // Vyčistit prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Zapamatovat si, že uživatel zavřel prompt
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      TransitionComponent={SlideTransition}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          width: "100%",
          maxWidth: 400,
          bgcolor: "primary.main",
          "& .MuiAlert-message": {
            flex: 1,
          },
        }}
        action={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleInstallClick}
              startIcon={<InstallIcon />}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.2)",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.3)",
                },
              }}
            >
              Instalovat
            </Button>
            <IconButton
              size="small"
              aria-label="zavřít"
              color="inherit"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        Nainstalujte si GeoQuest pro offline hraní a rychlejší přístup!
      </Alert>
    </Snackbar>
  );
}
