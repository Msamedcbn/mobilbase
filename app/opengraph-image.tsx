import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VibeGSM | Telefon Bayii, Telefoncu ve Teknik Servis Yönetim Yazılımı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #030712 0%, #0b1220 55%, #111c34 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 900,
              color: "white",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: "white", letterSpacing: -1 }}>
            VibeGSM
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 60,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: -2,
            color: "white",
            maxWidth: 980,
          }}
        >
          Telefon Bayii ve Teknik Servis Yönetim Yazılımı
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 26, color: "#94a3b8", maxWidth: 880 }}>
          Stok, POS, tamir takip, IMEI ve tahsilatı tek panelde birleştiren bulut otomasyonu.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 48 }}>
          {["Stok & IMEI", "POS", "Teknik Servis", "Tahsilat"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.35)",
                color: "#93c5fd",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
