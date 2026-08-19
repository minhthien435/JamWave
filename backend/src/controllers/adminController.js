const prisma = require("../lib/prisma");

// Thống kê tổng quan cho trang quản trị
const getStats = async (req, res) => {
  try {
    const [users, songs, albums, playlists, listens, follows] = await Promise.all([
      prisma.user.count(),
      prisma.song.count(),
      prisma.album.count(),
      prisma.playlist.count(),
      prisma.songListen.count(),
      prisma.userArtist.count(),
    ]);

    return res.status(200).json({ users, songs, albums, playlists, listens, follows });
  } catch (error) {
    console.error("Lỗi lấy thống kê admin:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy thống kê" });
  }
};

// Danh sách người dùng (phân trang + tìm kiếm)
const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const q = (req.query.q || "").trim();

    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { playlists: true, likedSongs: true, listens: true } },
        },
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      playlists: u._count.playlists,
      likes: u._count.likedSongs,
      listens: u._count.listens,
    }));

    return res.status(200).json({ users: formatted, total, page, limit });
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách người dùng" });
  }
};

// Đổi vai trò người dùng (USER <-> ADMIN)
const updateUserRole = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID người dùng không hợp lệ" });
    }

    if (role !== "USER" && role !== "ADMIN") {
      return res.status(400).json({ error: "Vai trò không hợp lệ (chỉ USER hoặc ADMIN)" });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    if (userId === req.user.userId && role !== "ADMIN") {
      return res.status(400).json({ error: "Bạn không thể tự hạ quyền của chính mình" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return res.status(200).json({ message: "Đã cập nhật vai trò", user: updated });
  } catch (error) {
    console.error("Lỗi cập nhật vai trò:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi cập nhật vai trò" });
  }
};

// Xóa người dùng (cascade: playlists, likes, listens, follows)
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID người dùng không hợp lệ" });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({ error: "Bạn không thể xóa chính mình" });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ message: `Đã xóa người dùng ${target.email}` });
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xóa người dùng" });
  }
};

// Danh sách bài hát (phân trang + tìm kiếm)
const getSongs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const q = (req.query.q || "").trim();

    const where = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { artist: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          source: true,
          albumCover: true,
          duration: true,
          _count: { select: { listens: true, likedBy: true } },
        },
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.song.count({ where }),
    ]);

    const formatted = songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      source: s.source,
      albumCover: s.albumCover,
      duration: s.duration,
      listenCount: s._count.listens,
      likeCount: s._count.likedBy,
    }));

    return res.status(200).json({ songs: formatted, total, page, limit });
  } catch (error) {
    console.error("Lỗi lấy danh sách bài hát admin:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy danh sách bài hát" });
  }
};

// Xóa bài hát (cascade listens, likes, playlist songs)
const deleteSong = async (req, res) => {
  try {
    const songId = parseInt(req.params.id);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const target = await prisma.song.findUnique({ where: { id: songId } });
    if (!target) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    await prisma.song.delete({ where: { id: songId } });

    return res.status(200).json({ message: `Đã xóa bài hát "${target.title}"` });
  } catch (error) {
    console.error("Lỗi xóa bài hát:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xóa bài hát" });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getSongs,
  deleteSong,
};
