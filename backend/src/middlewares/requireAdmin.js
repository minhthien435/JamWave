const prisma = require("../lib/prisma");
const authMiddleware = require("./auth");

// Chỉ ADMIN mới qua được (role lấy từ DB để luôn mới nhất)
const requireAdmin = async (req, res, next) => {
  await authMiddleware(req, res, async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true },
      });

      if (!user) {
        return res.status(401).json({ error: "Tài khoản không tồn tại" });
      }

      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Bạn không có quyền truy cập khu vực quản trị" });
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      console.error("Lỗi kiểm tra quyền admin:", error);
      return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi kiểm tra quyền" });
    }
  });
};

module.exports = requireAdmin;
