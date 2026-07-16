import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { getDemoAuthUser, isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { createSignedSessionToken } from "@/lib/session";
import { isTenantFrozenFromNotes } from "@/lib/tenant-metadata";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ALLOWED_USER_ROLES = ["PLATFORM_OWNER", "ADMIN", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"] as const;
type AllowedUserRole = (typeof ALLOWED_USER_ROLES)[number];

function normalizeUserRole(input: unknown, fallback: AllowedUserRole = "CASHIER"): AllowedUserRole {
  const value = String(input ?? "").toUpperCase();
  return (ALLOWED_USER_ROLES as readonly string[]).includes(value) ? (value as AllowedUserRole) : fallback;
}

export async function POST(req: Request) {
  const isHttpsBaseUrl = (process.env.APP_BASE_URL ?? "").toLowerCase().startsWith("https://");
  const secureCookie = process.env.NODE_ENV === "production" ? isHttpsBaseUrl : false;

  const createResponseWithSession = (payload: { 
    userId: string; 
    email: string; 
    fullName: string; 
    role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT" | "STUDIO_OPERATOR";
    expiresAt: number;
    rolePermissions?: Record<string, string[]>;
    activeModules?: Record<string, boolean>;
  }) => {
    const response = NextResponse.json({ ok: true, user: payload });
    response.cookies.set("tp_session", createSignedSessionToken(payload as any), {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  };

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz giris verisi" }, { status: 400 });
    }

    // Helper to fetch tenant config - customerId ile belirli tenant'ın konfigürasyonunu yükler
    const getTenantConfig = async (customerId?: string | null) => {
      let rolePermissions: Record<string, string[]> = {
        PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback"],
        ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback"],
        MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
        CASHIER: ["pos"],
        TECHNICIAN: ["repairs"],
        ACCOUNTANT: ["invoicing"],
      };
      let activeModules: Record<string, boolean> = {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: true,
      };

      try {
        if (isDbDisabledMode()) {
          const tenantName = process.env.TENANT_NAME ?? "VibeGSM";
          const store = await readLocalStore();
          const customer = store.customers.find((c) => customerId ? c.id === customerId : c.fullName === tenantName);
          if (customer && customer.notes) {
            const parsedNotes = JSON.parse(customer.notes);
            if (parsedNotes.rolePermissions) rolePermissions = parsedNotes.rolePermissions;
            if (parsedNotes.modules) activeModules = { ...parsedNotes.modules, buyback: true };
          }
        } else {
          const customer = customerId
            ? await prisma.customer.findUnique({ where: { id: customerId } })
            : await prisma.customer.findFirst({ where: { fullName: process.env.TENANT_NAME ?? "VibeGSM" } });
          if (customer && customer.notes) {
            const parsedNotes = JSON.parse(customer.notes);
            if (parsedNotes.rolePermissions) rolePermissions = parsedNotes.rolePermissions;
            if (parsedNotes.modules) activeModules = { ...parsedNotes.modules, buyback: true };
          }
        }
      } catch (err) {
        console.error("Failed to load tenant metadata on login:", err);
      }

      return { rolePermissions, activeModules };
    };

    if (isDbDisabledMode()) {
      const demo = getDemoAuthUser();
      if (parsed.data.email.toLowerCase() !== demo.email || parsed.data.password !== demo.password) {
        return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
      }
      const tenantConf = await getTenantConfig();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
      return createResponseWithSession({
        userId: "demo-admin",
        email: demo.email,
        fullName: demo.fullName,
        role: demo.role as any,
        expiresAt,
        rolePermissions: tenantConf.rolePermissions,
        activeModules: tenantConf.activeModules,
      });
    }

    const signInWithSupabaseAuth = async (email: string, password: string) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return null;

      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data?.user ?? null;
      } catch {
        return null;
      }
    };

    let user: Awaited<ReturnType<typeof prisma.appUser.findUnique>> = null;
    try {
      user = await prisma.appUser.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Veritabani baglantisi olmadan giris fallback devre disi.");
      }
      const demo = getDemoAuthUser();
      if (parsed.data.email.toLowerCase() === demo.email && parsed.data.password === demo.password) {
        const tenantConf = await getTenantConfig();
        const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
        return createResponseWithSession({
          userId: "demo-admin",
          email: demo.email,
          fullName: demo.fullName,
          role: demo.role as any,
          expiresAt,
          rolePermissions: tenantConf.rolePermissions,
          activeModules: tenantConf.activeModules,
        });
      }
      throw new Error("Veritabani baglantisi olmadan yalniz demo giris kullanilabilir");
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    let authenticatedUser = user;

    // Legacy local users: passwordHash ile dogrula
    if (user && user.passwordHash) {
      if (!user.isActive) {
        return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
      }
      const ok = compareSync(parsed.data.password, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
      }
    } else {
      // Supabase Auth users: password dogrulamayi Supabase uzerinden yap
      const authUser = await signInWithSupabaseAuth(normalizedEmail, parsed.data.password);
      if (!authUser) {
        return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
      }

      const existingById = await prisma.appUser.findUnique({ where: { id: String(authUser.id) } });
      const existingByEmail = await prisma.appUser.findUnique({ where: { email: normalizedEmail } });
      authenticatedUser = existingById ?? existingByEmail;

      if (!authenticatedUser) {
        authenticatedUser = await prisma.appUser.create({
          data: {
            id: String(authUser.id),
            email: normalizedEmail,
            fullName:
              (authUser.user_metadata?.fullName as string | undefined) ||
              (authUser.user_metadata?.full_name as string | undefined) ||
              "Yeni Kullanici",
            role: normalizeUserRole(authUser.user_metadata?.role, "CASHIER") as any,
            passwordHash: "",
            isActive: true,
          },
        });
      } else if (!authenticatedUser.isActive) {
        return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
    }

    // Multi-tenant giriş kontrolü
    // Her tenant kendi Customer kaydına bağlı kullanıcılarıyla giriş yapabilir.
    // PLATFORM_OWNER için tenant kontrolü yoktur.
    let resolvedTenantId: string | null = null;

    if (authenticatedUser.role !== "PLATFORM_OWNER" && authenticatedUser.role !== "STUDIO_OPERATOR") {
      const userTenantId = (authenticatedUser as any).tenantId as string | null | undefined;

      if (userTenantId) {
        // Kullanıcının mevcut tenantId'si var - geçerli bir Customer'a işaret ediyor mu?
        const userTenant = await prisma.customer.findUnique({
          where: { id: userTenantId },
          select: { id: true },
        });
        if (!userTenant) {
          return NextResponse.json({ error: "Kullanicinin tenant kaydı geçersiz veya silinmiş." }, { status: 403 });
        }
        resolvedTenantId = userTenant.id;
      } else {
        return NextResponse.json(
          { error: "Kullaniciya tenant atanmamis. Studio'dan tenant atamasi yapin." },
          { status: 403 }
        );
      }
    }

    // Kullanıcının kendi tenant config'ini yükle
    const finalTenantId = resolvedTenantId ?? (authenticatedUser as any).tenantId ?? null;
    if (finalTenantId && authenticatedUser.role !== "PLATFORM_OWNER") {
      if (isDbDisabledMode()) {
        const store = await readLocalStore();
        const tenant = store.customers.find((c) => c.id === finalTenantId);
        if (isTenantFrozenFromNotes(tenant?.notes)) {
          return NextResponse.json({ error: "Bu tenant dondurulmustur. Giris gecici olarak kapatilmistir." }, { status: 403 });
        }
      } else {
        const tenant = await prisma.customer.findUnique({ where: { id: finalTenantId }, select: { notes: true } });
        if (isTenantFrozenFromNotes(tenant?.notes)) {
          return NextResponse.json({ error: "Bu tenant dondurulmustur. Giris gecici olarak kapatilmistir." }, { status: 403 });
        }
      }
    }
    const tenantConf = await getTenantConfig(finalTenantId);
    if (authenticatedUser.role === "MANAGER") {
      const adminPerms = tenantConf.rolePermissions.ADMIN || [];
      const managerPerms = tenantConf.rolePermissions.MANAGER || [];
      tenantConf.rolePermissions.MANAGER = Array.from(new Set([...adminPerms, ...managerPerms, "branches"]));
    }

    // Kullanıcı bazlı modül override — role listesinin bu kullanıcıya özel kopyası
    const userModuleOverrides = (authenticatedUser as any).moduleOverrides as Record<string, boolean> | null | undefined;
    if (userModuleOverrides && typeof userModuleOverrides === "object") {
      const effective = new Set(tenantConf.rolePermissions[authenticatedUser.role] || []);
      for (const [mod, allowed] of Object.entries(userModuleOverrides)) {
        if (allowed) effective.add(mod); else effective.delete(mod);
      }
      tenantConf.rolePermissions = { ...tenantConf.rolePermissions, [authenticatedUser.role]: Array.from(effective) };
    }

    const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
    const payload = {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      fullName: authenticatedUser.fullName,
      role: authenticatedUser.role,
      tenantId: finalTenantId,
      expiresAt,
      rolePermissions: tenantConf.rolePermissions,
      activeModules: tenantConf.activeModules,
    };

    return createResponseWithSession(payload);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error), code: getErrorCode(error) },
      { status: getErrorStatus(error) },
    );
  }
}

