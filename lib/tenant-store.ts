import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { parseTenantMetadata, stringifyTenantMetadata, type TenantMetadata } from "@/lib/tenant-metadata";

/**
 * Mode-aware access to a tenant record and its metadata blob.
 *
 * A tenant is a Customer row whose `notes` column holds a JSON blob of platform
 * state: plan, licence dates, module entitlements, isFrozen, billing ledger.
 * The trial and LemonSqueezy routes each reached into the process-local JSON
 * store to read and rewrite that blob, which meant on a real deployment they
 * mutated a file the rest of the app never reads — trials and paid
 * subscriptions were invisible to the running application, and on serverless
 * the file did not survive a cold start.
 *
 * Everything tenant-lifecycle related should go through here so there is one
 * place that knows which backing store is live.
 */

export type TenantRecord = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  notes: string | null;
};

export async function findTenantById(tenantId: string): Promise<TenantRecord | null> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const found = store.customers.find((c) => c.id === tenantId);
    if (!found) return null;
    return {
      id: found.id,
      fullName: found.fullName,
      email: found.email ?? null,
      phone: found.phone,
      notes: found.notes ?? null,
    };
  }

  return prisma.customer.findUnique({
    where: { id: tenantId },
    select: { id: true, fullName: true, email: true, phone: true, notes: true },
  });
}

export async function getTenantMetadata(tenantId: string): Promise<TenantMetadata | null> {
  const tenant = await findTenantById(tenantId);
  if (!tenant) return null;
  return parseTenantMetadata(tenant.notes);
}

/**
 * Read-modify-write of a tenant's metadata blob.
 *
 * This is last-write-wins, not atomic. That is acceptable for the current
 * callers (webhooks and a nightly lifecycle job, which do not overlap on the
 * same tenant) but is the thing to revisit if concurrent billing writes ever
 * become possible — the fix would be a real column per field rather than a JSON
 * blob in `notes`.
 */
export async function updateTenantMetadata(
  tenantId: string,
  mutate: (current: TenantMetadata) => TenantMetadata,
): Promise<TenantMetadata | null> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx === -1) return null;
    const next = mutate(parseTenantMetadata(store.customers[idx].notes));
    store.customers[idx] = { ...store.customers[idx], notes: stringifyTenantMetadata(next) };
    await writeLocalStore(store);
    return next;
  }

  const existing = await prisma.customer.findUnique({
    where: { id: tenantId },
    select: { notes: true },
  });
  if (!existing) return null;

  const next = mutate(parseTenantMetadata(existing.notes));
  await prisma.customer.update({
    where: { id: tenantId },
    data: { notes: stringifyTenantMetadata(next) },
  });
  return next;
}

/** All tenant rows (the self-referential roots), for lifecycle sweeps. */
export async function listTenants(): Promise<TenantRecord[]> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return store.customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email ?? null,
      phone: c.phone,
      notes: c.notes ?? null,
    }));
  }

  // A tenant root is a Customer that is its own tenant, or has no parent tenant.
  return prisma.customer.findMany({
    where: { OR: [{ tenantId: null }, { tenantId: { equals: prisma.customer.fields.id } }] },
    select: { id: true, fullName: true, email: true, phone: true, notes: true },
  });
}
