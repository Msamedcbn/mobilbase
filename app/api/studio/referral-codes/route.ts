import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logStudioAction } from "@/lib/studio-audit";
import {
  listReferralCodes,
  saveReferralCodes,
  newId,
  normalizeReferralCode,
  type ReferralCode,
  type ReferralDiscountType,
} from "@/lib/marketing";

/**
 * GET  /api/studio/referral-codes  — list every referral code for Studio management.
 * POST /api/studio/referral-codes  — create a new referral code.
 */

export async function GET() {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  try {
    const codes = await listReferralCodes();
    return NextResponse.json({ codes: codes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Referans kodları okunamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const code = normalizeReferralCode(typeof body.code === "string" ? body.code : "");
    const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
    const discountType: ReferralDiscountType = body.discountType === "fixed" ? "fixed" : "percent";
    const discountValue = Number(body.discountValue);

    if (!code) return NextResponse.json({ error: "Kod zorunludur" }, { status: 400 });
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return NextResponse.json({ error: "Kod sadece harf, rakam, - ve _ içerebilir (3-24 karakter)" }, { status: 400 });
    }
    if (!ownerName) return NextResponse.json({ error: "Referans eden kişi/bayi adı zorunludur" }, { status: 400 });
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return NextResponse.json({ error: "Geçerli bir indirim değeri girin" }, { status: 400 });
    }
    if (discountType === "percent" && discountValue > 100) {
      return NextResponse.json({ error: "Yüzde indirim 100'den büyük olamaz" }, { status: 400 });
    }

    const codes = await listReferralCodes();
    if (codes.some((c) => c.code === code)) {
      return NextResponse.json({ error: "Bu kod zaten kullanılıyor" }, { status: 409 });
    }

    const usageLimitRaw = body.usageLimit;
    const usageLimit = usageLimitRaw === null || usageLimitRaw === undefined || usageLimitRaw === ""
      ? null
      : Number(usageLimitRaw);
    if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
      return NextResponse.json({ error: "Kullanım limiti pozitif bir sayı olmalı veya boş bırakılmalı" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const referralCode: ReferralCode = {
      id: newId("ref"),
      code,
      ownerName,
      discountType,
      discountValue,
      usageLimit,
      usageCount: 0,
      isActive: body.isActive !== false,
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
      createdAt: now,
      updatedAt: now,
    };

    codes.unshift(referralCode);
    await saveReferralCodes(codes);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "REFERRAL_CODE_CREATE",
      targetType: "MARKETING",
      targetId: referralCode.id,
      detail: `Referans kodu oluşturuldu: ${referralCode.code} (${referralCode.ownerName})`,
    });

    return NextResponse.json({ code: referralCode }, { status: 201 });
  } catch (error: any) {
    console.error("[studio/referral-codes] POST", error);
    return NextResponse.json({ error: "Referans kodu oluşturulamadı" }, { status: 500 });
  }
}
