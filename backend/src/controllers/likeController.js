const prisma = require("../lib/prisma");

// 1. Lấy danh sách bài hát đã thích của người dùng
const getLikedSongs = async (req, res) => {
  try {
    const userId = req.user.userId;

    const likedSongs = await prisma.userSong.findMany({
      where: { userId },
      include: { song: true },
      orderBy: { createdAt: "desc" },
    });

    const songs = likedSongs.map((ls) => ls.song);

    return res.status(200).json({ songs });
  } catch (error) {
    console.error("Lỗi lấy danh sách bài hát yêu thích:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách yêu thích" });
  }
};

// 2. Thích một bài hát (idempotent)
const likeSong = async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = parseInt(req.params.songId);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    await prisma.userSong.upsert({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
      create: { userId, songId },
      update: {},
    });

    return res.status(201).json({ message: "Đã thêm vào danh sách yêu thích", song });
  } catch (error) {
    console.error("Lỗi thích bài hát:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi thích bài hát" });
  }
};

// 3. Bỏ thích một bài hát
const unlikeSong = async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = parseInt(req.params.songId);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const existing = await prisma.userSong.findUnique({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Bài hát chưa được thích" });
    }

    await prisma.userSong.delete({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    });

    return res.status(200).json({ message: "Đã xóa khỏi danh sách yêu thích" });
  } catch (error) {
    console.error("Lỗi bỏ thích bài hát:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi bỏ thích bài hát" });
  }
};

module.exports = {
  getLikedSongs,
  likeSong,
  unlikeSong,
};
