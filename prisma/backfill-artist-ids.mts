import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./prisma_db/index.js";

// One-off backfill: liked/playlist tracks stored before artist-id support have
// `artistId = null`, so their artist name isn't clickable. This walks every
// distinct Deezer track id still missing an artist id, asks Deezer for it, and
// fills the rows in. Safe to re-run: it only ever touches rows still null.
//
// Run with:  node prisma/backfill-artist-ids.mts

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// Deezer rate-limits to ~50 requests / 5s; stay well under that.
const REQUEST_DELAY_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArtistId(deezerTrackId: number): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.deezer.com/track/${deezerTrackId}`,
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const artistId = payload?.artist?.id;
    return typeof artistId === "number" ? artistId : null;
  } catch {
    return null;
  }
}

async function main() {
  const [likedRows, playlistRows] = await Promise.all([
    prisma.likedTrack.findMany({
      where: { artistId: null },
      select: { deezerTrackId: true },
    }),
    prisma.playlistTrack.findMany({
      where: { artistId: null },
      select: { deezerTrackId: true },
    }),
  ]);

  const trackIds = [
    ...new Set([
      ...likedRows.map((row) => row.deezerTrackId),
      ...playlistRows.map((row) => row.deezerTrackId),
    ]),
  ].filter((id) => id > 0);

  if (trackIds.length === 0) {
    console.log("Rien à mettre à jour : tous les titres ont déjà un artistId.");
    return;
  }

  console.log(
    `${trackIds.length} titre(s) distinct(s) à résoudre via Deezer...`,
  );

  let updated = 0;
  let missed = 0;

  for (const deezerTrackId of trackIds) {
    const artistId = await fetchArtistId(deezerTrackId);
    if (artistId === null) {
      missed += 1;
    } else {
      await Promise.all([
        prisma.likedTrack.updateMany({
          where: { deezerTrackId, artistId: null },
          data: { artistId },
        }),
        prisma.playlistTrack.updateMany({
          where: { deezerTrackId, artistId: null },
          data: { artistId },
        }),
      ]);
      updated += 1;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(
    `Terminé : ${updated} titre(s) mis à jour, ${missed} introuvable(s) sur Deezer.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
