import crypto from "node:crypto";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { createSignedSessionToken } from "@/lib/session";
import { getSubscription } from "@/lib/polar";
import { PLAN_NAME } from "@/lib/subscription-plans";
import { logStudioAction } from "@/lib/studio-audit";

/**
 * Provisions a real, paid tenant straight from a completed Polar checkout —
 * no trial, no manual Studio setup. Used by /api/subscriptions/complete
 * (the checkout success redirect) and reachable idempotently in case a
 * webhook already created the tenant by the time the browser lands back.
 */

const ALL_MODULES_ENABLED = { pos: true, repairs: true, stock: true, buyback: true, invoicing: true };
const ADMIN_ROLE_PERMISSIONS = {
  ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
};
const SESSION_DAYS = 30;

export interface DirectPurchaseInput {
  /** Pre-generated, matches the Polar checkout's external_customer_id. */
  tenantId: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  subscriptionId: string | null;
}

export interface ProvisionResult {
  tenantId: string;
  userId: string;
  sessionToken: string;
  isNew: boolean;
  /** Only set when a brand-new account was just created — shown once. */
  temporaryPassword: string | null;
}

async function findExistingTenantOwner(tenantId: string): Promise<{ userId: string; fullName: string; email: string } | null> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const user = store.users.find((u) => u.tenantId === tenantId);
    if (!user) return null;
    return { userId: user.id, fullName: user.fullName, email: user.email };
  }
  const user = await prisma.appUser.findFirst({ where: { tenantId }, select: { id: true, fullName: true, email: true } });
  if (!user) return null;
  return { userId: user.id, fullName: user.fullName, email: user.email };
}

function buildSessionPayload(args: { userId: string; tenantId: string; fullName: string; email: string }) {
  return {
    userId: args.userId,
    fullName: args.fullName,
    email: args.email,
    role: "ADMIN" as const,
    tenantId: args.tenantId,
    branchId: null,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    rolePermissions: ADMIN_ROLE_PERMISSIONS,
    activeModules: ALL_MODULES_ENABLED,
  };
}

export async function provisionPaidTenant(input: DirectPurchaseInput): Promise<ProvisionResult> {
  const existingOwner = await findExistingTenantOwner(input.tenantId);
  if (existingOwner) {
    const token = createSignedSessionToken(
      buildSessionPayload({ userId: existingOwner.userId, tenantId: input.tenantId, fullName: existingOwner.fullName, email: existingOwner.email }) as any,
    );
    return { tenantId: input.tenantId, userId: existingOwner.userId, sessionToken: token, isNew: false, temporaryPassword: null };
  }

  const sub = input.subscriptionId ? await getSubscription(input.subscriptionId) : null;
  const licenseEndIso = sub?.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const metadata = {
    isSaas: true,
    isSaaS: true,
    isTrial: false,
    plan: PLAN_NAME,
    licenseStart: new Date().toISOString(),
    licenseEnd: licenseEndIso.split("T")[0],
    branchLimit: 5,
    leadStatus: "WON",
    leadHistory: [{ status: "WON", date: new Date().toISOString(), note: "Doğrudan satın alma (Polar checkout)" }],
    modules: ALL_MODULES_ENABLED,
    tickets: [],
    billingLedger: [],
    crmTasks: [],
    rolePermissions: ADMIN_ROLE_PERMISSIONS,
    isFrozen: false,
    polarSubscriptionId: sub?.id ?? null,
    polarSubscriptionStatus: sub?.status ?? null,
    polarProductId: sub?.productId ?? null,
    polarCustomerId: sub?.customerId ?? null,
    polarCurrentPeriodEnd: sub?.currentPeriodEnd ?? null,
    polarCancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    polarProductName: sub?.productName ?? "",
  };

  // Shown once on the success screen — the account has no email-verified
  // recovery path yet, so this (not a magic link) is the only way back in
  // until the owner sets a real password from settings.
  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = hashSync(temporaryPassword, 10);

  let userId: string;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    userId = `direct-user-${crypto.randomUUID().slice(0, 8)}`;
    store.users.push({
      id: userId,
      fullName: input.ownerName,
      email: input.ownerEmail,
      role: "ADMIN",
      passwordHash,
      isActive: true,
      branchId: null,
      tenantId: input.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    store.customers.push({
      id: input.tenantId,
      tenantId: input.tenantId,
      nationalId: null,
      fullName: input.shopName,
      phone: input.ownerPhone,
      email: input.ownerEmail,
      notes: JSON.stringify(metadata),
    });
    await writeLocalStore(store);
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.customer.create({
        data: {
          id: input.tenantId,
          fullName: input.shopName,
          phone: input.ownerPhone,
          email: input.ownerEmail,
          notes: JSON.stringify(metadata),
        },
        select: { id: true },
      });
      // Self-referential tenantId can't be set in the same insert (the row
      // it points at — itself — doesn't exist yet as far as the FK check is
      // concerned), so it's a second statement, same as the trial-signup path.
      await tx.customer.update({ where: { id: tenant.id }, data: { tenantId: tenant.id } });

      const owner = await tx.appUser.create({
        data: {
          fullName: input.ownerName,
          email: input.ownerEmail,
          role: "ADMIN",
          passwordHash,
          isActive: true,
          tenantId: tenant.id,
        },
        select: { id: true },
      });
      return { userId: owner.id };
    });
    userId = created.userId;
  }

  await logStudioAction({
    actor: "PolarDirectPurchase",
    action: "TENANT_PROVISIONED",
    targetType: "TENANT",
    targetId: input.tenantId,
    detail: `${input.shopName} (${input.ownerEmail}) doğrudan satın alma ile hesap oluşturdu`,
    context: { subscriptionId: input.subscriptionId },
  });

  const token = createSignedSessionToken(
    buildSessionPayload({ userId, tenantId: input.tenantId, fullName: input.ownerName, email: input.ownerEmail }) as any,
  );

  return { tenantId: input.tenantId, userId, sessionToken: token, isNew: true, temporaryPassword };
}
