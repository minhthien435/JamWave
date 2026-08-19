// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const prisma = require('./lib/prisma');
const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlists');
const songRoutes = require('./routes/songs');
const likeRoutes = require('./routes/likes');
const albumRoutes = require('./routes/albums');
const artistRoutes = require('./routes/artists');
const aiRoutes = require('./routes/ai');
const listenRoutes = require('./routes/listens');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const wrappedRoutes = require('./routes/wrapped');
const { generalLimiter } = require('./middlewares/rateLimit');
const { ensureUploadDirs, UPLOADS_DIR } = require('./middlewares/upload');

// Yêu cầu JWT_SECRET trong môi trường
if (!process.env.JWT_SECRET) {
    console.error("Thiếu biến môi trường JWT_SECRET. Vui lòng cấu hình trong file .env");
    process.exit(1);
}

const app = express();

// Bật trust proxy khi chạy sau Reverse Proxy (Render/Vercel/Cloudflare) để express-rate-limit đọc IP đúng
app.set('trust proxy', 1);


// CORS: Cho phép origins cấu hình từ CLIENT_ORIGIN / CORS_ORIGIN, tự động loại bỏ dấu / cuối và hỗ trợ *.vercel.app
const rawOrigins = `${process.env.CLIENT_ORIGIN || ""} ${process.env.CORS_ORIGIN || ""}`
  .split(/[,\s]+/)
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép request không có origin (mobile, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, "");

    // Nếu không cấu hình origin -> cho phép tất cả
    if (rawOrigins.length === 0) return callback(null, true);

    const isAllowed =
      rawOrigins.includes(cleanOrigin) ||
      rawOrigins.includes("*") ||
      cleanOrigin.endsWith(".vercel.app") ||
      cleanOrigin.includes("localhost") ||
      cleanOrigin.includes("127.0.0.1");

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// Rate limit chung cho toàn bộ API
app.use('/api', generalLimiter);

// Phục vụ frontend build (production): nếu có thư mục dist
// Đăng ký trước route "/" để root trả về app thay vì message API
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));
// File upload (bìa playlist / avatar) — đăng ký TRƯỚC catch-all SPA
ensureUploadDirs();
app.use('/uploads', express.static(UPLOADS_DIR));
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next();
    });
});

app.get('/', (req, res) => {
    res.send('JamWave Audio API is running');
});

// Health check cho uptime monitor (Render/Railway/UptimeRobot)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/listens', listenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', wrappedRoutes);

// Error handler tập trung (Express 5 tự chuyển lỗi async vào đây)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
