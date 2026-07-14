"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const NAV_LINKS = [
  { label: "Özellikler", href: "#features" },
  { label: "Çözüm", href: "#solution" },
  { label: "Paketler", href: "#pricing" },
];

const MARQUEE_WORDS = [
  "POS", "Teknik Servis", "Stok Yönetimi", "Faturalama", "İkinci El Alım", "Şube Kontrolü",
  "Tahsilat Takibi", "Seri No İzleme", "Cihaz Kabulü", "Kurumsal Teklif", "Buyback",
];

const PAIN_POINTS = [
  {
    title: "Excel'de kaybolan stok",
    desc: "Kaç üründen kaç adet kaldığını bulmak için sekiz farklı sekmeye bakıyorsunuz.",
    icon: "M9 12h6m-6 4h6m-7 5h8a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0012.586 2H6a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    title: "WhatsApp'ta dağılan sipariş",
    desc: "Müşteri talebi mesaj geçmişinde kayboluyor, takibi kimseye ait değil.",
    icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.463L3 21l1.51-4.036C3.552 15.606 3 13.86 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Deftere yazılan tahsilat",
    desc: "Kim ne kadar borçlu, elle tutulan notlardan takip ediliyor.",
    icon: "M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 9v1.5m9-6.5a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Kağıt fişle servis takibi",
    desc: "Cihaz hangi aşamada, teknisyen dışında kimse bilmiyor.",
    icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25",
  },
];

const BENTO_CARDS = [
  {
    span: "md:col-span-2 md:row-span-2",
    gradient: "from-blue-950 via-[#0f172a] to-slate-950",
    title: "Tek panelden tüm bayi yönetimi",
    description: "Satış, servis, stok ve tahsilat verisi aynı ekranda birleşir. Günlük karar anında ihtiyacınız olan rakam.",
    stat: "92%",
    statLabel: "Operasyonel verimlilik",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-blue-950 via-slate-900 to-slate-950",
    title: "Tamir takip",
    description: "Cihaz kabulden teslime her adım izlenir.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-emerald-600 to-blue-700",
    title: "Stok ve seri no",
    description: "Ürün, maliyet, şube ve seri numarası görünür kalır.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-amber-500 to-orange-600",
    title: "Tahsilat riski",
    description: "Veresiye ve vade takibi erken uyarı ile yönetilir.",
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-violet-900 via-slate-900 to-slate-950",
    title: "İkinci el buyback",
    description: "Alım, servis transferi ve satış tek akışta bağlanır.",
  },
];

const BEFORE_CHIPS = [
  { label: "Excel tablosu", sub: "12 farklı dosya", rotate: "md:-rotate-6 md:-translate-x-2", top: "md:top-0 md:left-4" },
  { label: "WhatsApp mesajları", sub: "Cevapsız 34 talep", rotate: "md:rotate-3 md:translate-x-6", top: "md:top-16 md:left-32" },
  { label: "Kağıt fiş yığını", sub: "Kaybolma riski", rotate: "md:-rotate-2 md:translate-x-2", top: "md:top-40 md:left-8" },
  { label: "Ayrı kasa defteri", sub: "Elle toplam", rotate: "md:rotate-6 md:translate-x-28", top: "md:top-52 md:left-36" },
];

const AFTER_STATS = [
  ["Bugünkü satış", "18 işlem", "from-blue-600 to-blue-700"],
  ["Açık servis", "46 kayıt", "from-blue-600 to-blue-700"],
  ["Stok uyarısı", "3 kritik", "from-amber-600 to-amber-700"],
  ["Bekleyen tahsilat", "7.2K TL", "from-emerald-600 to-emerald-700"],
];

