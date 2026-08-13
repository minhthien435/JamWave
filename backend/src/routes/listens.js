const express = require("express");
const router = express.Router();
const listenController = require("../controllers/listenController");
const authMiddleware = require("../middlewares/auth");

// Lịch sử nghe của người dùng (cần đăng nhập)
router.get("/recent", authMiddleware, listenController.getRecentListens);

// Top bài hát nghe nhiều nhất (tuần / tháng) - công khai
router.get("/top", listenController.getTopListens);

module.exports = router;
