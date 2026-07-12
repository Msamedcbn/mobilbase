"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TrialSignupForm } from "@/components/trial-signup-form";

gsap.registerPlugin(ScrollTrigger);

/* ── Python RNG (seed: 492) ──
 * Hero:    cinematic_center
 * Font:    Satoshi
 * Comps:   infinite_marquee, inline_typography_images, testimonial_carousel
 * GSAP:    image_scale_fade, scrubbing_text
 */

const NAV_LINKS = [
  { label: "Ozellikler", href: "#features" },
  { label: "Cozum", href: "#solution" },
  { label: "Paketler", href: "#pricing" },
  { label: "Takas Hesapla", href: "/takas-hesapla" },
];

const MARQUEE_WORDS = [
  "POS", "Teknik Servis", "Stok Yonetimi", "Faturalama", "Ikinci El Alim", "Sube Kontrolu",
  "Tahsilat Takibi", "Seri No Izleme", "Cihaz Kabulu", "Kurumsal Teklif", "Buyback",
];

const BENTO_CARDS = [
  {
    span: "md:col-span-2 md:row-span-2",
    image: "https://picsum.photos/seed/dashboard-dark/800/600",
    title: "Tek panelden tum bayi yonetimi",
    description: "Satis, servis, stok ve tahsilat verisi ayni ekranda birlesir. Gunluk karar aninda ihtiyaciniz olan rakam.",
    stat: "92%",
    statLabel: "Operasyonel verimlilik",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    image: "https://picsum.photos/seed/repair-phone/400/300",
    title: "Tamir takip",
    description: "Cihaz kabulden teslime her adim izlenir.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    title: "Stok ve seri no",
    image: null,
    color: "from-emerald-600 to-teal-700",
    description: "Urun, maliyet, sube ve seri numarasi gorunur kalir.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    title: "Tahsilat riski",
    image: null,
    color: "from-amber-500 to-orange-600",
    description: "Veresiye ve vade takibi erken uyari ile yonetilir.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    title: "Ikinci el buyback",
    image: "https://picsum.photos/seed/used-phone/400/300",
    description: "Alim, servis transferi ve satis tek akista baglanir.",
  },
];

const TESTIMONIALS = [
  {
    quote: "MobiBase ile servis takibimiz tamamen degisti. Hangi cihazin hangi asamada oldugunu aninda goruyoruz.",
    name: "Ahmet K.",
    role: "Teknik Servis Muduru, Istanbul",
    image: "https://picsum.photos/seed/portrait-1/200/200",
  },
  {
    quote: "Stok ve seri no takibi sayesinde kayip urun sorunu sifira indi. Subeler arasi transfer artik karmasik degil.",
    name: "Zeynep D.",
    role: "Bayi Sahibi, Ankara",
    image: "https://picsum.photos/seed/portrait-2/200/200",
  },
  {
    quote: "Ikinci el alim surecini tek bir ekranda yonetebilmek buyuk avantaj. IMEI sorgulamasi ve fiyatlandirma cok hizli.",
    name: "Mehmet S.",
    role: "Isletme Muduru, Izmir",
    image: "https://picsum.photos/seed/portrait-3/200/200",
  },
];

const PLANS = [
  { key: "Lite", subtitle: "Kucuk bayi icin temel kontrol" },
  { key: "Service", subtitle: "Teknik servis agirlikli isletmeler" },
  { key: "Pro", subtitle: "Satis, stok ve finans birlikte", badge: "Onerilen" },
  { key: "Enterprise", subtitle: "Cok subeli bayi ve SLA ihtiyaci" },
];

const FEATURE_NAMES = [
  { key: "pos", label: "POS" },
  { key: "repairs", label: "Teknik servis" },
  { key: "stock", label: "Stok" },
  { key: "invoicing", label: "Faturalama" },
  { key: "buyback", label: "Ikinci el" },
];

interface PricingData {
  Lite: number;
  Service: number;
  Pro: number;
  Enterprise: number;
  freeBranchLimit: number;
  branchSurchargePrice: number;
  addons: { apiPackPrice: number; dbGbPrice: number; customDevHourly: number; annualDiscountPct: number };
  features: Record<string, Record<string, any>>;
}

