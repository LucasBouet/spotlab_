import YTMusic, { type SongDetailed } from "ytmusic-api";

let clientPromise: Promise<YTMusic> | null = null;

function getClient(): Promise<YTMusic> {
  if (!clientPromise) {
    const instance = new YTMusic();
    clientPromise = instance.initialize().then(() => instance);
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

export type TrackMatchQuery = {
  title: string;
  artist: string;
  durationSeconds: number;
};

// A YT Music song is only considered "close enough" on duration if it's
// within this many seconds of the Deezer track — otherwise it's more likely
// a live version, extended mix, or unrelated video sharing a title.
const DURATION_TOLERANCE_SECONDS = 12;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCandidate(song: SongDetailed, query: TrackMatchQuery): number {
  const songTitle = normalize(song.name);
  const songArtist = normalize(song.artist.name);
  const queryTitle = normalize(query.title);
  const queryArtist = normalize(query.artist);

  let score = 0;

  if (songTitle === queryTitle) score += 3;
  else if (songTitle.includes(queryTitle) || queryTitle.includes(songTitle)) {
    score += 1.5;
  }

  if (songArtist === queryArtist) score += 3;
  else if (
    songArtist.includes(queryArtist) ||
    queryArtist.includes(songArtist)
  ) {
    score += 1.5;
  }

  if (song.duration != null) {
    const diff = Math.abs(song.duration - query.durationSeconds);
    if (diff <= DURATION_TOLERANCE_SECONDS) {
      score += 2 - diff / DURATION_TOLERANCE_SECONDS;
    } else {
      score -= 1;
    }
  }

  return score;
}

// Matches a Deezer track (title/artist/duration) to the closest YouTube
// Music song and returns its video ID, or null if nothing usable came back.
export async function findBestMatch(
  query: TrackMatchQuery,
): Promise<string | null> {
  const client = await getClient();
  const results = await client.searchSongs(`${query.artist} ${query.title}`);
  if (results.length === 0) return null;

  let best: SongDetailed | null = null;
  let bestScore = -Infinity;

  for (const song of results) {
    const score = scoreCandidate(song, query);
    if (score > bestScore) {
      bestScore = score;
      best = song;
    }
  }

  return best?.videoId ?? null;
}
