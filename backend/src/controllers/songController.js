const prisma = require("../lib/prisma");

// Lấy danh sách bài hát, hỗ trợ tìm kiếm theo q (title / artist) + phân trang
const getSongs = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = q
      ? {
          duplicateOf: null,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { artist: { contains: q, mode: "insensitive" } },
          ],
        }
      : { duplicateOf: null };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy: { id: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.song.count({ where }),
    ]);

    res.json({ songs, total, limit, offset });
  } catch (error) {
    console.error("Error to fetch song data:", error);
    res.status(500).json({ error: "Error to fetch song data" });
  }
};

// Lấy danh sách bài hát ngẫu nhiên (cho nút "Phát ngẫu nhiên")
const getRandomSongs = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const songs = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Song" WHERE "duplicateOf" IS NULL ORDER BY RANDOM() LIMIT ${limit}`
    );

    res.json(songs);
  } catch (error) {
    console.error("Error to fetch random songs:", error);
    res.status(500).json({ error: "Error to fetch random songs" });
  }
};

module.exports = {
  getSongs,
  getRandomSongs,
};
