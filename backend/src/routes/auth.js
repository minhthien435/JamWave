const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimit");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
