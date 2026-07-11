"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("SW registered:", reg.scope);
          })
          .catch((err) => {
            console.error("SW registration failed:", err);
          });
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 5000);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);

    if (choice.outcome === "accepted") {
      console.log("PWA installed");
    } else {
      localStorage.setItem("pwa_install_dismissed", "1");
    }
  }

  function handleDismiss() {
    setShowInstallBanner(false);
    localStorage.setItem("pwa_install_dismissed", "1");
  }

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80 animate-fade-in">
      <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-lg shadow-teal-100/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white text-lg font-black">
            M
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">MobiBase&apos;i telefonunuza ekleyin</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bayi panelinize uygulama simgesinden tek dokunuşla ulaşın.
            </p>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-1 text-slate-300 hover:text-slate-500 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
          >
            Sonra
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 transition shadow-sm"
          >
            Yükle
          </button>
        </div>
      </div>
    </div>
  );
}
