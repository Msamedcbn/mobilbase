import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const BUCKET = "product-images";

let bucketEnsured = false;
async function ensureBucket(supabaseUrl: string, serviceRoleKey: string) {
  if (bucketEnsured) return;
  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).catch(() => null);
  bucketEnsured = true;
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId ?? "shared";

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return fail("Dosya bulunamadi", "VALIDATION", 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return fail("Sadece PNG, JPEG veya WEBP resim yuklenebilir.", "VALIDATION", 400);
  }
  if (file.size > MAX_SIZE_BYTES) {
    return fail("Dosya boyutu 5MB'i gecemez.", "VALIDATION", 400);
  }

  const fileName = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isDbDisabledMode()) {
    const dir = path.join(process.cwd(), "public", "uploads", tenantId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), buffer);
    return ok({ url: `/uploads/${tenantId}/${fileName}` }, 201, "Resim yuklendi");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return fail("Depolama servisi yapilandirilmamis.", "INTERNAL", 500);
  }

  await ensureBucket(supabaseUrl, serviceRoleKey);

  const objectPath = `${tenantId}/${fileName}`;
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    return fail("Resim yuklenemedi", "INTERNAL", 502);
  }

  return ok({ url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}` }, 201, "Resim yuklendi");
}
