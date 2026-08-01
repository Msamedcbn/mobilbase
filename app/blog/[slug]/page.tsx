import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";

const BASE_URL = process.env.APP_BASE_URL ?? "https://vibegsm.com";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  const seoTitle = post.metaTitle ?? post.title;
  return {
    title: seoTitle,
    description: post.description,
    keywords: Array.from(new Set([post.focusKeyword, ...post.keywords])),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: seoTitle,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const aShared = a.tags.some((t) => post.tags.includes(t)) ? 1 : 0;
      const bShared = b.tags.some((t) => post.tags.includes(t)) ? 1 : 0;
      return bShared - aShared;
    })
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    keywords: [post.focusKeyword, ...post.tags].join(", "),
    datePublished: post.date,
    author: { "@type": "Organization", name: "VibeGSM" },
    publisher: { "@type": "Organization", name: "VibeGSM" },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <main className="relative min-h-[100dvh] bg-[#fbfcfe] px-5 py-16 text-slate-900 md:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
          ← Tüm yazılar
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{formatDate(post.date)}</span>
          <span>·</span>
          <span>{post.readingMinutes} dk okuma</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] font-black leading-[1.15] tracking-[-0.02em] text-slate-900">
          {post.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">{post.excerpt}</p>

        <div className="mt-10 flex flex-col gap-8">
          {post.sections.map((section, idx) => (
            <div key={idx}>
              {section.heading && (
                <h2 className="text-lg font-black text-slate-900 md:text-xl">{section.heading}</h2>
              )}
              {section.paragraphs?.map((p, pIdx) => (
                <p key={pIdx} className={`text-[15px] leading-[1.8] text-slate-600 ${section.heading ? "mt-3" : ""} ${pIdx > 0 ? "mt-3" : ""}`}>
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 flex flex-col gap-2">
                  {section.list.map((item, lIdx) => (
                    <li key={lIdx} className="flex gap-2 text-[15px] leading-relaxed text-slate-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 text-center md:p-10">
          <p className="text-sm font-bold text-blue-600">VibeGSM</p>
          <h3 className="mt-2 text-xl font-black text-slate-900 md:text-2xl">Bayinizi tek panelden yönetmeye hazır mısınız?</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Stok, POS, teknik servis ve tahsilatı tek sistemde birleştirin.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:satis@vibegsm.com?subject=VibeGSM%20Demo%20Talebi"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700"
            >
              Demo Talep Et
            </a>
            <a
              href="tel:+905454403452"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Hemen Ara
            </a>
          </div>
        </div>

        {otherPosts.length > 0 && (
          <div className="mt-14">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Diğer yazılar</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {otherPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <h4 className="text-sm font-bold leading-snug text-slate-900">{p.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
