import PDFDocument from "pdfkit";

type BuybackPdfPayload = {
  dealId: string;
  customerName: string;
  customerPhone: string;
  customerNationalId: string;
  deviceBrand: string;
  deviceModel: string;
  deviceImei: string;
  offeredPrice: number;
  agreedPrice: number | null;
  reconciliationLink?: string;
};

function createPdfBuffer(builder: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    builder(doc);
    doc.end();
  });
}

async function buildTemplate1(payload: BuybackPdfPayload) {
  return createPdfBuffer((doc) => {
    doc.fontSize(16).text("Template 1 - Teklif Ozeti", { align: "center" });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Islem No: ${payload.dealId}`);
    doc.text(`Musteri: ${payload.customerName}`);
    doc.text(`Telefon: ${payload.customerPhone}`);
    doc.text(`Marka/Model: ${payload.deviceBrand} ${payload.deviceModel}`);
    doc.text(`IMEI: ${payload.deviceImei || "-"}`);
    doc.moveDown();
    doc.text(`Teklif Fiyati: ${payload.offeredPrice.toFixed(2)} TL`);
    doc.text(`Anlasilan Fiyat: ${payload.agreedPrice == null ? "-" : `${payload.agreedPrice.toFixed(2)} TL`}`);
  });
}

async function buildTemplate2(payload: BuybackPdfPayload) {
  return createPdfBuffer((doc) => {
    doc.fontSize(16).fillColor("#1e293b").text("Ikinci El Alim Satim Belgesi", { align: "center" });
    doc.moveDown(1.5);
    
    doc.fontSize(12).fillColor("#334155").text("1. TARAFLAR VE BILGILER", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#475569");
    doc.text(`Satici (Musteri): ${payload.customerName}`);
    doc.text(`TC Kimlik: ${payload.customerNationalId || "-"}`);
    doc.text(`Telefon: ${payload.customerPhone}`);
    doc.moveDown(1);
    
    doc.fontSize(12).fillColor("#334155").text("2. CIHAZ VE BEDEL BILGILERI", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#475569");
    doc.text(`Malzeme Cinsi: Cep Telefonu`);
    doc.text(`Model: ${payload.deviceBrand} ${payload.deviceModel}`);
    doc.text(`Seri/IMEI: ${payload.deviceImei || "-"}`);
    doc.text(`Alim Bedeli: ${(payload.agreedPrice ?? payload.offeredPrice).toFixed(2)} TL`);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`);
    doc.moveDown(1.5);

    // Kimlik Fotokopisi Alanı
    doc.save();
    doc.strokeColor("#cbd5e1");
    doc.lineWidth(1);
    doc.dash(4, { space: 4 });
    const currentY = doc.y;
    doc.rect(40, currentY, 515, 100).stroke();
    doc.restore();
    
    doc.fontSize(8).fillColor("#94a3b8");
    doc.text("BU ALANA KIMLIK / EHLIYET GORSELI VEYA FOTOKOPISI EKLENECEKTIR", 40, currentY + 45, { align: "center", width: 515 });
    doc.moveDown(7);

    // Imza Alanlari
    doc.fontSize(11).fillColor("#1e293b");
    const sigY = doc.y;
    doc.save();
    doc.strokeColor("#cbd5e1");
    doc.rect(40, sigY, 240, 80).stroke();
    doc.fontSize(10).fillColor("#1e293b");
    doc.text("SATICI / MUSTERI BEYANI", 50, sigY + 10);
    doc.fontSize(8).fillColor("#64748b");
    doc.text(`Isim: ${payload.customerName}`, 50, sigY + 25);
    doc.text("Imza:", 50, sigY + 50);

    doc.rect(315, sigY, 240, 80).stroke();
    doc.fontSize(10).fillColor("#1e293b");
    doc.text("ALICI / YETKILI BEYANI", 325, sigY + 10);
    doc.fontSize(8).fillColor("#64748b");
    doc.text("Isim: Yetkili Personel / Magaza", 325, sigY + 25);
    doc.text("Imza / Kase:", 325, sigY + 50);
    doc.restore();

    doc.moveDown(9);

    // KVKK Metni
    doc.fontSize(7).fillColor("#94a3b8");
    doc.text(
      "KVKK Aydinlatma Beyani: 6698 sayili Kisisel Verilerin Korunmasi Kanunu uyarinca, bu formda toplanan kisisel verileriniz (Ad, Soyad, TC Kimlik, Telefon, Cihaz IMEI), ikinci el elektronik cihaz ticaretine dair mevzuat geregi yasal yukumluluklerin ifasi ve is yeri guvenliginin saglanmasi amaciyla islenmekte ve arsivlenmektedir. Verileriniz kanunen yetkili kilinan kamu mercileri disinda ucuncu kisilerle paylasilmayacak olup yasal saklama surelerinin bitiminde imha edilecektir.",
      { align: "justify", width: 515 }
    );
  });
}

