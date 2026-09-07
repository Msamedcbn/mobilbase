import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logStudioAction } from "@/lib/studio-audit";
import { listCampaigns, saveCampaigns, type CampaignPlacement } from "@/lib/marketing";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const campaigns = await listCampaigns();
    const idx = campaigns.findIndex((c) => c.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });

    const existing = campaigns[idx];
    const placement: CampaignPlacement = body.placement === "modal" ? "modal" : "banner";
    const updated = {
      ...existing,
      title: typeof body.title === "string" ? body.title.trim() : existing.title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() : existing.subtitle,
      badge: typeof body.badge === "string" ? body.badge.trim() : existing.badge,
      ctaText: typeof body.ctaText === "string" ? body.ctaText.trim() : existing.ctaText,
      ctaHref: typeof body.ctaHref === "string" ? body.ctaHref.trim() : existing.ctaHref,
      placement,
      isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      startsAt: body.startsAt !== undefined ? (body.startsAt || null) : existing.startsAt,
      endsAt: body.endsAt !== undefined ? (body.endsAt || null) : existing.endsAt,
      updatedAt: new Date().toISOString(),
    };
    campaigns[idx] = updated;
    await saveCampaigns(campaigns);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "CAMPAIGN_UPDATE",
      targetType: "MARKETING",
      targetId: updated.id,
      detail: `Kampanya güncellendi: ${updated.title} (aktif: ${updated.isActive})`,
    });

    return NextResponse.json({ campaign: updated });
  } catch (error: any) {
    console.error("[studio/campaigns/:id] PUT", error);
    return NextResponse.json({ error: "Kampanya güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const campaigns = await listCampaigns();
    const idx = campaigns.findIndex((c) => c.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });

    const [removed] = campaigns.splice(idx, 1);
    await saveCampaigns(campaigns);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "CAMPAIGN_DELETE",
      targetType: "MARKETING",
      targetId: removed.id,
      detail: `Kampanya silindi: ${removed.title}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[studio/campaigns/:id] DELETE", error);
    return NextResponse.json({ error: "Kampanya silinemedi" }, { status: 500 });
  }
}
