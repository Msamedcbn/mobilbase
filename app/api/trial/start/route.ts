import { NextResponse } from "next/server";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import crypto from "node:crypto";

const TRIAL_DAYS = 14;

function generateTrialSessionPayload(tenantId: string, shopName: string, email: string) {
  const id = localId("trial-user");
  const payload = {
    sub: id,
    fullName: shopName,
    email: email,
    role: "CASHIER" as const,
    tenantId: tenantId,
    branchId: null,
    isTrial: true,
    trialExpiresAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    rolePermissions: { CASHIER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"] },
    activeModules: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, branches: true },
    iat: Date.now(),
  };
  return { payload, userId: id };
}

function encodeSessionToken(payload: Record<string, any>) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${body}.0.0`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shopName, fullName, email, phone } = body || {};

    if (!shopName || typeof shopName !== "string" || !shopName.trim()) {
      return NextResponse.json({ error: "Bayi adı zorunludur" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir email adresi giriniz" }, { status: 400 });
    }

    const store = await readLocalStore();

    const existingEmail = store.customers.find(
      (c) => c.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (existingEmail && existingEmail.notes?.includes("isTrial")) {
      return NextResponse.json(
        { error: "Bu email ile zaten bir deneme hesabı mevcut. Lütfen giriş yapın." },
        { status: 409 }
      );
    }

    const tenantId = localId("trial-tenant");
    const name = shopName.trim();
    const ownerName = (fullName || name).trim();
    const ownerEmail = email.trim().toLowerCase();
    const trialExpires = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { payload, userId } = generateTrialSessionPayload(tenantId, name, ownerEmail);
    const hashedPassword = crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex");

    store.users.push({
      id: userId,
      fullName: ownerName,
      email: ownerEmail,
      role: "CASHIER",
      passwordHash: hashedPassword,
      isActive: true,
      branchId: null,
      tenantId: tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    store.customers.push({
      id: tenantId,
      tenantId: tenantId,
      nationalId: null,
      fullName: name,
      phone: phone || "5XXXXXXXXX",
      email: ownerEmail,
      notes: JSON.stringify({
        isSaas: true,
        isTrial: true,
        trialExpiresAt: trialExpires,
        plan: "Pro",
        licenseStart: new Date().toISOString(),
        licenseEnd: trialExpires,
        branchLimit: 1,
        leadStatus: "TRIAL_ACTIVE",
        leadHistory: [{ status: "TRIAL_ACTIVE", date: new Date().toISOString(), note: "Self-serve trial started" }],
        modules: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, branches: true },
        tickets: [],
        billingLedger: [],
        crmTasks: [],
        rolePermissions: { CASHIER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"] },
      }),
    });

    store.studioAuditLogs = store.studioAuditLogs || [];
    store.studioAuditLogs.unshift({
      id: localId("audit"),
      createdAt: new Date().toISOString(),
      actor: "TrialEngine",
      action: "TRIAL_STARTED",
      targetType: "TENANT",
      targetId: tenantId,
      detail: `${name} (${ownerEmail}) started trial`,
      context: { shopName: name, email: ownerEmail, plan: "Pro" },
    });

    await writeLocalStore(store);

    const token = encodeSessionToken(payload);

    const response = NextResponse.json({ redirect: "/dashboard", trialUntil: trialExpires });
    response.cookies.set("tp_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: TRIAL_DAYS * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err: any) {
    console.error("Trial start error:", err);
    return NextResponse.json({ error: err.message || "Deneme başlatılamadı" }, { status: 500 });
  }
}
