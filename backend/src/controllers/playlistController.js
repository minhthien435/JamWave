const prisma = require("../lib/prisma");

// 1. Lấy tất cả playlist của người dùng đang đăng nhập
const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user.userId;

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { songs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform dữ liệu trả về kèm số lượng bài hát (songCount)
    const formattedPlaylists = playlists.map((pl) => ({
      id: pl.id,
      title: pl.title,
      isPublic: pl.isPublic,
      songCount: pl._count.songs,
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
    }));

    return res.status(200).json(formattedPlaylists);
  } catch (error) {
    console.error("Lỗi lấy danh sách playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách playlist" });
  }
};

// 2. Tạo playlist mới
const createPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Tiêu đề playlist không được để trống" });
    }

    const newPlaylist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        userId,
        isPublic: req.body.isPublic === true,
      },
    });

    return res.status(201).json({
      message: "Tạo playlist thành công",
      playlist: {
        ...newPlaylist,
        songCount: 0,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi tạo playlist" });
  }
};

// 3. Lấy chi tiết playlist kèm danh sách bài hát
const getPlaylistById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    // Kiểm tra quyền sở hữu người dùng
    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền truy cập playlist này" });
    }

    // Phẳng hóa danh sách bài hát (Flatten song list)
    const formattedSongs = playlist.songs.map((ps) => ps.song);

    return res.status(200).json({
      id: playlist.id,
      title: playlist.title,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy chi tiết playlist" });
  }
};

// 4. Xóa playlist
const deletePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    // Kiểm tra quyền sở hữu
    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền xóa playlist này" });
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    return res.status(200).json({ message: "Xóa playlist thành công" });
  } catch (error) {
    console.error("Lỗi xóa playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xóa playlist" });
  }
};

// 5. Đổi tên playlist
const renamePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const { title } = req.body;

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Tiêu đề playlist không được để trống" });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa playlist này" });
    }

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: { title: title.trim() },
    });

    return res.status(200).json({ message: "Đổi tên playlist thành công", playlist: updated });
  } catch (error) {
    console.error("Lỗi đổi tên playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đổi tên playlist" });
  }
};

// 6. Thêm bài hát vào playlist
const addSongToPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const { songId } = req.body;

    if (isNaN(playlistId) || !songId || isNaN(parseInt(songId))) {
      return res.status(400).json({ error: "ID playlist hoặc ID bài hát không hợp lệ" });
    }

    const parsedSongId = parseInt(songId);

    // Kiểm tra playlist & quyền sở hữu
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa playlist này" });
    }

    // Kiểm tra bài hát có tồn tại không
    const song = await prisma.song.findUnique({
      where: { id: parsedSongId },
    });

    if (!song) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    // Kiểm tra xem bài hát đã có trong playlist chưa
    const existingEntry = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId: parsedSongId,
        },
      },
    });

    if (existingEntry) {
      return res.status(409).json({ error: "Bài hát này đã có trong playlist" });
    }

    // Thêm liên kết vào bảng PlaylistSong
    await prisma.playlistSong.create({
      data: {
        playlistId,
        songId: parsedSongId,
      },
    });

    return res.status(201).json({ message: "Thêm bài hát vào playlist thành công", song });
  } catch (error) {
    console.error("Lỗi thêm bài hát vào playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi thêm bài hát" });
  }
};

// 7. Xóa bài hát khỏi playlist
const removeSongFromPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const songId = parseInt(req.params.songId);

    if (isNaN(playlistId) || isNaN(songId)) {
      return res.status(400).json({ error: "ID playlist hoặc ID bài hát không hợp lệ" });
    }

    // Kiểm tra playlist & quyền sở hữu
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa playlist này" });
    }

    // Kiểm tra liên kết có tồn tại không
    const existingEntry = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: "Bài hát không tồn tại trong playlist" });
    }

    // Xóa liên kết khỏi PlaylistSong
    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    });

    return res.status(200).json({ message: "Xóa bài hát khỏi playlist thành công" });
  } catch (error) {
    console.error("Lỗi xóa bài hát khỏi playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xóa bài hát" });
  }
};

// 8. Bật / tắt chia sẻ công khai playlist
const togglePlaylistPublic = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const isPublic = req.body.isPublic === true;

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa playlist này" });
    }

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: { isPublic },
    });

    return res.status(200).json({
      message: isPublic ? "Playlist đã được chia sẻ công khai" : "Playlist đã chuyển về chế độ riêng tư",
      playlist: { id: updated.id, title: updated.title, isPublic: updated.isPublic },
    });
  } catch (error) {
    console.error("Lỗi đổi trạng thái chia sẻ playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đổi trạng thái chia sẻ" });
  }
};

// 9. Xem playlist được chia sẻ (không cần đăng nhập, read-only)
const getSharedPlaylist = async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        songs: { include: { song: true } },
        user: { select: { name: true } },
      },
    });

    if (!playlist || !playlist.isPublic) {
      return res.status(404).json({ error: "Không tìm thấy playlist được chia sẻ" });
    }

    const formattedSongs = playlist.songs.map((ps) => ps.song);

    return res.status(200).json({
      id: playlist.id,
      title: playlist.title,
      ownerName: playlist.user.name,
      createdAt: playlist.createdAt,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error("Lỗi lấy playlist được chia sẻ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy playlist chia sẻ" });
  }
};

module.exports = {
  getUserPlaylists,
  createPlaylist,
  getPlaylistById,
  deletePlaylist,
  renamePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  togglePlaylistPublic,
  getSharedPlaylist,
};
