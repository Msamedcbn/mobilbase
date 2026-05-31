import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { pdfSettingsSchema } from "@/lib/validations";
import { readPdfSettings, writePdfSettings } from "@/lib/pdf-settings";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;

  const settings = await readPdfSettings();
  return ok(settings);
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const parsed = pdfSettingsSchema.safeParse(body);
  if (!parsed.success) return fail("PDF ayar verisi geçersiz", "VALIDATION", 400);

  await writePdfSettings(parsed.data);
  await writeAuditLog({
    action: "PDF_SETTINGS_UPDATE",
    entityType: "SystemConfig",
    actorUserId: auth.user?.userId,
    detail: `template1DealerName:${parsed.data.template1DealerName}`,
  });

  return ok(parsed.data, 200, "PDF ayarlari kaydedildi");
}

