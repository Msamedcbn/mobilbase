"use client";

import { useEffect, useState } from "react";

/**
 * Dark clock card for the dashboard's top-left slot. Renders a neutral
 * placeholder on the server and mounts client-side to avoid a server/client
 * time mismatch hydration warning.
 */
export function DashboardClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="min-h-[128px] rounded-xl bg-[#1c1c1e] shadow-sm" />;
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="flex min-h-[128px] flex-col justify-center rounded-xl bg-[#1c1c1e] p-5 shadow-sm">
      <div className="flex items-baseline">
        <span className="font-mono text-4xl font-black leading-none tracking-tight text-white">
          {hh}:{mm}
        </span>
        <span className="ml-0.5 font-mono text-xl font-bold leading-none text-slate-500">:{ss}</span>
      </div>
      <p className="mt-2.5 text-[11px] font-semibold text-slate-400">
        {now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
      </p>
    </div>
  );
}
