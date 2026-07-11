import { revalidatePath } from "next/cache";
import { fetchDeezerPlaylist, resolveDeezerPlaylistId } from "@/lib/deezer";
import { prisma } from "@/lib/prisma";

export type ImportDestination = "playlist" | "liked";

export async function importDeezerPlaylistForUser(
  userId: string,
  link: string,
  options?: {
    destination?: ImportDestination;
    name?: string;
    onProgress?: (fetched: number, total: number) => void;
  },
) {
  const trimmedLink = link.trim();
  if (!trimmedLink) {
    throw new Error("Le lien de la playlist Deezer est requis.");
  }

  const destination = options?.destination ?? "playlist";
  const customName = options?.name?.trim();

  const playlistId = await resolveDeezerPlaylistId(trimmedLink);
  if (!playlistId) throw new Error("Ce lien de playlist Deezer est invalide.");

  const deezerPlaylist = await fetchDeezerPlaylist(
    playlistId,
    options?.onProgress,
  );
  if (!deezerPlaylist) {
    throw new Error("Impossible de récupérer cette playlist Deezer.");
  }
  // Deezer occasionally lists withdrawn/delisted tracks (negative ids,
  // missing cover art) inside otherwise valid playlists. They can't be
  // streamed anyway, so skip them instead of failing the whole import.
  const validTracks = deezerPlaylist.tracks.filter(
    (track) => track.id > 0 && track.title && track.album?.cover_medium,
  );
  if (validTracks.length === 0) {
    throw new Error("Cette playlist Deezer est vide.");
  }

  if (destination === "liked") {
    const existing = await prisma.likedTrack.findMany({
      where: {
        userId,
        deezerTrackId: { in: validTracks.map((track) => track.id) },
      },
      select: { deezerTrackId: true },
    });
    const existingIds = new Set(existing.map((track) => track.deezerTrackId));
    const newTracks = validTracks.filter((track) => !existingIds.has(track.id));

    if (newTracks.length > 0) {
      await prisma.likedTrack.createMany({
        data: newTracks.map((track) => ({
          userId,
          deezerTrackId: track.id,
          title: track.title,
          artistName: track.artist.name,
          albumTitle: track.album.title,
          albumCover: track.album.cover_medium,
          duration: track.duration,
        })),
      });
    }

    revalidatePath("/library");

    return {
      destination: "liked" as const,
      redirectTo: "/library",
      trackCount: validTracks.length,
    };
  }

  const playlist = await prisma.playlist.create({
    data: {
      userId,
      name: customName || deezerPlaylist.title || "Playlist importée",
      tracks: {
        create: validTracks.map((track) => ({
          deezerTrackId: track.id,
          title: track.title,
          artistName: track.artist.name,
          albumTitle: track.album.title,
          albumCover: track.album.cover_medium,
          duration: track.duration,
        })),
      },
    },
  });

  revalidatePath("/playlists");
  revalidatePath("/playlists/[id]", "page");

  return {
    destination: "playlist" as const,
    redirectTo: `/playlists/${playlist.id}`,
    trackCount: validTracks.length,
  };
}
