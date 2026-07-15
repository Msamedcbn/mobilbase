import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { PartsPriceClient } from "./parts-price-client";

export const metadata: Metadata = {
  title: "Yedek Parça & Onarım Ücretleri | VibeGSM",
  description: "Apple grubu teknik servis yedek parça ve onarım ücretleri listesi.",
};

export default function PartsPricePage() {
  const jsonPath = path.join(process.cwd(), "elpaservis.json");
  let data: any[] = [];
  if (fs.existsSync(jsonPath)) {
    try {
      let content = fs.readFileSync(jsonPath, "utf8");
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
      data = JSON.parse(content);
    } catch (err) {
      console.error("Error reading elpaservis.json on server page:", err);
    }
  }

  // Clean raw rows into structured PriceRecord objects
  const cleanData = data
    .filter((row) => {
      // Keep only rows that represent models (exclude title/header rows)
      return row.A && row.A !== "MODEL" && row.A !== "";
    })
    .map((row) => ({
      model: row.A ? row.A.trim() : "",
      originalName: row.B ? row.B.trim() : "",
      originalPrice: row.C ? row.C.trim() : "",
      equivalentName: row.D ? row.D.trim() : "",
      equivalentPrice: row.E ? row.E.trim() : "",
      revisionName: row.F ? row.F.trim() : "",
      revisionPrice: row.G ? row.G.trim() : "",
    }));

  return (
    <main className="main-content">
      <PartsPriceClient initialData={cleanData} />
    </main>
  );
}
