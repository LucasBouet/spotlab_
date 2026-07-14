import { NextResponse } from "next/server";
import { getFriendActivities } from "@/lib/friends";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polled by the Social tab to refresh friends' online/now-playing state without
// re-rendering the whole settings page. Cheap read straight from the in-memory
// presence maps, so a few-second cadence is fine.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const activities = await getFriendActivities(user.id);
  return NextResponse.json({ activities });
}
