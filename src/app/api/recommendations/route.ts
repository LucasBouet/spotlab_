import { NextResponse } from "next/server";
import {
  getRecommendations,
  type RecWindow,
} from "@/features/Home/recommendations";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function isWindow(value: string | null): value is RecWindow {
  return value === "day" || value === "week" || value === "all";
}

// Serves the homepage recommendations for one time window. The heavy build is
// cached server-side per (user, window); `?refresh=1` forces a rebuild.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window");
  if (!isWindow(window)) {
    return NextResponse.json({ error: "Période invalide." }, { status: 400 });
  }

  const forceRefresh = searchParams.get("refresh") === "1";
  const recommendations = await getRecommendations(
    user.id,
    window,
    forceRefresh,
  );
  return NextResponse.json(recommendations);
}
