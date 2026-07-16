import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { logStudioAction } from "@/lib/studio-audit";

const createTeamMemberSchema = z.object({
  fullName: z.string().trim().min(3),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export async function GET() {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const members = (store.users || [])
      .filter((u) => u.role === "STUDIO_OPERATOR")
      .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, isActive: u.isActive, createdAt: u.createdAt }));
    return NextResponse.json({ members });
  }

  const members = await prisma.appUser.findMany({
    where: { role: "STUDIO_OPERATOR" },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true },
  });
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  let data: z.infer<typeof createTeamMemberSchema>;
  try {
    data = createTeamMemberSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: "Gecersiz veri: ad, e-posta ve en az 8 karakterli sifre zorunludur." }, { status: 400 });
  }

  const email = data.email.toLowerCase();
  const passwordHash = hashSync(data.password, 10);

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if ((store.users || []).some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "Bu e-posta zaten kayitli." }, { status: 400 });
    }
    const member = {
      id: localId("studio-op"),
      fullName: data.fullName,
      email,
      role: "STUDIO_OPERATOR" as const,
      passwordHash,
      isActive: true,
      branchId: null,
      tenantId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.users = [...(store.users || []), member];
    await writeLocalStore(store);
    await logStudioAction({
      actor: auth.user.fullName || auth.user.email,
      action: "TEAM_MEMBER_CREATED",
      targetType: "TEAM",
      targetId: member.id,
      detail: `${data.fullName} (${email}) ekip uyesi olarak eklendi`,
    });
    return NextResponse.json({ success: true, member: { id: member.id, fullName: member.fullName, email: member.email, isActive: member.isActive } }, { status: 201 });
  }

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayitli." }, { status: 400 });
  }

  const member = await prisma.appUser.create({
    data: {
      fullName: data.fullName,
      email,
      role: "STUDIO_OPERATOR",
      passwordHash,
      isActive: true,
    },
    select: { id: true, fullName: true, email: true, isActive: true },
  });

  await logStudioAction({
    actor: auth.user.fullName || auth.user.email,
    action: "TEAM_MEMBER_CREATED",
    targetType: "TEAM",
    targetId: member.id,
    detail: `${data.fullName} (${email}) ekip uyesi olarak eklendi`,
  });

  return NextResponse.json({ success: true, member }, { status: 201 });
}
