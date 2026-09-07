import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logStudioAction } from "@/lib/studio-audit";
import { listCampaigns, saveCampaigns, newId, type MarketingCampaign, type CampaignPlacement } from "@/lib/marketing";

/**
 * GET  /api/studio/campaigns  — list every campaign (active or not) for Studio management.
 * POST /api/studio/campaigns  — create a new campaign.
 */

export async function GET() {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns: campaigns.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Kampanyalar okunamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const ctaText = typeof body.ctaText === "string" ? body.ctaText.trim() : "";
    const ctaHref = typeof body.ctaHref === "string" ? body.ctaHref.trim() : "";
    const placement: CampaignPlacement = body.placement === "modal" ? "modal" : "banner";

    if (!title) return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });
    if (!ctaText) return NextResponse.json({ error: "Buton metni zorunludur" }, { status: 400 });
    if (!ctaHref) return NextResponse.json({ error: "Buton linki zorunludur" }, { status: 400 });

    const now = new Date().toISOString();
    const campaign: MarketingCampaign = {
      id: newId("campaign"),
      title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() : "",
      badge: typeof body.badge === "string" ? body.badge.trim() : "",
      ctaText,
      ctaHref,
      placement,
      isActive: body.isActive !== false,
      startsAt: body.startsAt || null,
      endsAt: body.endsAt || null,
      createdAt: now,
      updatedAt: now,
    };

    const campaigns = await listCampaigns();
    campaigns.unshift(campaign);
    await saveCampaigns(campaigns);

    await logStudioAction({
      actor: auth.user.fullName ?? "StudioAdmin",
      action: "CAMPAIGN_CREATE",
      targetType: "MARKETING",
      targetId: campaign.id,
      detail: `Kampanya oluşturuldu: ${campaign.title} (${campaign.placement})`,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error("[studio/campaigns] POST", error);
    return NextResponse.json({ error: "Kampanya oluşturulamadı" }, { status: 500 });
  }
}
