import { NextResponse } from "next/server";
import { applyCommand } from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { SyncAction } from "@/lib/sync-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const action = body?.action as SyncAction | undefined;

  if (!deviceId || !action || typeof action.type !== "string") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (action.type === "SET_ACTIVE_DEVICES") {
    const owned = await prisma.device.findMany({
      where: { userId: user.id, deviceId: { in: action.deviceIds } },
      select: { deviceId: true },
    });
    if (owned.length !== action.deviceIds.length) {
      return NextResponse.json({ error: "Appareil inconnu." }, { status: 400 });
    }
  }

  const state = applyCommand(user.id, deviceId, action);
  return NextResponse.json({ ok: true, revision: state.revision });
}
