const prisma = require("../lib/prisma");

// Ghi lại lượt nghe (PlayerBar gọi mỗi khi đổi bài)
const recordListen = async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = parseInt(req.params.id);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
    if (!song) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    await prisma.songListen.create({
      data: { userId, songId },
    });

    return res.status(201).json({ message: "Đã ghi nhận lượt nghe" });
  } catch (error) {
    console.error("Lỗi ghi lượt nghe:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi ghi lượt nghe" });
  }
};

// Bài hát nghe gần đây của người dùng (mỗi bài 1 lần, mới nhất trước)
const getRecentListens = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const listens = await prisma.songListen.findMany({
      where: { userId },
      include: { song: true },
      orderBy: { listenedAt: "desc" },
      take: Math.min(limit * 10, 200),
    });

    // Lọc trùng bài: giữ bản nghe mới nhất của mỗi bài
    const seen = new Set();
    const songs = [];
    for (const l of listens) {
      if (seen.has(l.songId)) continue;
      seen.add(l.songId);
      songs.push(l.song);
      if (songs.length >= limit) break;
    }

    return res.status(200).json(songs);
  } catch (error) {
    console.error("Lỗi lấy bài nghe gần đây:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy lịch sử nghe" });
  }
};

// Top bài hát được nghe nhiều nhất (global) theo tuần / tháng
const getTopListens = async (req, res) => {
  try {
    const period = req.query.period === "month" ? "month" : "week";
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const now = new Date();
    const since = new Date(now);
    if (period === "month") since.setMonth(since.getMonth() - 1);
    else since.setDate(since.getDate() - 7);

    const top = await prisma.songListen.groupBy({
      by: ["songId"],
      where: { listenedAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { songId: "desc" } },
      take: limit,
    });

    const songs = await prisma.song.findMany({
      where: { id: { in: top.map((t) => t.songId) }, duplicateOf: null },
    });

    const songMap = new Map(songs.map((s) => [s.id, s]));
    const result = top
      .filter((t) => songMap.has(t.songId))
      .map((t) => ({ ...songMap.get(t.songId), listenCount: t._count._all }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi lấy top bài nghe nhiều:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy top bài hát" });
  }
};

module.exports = {
  recordListen,
  getRecentListens,
  getTopListens,
};
