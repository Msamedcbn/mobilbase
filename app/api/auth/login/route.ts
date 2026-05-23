import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { getDemoAuthUser, isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

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
    role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT"; 
    expiresAt: number;
    rolePermissions?: Record<string, string[]>;
    activeModules?: Record<string, boolean>;
  }) => {
    const response = NextResponse.json({ ok: true, user: payload });
    response.cookies.set("tp_session", JSON.stringify(payload), {
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
      return NextResponse.json({ error: "Gecersiz giris verisi" }, { status: 400 });
    }

    // Helper to fetch current tenant config
    const getTenantConfig = async () => {
      const tenantName = process.env.TENANT_NAME ?? "TelefoncuPro";
      let rolePermissions: Record<string, string[]> = {
        PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback"],
        ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback"],
        MANAGER: ["pos", "repairs", "stock", "invoicing"],
        CASHIER: ["pos"],
        TECHNICIAN: ["repairs"],
        ACCOUNTANT: ["invoicing"],
      };
      let activeModules: Record<string, boolean> = {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: false,
      };

      try {
        if (isDbDisabledMode()) {
          const store = await readLocalStore();
          const customer = store.customers.find((c) => c.fullName === tenantName);
          if (customer && customer.notes) {
            const parsedNotes = JSON.parse(customer.notes);
            if (parsedNotes.rolePermissions) rolePermissions = parsedNotes.rolePermissions;
            if (parsedNotes.modules) activeModules = parsedNotes.modules;
          }
        } else {
          const customer = await prisma.customer.findFirst({
            where: { fullName: tenantName }
          });
          if (customer && customer.notes) {
            const parsedNotes = JSON.parse(customer.notes);
            if (parsedNotes.rolePermissions) rolePermissions = parsedNotes.rolePermissions;
            if (parsedNotes.modules) activeModules = parsedNotes.modules;
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

    // Tenant isolation: non-platform users can only log into their own tenant context.
    const tenantName = process.env.TENANT_NAME ?? "TelefoncuPro";
    const tenant = await prisma.customer.findFirst({
      where: { fullName: tenantName },
      select: { id: true, email: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant baglami bulunamadi" }, { status: 503 });
    }
    if (authenticatedUser.role !== "PLATFORM_OWNER") {
      const userTenantId = (authenticatedUser as any).tenantId as string | null | undefined;
      if (!userTenantId) {
        // One-time safe backfill path: owner mail matches tenant mail.
        if (tenant.email && authenticatedUser.email.toLowerCase() === tenant.email.toLowerCase()) {
          authenticatedUser = await prisma.appUser.update({
            where: { id: authenticatedUser.id },
            data: { tenantId: tenant.id } as any,
          });
        } else {
          return NextResponse.json({ error: "Bu kullanici tenant ile eslesmiyor" }, { status: 403 });
        }
      } else if (userTenantId !== tenant.id) {
        return NextResponse.json({ error: "Bu kullanici bu tenant'a erisemez" }, { status: 403 });
      }
    }

    const tenantConf = await getTenantConfig();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
    const payload = {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      fullName: authenticatedUser.fullName,
      role: authenticatedUser.role,
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
