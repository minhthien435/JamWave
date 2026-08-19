const prisma = require("../lib/prisma");
const { deleteUploadedFile } = require("../middlewares/upload");

// Hồ sơ cá nhân kèm thống kê (likes, playlists, giờ nghe, top thể loại)
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { likedSongs: true, playlists: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const [listenCount, follows] = await Promise.all([
      prisma.songListen.count({ where: { userId } }),
      prisma.userArtist.count({ where: { userId } }),
    ]);

    // Top thể loại dựa trên các bài đã nghe
    const recentListens = await prisma.songListen.findMany({
      where: { userId },
      include: { song: { select: { genre: true } } },
      orderBy: { listenedAt: "desc" },
      take: 500,
    });

    const genreCount = new Map();
    for (const l of recentListens) {
      if (!l.song.genre) continue;
      genreCount.set(l.song.genre, (genreCount.get(l.song.genre) || 0) + 1);
    }
    const topGenres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre, count]) => ({ genre, count }));

    // Tổng thời gian nghe (giả định mỗi lượt nghe ~ 3 phút trung bình)
    const listenMinutes = Math.round(listenCount * 3);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      stats: {
        likes: user._count.likes,
        playlists: user._count.playlists,
        follows,
        listenCount,
        listenMinutes,
      },
      topGenres,
    });
  } catch (error) {
    console.error("Lỗi lấy hồ sơ cá nhân:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy hồ sơ cá nhân" });
  }
};

// Cập nhật thông tin hồ sơ (hiện tại: tên hiển thị)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Tên không được để trống" });
      }
      if (trimmed.length > 50) {
        return res.status(400).json({ error: "Tên tối đa 50 ký tự" });
      }
      await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    return res.status(200).json({ message: "Cập nhật hồ sơ thành công", user });
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi cập nhật hồ sơ" });
  }
};

// Upload avatar (ảnh đại diện)
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: "Chưa có file ảnh" });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Xóa avatar cũ nếu là file đã upload (không đụng avatar Google URL ngoài)
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    if (existing?.avatarUrl && existing.avatarUrl.startsWith("/uploads/")) {
      deleteUploadedFile(existing.avatarUrl);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    return res.status(200).json({ message: "Cập nhật avatar thành công", user });
  } catch (error) {
    console.error("Lỗi upload avatar:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi upload avatar" });
  }
};

module.exports = { getProfile, updateProfile, uploadAvatar };