async function buildTemplate3(payload: BuybackPdfPayload) {
  return createPdfBuffer((doc) => {
    doc.fontSize(16).fillColor("#1e293b").text("Geri Alim Taahhutnamesi", { align: "center" });
    doc.moveDown(1.5);
    
    doc.fontSize(10).fillColor("#334155");
    doc.text(
      `Musteri ${payload.customerName}, mulkiyeti kendisine ait olan asagida detaylari belirtilen cihazini, geri alim sureci kapsaminda teslim ettigini ve teklif edilen bedeli kabul ettigini beyan ve taahhut eder.`,
      { align: "justify" }
    );
    doc.moveDown(1);

    doc.fontSize(12).fillColor("#334155").text("CIHAZ VE TEKLIF BILGILERI", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#475569");
    doc.text(`Cihaz: ${payload.deviceBrand} ${payload.deviceModel}`);
    doc.text(`IMEI: ${payload.deviceImei || "-"}`);
    doc.text(`Teklif Bedeli: ${payload.offeredPrice.toFixed(2)} TL`);
    if (payload.reconciliationLink) {
      doc.text(`Mutabakat Linki: ${payload.reconciliationLink}`);
    }
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`);
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor("#334155");
    doc.text(
      "Taraflar cihazın ekspertiz, degerleme, veri silme ve sıfırlama islemlerinin yapılması hususunda mutabık kalmıslardır. Cihaz icindeki her turlu kisisel veri sorumlulugu teslim oncesinde musteriye aittir.",
      { align: "justify" }
    );
    doc.moveDown(1.5);

    // Imza Alanlari
    doc.fontSize(11).fillColor("#1e293b");
    const sigY = doc.y;
    doc.save();
    doc.strokeColor("#cbd5e1");
    doc.rect(40, sigY, 240, 80).stroke();
    doc.fontSize(10).fillColor("#1e293b");
    doc.text("TESLIM EDEN MUSTERI", 50, sigY + 10);
    doc.fontSize(8).fillColor("#64748b");
    doc.text(`Isim: ${payload.customerName}`, 50, sigY + 25);
    doc.text("Imza:", 50, sigY + 50);

    doc.rect(315, sigY, 240, 80).stroke();
    doc.fontSize(10).fillColor("#1e293b");
    doc.text("YETKILI TESLIM ALAN", 325, sigY + 10);
    doc.fontSize(8).fillColor("#64748b");
    doc.text("Isim: Magaza Gorevlisi", 325, sigY + 25);
    doc.text("Imza:", 325, sigY + 50);
    doc.restore();

    doc.moveDown(9);

    // KVKK Beyani
    doc.fontSize(7).fillColor("#94a3b8");
    doc.text(
      "KVKK Aydinlatma Beyani: 6698 sayili Kisisel Verilerin Korunmasi Kanunu uyarinca, bu formda toplanan kisisel verileriniz (Ad, Soyad, TC Kimlik, Telefon, Cihaz IMEI), ikinci el elektronik cihaz ticaretine dair mevzuat geregi yasal yukumluluklerin ifasi ve is yeri guvenliginin saglanmasi amaciyla islenmekte ve arsivlenmektedir. Verileriniz yasal saklama surelerinin bitiminde imha edilecektir.",
      { align: "justify", width: 515 }
    );
  });
}

export async function generateBuybackMailPdfTemplates(payload: BuybackPdfPayload) {
  const [t1, t2, t3] = await Promise.all([
    buildTemplate1(payload),
    buildTemplate2(payload),
    buildTemplate3(payload),
  ]);

  return [
    { filename: `template-1-${payload.dealId}.pdf`, content: t1 },
    { filename: `template-2-${payload.dealId}.pdf`, content: t2 },
    { filename: `template-3-${payload.dealId}.pdf`, content: t3 },
  ];
}

export async function generateBuybackPdfTemplate(payload: BuybackPdfPayload, templateNo: 1 | 2 | 3) {
  if (templateNo === 1) return { filename: `template-1-${payload.dealId}.pdf`, content: await buildTemplate1(payload) };
  if (templateNo === 2) return { filename: `template-2-${payload.dealId}.pdf`, content: await buildTemplate2(payload) };
  return { filename: `template-3-${payload.dealId}.pdf`, content: await buildTemplate3(payload) };
}

export type { BuybackPdfPayload };
