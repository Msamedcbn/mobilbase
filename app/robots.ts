import type { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog", "/blog/"],
      disallow: [
        "/api/",
        "/dashboard",
        "/hizli-yonetim",
        "/pos",
        "/stok",
        "/seri-no-takip",
        "/toptan-alim-satis",
        "/distributor-ithalat",
        "/buyback",
        "/ikinci-el",
        "/tamir-takip",
        "/parca-fiyatlari",
        "/ic-servis-dongusu",
        "/musteriler-veresiye",
        "/banka",
        "/taksit-yonetimi",
        "/kurumsal-teklifler",
        "/personel-yonetimi",
        "/subeler",
        "/ayarlar",
        "/veri-analizi",
        "/giderler",
        "/denetim-kayitlari",
        "/uyarilar",
        "/vadeli-alis-borclari",
        "/studio",
        // Per-record repair status lookup pages — not content, must never be indexed.
        "/servis",
        "/login",
        "/unauthorized",
        "/trial-expired",
        // Internal screenshot/asset-generation tool, not real content — inherits
        // the homepage title/description verbatim, so keep it out of the index.
        "/story-preview",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
