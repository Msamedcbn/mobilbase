import { requireRole } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { getBuybackPdfPayloadByDealId } from "@/lib/buyback-documents";
import { generateBuybackPdfTemplate } from "@/lib/buyback-pdf";

type Params = { dealId: string; templateNo: string };

export async function GET(_req: Request, { params }: { params: Params }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  try {
    const templateNo = Number(params.templateNo);
    if (![1, 2, 3].includes(templateNo)) {
      return fail("Gecersiz template numarasi", "VALIDATION", 400);
    }
    const payload = await getBuybackPdfPayloadByDealId(params.dealId);
    if (!payload) return fail("Buyback kaydi bulunamadi", "NOT_FOUND", 404);

    const file = await generateBuybackPdfTemplate(payload, templateNo as 1 | 2 | 3);
    return new Response(new Uint8Array(file.content), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

