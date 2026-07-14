import { NextResponse } from "next/server";
import {
  acceptJamInvite,
  declineJamInvite,
  inviteToJam,
  leaveJam,
  stopJam,
} from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function displayName(name: string | null, email: string): string {
  return name?.trim() ? name : email;
}

// Single entry point for every jam membership operation. Playback commands keep
// flowing through /api/sync/command — once a user is a jam member the sync layer
// routes those to the shared state automatically.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const op = typeof body?.op === "string" ? body.op : "";
  const me = { id: user.id, name: displayName(user.name, user.email) };

  switch (op) {
    case "invite": {
      const friendUserId =
        typeof body?.friendUserId === "string" ? body.friendUserId : "";
      const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
      if (!friendUserId || !deviceId) {
        return NextResponse.json(
          { error: "Requête invalide." },
          { status: 400 },
        );
      }
      if (friendUserId === user.id) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas vous inviter vous-même." },
          { status: 400 },
        );
      }

      // Only accepted friends can be invited (either direction of the row).
      const friendship = await prisma.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: user.id, addresseeId: friendUserId },
            { requesterId: friendUserId, addresseeId: user.id },
          ],
        },
      });
      if (!friendship) {
        return NextResponse.json(
          { error: "Cet utilisateur n'est pas dans vos amis." },
          { status: 403 },
        );
      }

      const friend = await prisma.user.findUnique({
        where: { id: friendUserId },
        select: { id: true, name: true, email: true },
      });
      if (!friend) {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 },
        );
      }

      const { jamId } = inviteToJam(me, deviceId, {
        id: friend.id,
        name: displayName(friend.name, friend.email),
      });
      return NextResponse.json({ ok: true, jamId });
    }

    case "accept": {
      const jamId = typeof body?.jamId === "string" ? body.jamId : "";
      const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
      if (!jamId || !deviceId) {
        return NextResponse.json(
          { error: "Requête invalide." },
          { status: 400 },
        );
      }
      const result = acceptJamInvite(jamId, me, deviceId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    case "decline": {
      const jamId = typeof body?.jamId === "string" ? body.jamId : "";
      if (!jamId) {
        return NextResponse.json(
          { error: "Requête invalide." },
          { status: 400 },
        );
      }
      declineJamInvite(jamId, user.id);
      return NextResponse.json({ ok: true });
    }

    case "leave": {
      leaveJam(user.id);
      return NextResponse.json({ ok: true });
    }

    case "stop": {
      const result = stopJam(user.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json(
        { error: "Opération inconnue." },
        { status: 400 },
      );
  }
}
