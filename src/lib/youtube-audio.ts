import { readdir } from "node:fs/promises";
import path from "node:path";
import ytdlp from "yt-dlp-exec";

// yt-dlp writes progress/resume state into these sidecar files while a
// download is in flight (and leaves a `.part` behind on failure so the next
// attempt can resume) — never mistake one of these for a finished download.
const INCOMPLETE_SUFFIXES = [".part", ".ytdl"];

export function isIncompleteCacheFile(fileName: string): boolean {
  return INCOMPLETE_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

// Downloads the best available audio-only stream for a YouTube video ID
// straight to <destDir>/<baseName>.<ext> via yt-dlp — it picks the real
// extension based on whichever format YouTube actually serves (typically
// .webm or .m4a) and handles retries/signature deciphering/client selection
// internally, which is why this app shells out to it rather than
// reimplementing that logic. No transcoding (no ffmpeg dependency): the
// container YouTube serves is kept as-is.
export async function downloadAudio(
  videoId: string,
  destDir: string,
  baseName: string,
): Promise<string> {
  await ytdlp(`https://www.youtube.com/watch?v=${videoId}`, {
    output: path.join(destDir, `${baseName}.%(ext)s`),
    format: "bestaudio/best",
    noPlaylist: true,
    noWarnings: true,
    quiet: true,
  });

  const entries = await readdir(destDir);
  const match = entries.find(
    (name) => name.startsWith(`${baseName}.`) && !isIncompleteCacheFile(name),
  );
  if (!match) {
    throw new Error("yt-dlp n'a produit aucun fichier audio.");
  }
  return path.join(destDir, match);
}
