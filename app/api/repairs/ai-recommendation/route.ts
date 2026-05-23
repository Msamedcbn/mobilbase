import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { issueDescription = "", brand = "", model = "" } = await req.json();
    const cleanDesc = issueDescription.toLowerCase();

    let laborCost = 300;
    let partCost = 500;
    let predictedTime = "2 Saat";
    let possibleParts: string[] = ["Genel Arıza Tespit & Onarım"];
    let reasoning = "Belirtilen şikayete göre detaylı arıza tespiti ve anakart entegre kontrolü gerekmektedir.";

    let matchedFromExcel = false;

    // Load Excel pricing list
    const jsonPath = path.join(process.cwd(), "elpaservis.json");
    let excelData: any[] = [];
    if (fs.existsSync(jsonPath)) {
      try {
        let content = fs.readFileSync(jsonPath, "utf8");
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
        excelData = JSON.parse(content);
      } catch (err) {
        console.error("Excel data parse error in AI recommendation:", err);
      }
    }

    if (brand.toLowerCase() === "apple" && model && excelData.length > 0) {
      const cleanModel = model.toLowerCase().replace(/iphone/g, "").trim();
      
      // Filter rows matching this model
      const modelRows = excelData.filter(row => {
        if (!row.A) return false;
        const excelModel = row.A.toLowerCase().replace(/iphone/g, "").trim();
        return excelModel === cleanModel || excelModel.includes(cleanModel) || cleanModel.includes(excelModel);
      });

      if (modelRows.length > 0) {
        // Find matching repair item
        let selectedRow: any = null;
        let repairType = "";

        if (cleanDesc.includes("batarya") || cleanDesc.includes("pil") || cleanDesc.includes("şarjı az") || cleanDesc.includes("şişme")) {
          selectedRow = modelRows.find(row => (row.B && row.B.toLowerCase().includes("batarya")) || (row.D && row.D.toLowerCase().includes("batarya")));
          repairType = "batarya";
          predictedTime = "30 Dakika";
        } else if (cleanDesc.includes("arka cam") || cleanDesc.includes("arka kapak")) {
          selectedRow = modelRows.find(row => (row.B && row.B.toLowerCase().includes("arka cam")) || (row.D && row.D.toLowerCase().includes("arka cam")));
          repairType = "arka cam";
          predictedTime = "2 Saat";
        } else if (cleanDesc.includes("ekran") || cleanDesc.includes("cam") || cleanDesc.includes("görüntü") || cleanDesc.includes("kırık")) {
          selectedRow = modelRows.find(row => (row.B && row.B.toLowerCase().includes("ekran")) || (row.D && row.D.toLowerCase().includes("ekran")) || (row.F && row.F.toLowerCase().includes("ekran")));
          repairType = "ekran";
          predictedTime = "1 Saat";
        } else if (cleanDesc.includes("kamera") || cleanDesc.includes("lens") || cleanDesc.includes("fotoğraf")) {
          selectedRow = modelRows.find(row => (row.B && row.B.toLowerCase().includes("kamera")) || (row.D && row.D.toLowerCase().includes("kamera")));
          repairType = "kamera";
          predictedTime = "1.5 Saat";
        } else if (cleanDesc.includes("face") || cleanDesc.includes("yüz") || cleanDesc.includes("truedepth")) {
          selectedRow = modelRows.find(row => (row.B && row.B.toLowerCase().includes("face id")) || (row.D && row.D.toLowerCase().includes("face id")));
          repairType = "face id";
          predictedTime = "1.5 Saat";
        }

        if (selectedRow) {
          matchedFromExcel = true;
          const parsePrice = (val: any): number | null => {
            if (!val) return null;
            const str = String(val).replace(/[^\d]/g, "");
            return str ? parseInt(str, 10) : null;
          };

          const origPrice = parsePrice(selectedRow.C);
          const muadilPrice = parsePrice(selectedRow.E);
          const revizePrice = parsePrice(selectedRow.G);

          possibleParts = [];
          if (selectedRow.B && origPrice) {
            possibleParts.push(`${selectedRow.B} (${origPrice} TL)`);
          }
          if (selectedRow.D && muadilPrice) {
            possibleParts.push(`${selectedRow.D} (${muadilPrice} TL)`);
          }
          if (selectedRow.F && revizePrice) {
            possibleParts.push(`${selectedRow.F} (${revizePrice} TL)`);
          }

          // Decide dynamic defaults for the form
          laborCost = repairType === "batarya" ? 250 : 400;
          
          if (origPrice) {
            partCost = origPrice;
          } else if (muadilPrice) {
            partCost = muadilPrice;
          } else if (revizePrice) {
            partCost = revizePrice;
          } else {
            partCost = 500;
          }

          reasoning = `Excel fiyat listesinden "${selectedRow.A.trim()}" modeli için eşleşme sağlandı. ` +
            `Önerilen seçenekler: ` + possibleParts.join(" | ") + `. ` +
            `Teknisyen işçilik bedeli olarak ${laborCost} TL eklenmiştir.`;
        }
      }
    }

    if (!matchedFromExcel) {
      if (cleanDesc.includes("ekran") || cleanDesc.includes("cam") || cleanDesc.includes("görüntü") || cleanDesc.includes("kırık")) {
        partCost = 1500;
        laborCost = 400;
        predictedTime = "1 Saat";
        possibleParts = ["A+ Kalite Ekran Paneli", "Orijinal Ekran Revize Dokunmatik"];
        reasoning = "Ekran hasarı veya görüntü kaybı durumunda komple ekran paneli değişimi önerilir.";
      } else if (cleanDesc.includes("batarya") || cleanDesc.includes("pil") || cleanDesc.includes("şarjı az") || cleanDesc.includes("şişme")) {
        partCost = 600;
        laborCost = 250;
        predictedTime = "30 Dakika";
        possibleParts = ["Yüksek Kapasiteli Batarya (Deji vb.)", "Orijinal Kalite Yedek Batarya"];
        reasoning = "Pil ömrü azalması veya şişme durumunda batarya değişimi yapılması önerilir.";
      } else if (cleanDesc.includes("şarj soketi") || cleanDesc.includes("şarj olmuyor") || cleanDesc.includes("soket")) {
        partCost = 300;
        laborCost = 300;
        predictedTime = "1 Saat";
        possibleParts = ["Şarj Soketi Flex Kablosu", "Mikrofonlu Alt Flex Modülü"];
        reasoning = "Şarj temassızlığı veya hiç şarj olmama durumunda alt şarj flex değişimi önerilir.";
      } else if (cleanDesc.includes("kamera") || cleanDesc.includes("lens") || cleanDesc.includes("fotoğraf")) {
        partCost = 800;
        laborCost = 350;
        predictedTime = "1.5 Saat";
        possibleParts = ["Arka Kamera Modülü", "Safir Cam Kamera Koruyucu"];
        reasoning = "Kamera odaklama sorunu veya fiziksel hasar durumunda kamera değişimi önerilir.";
      } else if (cleanDesc.includes("hoparlör") || cleanDesc.includes("ahize") || cleanDesc.includes("ses gitmiyor") || cleanDesc.includes("ses gelmiyor") || cleanDesc.includes("mikrofon")) {
        partCost = 200;
        laborCost = 200;
        predictedTime = "45 Dakika";
        possibleParts = ["İç Kulaklık Ahizesi", "Alt Hoparlör Modülü"];
        reasoning = "Ses iletim sorunlarında hoparlör veya mikrofon modüllerinin temizlenmesi veya değişimi gerekir.";
      }

      // Dynamic brand/model customizer
      if (brand && model) {
        possibleParts = possibleParts.map(part => `${brand} ${model} Uyumlu ${part}`);
        if (brand.toLowerCase() === "apple") {
          partCost = Math.round(partCost * 1.25);
          laborCost = Math.round(laborCost * 1.15);
        }
      }
    }

    return NextResponse.json({
      success: true,
      laborCost,
      partCost,
      predictedTime,
      possibleParts,
      reasoning
    });
  } catch (error) {
    return NextResponse.json({ error: "AI Teşhis motoru çalıştırılamadı." }, { status: 500 });
  }
}
