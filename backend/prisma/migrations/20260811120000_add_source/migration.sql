-- AlterTable: thêm nguồn nhạc (jamendo / audius)
ALTER TABLE "Song" ADD COLUMN "source" TEXT DEFAULT 'jamendo';
