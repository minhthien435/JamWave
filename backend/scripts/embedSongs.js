// Tạo embedding (vector 3072) cho các bài hát chưa có, dùng Gemini embedding.
// Chạy thủ công: npm run embed   (resumable — bỏ qua bài đã có embedding)
// Dùng BATCH embed: nhiều bài / 1 HTTP request để nhanh + ít bị rate limit.
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { embedBatch, songEmbeddingText, hasKey } = require("../src/services/embeddingService");

const prisma = new PrismaClient();
const BATCH = 10; // bài / 1 lần gọi API

async function main() {
  if (!hasKey) {
    console.error("❌ Thiếu AI_API_KEY (Gemini) trong backend/.env — cần để gọi embedding.");
    process.exit(1);
  }

  const songs = await prisma.$queryRaw`SELECT id, title, artist, genre FROM "Song" WHERE "embedding" IS NULL ORDER BY id ASC`;
  console.log(`📊 Có ${songs.length} bài chưa có embedding.`);

  let ok = 0;
  let failed = 0;
  const failedLog = [];

  for (let i = 0; i < songs.length; i += BATCH) {
    const chunk = songs.slice(i, i + BATCH);
    const texts = chunk.map((s) => songEmbeddingText(s));
    const vecs = await embedBatch(texts);

    if (vecs) {
      // Map vector theo từng bài
      for (let j = 0; j < chunk.length; j += 1) {
        const vec = vecs[j];
        if (Array.isArray(vec) && vec.length > 0) {
          const list = `[${vec.join(",")}]`;
          await prisma.$executeRaw`UPDATE "Song" SET "embedding" = ${list}::vector WHERE id = ${chunk[j].id}`;
          ok += 1;
        } else {
          failed += 1;
          failedLog.push(`  #${chunk[j].id} "${chunk[j].title}"`);
        }
      }
    } else {
      failed += chunk.length;
      for (const s of chunk) failedLog.push(`  #${s.id} "${s.title}"`);
    }

    if ((i + chunk.length) % 50 < BATCH || i + chunk.length >= songs.length) {
      console.log(`  Tiến độ: ${i + chunk.length}/${songs.length} (ok: ${ok}, fail: ${failed})`);
    }
  }

  console.log(`\n✅ Xong: ${ok} bài có vector, ${failed} bài lỗi.`);
  if (failedLog.length) {
    console.log("Danh sách bài lỗi (chưa có vector, resumable — chạy lại sẽ embed):");
    console.log(failedLog.slice(0, 50).join("\n"));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });