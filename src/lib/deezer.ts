const DEEZER_API_BASE = "https://api.deezer.com";

export type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  artist: { name: string };
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

export async function fetchDeezer<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${DEEZER_API_BASE}${path}`, { cache: "no-store" });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const payload = await response.json();
  if (payload?.error) return null;

  return payload as T;
}