const TESTIMONIALS = [
  {
    quote: "VibeGSM ile servis takibimiz tamamen değişti. Hangi cihazın hangi aşamada olduğunu anında görüyoruz.",
    name: "Ahmet K.",
    role: "Teknik Servis Müdürü, İstanbul",
    initials: "AK",
    color: "from-blue-400 to-blue-500",
  },
  {
    quote: "Stok ve seri no takibi sayesinde kayıp ürün sorunu sıfıra indi. Şubeler arası transfer artık karmaşık değil.",
    name: "Zeynep D.",
    role: "Bayi Sahibi, Ankara",
    initials: "ZD",
    color: "from-amber-400 to-orange-500",
  },
  {
    quote: "İkinci el alım sürecini tek bir ekranda yönetebilmek büyük avantaj. IMEI sorgulaması ve fiyatlandırma çok hızlı.",
    name: "Mehmet S.",
    role: "İşletme Müdürü, İzmir",
    initials: "MS",
    color: "from-indigo-400 to-blue-500",
  },
];

const PLANS = [
  { key: "Lite", subtitle: "Küçük bayi için temel kontrol" },
  { key: "Service", subtitle: "Teknik servis ağırlıklı işletmeler" },
  { key: "Pro", subtitle: "Satış, stok ve finans birlikte", badge: "Önerilen" },
  { key: "Enterprise", subtitle: "Çok şubeli bayi ve SLA ihtiyacı" },
];

