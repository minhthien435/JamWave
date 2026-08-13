-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "mbid" TEXT,
ADD COLUMN     "isrc" TEXT,
ADD COLUMN     "artistMbid" TEXT;

-- CreateTable
CREATE TABLE "ArtistMeta" (
    "artistMbid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "country" TEXT,
    "yearRange" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistMeta_pkey" PRIMARY KEY ("artistMbid")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistMeta_name_key" ON "ArtistMeta"("name");