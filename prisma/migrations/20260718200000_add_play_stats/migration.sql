-- CreateTable
CREATE TABLE "PlayEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deezerTrackId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "artistId" INTEGER,
    "albumTitle" TEXT NOT NULL,
    "albumCover" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayEvent_userId_idx" ON "PlayEvent"("userId");

-- CreateIndex
CREATE INDEX "PlayEvent_userId_deezerTrackId_idx" ON "PlayEvent"("userId", "deezerTrackId");

-- CreateTable
CREATE TABLE "TrackGenre" (
    "deezerTrackId" INTEGER NOT NULL PRIMARY KEY,
    "albumId" INTEGER,
    "genreId" INTEGER,
    "genreName" TEXT,
    "updatedAt" DATETIME NOT NULL
);
