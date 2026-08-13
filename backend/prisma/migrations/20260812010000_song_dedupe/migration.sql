-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "duplicateOf" INTEGER;

-- CreateIndex
CREATE INDEX "Song_duplicateOf_idx" ON "Song"("duplicateOf");