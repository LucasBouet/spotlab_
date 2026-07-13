import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { type DeezerTrack, fetchDeezer } from "@/lib/deezer";
import { downloadAudio, isIncompleteCacheFile } from "@/lib/youtube-audio";
import { findBestMatch } from "@/lib/ytmusic";

const CACHE_DIR = process.env.STREAM_CACHE_DIR
  ? path.resolve(process.env.STREAM_CACHE_DIR)
  : path.resolve(process.cwd(), "cache", "songs");

let cacheDirReady: Promise<void> | null = null;
function ensureCacheDir(): Promise<void> {
  if (!cacheDirReady) {
    cacheDirReady = mkdir(CACHE_DIR, { recursive: true }).then(() => undefined);
  }
  return cacheDirReady;
}

async function findExistingCacheFile(trackId: string): Promise<string | null> {
  await ensureCacheDir();
  const entries = await readdir(CACHE_DIR).catch(() => [] as string[]);
  const match = entries.find(
    (name) => name.startsWith(`${trackId}.`) && !isIncompleteCacheFile(name),
  );
  if (!match) return null;

  const filePath = path.join(CACHE_DIR, match);
  const exists = await stat(filePath)
    .then(() => true)
    .catch(() => false);
  return exists ? filePath : null;
}

async function downloadTrack(id: string): Promise<string> {
  // Another request may have finished caching this exact track while we
  // were waiting to be scheduled (e.g. a prefetch racing the actual
  // playback request) — skip the redundant work if so.
  const existing = await findExistingCacheFile(id);
  if (existing) return existing;

  const track = await fetchDeezer<DeezerTrack>(`/track/${id}`);
  if (!track) {
    throw new Error("Ce titre est introuvable.");
  }

  const videoId = await findBestMatch({
    title: track.title,
    artist: track.artist.name,
    durationSeconds: track.duration,
  });
  if (!videoId) {
    throw new Error("Aucune correspondance trouvée sur YouTube Music.");
  }

  await ensureCacheDir();

  try {
    return await downloadAudio(videoId, CACHE_DIR, id);
  } catch (err) {
    console.error(`Failed to cache track ${id}:`, err);
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Le téléchargement du titre a échoué : ${detail}`);
  }
}

// Per-track de-dupe so a prefetch racing the real playback request (or two
// devices starting the same track at once) share one download instead of
// each kicking off their own.
const inFlight = new Map<string, Promise<string>>();

export async function resolveTrackFile(id: string): Promise<string> {
  const existing = await findExistingCacheFile(id);
  if (existing) return existing;

  const pending = inFlight.get(id);
  if (pending) return pending;

  const promise = downloadTrack(id).finally(() => {
    inFlight.delete(id);
  });
  inFlight.set(id, promise);
  return promise;
}
