const express = require("express");
const router = express.Router();
const likeController = require("../controllers/likeController");
const authMiddleware = require("../middlewares/auth");

// Tất cả các route likes đều yêu cầu xác thực người dùng
router.use(authMiddleware);

router.get("/", likeController.getLikedSongs);
router.put("/:songId", likeController.likeSong);
router.delete("/:songId", likeController.unlikeSong);

module.exports = router;