export function LandingPage({ pricing, addons }: { pricing: PricingData; addons: PricingData["addons"] }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const imageScaleRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLParagraphElement>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  /* ── GSAP: Hero entrance ── */
  useGSAP(() => {
    if (!heroRef.current) return;
    gsap.fromTo(
      heroRef.current.querySelectorAll(".hero-anim"),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" }
    );
  }, { scope: heroRef });

  /* ── GSAP: Image scale & fade ── */
  useGSAP(() => {
    if (!imageScaleRef.current) return;
    const images = imageScaleRef.current.querySelectorAll(".scale-image");
    images.forEach((img) => {
      gsap.fromTo(
        img,
        { scale: 0.82, opacity: 0.3 },
        {
          scale: 1,
          opacity: 1,
          scrollTrigger: {
            trigger: img,
            start: "top 85%",
            end: "top 35%",
            scrub: 1.2,
          },
        }
      );
      gsap.to(img, {
        opacity: 0.25,
        scrollTrigger: {
          trigger: img,
          start: "top 10%",
          end: "top -15%",
          scrub: 1.2,
        },
      });
    });
  }, { scope: imageScaleRef });

  /* ── GSAP: Scrubbing text reveals ── */
  useGSAP(() => {
    if (!textRevealRef.current) return;
    const words = textRevealRef.current.querySelectorAll(".reveal-word");
    words.forEach((word, i) => {
      gsap.fromTo(
        word,
        { opacity: 0.08 },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: textRevealRef.current,
            start: "top 70%",
            end: "bottom 30%",
            scrub: 0.8,
          },
          delay: i * 0.02,
        }
      );
    });
  }, { scope: textRevealRef });

  return (
    <main className="overflow-x-hidden w-full max-w-full bg-[#030712] text-white" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      {/* ──────────── NAV: Floating glass pill ──────────── */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-6 py-3 transition-all duration-500 ${
            scrolled
              ? "border-white/[0.08] bg-white/[0.04] backdrop-blur-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "border-transparent bg-transparent"
          }`}
        >
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-sm font-black text-white shadow-lg shadow-teal-500/25">
              M
            </div>
            <span className="text-base font-black tracking-tight">MobiBase</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] font-medium text-slate-300 transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="/login"
            className="rounded-full bg-white/10 px-5 py-2 text-[13px] font-bold text-white transition hover:bg-white/20 border border-white/10"
          >
            Giris
          </a>
        </div>
      </nav>

      {/* ──────────── ATTENTION: Asymmetric Split Hero (VARIANCE=8) ──────────── */}
      <section
        ref={heroRef}
        className="relative flex min-h-[100dvh] items-center px-5 pb-20 pt-32 md:px-8"
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_30%_40%,rgba(20,184,166,0.18),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(6,182,212,0.06),transparent_45%)]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
            {/* ── Left: Text Block ── */}
            <div>
              <div className="hero-anim mb-8 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-300">
                  Telefon bayileri icin operasyon sistemi
                </span>
              </div>

              <h1 className="hero-anim max-w-2xl text-[clamp(2.8rem,5.5vw,5.2rem)] font-black leading-[0.95] tracking-[-0.04em] text-white">
                Excel ve WhatsApp
                <br />
                karmasasini tek bayi
                <br />
                sisteminde bitirin
              </h1>

              <p className="hero-anim mt-8 max-w-lg text-[17px] leading-relaxed text-slate-400">
                MobiBase; satis, teknik servis, stok, ikinci el ve tahsilati ayni akista toplayan
                telefon bayi otomasyonudur.
              </p>

              <div className="hero-anim mt-10 flex flex-wrap gap-4">
                <a
                  href="#pricing"
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-black text-[#030712] shadow-lg shadow-white/10 transition hover:scale-105 active:scale-[0.98]"
                >
                  Paketleri Gor
                </a>
                <a
                  href="/takas-hesapla"
                  className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 hover:border-white/30 active:scale-[0.98]"
                >
                  Takas Fiyati Hesapla
                </a>
              </div>
            </div>

            {/* ── Right: Stylized Image Block ── */}
            <div className="hero-anim relative hidden md:block">
              <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#020617] shadow-2xl shadow-black/30">
                <img
                  src="https://picsum.photos/seed/dashboard-dark/700/800"
                  alt=""
                  className="w-full object-cover opacity-80 contrast-110"
                  style={{ filter: "grayscale(0.5) brightness(0.5)", minHeight: "500px" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-teal-300">Bayi Durumu</span>
                    <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-black text-teal-300">Canli</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Servis", "46"],
                      ["Satis", "18"],
                      ["Stok", "1.284"],
                      ["Tahsilat", "7.2K TL"],
                    ].map(([label, val]) => (
                      <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                        <p className="text-[10px] text-slate-500">{label}</p>
                        <p className="text-sm font-black text-white">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── INTEREST: Gapless Bento Grid ──────────── */}
      <section id="features" ref={bentoRef} className="py-40 md:py-56">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
              Ozellikler
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white">
              Bayi operasyonunuzu tek
              <br />
              <span className="text-slate-500">kontrol panelinde toplayin</span>
            </h2>
          </div>

          <div className="mt-14 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 md:grid-flow-dense">
            {BENTO_CARDS.map((card, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition-all duration-500 hover:border-white/20 hover:bg-white/[0.06] ${card.span}`}
              >
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-60 contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ filter: "grayscale(0.4) brightness(0.6)" }}
                  />
                ) : null}
                {card.color ? (
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-80`} />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6">
                  {card.stat ? (
                    <span className="text-5xl font-black tracking-tight">{card.stat}</span>
                  ) : null}
                  <h3 className="mt-2 text-lg font-black leading-tight">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── DESIRE: GSAP Image Scale & Fade ──────────── */}
      <section ref={imageScaleRef} className="py-40 md:py-56">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="scale-image overflow-hidden rounded-[32px] border border-white/10">
              <img
                src="https://picsum.photos/seed/dashboard-panel/800/500"
                alt=""
                className="w-full object-cover contrast-110 brightness-75"
                style={{ filter: "grayscale(0.3)" }}
              />
            </div>
            <div className="flex flex-col justify-center gap-6">
              <div className="scale-image overflow-hidden rounded-[32px] border border-white/10">
                <img
                  src="https://picsum.photos/seed/repair-workshop/800/250"
                  alt=""
                  className="w-full object-cover contrast-110 brightness-75"
                  style={{ filter: "grayscale(0.3)" }}
                />
              </div>
              <div className="scale-image overflow-hidden rounded-[32px] border border-white/10">
                <img
                  src="https://picsum.photos/seed/stock-shelf/800/250"
                  alt=""
                  className="w-full object-cover contrast-110 brightness-75"
                  style={{ filter: "grayscale(0.3)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── DESIRE: Scrubbing Text Reveal ──────────── */}
      <section className="py-40 md:py-56">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p ref={textRevealRef} className="text-[clamp(1.8rem,3.5vw,3rem)] font-black leading-[1.15] tracking-[-0.03em] text-white md:pl-8 md:border-l md:border-white/10">
            {"Daginik kayit degil yonetilebilir akis. Amac sadece veri girmek degil bayi sahibine karar verecegi temiz tabloyu vermek."
              .split(" ")
              .map((word, i) => (
                <span key={i} className="reveal-word inline">
                  {word}{" "}
                </span>
              ))}
          </p>
        </div>
      </section>

      {/* ──────────── Infinite Marquee ──────────── */}
      <section className="border-y border-white/10 py-10">
        <div className="flex animate-[marquee_30s_linear_infinite] gap-12 whitespace-nowrap">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="text-[13px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {word}
            </span>
          ))}
        </div>
      </section>

      {/* ──────────── Testimonial Carousel ──────────── */}
      <section className="py-40 md:py-56">
        <div className="mx-auto max-w-3xl px-5 md:px-8 text-center">
          <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-white/20">
            <img
              src={TESTIMONIALS[testimonialIndex].image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <blockquote className="mt-6 text-xl font-medium leading-relaxed text-slate-300 md:text-2xl">
            &ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-bold text-white">{TESTIMONIALS[testimonialIndex].name}</p>
          <p className="text-xs text-slate-500">{TESTIMONIALS[testimonialIndex].role}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() =>
                setTestimonialIndex((prev) =>
                  prev === 0 ? TESTIMONIALS.length - 1 : prev - 1
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Onceki"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === testimonialIndex ? "w-8 bg-teal-400" : "w-2 bg-white/20"
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() =>
                setTestimonialIndex((prev) =>
                  prev === TESTIMONIALS.length - 1 ? 0 : prev + 1
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Sonraki"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ──────────── ACTION: Pricing + CTA ──────────── */}
      <section id="pricing" className="py-40 md:py-56">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <div className="md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Paketler</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white">
              Bayi olcegine gore baslayin
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Tum fiyatlar ayliktir. Yillik odemede %{addons.annualDiscountPct} indirim uygulanir.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
            {PLANS.map((plan) => {
              const featureConfig = (pricing.features as any)?.[plan.key] || {};
              const amount = Number((pricing as any)[plan.key] || 0);
              const highlighted = Boolean(plan.badge);
              return (
                <article
                  key={plan.key}
                  className={`rounded-[32px] border p-8 transition-all duration-500 hover:scale-[1.01] ${
                    highlighted
                      ? "border-teal-500/30 bg-teal-500/[0.06] shadow-[0_20px_60px_-20px_rgba(20,184,166,0.4)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black">{plan.key}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{plan.subtitle}</p>
                    </div>
                    {plan.badge ? (
                      <span className="shrink-0 rounded-full bg-teal-500/20 px-3 py-1 text-[10px] font-black uppercase text-teal-300">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-6 text-4xl font-black tracking-tight">
                    {amount.toLocaleString("tr-TR")} <span className="text-base font-medium text-slate-500">TL / ay</span>
                  </p>
                  <div className="mt-6 space-y-2.5 border-t border-white/[0.08] pt-5">
                    {FEATURE_NAMES.map((f) => (
                      <div key={f.key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{f.label}</span>
                        <span className={featureConfig[f.key] ? "text-teal-400 font-bold" : "text-slate-600"}>
                          {featureConfig[f.key] ? "Dahil" : "Yok"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-6">Ucretsiz deneyin</p>
            <div className="mx-auto max-w-md">
              <TrialSignupForm className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="border-t border-white/10 px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-sm font-black text-white">
              M
            </div>
            <span className="text-base font-black">MobiBase</span>
          </a>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition">Ozellikler</a>
            <a href="#pricing" className="hover:text-white transition">Paketler</a>
            <a href="/takas-hesapla" className="hover:text-white transition">Takas Hesapla</a>
            <a href="/yardim" className="hover:text-white transition">Yardim</a>
            <a href="mailto:satis@mobibase.com" className="hover:text-white transition">Iletisim</a>
          </div>
          <p className="text-[11px] text-slate-600">(c) 2026 MobiBase Cloud Technologies</p>
        </div>
      </footer>

      {/* ── Marquee keyframe ── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
