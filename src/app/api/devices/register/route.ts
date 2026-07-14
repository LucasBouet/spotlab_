import { NextResponse } from "next/server";
import { broadcastDevices, isOnline } from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { DeviceDTO } from "@/lib/sync-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const platform = typeof body?.platform === "string" ? body.platform : "";

  if (!deviceId || !name || !platform) {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  // Only `create` sets the name — a user-chosen rename must survive future
  // re-registrations (every reload re-registers the device).
  const device = await prisma.device.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId } },
    create: {
      userId: user.id,
      deviceId,
      name,
      platform,
      lastSeenAt: new Date(),
    },
    update: { platform, lastSeenAt: new Date() },
  });

  const dto: DeviceDTO = {
    deviceId: device.deviceId,
    name: device.name,
    platform: device.platform,
    online: isOnline(user.id, device.deviceId),
    lastSeenAt: device.lastSeenAt.toISOString(),
  };

  // Push the updated roster to every connected panel. Without this, a
  // brand-new device's row would only reach already-connected peers on their
  // next refresh (or some unrelated later broadcast), which is what made new
  // devices appear to "not show up until I reload".
  await broadcastDevices(user.id);

  return NextResponse.json({ device: dto });
}
