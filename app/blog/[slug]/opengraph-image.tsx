import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog-posts";

export const runtime = "edge";
export const alt = "VibeGSM Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function BlogOpengraphImage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  const title = post?.title ?? "VibeGSM Blog";
  const tag = post?.tags?.[0] ?? "Telefon Bayii & Teknik Servis";

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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: "white",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 900, color: "white" }}>VibeGSM Blog</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 18,
            fontWeight: 700,
            color: "#93c5fd",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {tag}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 54,
            fontWeight: 900,
            lineHeight: 1.18,
            letterSpacing: -1.5,
            color: "white",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...size }
  );
}
