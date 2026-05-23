"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body>
        <section className="panel" style={{ maxWidth: 720, margin: "3rem auto", padding: "1rem" }}>
          <h2 className="page-title">Beklenmeyen bir hata olustu</h2>
          <p style={{ color: "#64748b" }}>
            Uygulama oturumu yenilendi ama hata devam ediyor. Sayfayi tekrar deneyin.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
            Hata: {error.message}
          </p>
          <button className="primary-btn" onClick={reset}>
            Tekrar Dene
          </button>
        </section>
      </body>
    </html>
  );
}
