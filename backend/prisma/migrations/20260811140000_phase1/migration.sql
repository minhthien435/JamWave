-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "SongListen" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongListen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserArtist" (
    "userId" INTEGER NOT NULL,
    "artistName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserArtist_pkey" PRIMARY KEY ("userId","artistName")
);

-- CreateIndex
CREATE INDEX "SongListen_userId_listenedAt_idx" ON "SongListen"("userId", "listenedAt");

-- CreateIndex
CREATE INDEX "SongListen_songId_listenedAt_idx" ON "SongListen"("songId", "listenedAt");

-- CreateIndex
CREATE INDEX "UserArtist_artistName_idx" ON "UserArtist"("artistName");

-- AddForeignKey
ALTER TABLE "SongListen" ADD CONSTRAINT "SongListen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongListen" ADD CONSTRAINT "SongListen_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserArtist" ADD CONSTRAINT "UserArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

