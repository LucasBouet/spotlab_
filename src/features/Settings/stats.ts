import { prisma } from "@/lib/prisma";

export type StatEntry = {
  label: string;
  sublabel?: string;
  cover?: string;
  count: number;
};

export type ListeningStats = {
  totalPlays: number;
  totalSeconds: number;
  topTracks: StatEntry[];
  topAlbums: StatEntry[];
  topGenres: StatEntry[];
};

const TOP_LIMIT = 10;

// Raw-query row shapes. COUNT(*) can come back as a bigint through the SQLite
// adapter, so `count` is coerced with Number() at the mapping step below.
type TrackRow = {
  title: string;
  artistName: string;
  albumCover: string;
  count: number | bigint;
};
type AlbumRow = {
  albumTitle: string;
  artistName: string;
  albumCover: string;
  count: number | bigint;
};
type GenreRow = { genreName: string; count: number | bigint };

// Aggregates a user's play log into the settings "Statistiques" tab. Rankings
// are by play count (each PlayEvent row is one qualified play); the total time
// sums the credited full durations. Genres come from a join onto the lazily
// populated TrackGenre cache, so a track played before its genre resolved (or
// with no genre on Deezer) simply doesn't contribute to the genre ranking.
export async function getListeningStats(
  userId: string,
): Promise<ListeningStats> {
  const [totals, topTracks, topAlbums, topGenres] = await Promise.all([
    prisma.playEvent.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { duration: true },
    }),
    prisma.$queryRaw<TrackRow[]>`
      SELECT "title", "artistName", "albumCover", COUNT(*) AS count
      FROM "PlayEvent"
      WHERE "userId" = ${userId}
      GROUP BY "deezerTrackId"
      ORDER BY count DESC, MAX("createdAt") DESC
      LIMIT ${TOP_LIMIT}`,
    prisma.$queryRaw<AlbumRow[]>`
      SELECT "albumTitle", "artistName", "albumCover", COUNT(*) AS count
      FROM "PlayEvent"
      WHERE "userId" = ${userId}
      GROUP BY "albumTitle", "artistName"
      ORDER BY count DESC, MAX("createdAt") DESC
      LIMIT ${TOP_LIMIT}`,
    prisma.$queryRaw<GenreRow[]>`
      SELECT g."genreName" AS "genreName", COUNT(*) AS count
      FROM "PlayEvent" p
      JOIN "TrackGenre" g ON g."deezerTrackId" = p."deezerTrackId"
      WHERE p."userId" = ${userId} AND g."genreName" IS NOT NULL
      GROUP BY g."genreName"
      ORDER BY count DESC
      LIMIT ${TOP_LIMIT}`,
  ]);

  return {
    totalPlays: totals._count._all,
    totalSeconds: totals._sum.duration ?? 0,
    topTracks: topTracks.map((row) => ({
      label: row.title,
      sublabel: row.artistName,
      cover: row.albumCover,
      count: Number(row.count),
    })),
    topAlbums: topAlbums.map((row) => ({
      label: row.albumTitle,
      sublabel: row.artistName,
      cover: row.albumCover,
      count: Number(row.count),
    })),
    topGenres: topGenres.map((row) => ({
      label: row.genreName,
      count: Number(row.count),
    })),
  };
}
