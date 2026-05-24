import PDFDocument from "pdfkit";

export type CorporateQuotePdfInput = {
  quoteNo: string;
  companyName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  validUntil?: string | null;
  createdAt: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  note?: string | null;
};

export async function generateCorporateQuotePdf(input: CorporateQuotePdfInput) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  doc.fontSize(18).text("Kurumsal Teklif", { align: "center" });
  doc.moveDown(0.6);
  doc.fontSize(10).text(`Teklif No: ${input.quoteNo}`);
  doc.text(`Tarih: ${new Date(input.createdAt).toLocaleDateString("tr-TR")}`);
  if (input.validUntil) doc.text(`Gecerlilik: ${new Date(input.validUntil).toLocaleDateString("tr-TR")}`);

  doc.moveDown(0.7);
  doc.fontSize(12).text("Musteri Bilgileri", { underline: true });
  doc.fontSize(10).text(`Firma: ${input.companyName}`);
  if (input.contactName) doc.text(`Yetkili: ${input.contactName}`);
  if (input.contactPhone) doc.text(`Telefon: ${input.contactPhone}`);
  if (input.contactEmail) doc.text(`E-posta: ${input.contactEmail}`);

  doc.moveDown(0.7);
  doc.fontSize(12).text("Teklif Kalemleri", { underline: true });
  doc.moveDown(0.4);

  const startX = doc.x;
  const widths = [250, 70, 90, 100];
  const rowH = 18;
  let y = doc.y;

  const drawRow = (cols: string[], bold = false) => {
    const style = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(style).fontSize(9);
    let x = startX;
    cols.forEach((c, i) => {
      doc.rect(x, y, widths[i], rowH).stroke("#d1d5db");
      doc.text(c, x + 4, y + 5, { width: widths[i] - 8, align: i === 0 ? "left" : "right" });
      x += widths[i];
    });
    y += rowH;
  };

  drawRow(["Kalem", "Adet", "Birim Fiyat", "Tutar"], true);
  input.items.forEach((it) => {
    drawRow([
      it.title,
      String(it.quantity),
      `${it.unitPrice.toLocaleString("tr-TR")} TL`,
      `${(it.quantity * it.unitPrice).toLocaleString("tr-TR")} TL`,
    ]);
  });

  doc.y = y + 10;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Ara Toplam: ${input.subtotal.toLocaleString("tr-TR")} TL`, { align: "right" });
  doc.text(`Indirim: ${input.discountAmount.toLocaleString("tr-TR")} TL`, { align: "right" });
  doc.text(`KDV: ${input.taxAmount.toLocaleString("tr-TR")} TL`, { align: "right" });
  doc.fontSize(12).text(`Genel Toplam: ${input.totalAmount.toLocaleString("tr-TR")} TL`, { align: "right" });

  if (input.note) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(10).text("Not:");
    doc.font("Helvetica").fontSize(10).text(input.note);
  }

  doc.moveDown(1.2);
  doc.fontSize(9).fillColor("#6b7280").text("Bu teklif bilgilendirme amacli hazirlanmistir.", { align: "center" });

  doc.end();
  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return {
    filename: `${input.quoteNo}.pdf`,
    content: buffer,
  };
}
