import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog — Telefon Bayii ve Teknik Servis Rehberi",
  description:
    "Telefon bayileri ve teknik servisler için stok takibi, IMEI yönetimi, servis süreçleri ve ikinci el alım üzerine pratik rehberler.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Telefon Bayii ve Teknik Servis Rehberi",
    description:
      "Telefon bayileri ve teknik servisler için stok takibi, IMEI yönetimi, servis süreçleri ve ikinci el alım üzerine pratik rehberler.",
    type: "website",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

const TAG_COLORS: Record<string, string> = {
  "Stok Yönetimi": "border-blue-400/20 bg-blue-500/10 text-blue-300",
  "Teknik Servis": "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  "IMEI & Güvenlik": "border-amber-400/20 bg-amber-500/10 text-amber-300",
  "Büyüme": "border-violet-400/20 bg-violet-500/10 text-violet-300",
  "Yazılım Seçimi": "border-rose-400/20 bg-rose-500/10 text-rose-300",
  "İkinci El": "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  "POS & Satış": "border-blue-400/20 bg-blue-500/10 text-blue-300",
  "Tahsilat & Cari": "border-amber-400/20 bg-amber-500/10 text-amber-300",
  "Şube Yönetimi": "border-violet-400/20 bg-violet-500/10 text-violet-300",
  "Fiyatlandırma": "border-rose-400/20 bg-rose-500/10 text-rose-300",
  "Tedarik": "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
};

function tagClass(tag: string) {
  return TAG_COLORS[tag] ?? "border-slate-400/20 bg-slate-500/10 text-slate-300";
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  return (
    <main className="relative min-h-[100dvh] bg-[#030712] px-5 py-16 text-white md:px-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition">
          ← VibeGSM Ana Sayfa
        </Link>
        <h1 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] tracking-[-0.03em]">
          Telefon Bayii ve Teknik Servis Rehberi
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-400">
          Stok takibi, IMEI yönetimi, teknik servis süreçleri ve ikinci el alım-satım üzerine bayilerin gerçek
          ihtiyaçlarına dayanan pratik yazılar.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <span key={tag} className={`rounded-full border px-3 py-1 text-[11px] font-bold ${tagClass(tag)}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="mt-4 flex-1 text-lg font-black leading-snug text-white group-hover:text-blue-300 transition-colors">
                {post.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-slate-500">
                <span>{formatDate(post.date)}</span>
                <span>{post.readingMinutes} dk okuma</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
