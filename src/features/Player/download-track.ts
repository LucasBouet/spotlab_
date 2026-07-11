import type { PlayerTrack } from "@/features/Player/player-context";

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/wav": "wav",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function downloadTrack(track: PlayerTrack): Promise<void> {
  const response = await fetch(`/api/stream/${track.id}`);
  if (!response.ok) {
    throw new Error("Le téléchargement du titre a échoué.");
  }

  const blob = await response.blob();
  const extension =
    EXTENSION_BY_CONTENT_TYPE[response.headers.get("content-type") ?? ""] ??
    "mp3";
  const filename = `${sanitizeFilename(track.artist)} - ${sanitizeFilename(track.title)}.${extension}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
