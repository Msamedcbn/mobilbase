"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const WHATSAPP_NUMBER = "905454403452";
const WHATSAPP_MESSAGE = "Merhaba, VibeGSM hakkında bilgi almak istiyorum. Bayimiz için demo talep edebilir miyim?";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const PROMO_DEADLINE = new Date("2026-08-31T23:59:59+03:00").getTime();

function useCountdown(deadline: number) {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });
  useEffect(() => {
    const tick = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setLeft({ d: 0, h: 0, m: 0, s: 0, done: true });
        return;
      }
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return left;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const NAV_LINKS = [
  { label: "Özellikler", href: "#features" },
  { label: "Çözüm", href: "#solution" },
  { label: "Paketler", href: "#pricing" },
  { label: "Blog", href: "/blog" },
];

const MARQUEE_WORDS = [
  "POS", "Teknik Servis", "Stok Yönetimi", "Faturalama", "İkinci El Alım", "Şube Kontrolü",
  "Tahsilat Takibi", "Seri No İzleme", "Cihaz Kabulü", "Kurumsal Teklif", "Buyback",
];

const HERO_CHECKS = [
  "IMEI bazlı stok takibi",
  "Tek panelden POS, servis, stok, tahsilat",
  "Çoklu şube desteği",
  "Türkçe, yerli destek",
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

function BentoStatRow({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2">
      <span className="text-[11px] font-bold text-white/70">{label}</span>
      <span className={`text-[11px] font-black ${toneClass}`}>{value}</span>
    </div>
  );
}

const BENTO_CARDS = [
  {
    span: "md:col-span-2 md:row-span-2",
    gradient: "from-blue-950 via-[#0f172a] to-slate-950",
    title: "Tek panelden tüm bayi yönetimi",
    description: "Satış, servis, stok ve tahsilat verisi aynı ekranda birleşir. Günlük karar anında ihtiyacınız olan rakam.",
    stat: "92%",
    statLabel: "Operasyonel verimlilik",
    visual: (
      <div className="flex flex-col gap-1.5">
        <BentoStatRow label="POS" value="Aktif" tone="good" />
        <BentoStatRow label="Stok" value="128 ürün" />
        <BentoStatRow label="Açık Servis" value="12" tone="warn" />
      </div>
    ),
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-blue-950 via-slate-900 to-slate-950",
    title: "Tamir takip",
    description: "Cihaz kabulden teslime her adım izlenir.",
    visual: (
      <div className="flex items-center gap-1">
        {["Kabul", "Onarım", "Hazır"].map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <div className="flex items-center gap-1 rounded-full bg-white/10 py-1 pl-1 pr-2">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black ${i === 1 ? "bg-white text-slate-900" : "bg-white/20 text-white/60"}`}>{i + 1}</span>
              <span className={`text-[9px] font-bold ${i === 1 ? "text-white" : "text-white/50"}`}>{step}</span>
            </div>
            {i < 2 && <span className="h-px w-2 bg-white/20" />}
          </div>
        ))}
      </div>
    ),
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-emerald-600 to-blue-700",
    title: "Stok ve seri no",
    description: "Ürün, maliyet, şube ve seri numarası görünür kalır.",
    visual: (
      <div className="rounded-xl bg-white/10 px-3 py-2">
        <p className="text-[11px] font-black text-white">iPhone 14 Pro</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[9px] font-mono text-white/60">IMEI •••220</span>
          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black text-emerald-100">Stokta</span>
        </div>
      </div>
    ),
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-amber-500 to-orange-600",
    title: "Tahsilat riski",
    description: "Veresiye ve vade takibi erken uyarı ile yönetilir.",
    visual: (
      <div>
        <div className="flex items-center justify-between text-[10px] font-bold text-white/80">
          <span>Vadesi geçen</span>
          <span className="text-white">2.400 TL</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/20">
          <div className="h-1.5 w-2/3 rounded-full bg-white" />
        </div>
      </div>
    ),
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-violet-900 via-slate-900 to-slate-950",
    title: "İkinci el buyback",
    description: "Alım, servis transferi ve satış tek akışta bağlanır.",
    visual: (
      <div className="rounded-xl bg-white/10 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-white">iPhone 12 · 128GB</p>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black text-white/80">İyi</span>
        </div>
        <p className="mt-1 text-[10px] font-bold text-white/70">Teklif: 8.200 TL</p>
      </div>
    ),
  },
  {
    span: "md:col-span-1 md:row-span-1",
    gradient: "from-rose-500 to-pink-600",
    title: "Çoklu şube yönetimi",
    description: "Her şubenin stoğu ve kasası ayrı, merkezi görünüm tek ekranda.",
    visual: (
      <div className="flex flex-col gap-1.5">
        <BentoStatRow label="Kadıköy" value="42 ürün" />
        <BentoStatRow label="Bakırköy" value="31 ürün" />
      </div>
    ),
  },
];

const BEFORE_CHIPS = [
  { label: "Excel tablosu", sub: "12 farklı dosya", rotate: "md:-rotate-6 md:-translate-x-2", top: "md:top-0 md:left-4" },
  { label: "WhatsApp mesajları", sub: "Cevapsız 34 talep", rotate: "md:rotate-3 md:translate-x-6", top: "md:top-16 md:left-32" },
  { label: "Kağıt fiş yığını", sub: "Kaybolma riski", rotate: "md:-rotate-2 md:translate-x-2", top: "md:top-40 md:left-8" },
  { label: "Ayrı kasa defteri", sub: "Elle toplam", rotate: "md:rotate-6 md:translate-x-28", top: "md:top-52 md:left-36" },
];

const AFTER_STATS = [
  ["Bugünkü satış", "18 işlem", "from-blue-500 to-blue-600"],
  ["Açık servis", "46 kayıt", "from-blue-500 to-blue-600"],
  ["Stok uyarısı", "3 kritik", "from-amber-500 to-amber-600"],
  ["Bekleyen tahsilat", "7.2K TL", "from-emerald-500 to-emerald-600"],
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

const ONBOARDING_STEPS = [
  {
    no: "01",
    title: "Kayıt Olun",
    desc: "Bayinize uygun paketi seçin, hesabınızı birkaç dakikada oluşturun.",
  },
  {
    no: "02",
    title: "Verilerinizi Aktarın",
    desc: "Ekibimiz mevcut Excel, WhatsApp ve defter kayıtlarınızı sizinle birlikte VibeGSM'e taşır.",
  },
  {
    no: "03",
    title: "Satışa Başlayın",
    desc: "Aynı gün POS, stok ve servis takibini kullanmaya başlayın, ekstra donanım gerekmez.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Verilerim güvende mi?",
    a: "Tüm verileriniz bulutta, düzenli yedeklemelerle saklanır. Müşteri, stok ve satış kayıtlarınız yalnızca sizin ve yetkilendirdiğiniz personelin erişimine açıktır.",
  },
  {
    q: "Excel ve WhatsApp'tan geçiş ne kadar sürer?",
    a: "Ekibimiz geçiş planını sizinle birlikte çıkarır. Mevcut stok, müşteri ve cari kayıtlarınız kaybolmadan sisteme aktarılır; çoğu bayi aynı hafta içinde satışa başlar.",
  },
  {
    q: "Mevcut müşteri ve stok verilerimi kaybeder miyim?",
    a: "Hayır. Aktarım sürecinde hiçbir kayıt silinmez; Excel dosyalarınız ve mevcut listeleriniz sistemde karşılığını bulacak şekilde işlenir.",
  },
  {
    q: "Birden fazla şubem var, hepsini tek yerden yönetebilir miyim?",
    a: "Evet. Her şubenin stoğu ve kasası ayrı takip edilirken, tüm şubelerin verisini tek panelden görebilirsiniz.",
  },
  {
    q: "Sözleşme süresi var mı, istediğim zaman iptal edebilir miyim?",
    a: "Paketler aylık faturalandırılır, uzun vadeli bir taahhüt yoktur. Yıllık ödemede ayrıca indirim uygulanır.",
  },
  {
    q: "Kurulum için teknik bilgim veya özel donanım gerekiyor mu?",
    a: "Hayır. VibeGSM tarayıcı üzerinden çalışan bulut tabanlı bir sistemdir; ekstra sunucu veya kurulum gerektirmez.",
  },
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

function TrailingIcon() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
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
  const [showPromo, setShowPromo] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const countdown = useCountdown(PROMO_DEADLINE);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || showPromo ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, showPromo]);

  useEffect(() => {
    if (sessionStorage.getItem("vibegsm_promo_seen")) return;
    const t = setTimeout(() => setShowPromo(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const closePromo = () => {
    setShowPromo(false);
    sessionStorage.setItem("vibegsm_promo_seen", "1");
  };

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
      opacity: 0.15,
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
    <main className="relative overflow-x-hidden w-full max-w-full bg-[#fbfcfe] text-slate-900" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-blue-500/[0.08] blur-[140px]" />
        <div className="absolute top-[60vh] right-0 h-[480px] w-[480px] rounded-full bg-violet-500/[0.06] blur-[140px]" />
        <div className="absolute top-[120vh] left-0 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.05] blur-[140px]" />
      </div>

      <div className="fixed inset-x-0 top-0 z-[60]">
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 px-4 py-2.5 text-center">
          <span className="text-[12.5px] font-black leading-tight text-white md:text-sm">
            🔥 İlk 20 şubeye özel: Yıllık sadece <span className="underline decoration-2 underline-offset-2">12.000 TL</span> — %50 indirim!
          </span>
          {!countdown.done && (
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-black tabular-nums text-white sm:inline-flex">
              ⏳ {countdown.d}g {pad(countdown.h)}s {pad(countdown.m)}dk
            </span>
          )}
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-orange-600 transition hover:bg-orange-50 sm:inline-flex"
          >
            Hemen Yakala →
          </a>
        </div>

        <div className={`overflow-hidden border-b border-slate-200 bg-white transition-all duration-500 ${scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}>
          <div className="mx-auto hidden max-w-6xl items-center justify-end gap-6 px-8 py-2.5 text-[12px] font-semibold text-slate-500 md:flex">
            <a href="mailto:satis@vibegsm.com" className="flex items-center gap-1.5 transition hover:text-slate-900">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              satis@vibegsm.com
            </a>
            <a href="tel:+905454403452" className="flex items-center gap-1.5 transition hover:text-slate-900">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              +90 545 440 34 52
            </a>
            <a href="mailto:satis@vibegsm.com?subject=VibeGSM%20-%20Sizi%20Arayalım" className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 font-black text-blue-600 transition hover:bg-blue-100">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M12 12h.008v.008H12V12z" /></svg>
              Sizi Arayalım
            </a>
          </div>
        </div>

        <nav className={`transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}>
          <div className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-6 py-3 transition-all duration-500 ${
            scrolled
              ? "border-slate-200 bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_-15px_rgba(15,23,42,0.15)]"
              : "border-transparent bg-transparent"
          }`}>
            <a href="/" className="flex items-center gap-2.5">
              <img src="/icon-square.png" alt="VibeGSM" className="h-9 w-9 rounded-xl shadow-lg shadow-blue-500/20 object-cover" />
              <span className="text-base font-black tracking-tight text-slate-900">VibeGSM</span>
            </a>
            <div className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="text-[13px] font-semibold text-slate-600 transition hover:text-slate-900">{link.label}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <a href="/login" className="hidden sm:inline-block rounded-full bg-slate-100 px-5 py-2 text-[13px] font-bold text-slate-800 transition hover:bg-slate-200 border border-slate-200">Giriş</a>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menü"
                aria-expanded={menuOpen}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 md:hidden"
              >
                <span className="relative block h-3.5 w-4">
                  <span className={`absolute left-0 top-0 h-[1.5px] w-4 bg-slate-900 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? "top-[6px] rotate-45" : ""}`} />
                  <span className={`absolute left-0 bottom-0 h-[1.5px] w-4 bg-slate-900 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? "bottom-[6px] -rotate-45" : ""}`} />
                </span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-white/95 backdrop-blur-2xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {[...NAV_LINKS, { label: "Giriş", href: "/login" }].map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{ transitionDelay: menuOpen ? `${100 + i * 70}ms` : "0ms" }}
            className={`px-6 py-3 text-2xl font-black tracking-tight text-slate-900 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div
        className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-5 transition-opacity duration-300 ${
          showPromo ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closePromo}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl transition-all duration-300 ${
            showPromo ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-orange-500 px-7 pt-7 pb-14 text-center">
            <button
              onClick={closePromo}
              aria-label="Kapat"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/80">Sınırlı Fırsat</span>
            <h3 className="mt-2 text-2xl font-black leading-tight text-white">İlk 20 Şubeye Özel<br />%50 İndirim</h3>
          </div>
          <div className="relative -mt-8 rounded-t-[2rem] bg-white px-7 pb-7 pt-6 text-center">
            <p className="text-3xl font-black text-slate-900">
              12.000 <span className="text-base font-bold text-slate-400">TL / yıl</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              İlk 20 şube için yıllık abonelikte %50 indirim uygulanır. Kontenjan dolmadan yerinizi ayırtın.
            </p>

            {!countdown.done ? (
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">Kampanya bitimine kalan süre</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  {[
                    { v: countdown.d, l: "Gün" },
                    { v: countdown.h, l: "Saat" },
                    { v: countdown.m, l: "Dk" },
                    { v: countdown.s, l: "Sn" },
                  ].map((unit) => (
                    <div key={unit.l} className="flex w-14 flex-col items-center rounded-xl bg-slate-100 py-2">
                      <span className="text-lg font-black tabular-nums text-slate-900">{pad(unit.v)}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400">{unit.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm font-black text-orange-600">Kampanya sona erdi</p>
            )}
            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closePromo}
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-105"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.55-3.7 8.21-8.26 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" /></svg>
                WhatsApp&apos;tan Yaz
              </a>
              <a
                href="#pricing"
                onClick={closePromo}
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Paketleri İncele
              </a>
            </div>
          </div>
        </div>
      </div>

      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp'tan yazın"
        className="group fixed bottom-20 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
        <svg className="relative h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.55-3.7 8.21-8.26 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" /></svg>
      </a>

      <div
        className={`fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-10px_30px_-15px_rgba(15,23,42,0.15)] transition-transform duration-500 md:hidden ${
          scrolled ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <a
            href="mailto:satis@vibegsm.com?subject=VibeGSM%20Demo%20Talebi"
            className="flex flex-1 items-center justify-center rounded-full bg-blue-600 py-3 text-sm font-black text-white shadow-md shadow-blue-600/25"
          >
            Demo Talep Et
          </a>
          <a
            href="tel:+905454403452"
            aria-label="Hemen Ara"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
          >
            <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
          </a>
        </div>
      </div>

      <section ref={heroRef} className="relative z-10 flex min-h-[100dvh] items-center px-5 pb-20 pt-48 md:px-8 md:pt-52">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
            <div>
              <div className="hero-anim mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-700">Telefon Bayii Yazılımı · Teknik Servis Otomasyonu · Stok &amp; POS</span>
              </div>
              <h1 className="hero-heading hero-anim max-w-2xl text-[clamp(2.6rem,5.2vw,4.8rem)] font-black leading-[0.98] tracking-[-0.04em] text-slate-900">
                Excel ve WhatsApp karmaşasını <span className="text-blue-600">tek sistemde</span> bitirin
              </h1>
              <p className="hero-anim mt-8 max-w-lg text-[17px] leading-relaxed text-slate-600">
                VibeGSM; satış, teknik servis, stok, ikinci el ve tahsilatı aynı akışta toplayan telefon bayi otomasyonudur.
              </p>

              <div className="hero-anim mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2.5">
                {HERO_CHECKS.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {item}
                  </div>
                ))}
              </div>

              <div className="hero-anim mt-10 flex flex-wrap gap-4">
                <a href="#pricing" className="group inline-flex items-center gap-3 rounded-full bg-blue-600 pl-8 pr-2 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]">
                  Paketleri Gör
                  <TrailingIcon />
                </a>
                <a href="#iletisim" className="rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]">Bize Ulaşın</a>
              </div>
            </div>

            <div className="hero-anim relative hidden md:block">
              <div className="absolute -top-7 -right-6 z-20 -rotate-3 rounded-[1.4rem] border border-slate-200 bg-white p-1.5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)]">
                <div className="flex items-center gap-2 rounded-[1.1rem] bg-slate-50 px-4 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Kritik Stok Uyarısı</span>
                </div>
              </div>

              <div className="rounded-[2.5rem] border border-slate-200 bg-white p-2 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)]">
                <div className="relative overflow-hidden rounded-[2.125rem] bg-slate-50">
                  <div className="flex items-center justify-center" style={{ minHeight: "460px" }}>
                    <div className="grid grid-cols-2 gap-2.5 p-6 w-full">
                      {AFTER_STATS.map(([label, val, grad]) => (
                        <div key={label} className={`rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`}>
                          <p className="text-[10px] font-bold text-white/80">{label}</p>
                          <p className="mt-1 text-lg font-black text-white">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Bayi Durumu</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-600">Canlı</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-8 z-20 rotate-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <div>
                    <p className="text-[11px] font-black text-slate-800">Tamir Hazır — #1182</p>
                    <p className="text-[10px] text-slate-500">Müşteriye bildirim gönderildi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="reveal text-xs font-black uppercase tracking-[0.2em] text-slate-400">Bugünkü durum tanıdık geliyor mu?</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="reveal rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-1.5">
                <div className="flex h-full flex-col rounded-[1.375rem] bg-slate-50/60 p-5">
                  <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                  <h3 className="mt-4 text-[15px] font-bold leading-tight text-slate-800">{p.title}</h3>
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Özellikler</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
              Bayi operasyonunuzu tek<br /><span className="text-slate-400">kontrol panelinde toplayın</span>
            </h2>
          </div>
          <div className="mt-14 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 md:grid-flow-dense">
            {BENTO_CARDS.map((card, i) => (
              <div key={i} className={`bento-card group relative rounded-[1.9rem] border border-slate-200 bg-white p-1.5 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-1 ${card.span}`}>
                <div className={`relative h-full overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${card.gradient || "from-slate-900 to-slate-950"} shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative flex h-full flex-col justify-between gap-4 p-6">
                    <div>{card.visual}</div>
                    <div>
                      {card.stat ? <span className="text-5xl font-black tracking-tight text-white">{card.stat}</span> : null}
                      <h3 className="mt-2 text-lg font-black leading-tight text-white">{card.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{card.description}</p>
                    </div>
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Çözüm</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
              Dağılan kayıtlar<br /><span className="text-slate-400">tek kontrollü akışa dönüşür</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="scale-block rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Önce</p>
              <div className="relative mt-6 md:h-[340px]">
                <div className="flex flex-col gap-3 md:block">
                  {BEFORE_CHIPS.map((chip) => (
                    <div
                      key={chip.label}
                      className={`before-chip w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 md:absolute md:w-56 ${chip.rotate} ${chip.top}`}
                    >
                      <p className="text-sm font-bold text-slate-600">{chip.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{chip.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="scale-block rounded-[2.25rem] border border-blue-100 bg-blue-50/40 p-1.5">
              <div className="rounded-[1.875rem] bg-white p-6 md:p-8 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Sonra</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {AFTER_STATS.map(([label, val, grad]) => (
                    <div key={label} className={`rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}>
                      <p className="text-[10px] font-bold text-white/80">{label}</p>
                      <p className="mt-1 text-lg font-black text-white">{val}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-relaxed text-slate-600">Tüm modüller tek panelde çalışır: POS, servis, stok, finans ve ikinci el aynı sistemde birleşir.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p ref={textRevealRef} className="text-[clamp(1.8rem,3.5vw,3rem)] font-black leading-[1.15] tracking-[-0.03em] text-slate-900 md:pl-8 md:border-l md:border-slate-200">
            Dağınık kayıt değil yönetilebilir akış. Amaç sadece veri girmek değil bayi sahibine karar vereceği temiz tabloyu vermek.
          </p>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden border-y border-slate-200 bg-white py-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
        <div className="flex animate-[marquee_30s_linear_infinite] gap-12 whitespace-nowrap">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="text-[13px] font-bold uppercase tracking-[0.15em] text-slate-400">{word}</span>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-32 md:py-44">
        <div className="reveal mx-auto max-w-3xl px-5 md:px-8">
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="rounded-[2.125rem] bg-slate-50/60 px-6 py-14 text-center md:px-14">
              <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${TESTIMONIALS[testimonialIndex].color} border-2 border-white shadow-md text-lg font-black text-white`}>
                {TESTIMONIALS[testimonialIndex].initials}
              </div>
              <blockquote className="mt-6 text-xl font-medium leading-relaxed text-slate-700 md:text-2xl">&ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;</blockquote>
              <p className="mt-4 text-sm font-bold text-slate-900">{TESTIMONIALS[testimonialIndex].name}</p>
              <p className="text-xs text-slate-500">{TESTIMONIALS[testimonialIndex].role}</p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button onClick={() => setTestimonialIndex((prev) => prev === 0 ? TESTIMONIALS.length - 1 : prev - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Önceki">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div className="flex gap-2">
                  {TESTIMONIALS.map((_, i) => (
                    <button key={i} onClick={() => setTestimonialIndex(i)} className={`h-2 rounded-full transition-all ${i === testimonialIndex ? "w-8 bg-blue-600" : "w-2 bg-slate-200"}`} aria-label={`Testimonial ${i + 1}`} />
                  ))}
                </div>
                <button onClick={() => setTestimonialIndex((prev) => prev === TESTIMONIALS.length - 1 ? 0 : prev + 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Sonraki">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="reveal text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Nasıl başlanır</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
              3 adımda VibeGSM&apos;e geçin
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {ONBOARDING_STEPS.map((step, i) => (
              <div key={step.no} className="reveal relative rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="text-4xl font-black text-slate-100">{step.no}</span>
                <h3 className="mt-3 text-lg font-black text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                {i < ONBOARDING_STEPS.length - 1 && (
                  <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-300 md:flex">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <div className="reveal md:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Paketler</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">Bayi ölçeğine göre başlayın</h2>
            <p className="mt-3 text-sm text-slate-500">Tüm fiyatlar aylıktır. Yıllık ödemede %{addons.annualDiscountPct} indirim uygulanır.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
            {PLANS.map((plan) => {
              const featureConfig = (pricing.features as any)?.[plan.key] || {};
              const amount = Number((pricing as any)[plan.key] || 0);
              const highlighted = Boolean(plan.badge);
              return (
                <article key={plan.key} className={`reveal group rounded-[2.25rem] border p-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${
                  highlighted ? "border-blue-200 bg-blue-50/50 shadow-[0_20px_60px_-25px_rgba(59,130,246,0.35)]" : "border-slate-200 bg-white shadow-sm hover:shadow-md"
                }`}>
                  <div className="rounded-[1.875rem] p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div><h3 className="text-2xl font-black text-slate-900">{plan.key}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{plan.subtitle}</p></div>
                      {plan.badge ? <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase text-white">{plan.badge}</span> : null}
                    </div>
                    <p className="mt-6 text-4xl font-black tracking-tight text-slate-900">{amount.toLocaleString("tr-TR")} <span className="text-base font-medium text-slate-400">TL / ay</span></p>
                    <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
                      {FEATURE_NAMES.map((f) => (
                        <div key={f.key} className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{f.label}</span>
                          <span className={featureConfig[f.key] ? "text-blue-600 font-bold" : "text-slate-400"}>{featureConfig[f.key] ? "Dahil" : "Yok"}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`mailto:satis@vibegsm.com?subject=VibeGSM%20${encodeURIComponent(plan.key)}%20Paket%20Talebi`}
                      className="group/cta mt-7 inline-flex w-full items-center justify-between rounded-full border border-slate-200 bg-slate-50 pl-5 pr-2 py-2 text-[13px] font-bold text-slate-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-slate-300 hover:bg-slate-100"
                    >
                      {plan.key} paketini tercih et
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-1 group-hover/cta:-translate-y-[1px]">
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

      <section className="relative z-10 py-32 md:py-44">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <div className="reveal md:text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Sık Sorulan Sorular</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
              Aklınıza takılanlar
            </h2>
          </div>

          <div className="reveal mt-12 flex flex-col gap-3">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15px] font-bold text-slate-900">{item.q}</span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="iletisim" className="relative z-10 py-32 md:py-44">
        <div className="reveal mx-auto max-w-4xl px-5 md:px-8">
          <div className="rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-1.5 shadow-sm">
            <div className="rounded-[2.125rem] px-6 py-16 text-center md:px-16 md:py-20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Sonraki adım</p>
              <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] font-black leading-[1.08] tracking-[-0.03em] text-slate-900">
                Bayinizi VibeGSM&apos;e taşımaya hazır mısınız?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
                Ekibimiz geçiş planınızı sizinle birlikte çıkarır. Mevcut Excel, WhatsApp ve defter kayıtlarınız kaybolmadan VibeGSM&apos;e aktarılır.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="mailto:satis@vibegsm.com?subject=VibeGSM%20Demo%20Talebi"
                  className="group inline-flex items-center gap-3 rounded-full bg-blue-600 pl-8 pr-2 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
                >
                  Demo Talep Et
                  <TrailingIcon />
                </a>
                <a href="tel:+905454403452" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  Hemen Ara
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200 bg-white px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon-square.png" alt="VibeGSM" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-base font-black text-slate-900">VibeGSM</span>
          </a>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition">Özellikler</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Paketler</a>
            <a href="/blog" className="hover:text-slate-900 transition">Blog</a>
            <a href="/yardim" className="hover:text-slate-900 transition">Yardım</a>
            <a href="mailto:satis@vibegsm.com" className="hover:text-slate-900 transition">İletişim</a>
          </div>
          <p className="text-[11px] text-slate-400">© 2026 VibeGSM Cloud Technologies</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
      `}</style>
    </main>
  );
}
