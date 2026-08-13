const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { isValidEmail, isValidPassword, isValidName } = require("../utils/validators");

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

// Email trong ADMIN_EMAIL (.env) sẽ có quyền quản trị viên
const promoteIfAdmin = (email) => {
  return ADMIN_EMAIL && email === ADMIN_EMAIL ? "ADMIN" : "USER";
};

// Đăng ký tài khoản mới
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ email, password và name" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ error: "Tên phải có ít nhất 2 ký tự" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email này đã được sử dụng" });
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo tài khoản mới trong DB
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role: promoteIfAdmin(normalizedEmail),
      },
    });

    // Ký JWT Token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Đăng ký tài khoản thành công",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đăng ký" });
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });
    }

    // Tìm user theo email (không phân biệt hoa thường)
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }

    // Email nằm trong ADMIN_EMAIL sẽ được tự động nâng cấp lên ADMIN
    if (promoteIfAdmin(user.email) === "ADMIN" && user.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
      user.role = "ADMIN";
    }

    // Ký JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đăng nhập" });
  }
};

// Lấy thông tin tài khoản hiện tại (Protected)
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi lấy thông tin me:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi lấy thông tin người dùng" });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
