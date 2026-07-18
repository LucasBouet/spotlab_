import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureTrackGenre } from "@/lib/track-genre";

export const runtime = "nodejs";

// Logs one *qualified* play (the player only calls this once a track has been
// heard past the scrobble threshold — see use-play-tracking.ts). Track metadata
// is denormalized here so stats survive the track later vanishing from Deezer.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const deezerTrackId = Number(body?.deezerTrackId);
  const duration = Number(body?.duration);
  const title = typeof body?.title === "string" ? body.title : "";
  const artistName =
    typeof body?.artistName === "string" ? body.artistName : "";
  const albumTitle =
    typeof body?.albumTitle === "string" ? body.albumTitle : "";
  const albumCover =
    typeof body?.albumCover === "string" ? body.albumCover : "";

  if (
    !Number.isFinite(deezerTrackId) ||
    deezerTrackId <= 0 ||
    !title ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return NextResponse.json(
      { error: "Paramètres invalides." },
      { status: 400 },
    );
  }

  await prisma.playEvent.create({
    data: {
      userId: user.id,
      deezerTrackId,
      title,
      artistName,
      albumTitle,
      albumCover,
      duration: Math.round(duration),
    },
  });

  // Resolve the genre in the background — never make the player's fire-and-
  // forget beacon wait on the Last.fm/Deezer round-trips. This server is
  // long-lived (it also serves SSE), so the promise isn't torn down after the
  // response as it would be on a serverless edge.
  void ensureTrackGenre(deezerTrackId, artistName).catch(() => {});

  return NextResponse.json({ ok: true });
}
