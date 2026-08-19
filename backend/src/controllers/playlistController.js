const prisma = require("../lib/prisma");
const { ZipArchive } = require("archiver");
const axios = require("axios");
const https = require("https");
const http = require("http");
const jwt = require("jsonwebtoken");
const { deleteUploadedFile } = require("../middlewares/upload");

// Agents buộc IPv4 cho mọi outbound request tới Jamendo (tránh ENETUNREACH trên IPv6)
const ipv4HttpAgent  = new http.Agent({  family: 4, keepAlive: false });
const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: false });

// Sanitize tên file tải về (bỏ ký tự đặc biệt không hợp lệ trong tên file)
function sanitizeFile(name) {
  return String(name || "file")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
}

// Lấy userId từ Bearer token (null nếu không có / token lỗi) — cho route public tùy chọn auth
function getOptionalUserId(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded && decoded.userId) return Number(decoded.userId);
    } catch {
      // token không hợp lệ
    }
  }
  return null;
}

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
      coverImg: pl.coverImg,
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
      coverImg: playlist.coverImg,
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
      coverImg: playlist.coverImg,
      createdAt: playlist.createdAt,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error("Lỗi lấy playlist được chia sẻ:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy playlist chia sẻ" });
  }
};

// 10. Upload / đổi ảnh bìa playlist (chỉ chủ sở hữu)
const uploadPlaylistCover = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);

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

    if (!req.file) {
      return res.status(400).json({ error: "Chưa có file ảnh" });
    }

    const coverUrl = `/uploads/covers/${req.file.filename}`;

    // Xóa ảnh bìa cũ nếu là file đã upload
    deleteUploadedFile(playlist.coverImg);

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: { coverImg: coverUrl },
    });

    return res.status(200).json({
      message: "Cập nhật ảnh bìa thành công",
      playlist: { id: updated.id, title: updated.title, isPublic: updated.isPublic, coverImg: updated.coverImg },
    });
  } catch (error) {
    console.error("Lỗi upload ảnh bìa playlist:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi cập nhật ảnh bìa" });
  }
};

function getAudioCandidateUrls(audioURL) {
  const urls = [];
  if (!audioURL) return urls;
  const jamMatch = audioURL.match(/trackid=([0-9]+)/i) || audioURL.match(/\/track\/([0-9]+)/i);
  if (jamMatch && jamMatch[1]) {
    urls.push(`https://mp3d.jamendo.com/download/track/${jamMatch[1]}/mp32/`);
    urls.push(`https://mp3d.jamendo.com/?trackid=${jamMatch[1]}&format=mp32`);
  }
  if (!audioURL.includes("prod-1.storage.jamendo.com")) {
    urls.push(audioURL);
  }
  return urls;
}

// Tải một file âm thanh về dạng Buffer, ưu tiên các URL thay thế, bắt buộc IPv4
async function fetchAudioBuffer(audioURL, timeoutMs = 50000) {
  const candidates = getAudioCandidateUrls(audioURL);

  function downloadUrl(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const mod = urlObj.protocol === "https:" ? https : http;
      const agent = urlObj.protocol === "https:" ? ipv4HttpsAgent : ipv4HttpAgent;

      const req = mod.get(
        url,
        {
          agent,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JamWave/1.0",
            Accept: "audio/mpeg, audio/*, */*",
          },
        },
        (res) => {
          // Xử lý redirect
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            resolve(downloadUrl(res.headers.location));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const buf = Buffer.concat(chunks);
            if (buf.length === 0) reject(new Error("Empty response"));
            else resolve(buf);
          });
          res.on("error", reject);
        }
      );

      const timer = setTimeout(() => {
        req.destroy(new Error(`Timeout sau ${timeoutMs}ms`));
      }, timeoutMs);

      req.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      req.on("close", () => clearTimeout(timer));
    });
  }

  let lastError = null;
  for (const url of candidates) {
    try {
      const buf = await downloadUrl(url);
      if (buf && buf.length > 0) return buf;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Không lấy được file âm thanh");
}

// 11. Tải playlist dưới dạng ZIP (chủ sở hữu hoặc playlist công khai)
const downloadPlaylist = async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);

    if (isNaN(playlistId)) {
      return res.status(400).json({ error: "ID playlist không hợp lệ" });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { songs: { include: { song: true }, orderBy: { playlistId: "asc" } } },
    });

    if (!playlist) {
      return res.status(404).json({ error: "Không tìm thấy playlist" });
    }

    // Cho phép: chủ sở hữu hoặc playlist công khai
    const userId = getOptionalUserId(req);
    if (playlist.userId !== userId && !playlist.isPublic) {
      return res.status(403).json({ error: "Playlist này không công khai" });
    }

    const songs = playlist.songs.map((ps) => ps.song).filter((s) => s.audioURL);
    if (songs.length === 0) {
      return res.status(400).json({ error: "Playlist chưa có bài hát nào để tải" });
    }

    const zipName = `${sanitizeFile(playlist.title)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("Lỗi tạo zip playlist:", err.message);
      res.destroy();
    });
    archive.pipe(res);

    // Tải song song tối đa 2 bài cùng lúc để giảm thời gian chờ
    const CONCURRENCY = 2;
    const results = new Array(songs.length); // giữ thứ tự bài hát

    for (let i = 0; i < songs.length; i += CONCURRENCY) {
      const batch = songs.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (song, batchIdx) => {
          const globalIdx = i + batchIdx;
          const fname = `${String(globalIdx + 1).padStart(2, "0")} - ${sanitizeFile(song.title)} - ${sanitizeFile(song.artist)}.mp3`;
          try {
            console.log(`[ZIP] Tải (${globalIdx + 1}/${songs.length}): ${song.title}...`);
            const buffer = await fetchAudioBuffer(song.audioURL);
            results[globalIdx] = { buffer, fname };
            console.log(`[ZIP] OK: ${fname} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
          } catch (err) {
            console.error(`[ZIP] Bỏ qua "${song.title}":`, err.message);
            results[globalIdx] = null;
          }
        })
      );
    }

    // Append tất cả buffer vào archive theo đúng thứ tự
    for (const item of results) {
      if (item) {
        archive.append(item.buffer, { name: item.fname });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Lỗi download playlist:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi tải playlist" });
    }
    res.destroy();
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
  uploadPlaylistCover,
  downloadPlaylist,
};
