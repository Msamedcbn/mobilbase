import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { createSignedSessionToken } from "@/lib/session";
import { logStudioAction } from "@/lib/studio-audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { findAndConsumeReferralCode } from "@/lib/marketing";

const TRIAL_DAYS = 7;

function isStrongPassword(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

function normalizeTrPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

const TRIAL_ROLE_PERMISSIONS = {
  CASHIER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
};
const TRIAL_MODULES = {
  pos: true,
  repairs: true,
  stock: true,
  invoicing: true,
  buyback: true,
  branches: true,
};

function buildTrialMetadata(
  trialExpires: string,
  referral: { code: string; ownerName: string; discountType: string; discountValue: number } | null,
) {
  return {
    isSaas: true,
    isSaaS: true,
    isTrial: true,
    trialExpiresAt: trialExpires,
    plan: "Pro",
    licenseStart: new Date().toISOString(),
    licenseEnd: trialExpires,
    branchLimit: 1,
    leadStatus: "TRIAL_ACTIVE",
    leadHistory: [
      { status: "TRIAL_ACTIVE", date: new Date().toISOString(), note: "Self-serve trial started" },
    ],
    modules: TRIAL_MODULES,
    tickets: [],
    billingLedger: [],
    crmTasks: [],
    rolePermissions: TRIAL_ROLE_PERMISSIONS,
    ...(referral
      ? {
          referralCode: referral.code,
          referredBy: referral.ownerName,
          referralDiscountType: referral.discountType,
          referralDiscountValue: referral.discountValue,
        }
      : {}),
  };
}

function buildSessionPayload(args: {
  userId: string;
  tenantId: string;
  shopName: string;
  email: string;
  trialExpires: string;
}) {
  return {
    // `userId` and `expiresAt` are what the session verifier and the rest of the
    // app read. The old payload used `sub`/`iat` only and was signed with a
    // literal ".0.0", so trial sessions failed every authenticated API call.
    userId: args.userId,
    fullName: args.shopName,
    email: args.email,
    role: "CASHIER" as const,
    tenantId: args.tenantId,
    branchId: null,
    isTrial: true,
    expiresAt: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    trialExpiresAt: args.trialExpires,
    rolePermissions: TRIAL_ROLE_PERMISSIONS,
    activeModules: TRIAL_MODULES,
  };
}

export async function POST(req: Request) {
  // Public, unauthenticated, and it provisions a tenant plus a user per call.
  const limit = await checkRateLimit(req, { bucket: "trial-start", limit: 3, windowMs: 60 * 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await req.json();
    const { shopName, fullName, email, phone, password, referralCode } = body || {};

    if (!shopName || typeof shopName !== "string" || !shopName.trim()) {
      return NextResponse.json({ error: "Bayi adı zorunludur" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir email adresi giriniz" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "Telefon numarası zorunludur" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || !isStrongPassword(password)) {
      return NextResponse.json(
        { error: "Şifre en az 8 karakter olmalı; büyük/küçük harf ve özel karakter içermelidir" },
        { status: 400 },
      );
    }
    const normalizedPhone = normalizeTrPhone(phone);
    if (!/^5\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Telefon numarası 5 ile başlayan 10 haneli olmalıdır (örn: 5XX XXX XX XX)" },
        { status: 400 },
      );
    }

    const name = shopName.trim();
    const ownerName = (fullName || name).trim();
    const ownerEmail = email.trim().toLowerCase();
    const ownerPhone = normalizedPhone;
    const trialExpires = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Best-effort: an invalid/expired code shouldn't block signup, it just
    // means the tenant isn't attributed to anyone. A typo'd code is caught
    // earlier by the inline preview in the signup form.
    let referral: { code: string; ownerName: string; discountType: string; discountValue: number } | null = null;
    if (typeof referralCode === "string" && referralCode.trim()) {
      const consumed = await findAndConsumeReferralCode(referralCode);
      if (consumed) {
        referral = {
          code: consumed.code,
          ownerName: consumed.ownerName,
          discountType: consumed.discountType,
          discountValue: consumed.discountValue,
        };
      }
    }

    // The trial user picks this at signup so /api/auth/login works if their
    // session cookie ever expires or gets cleared — previously this was a
    // random, never-shown hash, which locked trial accounts out permanently
    // the moment the cookie was gone.
    const passwordHash = hashSync(password, 10);

    let tenantId: string;
    let userId: string;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const existing = store.customers.find((c) => c.email?.toLowerCase() === ownerEmail);
      if (existing?.notes?.includes("isTrial")) {
        return NextResponse.json(
          { error: "Bu email ile zaten bir deneme hesabı mevcut. Lütfen giriş yapın." },
          { status: 409 },
        );
      }

      tenantId = localId("trial-tenant");
      userId = localId("trial-user");

      store.users.push({
        id: userId,
        fullName: ownerName,
        email: ownerEmail,
        role: "CASHIER",
        passwordHash,
        isActive: true,
        branchId: null,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      store.customers.push({
        id: tenantId,
        tenantId,
        nationalId: null,
        fullName: name,
        phone: ownerPhone,
        email: ownerEmail,
        notes: JSON.stringify(buildTrialMetadata(trialExpires, referral)),
      });
      await writeLocalStore(store);
    } else {
      // AppUser.email is globally unique, so an existing account must short
      // circuit before we try to create anything.
      const existingUser = await prisma.appUser.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Bu email ile zaten bir hesap mevcut. Lütfen giriş yapın." },
          { status: 409 },
        );
      }

      // Tenant row and owner user are created together: a tenant with no way to
      // log in, or a user pointing at a tenant that does not exist, are both
      // worse than the signup simply failing.
      const created = await prisma.$transaction(async (tx) => {
        const tenant = await tx.customer.create({
          data: {
            fullName: name,
            phone: ownerPhone,
            email: ownerEmail,
            notes: JSON.stringify(buildTrialMetadata(trialExpires, referral)),
          },
          select: { id: true },
        });

        // A tenant root points at itself, which is how the rest of the app
        // distinguishes it from an ordinary customer row.
        await tx.customer.update({
          where: { id: tenant.id },
          data: { tenantId: tenant.id },
        });

        const owner = await tx.appUser.create({
          data: {
            fullName: ownerName,
            email: ownerEmail,
            role: "ADMIN",
            passwordHash,
            isActive: true,
            tenantId: tenant.id,
          },
          select: { id: true },
        });

        return { tenantId: tenant.id, userId: owner.id };
      });

      tenantId = created.tenantId;
      userId = created.userId;
    }

    await logStudioAction({
      actor: "TrialEngine",
      action: "TRIAL_STARTED",
      targetType: "TENANT",
      targetId: tenantId,
      detail: referral
        ? `${name} (${ownerEmail}) started trial — referred by ${referral.ownerName} (${referral.code})`
        : `${name} (${ownerEmail}) started trial`,
      context: { shopName: name, email: ownerEmail, plan: "Pro", referral },
    });

    const token = createSignedSessionToken(
      buildSessionPayload({ userId, tenantId, shopName: name, email: ownerEmail, trialExpires }) as any,
    );

    const isHttpsBaseUrl = (process.env.APP_BASE_URL ?? "").toLowerCase().startsWith("https://");
    const response = NextResponse.json({ redirect: "/dashboard", trialUntil: trialExpires });
    response.cookies.set("tp_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: TRIAL_DAYS * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production" && isHttpsBaseUrl,
    });

    return response;
  } catch (err: any) {
    console.error("Trial start error:", err);
    return NextResponse.json({ error: "Deneme başlatılamadı" }, { status: 500 });
  }
}
