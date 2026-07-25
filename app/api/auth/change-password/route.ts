import { NextResponse } from "next/server";
import { z } from "zod";
import { compareSync, hashSync } from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

const schema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Yeni sifre ile tekrar sifre ayni olmalidir.",
    path: ["confirmPassword"],
  });

async function verifySupabasePassword(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  return res.ok;
}

async function updateSupabasePassword(userId: string, newPassword: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  return res.ok;
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER", "ADMIN", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"]);
  if (auth.error) return auth.error;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz sifre verisi." }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "Yeni sifre mevcut sifreden farkli olmali." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const user = (store.users || []).find((u) => u.id === auth.user.userId || u.email.toLowerCase() === auth.user.email.toLowerCase());
      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: "Bu modda sifre degisikligi desteklenmiyor." }, { status: 400 });
      }
      if (!compareSync(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: "Mevcut sifre yanlis." }, { status: 400 });
      }
      user.passwordHash = hashSync(newPassword, 10);
      user.updatedAt = new Date().toISOString();
      await writeLocalStore(store);
      return NextResponse.json({ ok: true, message: "Sifreniz güncellendi." });
    }

    const dbUser = await prisma.appUser.findUnique({ where: { id: auth.user.userId } });
    if (!dbUser) return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });

    let verifiedCurrentPassword = false;

    if (dbUser.passwordHash) {
      verifiedCurrentPassword = compareSync(currentPassword, dbUser.passwordHash);
    } else {
      verifiedCurrentPassword = await verifySupabasePassword(dbUser.email, currentPassword);
    }

    if (!verifiedCurrentPassword) {
      return NextResponse.json({ error: "Mevcut sifre yanlis." }, { status: 400 });
    }

    if (!dbUser.passwordHash) {
      const updated = await updateSupabasePassword(dbUser.id, newPassword);
      if (!updated) {
        return NextResponse.json({ error: "Supabase sifre guncelleme başarısız." }, { status: 502 });
      }
    }

    // Bumping the epoch invalidates every session cookie minted with the old
    // password, including any an attacker may already hold. The caller's own
    // cookie goes with them, so the client must send them back to /login.
    await prisma.appUser.update({
      where: { id: dbUser.id },
      data: {
        passwordHash: hashSync(newPassword, 10),
        sessionEpoch: { increment: 1 },
      },
    });

    // Other devices are cut off by the epoch bump, but that only takes effect
    // once middleware's cached status expires. Clearing the caller's own cookie
    // here makes their session end immediately rather than after the TTL.
    const response = NextResponse.json({
      ok: true,
      message: "Sifreniz güncellendi. Guvenlik icin tekrar giris yapmaniz gerekiyor.",
      reauthRequired: true,
    });
    response.cookies.delete("tp_session");
    return response;
  } catch {
    return NextResponse.json({ error: "Sifre güncellenemedi." }, { status: 500 });
  }
}

