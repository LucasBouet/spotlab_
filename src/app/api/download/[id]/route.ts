import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveTrackFile } from "@/lib/stream";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "Identifiant invalide." },
      { status: 400 },
    );
  }

  let filePath: string;
  try {
    filePath = await resolveTrackFile(id);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Le téléchargement du titre a échoué.",
      },
      { status: 502 },
    );
  }

  // The cache keeps whichever container YouTube served (webm/m4a) since
  // that's cheapest for streaming/seeking — the download button transcodes
  // to mp3 on the fly here instead, purely for maximum compatibility with
  // whatever the user's saving it for.
  const ffmpeg = spawn("ffmpeg", [
    "-i",
    filePath,
    "-vn",
    "-acodec",
    "libmp3lame",
    "-b:a",
    "192k",
    "-f",
    "mp3",
    "pipe:1",
  ]);
  ffmpeg.on("error", (err) => {
    console.error(`ffmpeg failed to start for track ${id}:`, err);
  });
  ffmpeg.stderr.on("data", () => {});

  return new NextResponse(Readable.toWeb(ffmpeg.stdout) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
