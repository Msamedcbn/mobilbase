import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
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
      console.error("Error reading elpaservis.json:", err);
    }
  }

  const modelsSet = new Set<string>();
  const results: Array<{ brand: string; model: string }> = [];

  const getSaveDetails = (rawModel: string) => {
    const raw = rawModel.trim();
    const upper = raw.toUpperCase();
    
    let brand = "Android";
    if (upper.includes("İPHONE") || upper.includes("IPHONE") || upper.includes("İPAD") || upper.includes("IPAD") || upper.includes("MACBOOK")) {
      brand = "Apple";
    } else if (upper.includes("SAMSUNG")) {
      brand = "Samsung";
    } else if (upper.includes("XIAOMI") || upper.includes("REDMI")) {
      brand = "Xiaomi";
    } else if (upper.includes("HUAWEI")) {
      brand = "Huawei";
    } else {
      brand = "Diğer";
    }

    let model = raw;
    if (brand === "Samsung") model = raw.replace(/SAMSUNG/gi, "").trim();
    if (brand === "Xiaomi" && upper.includes("XIAOMI")) model = raw.replace(/XIAOMI/gi, "").trim();
    if (brand === "Huawei") model = raw.replace(/HUAWEI/gi, "").trim();

    return { brand, model };
  };

  data.forEach((row) => {
    if (row.A && row.A !== "MODEL" && row.A !== "") {
      const rawModel = row.A.trim();
      if (!modelsSet.has(rawModel)) {
        modelsSet.add(rawModel);
        const { brand, model } = getSaveDetails(rawModel);
        results.push({ brand, model });
      }
    }
  });

  // Sort by brand first, then model
  results.sort((a, b) => {
    if (a.brand !== b.brand) {
      return a.brand.localeCompare(b.brand, "tr");
    }
    return a.model.localeCompare(b.model, "tr");
  });

  return NextResponse.json(results);
}
