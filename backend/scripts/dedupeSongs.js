// Khử trùng bài hát: nhóm các bài là cùng một track KHÁC NGUỒN (Jamendo vs Audius)
// và đánh dấu duplicateOf -> bài "chính" được giữ. Resumable, không xóa dữ liệu.
// Chỉ merge khi một nhóm có NHIỀU NGUỒN khác nhau (tránh gộp nhầm 2 bài cùng tên
// từ cùng một nguồn — thường là 2 bài khác nhau).
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const prisma = new PrismaClient();

// Chuẩn hóa title/artist để so khớp (in thường, bỏ dấu, bỏ ký tự đặc biệt)
function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Hạng ưu tiên: jamendo (full-length) > audius; dài hơn > ngắn hơn
function preference(a, b) {
  const sa = a.source === "jamendo" ? 0 : 1;
  const sb = b.source === "jamendo" ? 0 : 1;
  if (sa !== sb) return sa - sb;
  return (b.duration || 0) - (a.duration || 0);
}

async function main() {
  console.log("🧹 Bắt đầu khử trùng bài hát (chỉ cross-source)...");
  const songs = await prisma.song.findMany({
    select: { id: true, title: true, artist: true, source: true, duration: true, mbid: true },
    orderBy: { id: "asc" },
  });

  // Nhóm theo key: ưu tiên mbid nếu có, ngược lại (chuẩn hóa title|artist)
  const groups = new Map();
  for (const s of songs) {
    const key = s.mbid ? `mb:${s.mbid}` : `t:${norm(s.title)}|${norm(s.artist)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  let duplicateCount = 0;
  let groupCount = 0;

  for (const [key, group] of groups) {
    if (group.length <= 1) continue;
    // CHỈ merge khi có nhiều nguồn khác nhau trong nhóm
    const sources = new Set(group.map((s) => s.source));
    if (sources.size <= 1) continue;
    groupCount += 1;

    // Chọn bài chính (ưu tiên jamendo, sau đó bài dài hơn)
    const primary = [...group].sort(preference)[0];
    const rest = group.filter((s) => s.id !== primary.id);

    for (const dup of rest) {
      await prisma.song.update({
        where: { id: dup.id },
        data: { duplicateOf: primary.id },
      });
      duplicateCount += 1;
    }
    console.log(`  Nhóm "${group[0].title}" (${[...sources].join("+")}) -> giữ #${primary.id} (${primary.source}), đánh dấu ${rest.length} bản trùng`);
  }

  console.log(`\n✅ Xong: ${groupCount} nhóm trùng cross-source, đánh dấu ${duplicateCount} bài là duplicate.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });