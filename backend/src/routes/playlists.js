const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlistController");
const authMiddleware = require("../middlewares/auth");
const { uploadCover, uploadSingle } = require("../middlewares/upload");

// Xem playlist được chia sẻ (công khai, không cần đăng nhập)
// Đặt TRƯỚC router.use(authMiddleware) và TRƯỚC /:id để không bị chặn
router.get("/shared/:id", playlistController.getSharedPlaylist);

// Tải playlist dạng ZIP — cho phép chủ sở hữu (token tùy chọn) hoặc playlist công khai
router.get("/:id/download", playlistController.downloadPlaylist);

// Tất cả các route playlist còn lại đều yêu cầu xác thực người dùng
router.use(authMiddleware);

router.get("/", playlistController.getUserPlaylists);
router.post("/", playlistController.createPlaylist);
router.get("/:id", playlistController.getPlaylistById);
router.patch("/:id", playlistController.renamePlaylist);
router.delete("/:id", playlistController.deletePlaylist);
router.patch("/:id/privacy", playlistController.togglePlaylistPublic);
router.post("/:id/cover", uploadSingle(uploadCover, "cover"), playlistController.uploadPlaylistCover);

router.post("/:id/songs", playlistController.addSongToPlaylist);
router.delete("/:id/songs/:songId", playlistController.removeSongFromPlaylist);

module.exports = router;
