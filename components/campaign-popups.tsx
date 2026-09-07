"use client";

import { useEffect, useState } from "react";

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
  placement: "banner" | "modal";
}

/** Fetches Studio-managed active campaigns once, split by placement. */
export function useActiveCampaigns() {
  const [banners, setBanners] = useState<Campaign[]>([]);
  const [modals, setModals] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns/active")
      .then((r) => r.json())
      .then((json) => {
        const campaigns: Campaign[] = Array.isArray(json?.campaigns) ? json.campaigns : [];
        setBanners(campaigns.filter((c) => c.placement === "banner"));
        setModals(campaigns.filter((c) => c.placement === "modal"));
      })
      .catch(() => {});
  }, []);

  return { banners, modals };
}

function IconClose(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Top banner strip for "banner"-placement campaigns. Position-dependent
 * (meant to sit inside the page's own fixed header stack), so the caller
 * renders it wherever that stack lives rather than this component fixing
 * its own position.
 */
export function CampaignBanners({ campaigns }: { campaigns: Campaign[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = campaigns.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((banner) => (
        <div key={banner.id} className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 px-4 py-2.5 text-center">
          <span className="text-[12.5px] font-black leading-tight text-white md:text-sm">
            {banner.badge && <span className="mr-1.5 rounded-full bg-black/15 px-2 py-0.5 text-[10px] uppercase">{banner.badge}</span>}
            {banner.title}
          </span>
          <a
            href={banner.ctaHref}
            target={banner.ctaHref.startsWith("http") ? "_blank" : undefined}
            rel={banner.ctaHref.startsWith("http") ? "noopener noreferrer nofollow" : undefined}
            className="hidden shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-orange-600 transition hover:bg-orange-50 sm:inline-flex"
          >
            {banner.ctaText}
          </a>
          <button
            onClick={() => setDismissed((s) => new Set(s).add(banner.id))}
            aria-label="Kapat"
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-white transition hover:bg-black/25"
          >
            <IconClose className="h-3 w-3" />
          </button>
        </div>
      ))}
    </>
  );
}

/**
 * Centered modal overlay for "modal"-placement campaigns. Position-independent
 * (fixed, full-viewport), shows one at a time from the queue.
 */
export function CampaignModals({ campaigns }: { campaigns: Campaign[] }) {
  const [queue, setQueue] = useState<Campaign[]>([]);
  const [active, setActive] = useState<Campaign | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seenKey = (id: string) => `vibegsm_campaign_seen_${id}`;
    setQueue(campaigns.filter((c) => !sessionStorage.getItem(seenKey(c.id))));
  }, [campaigns]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const delay = setTimeout(() => {
      const next = queue[0];
      setActive(next);
      setQueue((q) => q.slice(1));
      try { sessionStorage.setItem(`vibegsm_campaign_seen_${next.id}`, "1"); } catch {}
    }, 1500);
    return () => clearTimeout(delay);
  }, [active, queue]);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [active]);

  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [active]);

  if (!active) return null;

  const close = () => {
    setVisible(false);
    setTimeout(() => setActive(null), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-5 transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl transition-all duration-300 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-orange-500 px-7 pt-7 pb-10 text-center">
          <button
            onClick={close}
            aria-label="Kapat"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <IconClose className="h-4 w-4" />
          </button>
          {active.badge && <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/80">{active.badge}</span>}
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">{active.title}</h3>
        </div>
        <div className="relative -mt-4 rounded-t-[2rem] bg-white px-7 pb-7 pt-6 text-center">
          {active.subtitle && <p className="text-sm leading-relaxed text-slate-500">{active.subtitle}</p>}
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={active.ctaHref}
              target={active.ctaHref.startsWith("http") ? "_blank" : undefined}
              rel={active.ctaHref.startsWith("http") ? "noopener noreferrer nofollow" : undefined}
              onClick={close}
              className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
            >
              {active.ctaText}
            </a>
            <button
              onClick={close}
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
