"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "dashboard-kpi",
    title: "Gösterge Paneli",
    description: "Bayinizin günlük finansal durumunu buradan izleyin. Satış, gider ve tahsilat özeti.",
    position: "bottom",
  },
  {
    target: "nav-tamir-takip",
    title: "Tamir Takip",
    description: "Cihaz girişinden teslimata kadar tüm servis sürecini bu bölümden yönetin.",
    position: "right",
  },
  {
    target: "nav-pos",
    title: "Hızlı Satış (POS)",
    description: "Tek ekranda satış yapın, ödeme alın, fatura kesin. Stok ve kâr otomatik güncellenir.",
    position: "right",
  },
  {
    target: "support-bot-button",
    title: "Destek Masası",
    description: "Herhangi bir sorunuzda buradan destek talebi oluşturabilirsiniz. Size özel yanıtlanır.",
    position: "left",
  },
];

const TOUR_STORAGE_KEY = "mobibase_tour_completed";

export function ProductTour() {
  const [current, setCurrent] = useState(-1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_STORAGE_KEY);
    if (done) return;

    const timer = setTimeout(() => setCurrent(0), 800);
    return () => clearTimeout(timer);
  }, []);

  const getPosition = useCallback(
    (step: TourStep) => {
      const el = document.getElementById(step.target);
      if (!el) return { top: "40%", left: "50%", transform: "translate(-50%, -50%)" };

      const r = el.getBoundingClientRect();

      const gap = 16;
      let top = 0;
      let left = 0;

      switch (step.position) {
        case "top":
          top = r.top - gap;
          left = r.left + r.width / 2;
          return { top: `${top}px`, left: `${left}px`, transform: "translate(-50%, -100%)" };
        case "bottom":
          top = r.bottom + gap;
          left = r.left + r.width / 2;
          return { top: `${top}px`, left: `${left}px`, transform: "translate(-50%, 0)" };
        case "left":
          top = r.top + r.height / 2;
          left = r.left - gap;
          return { top: `${top}px`, left: `${left}px`, transform: "translate(-100%, -50%)" };
        case "right":
          top = r.top + r.height / 2;
          left = r.right + gap;
          return { top: `${top}px`, left: `${left}px`, transform: "translate(0, -50%)" };
        default:
          return { top: "40%", left: "50%", transform: "translate(-50%, -50%)" };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current]
  );

  const currentStep = current >= 0 && current < TOUR_STEPS.length ? TOUR_STEPS[current] : null;

  if (!currentStep) return null;

  const pos = getPosition(currentStep);

  function next() {
    if (current + 1 < TOUR_STEPS.length) {
      setVisible(false);
      setTimeout(() => {
        setCurrent(current + 1);
        setVisible(true);
      }, 200);
    } else {
      finish();
    }
  }

  function prev() {
    if (current > 0) {
      setVisible(false);
      setTimeout(() => {
        setCurrent(current - 1);
        setVisible(true);
      }, 200);
    }
  }

  function finish() {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setCurrent(-1);
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
        onClick={finish}
      />

      <div
        className="fixed z-[101] transition-all duration-300 ease-out"
        style={{
          ...pos,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          maxWidth: isMobile ? "calc(100vw - 40px)" : "360px",
          width: "100%",
        }}
        onTransitionEnd={() => setVisible(true)}
      >
        <div className="rounded-2xl border border-white/20 bg-[#0f172a] p-5 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-cyan-200/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
              {current + 1} / {TOUR_STEPS.length}
            </span>
            <button onClick={finish} className="text-xs font-bold text-slate-400 hover:text-white transition">
              Geç
            </button>
          </div>

          <h3 className="mt-3 text-lg font-black text-white">{currentStep.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{currentStep.description}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={current === 0}
              className="text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Geri
            </button>
            <button
              onClick={next}
              className="rounded-full bg-cyan-200 px-5 py-2 text-xs font-black text-[#06111f] transition hover:bg-white"
            >
              {current + 1 === TOUR_STEPS.length ? "Bitir" : "Sonraki"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
