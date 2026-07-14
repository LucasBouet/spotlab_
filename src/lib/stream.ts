import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { type DeezerTrack, fetchDeezer } from "@/lib/deezer";
import {
  completedDownload,
  isIncompleteCacheFile,
  startDownload,
  type TrackDownload,
  tailTrackDownload,
} from "@/lib/youtube-audio";
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

async function startTrackDownload(id: string): Promise<TrackDownload> {
  // Another request may have finished caching this exact track while we
  // were waiting to be scheduled (e.g. a prefetch racing the actual
  // playback request) — skip the redundant work if so.
  const existing = await findExistingCacheFile(id);
  if (existing) return completedDownload(existing);

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
  return startDownload(videoId, CACHE_DIR, id);
}

// Per-track de-dupe so a prefetch racing the real playback request (or two
// devices starting the same track at once) share one download instead of
// each kicking off their own. Keyed on the promise that resolves once the
// yt-dlp process has actually been spawned, so two calls arriving before
// that happens still collapse onto the same download (the map entry is set
// synchronously, before the metadata lookup above ever awaits).
const inFlight = new Map<string, Promise<TrackDownload>>();

function getOrStartDownload(id: string): Promise<TrackDownload> {
  const pending = inFlight.get(id);
  if (pending) return pending;

  const promise = startTrackDownload(id);
  inFlight.set(id, promise);

  promise
    .then((download) => download.waitForDone())
    .catch(() => {})
    .finally(() => inFlight.delete(id));

  return promise;
}

export async function resolveTrackFile(id: string): Promise<string> {
  const existing = await findExistingCacheFile(id);
  if (existing) return existing;

  const download = await getOrStartDownload(id);
  return download.waitForDone();
}

export type TrackStreamResult =
  | { kind: "file"; filePath: string }
  | {
      kind: "live";
      contentType: string;
      read: () => AsyncGenerator<Buffer>;
    };

// Like resolveTrackFile, but for a track that isn't cached yet, returns a
// live stream that starts producing bytes as soon as yt-dlp has picked a
// format — instead of making the caller wait for the entire download (which
// is what made first-time playback slow, especially over a mobile network).
export async function openTrackStream(id: string): Promise<TrackStreamResult> {
  const existing = await findExistingCacheFile(id);
  if (existing) return { kind: "file", filePath: existing };

  const download = await getOrStartDownload(id);
  if (download.finished && download.filePath) {
    return { kind: "file", filePath: download.filePath };
  }

  await download.waitForExt();

  return {
    kind: "live",
    contentType: download.contentType ?? "application/octet-stream",
    read: () => tailTrackDownload(download),
  };
}
