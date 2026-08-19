const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/auth");
const { authLimiter, resendLimiter } = require("../middlewares/rateLimit");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/verify-email", resendLimiter, authController.verifyEmail);
router.post("/resend-verification", resendLimiter, authController.resendVerification);
router.post("/google", authLimiter, authController.googleLogin);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;