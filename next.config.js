/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Vercel'in verdigi production alias'i gercek domaine tasi. Ayni icerik
        // iki adreste yayinlaninca analytics bolunuyor ve arama motoru gereksiz
        // yere iki adresi birden tariyordu. Canonical zaten dogru domaini
        // gosteriyordu; bu, ziyaretcinin de dogru adrese dusmesini saglar.
        //
        // Yalnizca tam bu host eslesir: deployment'a ozel adresler
        // (mobilbase-<hash>.vercel.app) ve branch preview'lari etkilenmez, yani
        // canli domainde bir sorun cikarsa test icin kullanilabilir kalirlar.
        source: "/:path*",
        has: [{ type: "host", value: "mobilbase.vercel.app" }],
        destination: "https://www.vibegsm.com.tr/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
