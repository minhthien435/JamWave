// Multer upload: xử lý file ảnh (bìa playlist / avatar) tải lên
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const SUBDIRS = ["covers", "avatars"];

// Đảm bảo các thư mục upload tồn tại khi server khởi động
function ensureUploadDirs() {
  for (const d of SUBDIRS) {
    fs.mkdirSync(path.join(UPLOADS_DIR, d), { recursive: true });
  }
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function makeUploader(folder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_DIR, folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        return cb(new Error("Chỉ hỗ trợ ảnh JPG/PNG/WebP"));
      }
      cb(null, true);
    },
  });
}

const uploadCover = makeUploader("covers");
const uploadAvatar = makeUploader("avatars");

// Wrapper: bắt lỗi multer -> trả JSON 400/413 thay vì error handler 500
function uploadSingle(uploader, field) {
  return (req, res, next) => {
    uploader.single(field)(req, res, (err) => {
      if (!err) return next();
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ảnh tối đa 5MB"
          : err.message || "File không hợp lệ";
      return res.status(status).json({ error: message });
    });
  };
}

// Xóa file upload cũ khi thay ảnh (bỏ qua lỗi — chỉ là dọn dẹp nền)
function deleteUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOADS_DIR, publicPath.replace("/uploads/", ""));
  fs.unlink(filePath, () => {});
}

module.exports = { ensureUploadDirs, UPLOADS_DIR, uploadCover, uploadAvatar, uploadSingle, deleteUploadedFile };