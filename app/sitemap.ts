import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/takas-hesapla`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/yardim`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/neden-vibegsm`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/kayit`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/karsilastir/excel`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/en-iyi-telefoncu-yazilimlari-2026`, changeFrequency: "monthly", priority: 0.85 },
  ];

  const cityRoutes: MetadataRoute.Sitemap = [
    "istanbul", "ankara", "izmir", "bursa", "antalya", "adana", "gaziantep", "konya", "kocaeli", "kayseri"
  ].map((city) => ({
    url: `${BASE_URL}/sehirler/${city}`,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const postRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...cityRoutes, ...postRoutes];
}
