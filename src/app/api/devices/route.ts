import { NextResponse } from "next/server";
import { listDeviceDTOs } from "@/lib/playback-sync";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const devices = await listDeviceDTOs(user.id);
  return NextResponse.json({ devices });
}
