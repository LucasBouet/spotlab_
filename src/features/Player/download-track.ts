import type { PlayerTrack } from "@/features/Player/player-context";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function downloadTrack(track: PlayerTrack): Promise<void> {
  const response = await fetch(`/api/download/${track.id}`);
  if (!response.ok) {
    throw new Error("Le téléchargement du titre a échoué.");
  }

  const blob = await response.blob();
  const filename = `${sanitizeFilename(track.artist)} - ${sanitizeFilename(track.title)}.mp3`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
