import { NextResponse } from "next/server";
import { listCampaigns, isCampaignLive } from "@/lib/marketing";

/**
 * GET /api/campaigns/active
 * Public, unauthenticated — returns only the campaigns currently live (active
 * flag on, and within their start/end window, if set). Consumed by the public
 * site's banner/popup renderer.
 */
export async function GET() {
  try {
    const campaigns = await listCampaigns();
    const live = campaigns.filter((c) => isCampaignLive(c));
    return NextResponse.json(
      { campaigns: live },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error: any) {
    return NextResponse.json({ campaigns: [] });
  }
}
