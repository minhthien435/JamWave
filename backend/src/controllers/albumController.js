const prisma = require("../lib/prisma");

// Danh sách album kèm số bài hát
const getAlbums = async (req, res) => {
  try {
    const albums = await prisma.album.findMany({
      include: {
        _count: { select: { songs: true } },
        songs: { take: 1, select: { source: true } },
      },
      orderBy: { title: "asc" },
    });

    const formatted = albums.map((album) => ({
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverImg: album.coverImg,
      songCount: album._count.songs,
      source: album.songs[0]?.source || "jamendo",
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Lỗi lấy danh sách album:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách album" });
  }
};

// Chi tiết album kèm danh sách bài hát
const getAlbumById = async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);

    if (isNaN(albumId)) {
      return res.status(400).json({ error: "ID album không hợp lệ" });
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        songs: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!album) {
      return res.status(404).json({ error: "Không tìm thấy album" });
    }

    return res.status(200).json({
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverImg: album.coverImg,
      source: album.songs[0]?.source || "jamendo",
      createdAt: album.createdAt,
      songs: album.songs,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết album:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy chi tiết album" });
  }
};

module.exports = {
  getAlbums,
  getAlbumById,
};
