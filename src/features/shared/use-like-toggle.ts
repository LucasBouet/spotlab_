import { useState } from "react";
import { likeTrack, unlikeTrack } from "@/features/Library/actions";
import type { DeezerTrack } from "@/lib/deezer";

export function useLikeToggle(initialLikedTrackIds: number[]) {
  const [likedTrackIds, setLikedTrackIds] = useState(
    () => new Set(initialLikedTrackIds),
  );

  async function toggleLike(track: DeezerTrack) {
    const isLiked = likedTrackIds.has(track.id);

    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });

    try {
      if (isLiked) {
        await unlikeTrack(track.id);
      } else {
        await likeTrack({
          deezerTrackId: track.id,
          title: track.title,
          artistName: track.artist.name,
          albumTitle: track.album.title,
          albumCover: track.album.cover_medium,
          duration: track.duration,
        });
      }
    } catch {
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(track.id);
        } else {
          next.delete(track.id);
        }
        return next;
      });
    }
  }

  return { likedTrackIds, toggleLike };
}
