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
  "Stok Yönetimi": "border-blue-200 bg-blue-50 text-blue-700",
  "Teknik Servis": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "IMEI & Güvenlik": "border-amber-200 bg-amber-50 text-amber-700",
  "Büyüme": "border-violet-200 bg-violet-50 text-violet-700",
  "Yazılım Seçimi": "border-rose-200 bg-rose-50 text-rose-700",
  "İkinci El": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "POS & Satış": "border-blue-200 bg-blue-50 text-blue-700",
  "Tahsilat & Cari": "border-amber-200 bg-amber-50 text-amber-700",
  "Şube Yönetimi": "border-violet-200 bg-violet-50 text-violet-700",
  "Fiyatlandırma": "border-rose-200 bg-rose-50 text-rose-700",
  "Tedarik": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Muhasebe & Fatura": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Kurumsal Satış": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Personel & Prim": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  "Raporlama": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "İstanbul": "border-red-200 bg-red-50 text-red-700",
  "Türkiye": "border-sky-200 bg-sky-50 text-sky-700",
};

function tagClass(tag: string) {
  return TAG_COLORS[tag] ?? "border-slate-200 bg-slate-50 text-slate-600";
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  return (
    <main className="relative min-h-[100dvh] bg-[#fbfcfe] px-5 py-16 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
          ← VibeGSM Ana Sayfa
        </Link>
        <h1 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] tracking-[-0.03em] text-slate-900">
          Telefon Bayii ve Teknik Servis Rehberi
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
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
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="mt-4 flex-1 text-lg font-black leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{post.excerpt}</p>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
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
