const prisma = require("../lib/prisma");

// Wrapped: thống kê nghe cá nhân theo giai đoạn (week / month / year / all)
const getWrapped = async (req, res) => {
  try {
    const userId = req.user.userId;
    const period = ["week", "month", "year", "all"].includes(req.query.period) ? req.query.period : "all";

    const now = new Date();
    const since = new Date(now);
    if (period === "week") since.setDate(since.getDate() - 7);
    else if (period === "month") since.setMonth(since.getMonth() - 1);
    else if (period === "year") since.setFullYear(since.getFullYear() - 1);

    const where = period === "all" ? { userId } : { userId, listenedAt: { gte: since } };

    const listens = await prisma.songListen.findMany({
      where,
      include: { song: { select: { id: true, title: true, artist: true, albumCover: true, duration: true, genre: true, source: true } } },
      orderBy: { listenedAt: "asc" },
    });

    if (listens.length === 0) {
      return res.status(200).json({
        period,
        totalListens: 0,
        minutesListened: 0,
        uniqueSongs: 0,
        topSongs: [],
        topArtists: [],
        topGenres: [],
      });
    }

    // Tổng thời gian nghe (dùng duration thật của bài, quy đổi phút)
    const minutesListened = Math.round(
      listens.reduce((sum, l) => sum + (l.song.duration || 0), 0) / 60
    );

    // Top bài hát
    const songCount = new Map();
    for (const l of listens) {
      const key = l.songId;
      if (!songCount.has(key)) songCount.set(key, { song: l.song, count: 0 });
      songCount.get(key).count += 1;
    }
    const topSongs = [...songCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ song, count }) => ({ ...song, listenCount: count }));

    // Top nghệ sĩ
    const artistCount = new Map();
    for (const l of listens) {
      const key = l.song.artist;
      if (!artistCount.has(key)) artistCount.set(key, { artist: key, count: 0, albumCover: l.song.albumCover });
      artistCount.get(key).count += 1;
    }
    const topArtists = [...artistCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((a) => ({ name: a.artist, listenCount: a.count, coverImg: a.albumCover }));

    // Top thể loại (từ genre của bài đã nghe)
    const genreCount = new Map();
    for (const l of listens) {
      if (!l.song.genre) continue;
      for (const g of l.song.genre.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      }
    }
    const topGenres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, count]) => ({ genre, count }));

    return res.status(200).json({
      period,
      totalListens: listens.length,
      minutesListened,
      uniqueSongs: songCount.size,
      firstListenAt: listens[0]?.listenedAt || null,
      lastListenAt: listens[listens.length - 1]?.listenedAt || null,
      topSongs,
      topArtists,
      topGenres,
    });
  } catch (error) {
    console.error("Lỗi lấy wrapped:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy thống kê nghe" });
  }
};

module.exports = { getWrapped };