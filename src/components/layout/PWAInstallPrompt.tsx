import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissedAt = localStorage.getItem("pwa_install_dismissed");
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / 86400000;
        if (daysSince < 7) return;
      }
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa_install_dismissed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-700 p-4 text-white shadow-2xl sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Instalar LPAV</p>
          <p className="text-xs text-white/80 truncate">
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-white/90"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
