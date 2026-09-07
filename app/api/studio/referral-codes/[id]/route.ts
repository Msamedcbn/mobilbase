import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logStudioAction } from "@/lib/studio-audit";
import { listReferralCodes, saveReferralCodes, normalizeReferralCode, type ReferralDiscountType } from "@/lib/marketing";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const codes = await listReferralCodes();
    const idx = codes.findIndex((c) => c.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Referans kodu bulunamadı" }, { status: 404 });

    const existing = codes[idx];

    let nextCode = existing.code;
    if (typeof body.code === "string" && body.code.trim()) {
      const normalized = normalizeReferralCode(body.code);
      if (!/^[A-Z0-9_-]{3,24}$/.test(normalized)) {
        return NextResponse.json({ error: "Kod sadece harf, rakam, - ve _ içerebilir (3-24 karakter)" }, { status: 400 });
      }
      if (normalized !== existing.code && codes.some((c) => c.code === normalized)) {
        return NextResponse.json({ error: "Bu kod zaten kullanılıyor" }, { status: 409 });
      }
      nextCode = normalized;
    }

    const discountType: ReferralDiscountType = body.discountType === "fixed" ? "fixed" : body.discountType === "percent" ? "percent" : existing.discountType;
    const discountValue = body.discountValue !== undefined ? Number(body.discountValue) : existing.discountValue;
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return NextResponse.json({ error: "Geçerli bir indirim değeri girin" }, { status: 400 });
    }
    if (discountType === "percent" && discountValue > 100) {
      return NextResponse.json({ error: "Yüzde indirim 100'den büyük olamaz" }, { status: 400 });
    }

    const usageLimitRaw = body.usageLimit;
    const usageLimit = usageLimitRaw === undefined
      ? existing.usageLimit
      : (usageLimitRaw === null || usageLimitRaw === "") ? null : Number(usageLimitRaw);
    if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
      return NextResponse.json({ error: "Kullanım limiti pozitif bir sayı olmalı veya boş bırakılmalı" }, { status: 400 });
    }

    const updated = {
      ...existing,
      code: nextCode,
      ownerName: typeof body.ownerName === "string" && body.ownerName.trim() ? body.ownerName.trim() : existing.ownerName,
      discountType,
      discountValue,
      usageLimit,
      isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };
    codes[idx] = updated;
    await saveReferralCodes(codes);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "REFERRAL_CODE_UPDATE",
      targetType: "MARKETING",
      targetId: updated.id,
      detail: `Referans kodu güncellendi: ${updated.code} (aktif: ${updated.isActive})`,
    });

    return NextResponse.json({ code: updated });
  } catch (error: any) {
    console.error("[studio/referral-codes/:id] PUT", error);
    return NextResponse.json({ error: "Referans kodu güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const codes = await listReferralCodes();
    const idx = codes.findIndex((c) => c.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Referans kodu bulunamadı" }, { status: 404 });

    const [removed] = codes.splice(idx, 1);
    await saveReferralCodes(codes);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "REFERRAL_CODE_DELETE",
      targetType: "MARKETING",
      targetId: removed.id,
      detail: `Referans kodu silindi: ${removed.code}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[studio/referral-codes/:id] DELETE", error);
    return NextResponse.json({ error: "Referans kodu silinemedi" }, { status: 500 });
  }
}
