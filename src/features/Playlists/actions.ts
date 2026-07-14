"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type PlaylistTrackInput = {
  deezerTrackId: number;
  title: string;
  artistName: string;
  artistId?: number;
  albumTitle: string;
  albumCover: string;
  duration: number;
};

function revalidatePlaylists() {
  revalidatePath("/playlists");
  revalidatePath("/playlists/[id]", "page");
}

export async function createPlaylist(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom de la playlist est requis.");

  const playlist = await prisma.playlist.create({
    data: { userId: user.id, name: trimmed },
  });

  revalidatePlaylists();
  return { id: playlist.id, name: playlist.name };
}

export async function renamePlaylist(playlistId: string, name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom de la playlist est requis.");

  await prisma.playlist.updateMany({
    where: { id: playlistId, userId: user.id },
    data: { name: trimmed },
  });

  revalidatePlaylists();
}

export async function deletePlaylist(playlistId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  await prisma.playlist.deleteMany({
    where: { id: playlistId, userId: user.id },
  });

  revalidatePlaylists();
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: PlaylistTrackInput,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId: user.id },
    select: { id: true },
  });
  if (!playlist) throw new Error("Playlist introuvable.");

  await prisma.playlistTrack.create({
    data: { playlistId, ...track },
  });

  revalidatePlaylists();
}

export async function removeTrackFromPlaylist(playlistTrackId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  await prisma.playlistTrack.deleteMany({
    where: { id: playlistTrackId, playlist: { userId: user.id } },
  });

  revalidatePlaylists();
}

export async function getPlaylistMembership(deezerTrackId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tracks: { where: { deezerTrackId }, select: { id: true }, take: 1 },
    },
  });

  return playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    hasTrack: playlist.tracks.length > 0,
  }));
}

export async function togglePlaylistTrack(
  playlistId: string,
  track: PlaylistTrackInput,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId: user.id },
    select: { id: true },
  });
  if (!playlist) throw new Error("Playlist introuvable.");

  const existing = await prisma.playlistTrack.findFirst({
    where: { playlistId, deezerTrackId: track.deezerTrackId },
    select: { id: true },
  });

  if (existing) {
    await prisma.playlistTrack.delete({ where: { id: existing.id } });
    revalidatePlaylists();
    return false;
  }

  await prisma.playlistTrack.create({ data: { playlistId, ...track } });
  revalidatePlaylists();
  return true;
}
