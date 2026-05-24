import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const channel = String(body.channel || "EMAIL");

    const getWhatsappUrl = (phone: string, quoteNo: string, amount: number) => {
      const clean = phone.replace(/\D/g, "");
      const trPhone = clean.startsWith("90") ? clean : clean.startsWith("0") ? `90${clean.slice(1)}` : `90${clean}`;
      const text = `Merhaba, ${quoteNo} numarali teklifiniz hazirdir. Toplam: ${amount.toLocaleString("tr-TR")} TL.`;
      return `https://api.whatsapp.com/send?phone=${trPhone}&text=${encodeURIComponent(text)}`;
    };

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.corporateQuotes) store.corporateQuotes = [];
      const idx = store.corporateQuotes.findIndex((x) => x.id === params.id && x.tenantId === tenantId);
      if (idx === -1) return new Response(JSON.stringify({ error: "Teklif bulunamadi." }), { status: 404 });
      const q = store.corporateQuotes[idx];

      if (channel === "WHATSAPP") {
        if (!q.contactPhone) return new Response(JSON.stringify({ error: "Teklifte telefon yok." }), { status: 400 });
        q.status = "SENT";
        q.updatedAt = new Date().toISOString();
        store.corporateQuotes[idx] = q;
        await writeLocalStore(store);
        return new Response(JSON.stringify({ whatsappUrl: getWhatsappUrl(q.contactPhone, q.quoteNo, Number(q.totalAmount)) }), { status: 200 });
      }

      if (channel === "EMAIL") {
        if (!q.contactEmail) return new Response(JSON.stringify({ error: "Teklifte e-posta yok." }), { status: 400 });
        const smtpEnabled = (process.env.SMTP_ENABLED ?? "").toLowerCase() === "true";
        if (smtpEnabled) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
          await transporter.sendMail({
            from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
            to: q.contactEmail,
            subject: `Kurumsal Teklif - ${q.quoteNo}`,
            html: `<p>Merhaba,</p><p>${q.quoteNo} numarali teklifiniz hazirdir.</p><p>Toplam: <b>${Number(q.totalAmount).toLocaleString("tr-TR")} TL</b></p>`,
          });
        }
        q.status = "SENT";
        q.updatedAt = new Date().toISOString();
        store.corporateQuotes[idx] = q;
        await writeLocalStore(store);
        return new Response(JSON.stringify({ ok: true, simulated: !smtpEnabled }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: "Gecersiz kanal." }), { status: 400 });
    }

    const q = await prisma.corporateQuote.findFirst({ where: { id: params.id, tenantId } });
    if (!q) return new Response(JSON.stringify({ error: "Teklif bulunamadi." }), { status: 404 });

    if (channel === "WHATSAPP") {
      if (!q.contactPhone) return new Response(JSON.stringify({ error: "Teklifte telefon yok." }), { status: 400 });
      await prisma.corporateQuote.update({ where: { id: q.id }, data: { status: "SENT" } });
      return new Response(JSON.stringify({ whatsappUrl: getWhatsappUrl(q.contactPhone, q.quoteNo, Number(q.totalAmount)) }), { status: 200 });
    }

    if (channel === "EMAIL") {
      if (!q.contactEmail) return new Response(JSON.stringify({ error: "Teklifte e-posta yok." }), { status: 400 });
      const smtpEnabled = (process.env.SMTP_ENABLED ?? "").toLowerCase() === "true";
      if (smtpEnabled) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
          to: q.contactEmail,
          subject: `Kurumsal Teklif - ${q.quoteNo}`,
          html: `<p>Merhaba,</p><p>${q.quoteNo} numarali teklifiniz hazirdir.</p><p>Toplam: <b>${Number(q.totalAmount).toLocaleString("tr-TR")} TL</b></p>`,
        });
      }
      await prisma.corporateQuote.update({ where: { id: q.id }, data: { status: "SENT" } });
      return new Response(JSON.stringify({ ok: true, simulated: !smtpEnabled }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Gecersiz kanal." }), { status: 400 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Gonderim hatasi" }), { status: 500 });
  }
}
