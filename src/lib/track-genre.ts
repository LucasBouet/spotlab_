import { fetchDeezer } from "@/lib/deezer";
import { pickGenre } from "@/lib/genres";
import { prisma } from "@/lib/prisma";

// Deezer doesn't expose a genre on the track object, only on its album (and its
// taxonomy is coarse — "Rock" for metalcore/deathcore), so it's only used as a
// fallback. The granular genre comes from Last.fm's community tags, keyed by
// artist name.
type DeezerTrackInfo = { album?: { id?: number } };
type DeezerAlbumGenres = { genres?: { data?: { id: number; name: string }[] } };
type LastFmTopTags = {
  toptags?: { tag?: { name: string }[] | { name: string } };
};

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

function hasLastFm(): boolean {
  return Boolean(process.env.LASTFM_API_KEY);
}

// Resolves a granular genre from Last.fm's top tags for the artist, filtered
// through the curated vocabulary in genres.ts. Returns null when no key is
// configured, the request fails, or no tag is a recognized genre.
async function fetchLastFmGenre(artistName: string): Promise<string | null> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey || !artistName) return null;

  const url =
    `${LASTFM_API_BASE}?method=artist.gettoptags` +
    `&artist=${encodeURIComponent(artistName)}` +
    `&autocorrect=1&api_key=${apiKey}&format=json`;

  let payload: LastFmTopTags | null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    payload = (await response.json()) as LastFmTopTags;
  } catch {
    return null;
  }

  const raw = payload?.toptags?.tag;
  const tags = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return pickGenre(tags.map((tag) => tag?.name));
}

// Coarse fallback: track -> album.id -> album's first genre.
async function fetchDeezerGenre(deezerTrackId: number): Promise<{
  albumId: number | null;
  genreId: number | null;
  genreName: string | null;
} | null> {
  const track = await fetchDeezer<DeezerTrackInfo>(`/track/${deezerTrackId}`);
  const albumId = track?.album?.id ?? null;
  if (!albumId) return null;

  const album = await fetchDeezer<DeezerAlbumGenres>(`/album/${albumId}`);
  if (!album) return null;

  const genre = album.genres?.data?.[0] ?? null;
  return {
    albumId,
    genreId: genre?.id ?? null,
    genreName: genre?.name ?? null,
  };
}

// Resolves and caches a track's genre (shared across users) the first time it's
// played, preferring Last.fm's granular tags and falling back to Deezer's
// coarse album genre. A previously cached *Deezer* result is upgraded to a
// Last.fm one the next time the track is played after a key is configured, so
// stale "Rock" labels fix themselves without a manual cache wipe. Best-effort:
// on total failure nothing is written, so a later play retries.
export async function ensureTrackGenre(
  deezerTrackId: number,
  artistName: string,
): Promise<void> {
  const existing = await prisma.trackGenre.findUnique({
    where: { deezerTrackId },
  });

  if (existing) {
    // Already granular, or we have no better source available — leave it.
    if (existing.source === "lastfm" || !hasLastFm()) return;
    const upgraded = await fetchLastFmGenre(artistName);
    if (upgraded) {
      await prisma.trackGenre.update({
        where: { deezerTrackId },
        data: { genreName: upgraded, genreId: null, source: "lastfm" },
      });
    }
    return;
  }

  const lastFmGenre = await fetchLastFmGenre(artistName);
  if (lastFmGenre) {
    await prisma.trackGenre.create({
      data: { deezerTrackId, genreName: lastFmGenre, source: "lastfm" },
    });
    return;
  }

  const deezerGenre = await fetchDeezerGenre(deezerTrackId);
  if (!deezerGenre) return; // both sources unreachable → retry on a later play
  await prisma.trackGenre.create({
    data: {
      deezerTrackId,
      albumId: deezerGenre.albumId,
      genreId: deezerGenre.genreId,
      genreName: deezerGenre.genreName,
      source: "deezer",
    },
  });
}
