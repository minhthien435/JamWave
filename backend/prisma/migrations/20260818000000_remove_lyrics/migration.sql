-- DropForeignKey
ALTER TABLE "Lyric" DROP CONSTRAINT "Lyric_songId_fkey";

-- DropIndex
DROP INDEX "Song_duplicateOf_idx";

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "lyrics";

-- DropTable
DROP TABLE "Lyric";

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_duplicateOf_fkey" FOREIGN KEY ("duplicateOf") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

