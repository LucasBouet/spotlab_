import { NextResponse } from "next/server";
import { broadcastDevices } from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { deviceId } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
  }

  const result = await prisma.device
    .update({
      where: { userId_deviceId: { userId: user.id, deviceId } },
      data: { name },
    })
    .catch(() => null);

  if (!result) {
    return NextResponse.json(
      { error: "Appareil introuvable." },
      { status: 404 },
    );
  }

  await broadcastDevices(user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { deviceId } = await params;

  const result = await prisma.device
    .delete({
      where: { userId_deviceId: { userId: user.id, deviceId } },
    })
    .catch(() => null);

  if (!result) {
    return NextResponse.json(
      { error: "Appareil introuvable." },
      { status: 404 },
    );
  }

  await broadcastDevices(user.id);
  return NextResponse.json({ ok: true });
}
