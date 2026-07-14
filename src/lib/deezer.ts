const DEEZER_API_BASE = "https://api.deezer.com";

export type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  // `id` is present on tracks that come straight from the Deezer API
  // (search/album/artist), but absent on tracks rebuilt from our DB rows that
  // predate artist-id storage — so it stays optional.
  artist: { id?: number; name: string };
  album: { title: string; cover_medium: string };
};

export type DeezerAlbumDetail = {
  id: number;
  title: string;
  cover_medium: string;
  record_type: string;
  release_date: string;
  nb_tracks: number;
  artist: { id: number; name: string };
  tracks: { data: Omit<DeezerTrack, "album">[] };
};

export type DeezerArtistDetail = {
  id: number;
  name: string;
  picture_medium: string;
  nb_fan: number;
  nb_album: number;
};

export type DeezerPlaylistDetail = {
  id: number;
  title: string;
  nb_tracks: number;
};

async function fetchDeezerUrl<T>(url: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const payload = await response.json();
  if (payload?.error) return null;

  return payload as T;
}

export async function fetchDeezer<T>(path: string): Promise<T | null> {
  return fetchDeezerUrl<T>(`${DEEZER_API_BASE}${path}`);
}

const PLAYLIST_ID_REGEX = /playlist[/=](\d+)/i;
const MAX_PLAYLIST_TRACKS = 10000;

export async function resolveDeezerPlaylistId(
  input: string,
): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) return trimmed;

  const directMatch = trimmed.match(PLAYLIST_ID_REGEX);
  if (directMatch) return directMatch[1];

  try {
    const response = await fetch(trimmed, {
      method: "HEAD",
      redirect: "follow",
    });
    const finalMatch = response.url.match(PLAYLIST_ID_REGEX);
    if (finalMatch) return finalMatch[1];
  } catch {
    return null;
  }

  return null;
}

const PAGE_RETRY_ATTEMPTS = 5;
const PAGE_RETRY_DELAY_MS = 1200;
const PAGE_REQUEST_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDeezerPageWithRetry<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < PAGE_RETRY_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      await sleep(PAGE_RETRY_DELAY_MS);
      continue;
    }

    if (response.status === 429) {
      await sleep(PAGE_RETRY_DELAY_MS);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Deezer a répondu avec une erreur (${response.status}).`);
    }

    const payload = await response.json();
    if (payload?.error) {
      const reason = `${payload.error?.type ?? ""} ${payload.error?.message ?? ""}`;
      const isQuota = /quota|limit/i.test(reason);
      if (isQuota && attempt < PAGE_RETRY_ATTEMPTS - 1) {
        await sleep(PAGE_RETRY_DELAY_MS);
        continue;
      }
      throw new Error(payload.error?.message || "Erreur de l'API Deezer.");
    }

    return payload as T;
  }

  throw new Error(
    "Deezer a limité les requêtes pendant l'import, réessayez dans quelques instants.",
  );
}

const TRACKS_PAGE_SIZE = 100;

type DeezerTracksPage = { data: DeezerTrack[]; next?: string };

export async function fetchDeezerPlaylist(
  id: string,
  onProgress?: (fetched: number, total: number) => void,
): Promise<{ title: string; tracks: DeezerTrack[] } | null> {
  const playlist = await fetchDeezer<DeezerPlaylistDetail>(`/playlist/${id}`);
  if (!playlist) return null;

  const total = Math.min(playlist.nb_tracks || 0, MAX_PLAYLIST_TRACKS);
  const tracks: DeezerTrack[] = [];
  // The `tracks` field embedded on /playlist/{id} is capped at 400 items by
  // Deezer with no `next` cursor once truncated. The dedicated /tracks
  // collection endpoint paginates correctly through the full playlist.
  let nextUrl: string | undefined =
    `${DEEZER_API_BASE}/playlist/${id}/tracks?limit=${TRACKS_PAGE_SIZE}&index=0`;
  onProgress?.(0, total);

  while (nextUrl && tracks.length < MAX_PLAYLIST_TRACKS) {
    await sleep(PAGE_REQUEST_DELAY_MS);
    const currentUrl: string = nextUrl;
    const result: DeezerTracksPage =
      await fetchDeezerPageWithRetry<DeezerTracksPage>(currentUrl);
    tracks.push(...result.data);
    nextUrl = result.next;
    onProgress?.(Math.min(tracks.length, total), total);
  }

  return {
    title: playlist.title,
    tracks: tracks.slice(0, MAX_PLAYLIST_TRACKS),
  };
}
