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

export async function POST(req: Request) {
  const isHttpsBaseUrl = (process.env.APP_BASE_URL ?? "").toLowerCase().startsWith("https://");
  const secureCookie = process.env.NODE_ENV === "production" ? isHttpsBaseUrl : false;

  const createResponseWithSession = (payload: { 
    userId: string; 
    email: string; 
    fullName: string; 
    role: "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT"; 
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

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
    }

    const ok = compareSync(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
    }

    const tenantConf = await getTenantConfig();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
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
