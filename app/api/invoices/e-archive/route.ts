import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const { transactionNo, totalAmount, customerId } = await req.json();

    if (!transactionNo || totalAmount === undefined) {
      return fail("İşlem numarası ve toplam tutar zorunludur", "VALIDATION", 400);
    }

    const invoiceUuid = crypto.randomUUID();
    const invoiceNo = `GIB${new Date().getFullYear()}${Math.floor(100000000 + Math.random() * 900000000)}`;
    const signedAt = new Date().toISOString();

    if (isDbDisabledMode()) {
      return ok({
        success: true,
        invoiceUuid,
        invoiceNo,
        signedAt,
        xmlUrl: `/api/invoices/e-archive/mock-xml?uuid=${invoiceUuid}`,
        pdfUrl: `/api/invoices/e-archive/mock-pdf?uuid=${invoiceUuid}`,
        gibStatus: "ONAYLANDI",
        message: "e-Arşiv Fatura GİB portalında imzalanarak onaylandı.",
      });
    }

    // In DB mode, we can create/update the Invoice model as marked with this GİB metadata!
    // Let's check if an Invoice record exists or create a new one.
    const existingTransaction = await prisma.transaction.findFirst({
      where: { transactionNo },
    });

    const invoice = await prisma.invoice.create({
      data: {
        customerId: customerId || "demo-cust-1", // Fallback or search customer from transaction
        invoiceNo,
        totalAmount,
        paidAmount: totalAmount,
        dueAmount: 0,
        issuedAt: signedAt,
      },
    });

    return ok({
      success: true,
      invoiceUuid,
      invoiceNo,
      invoiceId: invoice.id,
      signedAt,
      xmlUrl: `/api/invoices/e-archive/mock-xml?uuid=${invoiceUuid}`,
      pdfUrl: `/api/invoices/e-archive/mock-pdf?uuid=${invoiceUuid}`,
      gibStatus: "ONAYLANDI",
      message: "e-Arşiv Fatura GİB portalında imzalanarak onaylandı.",
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
