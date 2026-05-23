"use client";

import { useEffect } from "react";

const RELOAD_KEY = "tp_runtime_reload_once";

function shouldReloadForRuntimeError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("__webpack_modules__[moduleid] is not a function") ||
    normalized.includes("loading chunk") ||
    normalized.includes("chunkloaderror")
  );
}

export function RuntimeGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      if (!shouldReloadForRuntimeError(message)) return;
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason ?? "");
      if (!shouldReloadForRuntimeError(reason)) return;
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
