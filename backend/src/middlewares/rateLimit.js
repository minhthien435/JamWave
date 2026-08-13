// Rate limiting: bảo vệ API khỏi spam / brute-force
const rateLimit = require("express-rate-limit");

const DEFAULT_LIMIT = 100; // request / phút cho toàn API
const AUTH_LIMIT = 5; // đăng nhập / đăng ký
const AI_LIMIT = 20; // chat AI

// Giới hạn chung áp cho mọi route
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: DEFAULT_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
});

// Giới hạn riêng cho đăng nhập / đăng ký (chống brute-force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: AUTH_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều lần thử đăng nhập. Vui lòng đợi 1 phút." },
});

// Giới hạn riêng cho chat AI
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: AI_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều tin nhắn. Vui lòng thử lại sau 1 phút." },
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
