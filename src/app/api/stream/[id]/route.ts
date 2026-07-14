import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { openTrackStream } from "@/lib/stream";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
};

function contentTypeFor(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  request: Request,
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

  let result: Awaited<ReturnType<typeof openTrackStream>>;
  try {
    result = await openTrackStream(id);
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

  if (result.kind === "live") {
    // Track isn't cached yet: stream bytes straight from yt-dlp as they
    // arrive instead of waiting for the whole file, so playback can start
    // almost as soon as YouTube starts sending data. Range requests aren't
    // honored here (the final size isn't known yet) — the client just gets
    // the full body from the start; once the file finishes caching, later
    // requests hit the normal path below with full Range support.
    const nodeStream = Readable.from(result.read());
    return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Accept-Ranges": "none",
        "Cache-Control": "no-store",
      },
    });
  }

  const filePath = result.filePath;
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat) {
    return NextResponse.json(
      { error: "Fichier introuvable." },
      { status: 404 },
    );
  }

  const contentType = contentTypeFor(filePath);
  const range = request.headers.get("range");

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match?.[2] ? Number.parseInt(match[2], 10) : fileStat.size - 1;

    if (match && start <= end && end < fileStat.size) {
      const nodeStream = createReadStream(filePath, { start, end });
      return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const nodeStream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
