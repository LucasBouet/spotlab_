import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { createWriteStream } from "node:fs";
import { open, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

const YT_DLP_BIN = path.join(
  process.cwd(),
  "node_modules",
  "yt-dlp-exec",
  "bin",
  "yt-dlp",
);

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  webm: "audio/webm",
};

// yt-dlp writes progress/resume state into these sidecar files while a
// download is in flight (and leaves a `.part` behind on failure so the next
// attempt can resume), and the ext sidecar below briefly exists before the
// real cache file does — never mistake one of these for a finished download.
const INCOMPLETE_SUFFIXES = [".part", ".ytdl", ".ext.tmp"];

export function isIncompleteCacheFile(fileName: string): boolean {
  return INCOMPLETE_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

function contentTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

// Represents one yt-dlp invocation for a given track: bytes arrive from the
// process' stdout and are written to a `.part` file on disk as they come in,
// while `progress`/`done` events let an HTTP response tail that same file and
// start playback long before the whole track has finished downloading. Once
// the process exits cleanly the `.part` file is renamed to its final name —
// existing readers keep the same fd (rename doesn't invalidate it) so they
// don't notice the swap.
export class TrackDownload extends EventEmitter {
  filePath: string | null = null;
  contentType: string | null = null;
  bytesWritten = 0;
  finished = false;
  error: Error | null = null;

  // Resolves once the target format is known and the on-disk file has been
  // created (i.e. `filePath`/`contentType` are populated), or rejects if the
  // download fails before getting that far.
  waitForExt(): Promise<void> {
    if (this.filePath) return Promise.resolve();
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      this.once("ext", resolve);
      this.once("error", reject);
    });
  }

  // Resolves with the final file path once the download completes.
  waitForDone(): Promise<string> {
    if (this.finished && this.filePath) return Promise.resolve(this.filePath);
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      this.once("done", () => resolve(this.filePath as string));
      this.once("error", reject);
    });
  }

  // Resolves the next time new bytes are available (or the download
  // finishes/fails) — used by tailers to wake back up after catching up to
  // whatever has been written so far.
  waitForProgress(): Promise<void> {
    if (this.finished || this.error) return Promise.resolve();
    return new Promise((resolve) => {
      this.once("progress", resolve);
      this.once("done", resolve);
      this.once("error", resolve);
    });
  }
}

// Wraps a file that's already fully cached in the same TrackDownload shape,
// so callers don't need to special-case "someone else just finished caching
// this" versus "still downloading" — used to close the race where a track
// finishes caching in the gap between a cache-miss check and reserving a new
// download for the same id.
export async function completedDownload(
  filePath: string,
): Promise<TrackDownload> {
  const { size } = await stat(filePath);
  const download = new TrackDownload();
  download.filePath = filePath;
  download.contentType = contentTypeForFile(filePath);
  download.bytesWritten = size;
  download.finished = true;
  return download;
}

// Starts downloading the best available audio-only stream for a YouTube
// video ID to <destDir>/<baseName>.<ext>, exposing the bytes as they arrive
// so a caller can start reading immediately instead of waiting for the whole
// file. No transcoding (no ffmpeg dependency): the container YouTube serves
// is written straight through as-is.
//
// The extension isn't known until yt-dlp has picked a format, so it's
// captured via `--print-to-file` into a small sidecar next to the track
// (yt-dlp writes this *before* it starts producing media bytes on stdout,
// since it happens right after format selection) rather than needing a
// second yt-dlp invocation just to ask.
export function startDownload(
  videoId: string,
  destDir: string,
  baseName: string,
): TrackDownload {
  const download = new TrackDownload();
  const extSidecar = path.join(destDir, `${baseName}.ext.tmp`);
  const pendingChunks: Buffer[] = [];
  let writeStream: ReturnType<typeof createWriteStream> | null = null;
  let stderr = "";
  let extPollTimer: ReturnType<typeof setInterval> | null = null;
  let failed = false;

  function fail(detail: string | Error) {
    if (failed) return;
    failed = true;
    const message = detail instanceof Error ? detail.message : detail;
    console.error(`Failed to cache track ${baseName}:`, detail);
    const err = new Error(`Le téléchargement du titre a échoué : ${message}`);
    download.error = err;
    if (extPollTimer) {
      clearInterval(extPollTimer);
      extPollTimer = null;
    }
    writeStream?.destroy();
    child.kill();
    download.emit("error", err);
  }

  async function tryOpenWriteStream(): Promise<boolean> {
    if (writeStream) return true;
    let ext: string;
    try {
      ext = (await readFile(extSidecar, "utf8")).trim();
      if (!ext) return false;
    } catch {
      return false;
    }
    await rm(extSidecar, { force: true }).catch(() => {});

    const partPath = path.join(destDir, `${baseName}.${ext}.part`);
    const ws = createWriteStream(partPath);
    ws.on("error", fail);
    writeStream = ws;
    download.filePath = partPath;
    download.contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    for (const chunk of pendingChunks.splice(0)) {
      ws.write(chunk);
      download.bytesWritten += chunk.length;
    }
    download.emit("ext");
    return true;
  }

  extPollTimer = setInterval(() => {
    tryOpenWriteStream().then((opened) => {
      if (opened && extPollTimer) {
        clearInterval(extPollTimer);
        extPollTimer = null;
      }
    });
  }, 75);

  const child = spawn(YT_DLP_BIN, [
    `https://www.youtube.com/watch?v=${videoId}`,
    "-o",
    "-",
    "--format",
    "bestaudio/best",
    "--no-playlist",
    "--no-warnings",
    "--quiet",
    "--print-to-file",
    "%(ext)s",
    extSidecar,
  ]);

  child.stdout.on("data", (chunk: Buffer) => {
    if (writeStream) {
      writeStream.write(chunk);
      download.bytesWritten += chunk.length;
      download.emit("progress");
    } else {
      pendingChunks.push(chunk);
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  child.on("error", fail);

  child.on("close", (code) => {
    if (extPollTimer) {
      clearInterval(extPollTimer);
      extPollTimer = null;
    }
    if (code !== 0) {
      fail(stderr.trim() || `yt-dlp a quitté avec le code ${code}.`);
      return;
    }
    if (!writeStream || !download.filePath) {
      fail("yt-dlp n'a produit aucun fichier audio.");
      return;
    }

    const partPath = download.filePath;
    const finalPath = partPath.slice(0, -".part".length);
    writeStream.end(() => {
      rename(partPath, finalPath)
        .then(() => {
          download.filePath = finalPath;
          download.finished = true;
          download.emit("done");
          download.emit("progress");
        })
        .catch(fail);
    });
  });

  return download;
}

// Reads a track download from the start, following along as new bytes are
// written to disk and stopping once the download is finished — lets an HTTP
// response start streaming a track before it's fully cached.
export async function* tailTrackDownload(
  download: TrackDownload,
): AsyncGenerator<Buffer> {
  if (!download.filePath) await download.waitForExt();
  const filePath = download.filePath as string;

  const fd = await open(filePath, "r");
  try {
    let position = 0;
    const chunkSize = 256 * 1024;
    const buffer = Buffer.alloc(chunkSize);
    while (true) {
      if (position < download.bytesWritten) {
        const { bytesRead } = await fd.read(buffer, 0, chunkSize, position);
        if (bytesRead > 0) {
          position += bytesRead;
          yield Buffer.from(buffer.subarray(0, bytesRead));
          continue;
        }
      }

      if (download.error) throw download.error;
      if (download.finished && position >= download.bytesWritten) break;

      await download.waitForProgress();
    }
  } finally {
    await fd.close();
  }
}
