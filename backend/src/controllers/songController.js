const prisma = require("../lib/prisma");
const { getRadioSongs, semanticSearch, enrichQueryForSemantic } = require("../services/aiTools");

// Lấy danh sách bài hát, hỗ trợ tìm kiếm theo q (title / artist) + lọc genre / year / country + phân trang
const getSongs = async (req, res) => {
  try {
    const { q, genre, year, country, sort } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = { duplicateOf: null };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
      ];
    }

    if (genre) {
      where.genre = { contains: genre, mode: "insensitive" };
    }

    const releaseYear = parseInt(year);
    if (year && !isNaN(releaseYear)) {
      where.releaseYear = releaseYear;
    }

    // Lọc quốc gia: gián tiếp qua tên nghệ sĩ có trong ArtistMeta (country = mã ISO)
    if (country) {
      const names = await prisma.artistMeta.findMany({
        where: { country: { contains: country, mode: "insensitive" } },
        select: { name: true },
      });
      where.artist = { in: names.length > 0 ? names.map((a) => a.name) : ["__no_match__"] };
    }

    const orderBy =
      sort === "year_desc"
        ? [{ releaseYear: "desc" }, { id: "asc" }]
        : sort === "year_asc"
        ? [{ releaseYear: "asc" }, { id: "asc" }]
        : sort === "title"
        ? [{ title: "asc" }]
        : [{ id: "asc" }];

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy,
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

// Lấy các nhãn lọc (facet) cho Browse: thể loại / năm / quốc gia kèm số lượng
const getFacets = async (req, res) => {
  try {
    const [genreGroups, yearGroups, countryGroups] = await Promise.all([
      prisma.song.groupBy({
        by: ["genre"],
        where: { duplicateOf: null, genre: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { genre: "desc" } },
        take: 40,
      }),
      prisma.song.groupBy({
        by: ["releaseYear"],
        where: { duplicateOf: null, releaseYear: { not: null } },
        _count: { _all: true },
        orderBy: { releaseYear: "desc" },
        take: 60,
      }),
      prisma.artistMeta.groupBy({
        by: ["country"],
        where: { country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 40,
      }),
    ]);

    const genres = genreGroups
      .filter((g) => g.genre)
      .map((g) => ({ value: g.genre, count: g._count._all }));
    const years = yearGroups
      .filter((y) => y.releaseYear)
      .map((y) => ({ value: y.releaseYear, count: y._count._all }));
    const countries = countryGroups
      .filter((c) => c.country)
      .map((c) => ({ value: c.country, count: c._count._all }));

    res.json({ genres, years, countries });
  } catch (error) {
    console.error("Error to fetch facets:", error);
    res.status(500).json({ error: "Error to fetch facets" });
  }
};

// Lấy bài hát ngẫu nhiên (cho nút "Phát ngẫu nhiên")
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

// Radio: chuỗi bài tương tự 1 bài (ưu tiên semantic embedding, fallback genre)
const getSongRadio = async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 50);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const seed = await prisma.song.findUnique({ where: { id: songId } });
    if (!seed) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    const radio = await getRadioSongs(seed, limit);
    return res.json({
      seed: { id: seed.id, title: seed.title, artist: seed.artist },
      songs: radio,
    });
  } catch (error) {
    console.error("Error to fetch radio:", error);
    res.status(500).json({ error: "Error to fetch radio" });
  }
};

// Mood: tìm bài theo tâm trạng/vibe bằng semantic embedding (fallback: genre keyword)
const getMoodSongs = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

    if (!q) {
      return res.status(400).json({ error: "Thiếu từ khóa tâm trạng" });
    }

    let songs = await semanticSearch(q, limit);

    // Fallback: nếu embedding không trả kết quả, lọc theo genre keyword đã enrich
    if (songs.length === 0) {
      const enriched = enrichQueryForSemantic(q);
      const words = enriched.split(" ").map((w) => w.trim()).filter(Boolean);
      if (words.length > 0) {
        songs = await prisma.song.findMany({
          where: {
            duplicateOf: null,
            OR: words.map((w) => ({ genre: { contains: w, mode: "insensitive" } })),
          },
          take: limit,
        });
      }
    }

    return res.json({ mood: q, songs });
  } catch (error) {
    console.error("Error to fetch mood songs:", error);
    res.status(500).json({ error: "Error to fetch mood songs" });
  }
};

module.exports = {
  getSongs,
  getFacets,
  getRandomSongs,
  getSongRadio,
  getMoodSongs,
};