const FEATURE_NAMES = [
  { key: "pos", label: "POS" },
  { key: "repairs", label: "Teknik servis" },
  { key: "stock", label: "Stok" },
  { key: "invoicing", label: "Faturalama" },
  { key: "buyback", label: "İkinci el" },
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

function TrailingIcon({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 ${
        dark ? "bg-black/10" : "bg-white/10"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </span>
  );
}

export function LandingPage({ pricing, addons }: { pricing: PricingData; addons: PricingData["addons"] }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLParagraphElement>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready?.then(refresh);
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 800);
    return () => {
      window.removeEventListener("load", refresh);
      clearTimeout(t);
    };
  }, []);

  useGSAP(() => {
    if (!heroRef.current) return;
    const h1 = heroRef.current.querySelector(".hero-heading");
    if (h1) {
      const split = SplitText.create(h1, { type: "words, chars", mask: "words", aria: "none" });
      gsap.from(split.chars, {
        opacity: 0,
        y: 20,
        rotateX: -40,
        stagger: 0.025,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.15,
      });
    }
    gsap.fromTo(
      heroRef.current.querySelectorAll(".hero-anim:not(.hero-heading)"),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.4 }
    );
  }, { scope: heroRef });

  useGSAP(() => {
    if (!bentoRef.current) return;
    const cards = bentoRef.current.querySelectorAll<HTMLElement>(".bento-card");
    cards.forEach((card, i) => {
      gsap.from(card, {
        opacity: 0,
        y: 60,
        scale: 0.95,
        filter: "blur(10px)",
        duration: 0.8,
        delay: i * 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 90%",
        },
      });
    });
  }, { scope: bentoRef });

  useGSAP(() => {
    if (!workflowRef.current) return;
    const blocks = workflowRef.current.querySelectorAll(".scale-block");
    blocks.forEach((block) => {
      gsap.fromTo(
        block,
        { scale: 0.9, opacity: 0.15, filter: "blur(12px)" },
        {
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
          scrollTrigger: {
            trigger: block,
            start: "top 85%",
            end: "top 45%",
            scrub: 1.2,
          },
        }
      );
    });
    const chips = workflowRef.current.querySelectorAll(".before-chip");
    gsap.from(chips, {
      opacity: 0,
      y: 24,
      stagger: 0.08,
      duration: 0.6,
      ease: "power3.out",
      scrollTrigger: { trigger: workflowRef.current, start: "top 75%" },
    });
  }, { scope: workflowRef });

  useGSAP(() => {
    if (!textRevealRef.current) return;
    const split = SplitText.create(textRevealRef.current, { type: "words", aria: "none" });
    gsap.from(split.words, {
      opacity: 0.08,
      stagger: 1,
      scrollTrigger: {
        trigger: textRevealRef.current,
        start: "top 70%",
        end: "bottom 30%",
        scrub: 1,
      },
    });
  }, { scope: textRevealRef });

  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>(".reveal");
    els.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 44, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        }
      );
    });
  }, []);

  return (
    <main className="relative overflow-x-hidden w-full max-w-full bg-[#030712] text-white" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute top-[60vh] right-0 h-[480px] w-[480px] rounded-full bg-violet-600/[0.07] blur-[140px]" />
        <div className="absolute top-[120vh] left-0 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.05] blur-[140px]" />
      </div>

      <nav className={`fixed inset-x-0 top-0 z-[60] transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-6 py-3 transition-all duration-500 ${
          scrolled
            ? "border-white/[0.08] bg-white/[0.04] backdrop-blur-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "border-transparent bg-transparent"
        }`}>
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/25">V</div>
            <span className="text-base font-black tracking-tight">VibeGSM</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-[13px] font-medium text-slate-300 transition hover:text-white">{link.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:inline-block rounded-full bg-white/10 px-5 py-2 text-[13px] font-bold text-white transition hover:bg-white/20 border border-white/10">Giriş</a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menü"
              aria-expanded={menuOpen}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 md:hidden"
            >
              <span className="relative block h-3.5 w-4">
                <span className={`absolute left-0 top-0 h-[1.5px] w-4 bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? "top-[6px] rotate-45" : ""}`} />
                <span className={`absolute left-0 bottom-0 h-[1.5px] w-4 bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? "bottom-[6px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/85 backdrop-blur-3xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {[...NAV_LINKS, { label: "Giriş", href: "/login" }].map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{ transitionDelay: menuOpen ? `${100 + i * 70}ms` : "0ms" }}
            className={`px-6 py-3 text-2xl font-black tracking-tight text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>

      <section ref={heroRef} className="relative z-10 flex min-h-[100dvh] items-center px-5 pb-20 pt-32 md:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
            <div>
              <div className="hero-anim mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Telefon bayileri için operasyon sistemi</span>
              </div>
              <h1 className="hero-heading hero-anim max-w-2xl text-[clamp(2.8rem,5.5vw,5.2rem)] font-black leading-[0.95] tracking-[-0.04em] text-white">
                Excel ve WhatsApp<br />karmaşasını tek bayi<br />sisteminde bitirin
              </h1>
              <p className="hero-anim mt-8 max-w-lg text-[17px] leading-relaxed text-slate-400">
                VibeGSM; satış, teknik servis, stok, ikinci el ve tahsilatı aynı akışta toplayan telefon bayi otomasyonudur.
              </p>
              <div className="hero-anim mt-10 flex flex-wrap gap-4">
                <a href="#pricing" className="group inline-flex items-center gap-3 rounded-full bg-white pl-8 pr-2 py-2 text-sm font-black text-[#030712] shadow-lg shadow-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-white/15 active:scale-[0.98]">
                  Paketleri Gör
                  <TrailingIcon dark />
                </a>
                <a href="#iletisim" className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:border-white/30 active:scale-[0.98]">Bize Ulaşın</a>
              </div>
            </div>

            <div className="hero-anim relative hidden md:block">
              <div className="absolute -top-6 -right-6 z-20 -rotate-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
                <div className="flex items-center gap-2 rounded-[1.1rem] bg-[#050914] px-4 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Canlı veri akışı</span>
                </div>
              </div>
              <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/40">
                <div className="relative overflow-hidden rounded-[2.125rem] bg-gradient-to-br from-[#0f172a] to-[#020617] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-center" style={{ minHeight: "500px" }}>
                    <div className="grid grid-cols-2 gap-2 p-6 w-full">
                      {AFTER_STATS.map(([label, val, grad]) => (
                        <div key={label} className={`rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]`}>
                          <p className="text-[10px] font-bold text-white/70">{label}</p>
                          <p className="mt-1 text-lg font-black text-white">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-300">Bayi Durumu</span>
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-black text-blue-300">Canlı</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="reveal text-xs font-black uppercase tracking-[0.2em] text-slate-500">Bugünkü durum tanıdık geliyor mu?</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="reveal rounded-[1.75rem] border border-dashed border-white/[0.09] bg-white/[0.015] p-1.5">
                <div className="flex h-full flex-col rounded-[1.375rem] bg-white/[0.015] p-5">
                  <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                  <h3 className="mt-4 text-[15px] font-bold leading-tight text-slate-300">{p.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" ref={bentoRef} className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Özellikler</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white">
              Bayi operasyonunuzu tek<br /><span className="text-slate-500">kontrol panelinde toplayın</span>
            </h2>
          </div>
          <div className="mt-14 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 md:grid-flow-dense">
            {BENTO_CARDS.map((card, i) => (
              <div key={i} className={`bento-card group relative rounded-[1.9rem] border border-white/[0.07] bg-white/[0.03] p-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/15 hover:-translate-y-1 ${card.span}`}>
                <div className={`relative h-full overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${card.gradient || "from-slate-900 to-slate-950"} shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-6">
                    {card.stat ? <span className="text-5xl font-black tracking-tight">{card.stat}</span> : null}
                    <h3 className="mt-2 text-lg font-black leading-tight">{card.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{card.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solution" ref={workflowRef} className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="reveal md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Çözüm</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white">
              Dağılan kayıtlar<br /><span className="text-slate-500">tek kontrollü akışa dönüşür</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="scale-block rounded-[2.25rem] border border-white/[0.07] bg-white/[0.02] p-6 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Önce</p>
              <div className="relative mt-6 md:h-[340px]">
                <div className="flex flex-col gap-3 md:block">
                  {BEFORE_CHIPS.map((chip) => (
                    <div
                      key={chip.label}
                      className={`before-chip w-full rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-4 md:absolute md:w-56 ${chip.rotate} ${chip.top}`}
                    >
                      <p className="text-sm font-bold text-slate-400">{chip.label}</p>
                      <p className="mt-1 text-xs text-slate-600">{chip.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="scale-block rounded-[2.25rem] border border-blue-500/15 bg-blue-500/[0.03] p-1.5">
              <div className="rounded-[1.875rem] bg-gradient-to-br from-[#0f172a] to-[#020617] p-6 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Sonra</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {AFTER_STATS.map(([label, val, grad]) => (
                    <div key={label} className={`rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]`}>
                      <p className="text-[10px] font-bold text-white/70">{label}</p>
                      <p className="mt-1 text-lg font-black text-white">{val}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-relaxed text-slate-400">Tüm modüller tek panelde çalışır: POS, servis, stok, finans ve ikinci el aynı sistemde birleşir.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p ref={textRevealRef} className="text-[clamp(1.8rem,3.5vw,3rem)] font-black leading-[1.15] tracking-[-0.03em] text-white md:pl-8 md:border-l md:border-white/10">
            Dağınık kayıt değil yönetilebilir akış. Amaç sadece veri girmek değil bayi sahibine karar vereceği temiz tabloyu vermek.
          </p>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden border-y border-white/10 py-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#030712] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#030712] to-transparent" />
        <div className="flex animate-[marquee_30s_linear_infinite] gap-12 whitespace-nowrap">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="text-[13px] font-bold uppercase tracking-[0.15em] text-slate-500">{word}</span>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-32 md:py-44">
        <div className="reveal mx-auto max-w-3xl px-5 md:px-8">
          <div className="rounded-[2.5rem] border border-white/[0.07] bg-white/[0.02] p-1.5">
            <div className="rounded-[2.125rem] bg-white/[0.015] px-6 py-14 text-center md:px-14">
              <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${TESTIMONIALS[testimonialIndex].color} border-2 border-white/20 text-lg font-black text-white`}>
                {TESTIMONIALS[testimonialIndex].initials}
              </div>
              <blockquote className="mt-6 text-xl font-medium leading-relaxed text-slate-300 md:text-2xl">&ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;</blockquote>
              <p className="mt-4 text-sm font-bold text-white">{TESTIMONIALS[testimonialIndex].name}</p>
              <p className="text-xs text-slate-500">{TESTIMONIALS[testimonialIndex].role}</p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button onClick={() => setTestimonialIndex((prev) => prev === 0 ? TESTIMONIALS.length - 1 : prev - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10" aria-label="Önceki">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div className="flex gap-2">
                  {TESTIMONIALS.map((_, i) => (
                    <button key={i} onClick={() => setTestimonialIndex(i)} className={`h-2 rounded-full transition-all ${i === testimonialIndex ? "w-8 bg-blue-400" : "w-2 bg-white/20"}`} aria-label={`Testimonial ${i + 1}`} />
                  ))}
                </div>
                <button onClick={() => setTestimonialIndex((prev) => prev === TESTIMONIALS.length - 1 ? 0 : prev + 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10" aria-label="Sonraki">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <div className="reveal md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Paketler</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-white">Bayi ölçeğine göre başlayın</h2>
            <p className="mt-3 text-sm text-slate-500">Tüm fiyatlar aylıktır. Yıllık ödemede %{addons.annualDiscountPct} indirim uygulanır.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
            {PLANS.map((plan) => {
              const featureConfig = (pricing.features as any)?.[plan.key] || {};
              const amount = Number((pricing as any)[plan.key] || 0);
              const highlighted = Boolean(plan.badge);
              return (
                <article key={plan.key} className={`reveal group rounded-[2.25rem] border p-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${
                  highlighted ? "border-blue-500/25 bg-blue-500/[0.05] shadow-[0_20px_60px_-20px_rgba(59,130,246,0.35)]" : "border-white/[0.07] bg-white/[0.015] hover:border-white/15"
                }`}>
                  <div className="rounded-[1.875rem] p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div><h3 className="text-2xl font-black">{plan.key}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{plan.subtitle}</p></div>
                      {plan.badge ? <span className="shrink-0 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-black uppercase text-blue-300">{plan.badge}</span> : null}
                    </div>
                    <p className="mt-6 text-4xl font-black tracking-tight">{amount.toLocaleString("tr-TR")} <span className="text-base font-medium text-slate-500">TL / ay</span></p>
                    <div className="mt-6 space-y-2.5 border-t border-white/[0.08] pt-5">
                      {FEATURE_NAMES.map((f) => (
                        <div key={f.key} className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">{f.label}</span>
                          <span className={featureConfig[f.key] ? "text-blue-400 font-bold" : "text-slate-600"}>{featureConfig[f.key] ? "Dahil" : "Yok"}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`mailto:satis@vibegsm.com?subject=VibeGSM%20${encodeURIComponent(plan.key)}%20Paket%20Talebi`}
                      className="group/cta mt-7 inline-flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.03] pl-5 pr-2 py-2 text-[13px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      {plan.key} paketini tercih et
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-1 group-hover/cta:-translate-y-[1px]">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="iletisim" className="relative z-10 py-32 md:py-44">
        <div className="reveal mx-auto max-w-4xl px-5 md:px-8">
          <div className="rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-br from-blue-500/[0.06] via-white/[0.02] to-transparent p-1.5">
            <div className="rounded-[2.125rem] px-6 py-16 text-center md:px-16 md:py-20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Sonraki adım</p>
              <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-[-0.03em] text-white">
                Bayinizi VibeGSM&apos;e taşımaya hazır mısınız?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400">
                Ekibimiz geçiş planınızı sizinle birlikte çıkarır. Mevcut Excel, WhatsApp ve defter kayıtlarınız kaybolmadan VibeGSM&apos;e aktarılır.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="mailto:satis@vibegsm.com?subject=VibeGSM%20Demo%20Talebi"
                  className="group inline-flex items-center gap-3 rounded-full bg-white pl-8 pr-2 py-2 text-sm font-black text-[#030712] shadow-lg shadow-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-white/15 active:scale-[0.98]"
                >
                  Demo Talep Et
                  <TrailingIcon dark />
                </a>
                <a href="tel:+902120000000" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:border-white/30 active:scale-[0.98]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  Hemen Ara
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-black text-white">V</div>
            <span className="text-base font-black">VibeGSM</span>
          </a>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition">Özellikler</a>
            <a href="#pricing" className="hover:text-white transition">Paketler</a>
            <a href="/yardim" className="hover:text-white transition">Yardım</a>
            <a href="mailto:satis@vibegsm.com" className="hover:text-white transition">İletişim</a>
          </div>
          <p className="text-[11px] text-slate-600">(c) 2026 VibeGSM Cloud Technologies</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
      `}</style>
    </main>
  );
}
