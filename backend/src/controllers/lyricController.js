const prisma = require("../lib/prisma");
const { getLyricsForSong } = require("../services/lyricService");

// GET /api/lyrics/:songId - lấy lời bài hát (có cache LRCLIB / Musixmatch)
const getLyrics = async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true },
    });

    if (!song) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    const result = await getLyricsForSong(songId);
    if (result.error === "not_found") {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi lấy lời bài hát:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy lời bài hát" });
  }
};

module.exports = { getLyrics };