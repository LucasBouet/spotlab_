import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// lrclib.net is a free, keyless, community-run lyrics database with synced
// (LRC) lyrics support — no API key or paid tier required.
const LRCLIB_BASE = "https://lrclib.net/api";
const LRCLIB_USER_AGENT = "Spotlab/1.0 (self-hosted music player)";

type LrclibResult = {
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

async function fetchLrclib<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${LRCLIB_BASE}${path}`, {
      headers: { "User-Agent": LRCLIB_USER_AGENT },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";
  const album = searchParams.get("album")?.trim() ?? "";
  const duration = searchParams.get("duration")?.trim() ?? "";

  if (!track || !artist) {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  const exactParams = new URLSearchParams({
    track_name: track,
    artist_name: artist,
  });
  if (album) exactParams.set("album_name", album);
  if (duration) exactParams.set("duration", duration);

  const exact = await fetchLrclib<LrclibResult>(`/get?${exactParams}`);
  if (exact) return NextResponse.json(exact);

  // Fall back to fuzzy search when there's no exact title/artist/duration
  // match (e.g. slightly different album edition or rounded duration).
  const searchParamsQuery = new URLSearchParams({
    track_name: track,
    artist_name: artist,
  });
  const results = await fetchLrclib<LrclibResult[]>(
    `/search?${searchParamsQuery}`,
  );
  if (results && results.length > 0) {
    return NextResponse.json(results[0]);
  }

  return NextResponse.json({ error: "Paroles introuvables." }, { status: 404 });
}
