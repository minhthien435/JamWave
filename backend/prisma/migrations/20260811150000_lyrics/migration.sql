-- CreateTable
CREATE TABLE "Lyric" (
    "id" SERIAL NOT NULL,
    "songId" INTEGER NOT NULL,
    "plainLyrics" TEXT,
    "syncedLyrics" TEXT,
    "instrumental" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lyric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lyric_songId_key" ON "Lyric"("songId");

-- CreateIndex
CREATE INDEX "Lyric_fetchedAt_idx" ON "Lyric"("fetchedAt");

-- AddForeignKey
ALTER TABLE "Lyric" ADD CONSTRAINT "Lyric_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

