import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// lrclib.net is a free, keyless, community-run lyrics database with synced
// (LRC) lyrics support — no API key or paid tier required.
const LRCLIB_BASE = "https://lrclib.net/api";
const LRCLIB_USER_AGENT = "Spotlab/1.0 (self-hosted music player)";
// lrclib's free hosting routinely takes 6-8s to respond, so the timeout
// needs real headroom above that or it aborts requests that were about to
// succeed.
const REQUEST_TIMEOUT_MS = 15000;

type LrclibResult = {
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

// Keyed by track/artist/album/duration; avoids re-hitting lrclib for a track
// that's already been looked up in this server process (repeat plays,
// several users, React effect re-runs). Only genuine "not found" results are
// cached — a timeout/network hiccup shouldn't permanently poison a track.
const resultCache = new Map<string, LrclibResult | null>();

async function fetchLrclib<T>(path: string): Promise<T | null | undefined> {
  let response: Response;
  try {
    response = await fetch(`${LRCLIB_BASE}${path}`, {
      headers: { "User-Agent": LRCLIB_USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return undefined;
  }
  if (!response.ok) return response.status === 404 ? null : undefined;
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

  const cacheKey = `${track}::${artist}::${album}::${duration}`;
  if (resultCache.has(cacheKey)) {
    const cached = resultCache.get(cacheKey) ?? null;
    return cached
      ? NextResponse.json(cached)
      : NextResponse.json({ error: "Paroles introuvables." }, { status: 404 });
  }

  const exactParams = new URLSearchParams({
    track_name: track,
    artist_name: artist,
  });
  if (album) exactParams.set("album_name", album);
  if (duration) exactParams.set("duration", duration);

  const searchParamsQuery = new URLSearchParams({
    track_name: track,
    artist_name: artist,
  });

  // Fire the exact lookup and the fuzzy-search fallback at the same time
  // instead of waiting for the exact match to fail first — lrclib's exact
  // endpoint is picky about duration, so it misses often, and running the
  // two requests sequentially doubled the wait on that (common) path.
  const [exact, results] = await Promise.all([
    fetchLrclib<LrclibResult>(`/get?${exactParams}`),
    fetchLrclib<LrclibResult[]>(`/search?${searchParamsQuery}`),
  ]);

  const result = exact ?? (results && results.length > 0 ? results[0] : null);

  // A genuine "nothing found" (both lookups came back 404) is worth
  // caching; a timeout or network failure (undefined) is not — it should be
  // retried on the next request rather than remembered as unavailable.
  if (exact !== undefined && results !== undefined) {
    resultCache.set(cacheKey, result ?? null);
  }

  if (result) return NextResponse.json(result);
  return NextResponse.json({ error: "Paroles introuvables." }, { status: 404 });
}
