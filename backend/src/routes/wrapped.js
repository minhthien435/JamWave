const express = require("express");
const router = express.Router();
const wrappedController = require("../controllers/wrappedController");
const authMiddleware = require("../middlewares/auth");

// Wrapped: thống kê nghe cá nhân (cần đăng nhập)
router.get("/wrapped", authMiddleware, wrappedController.getWrapped);

module.exports = router;