const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { isValidEmail, isValidPassword, isValidName } = require("../utils/validators");
const { verifyCaptcha } = require("../services/captchaService");
const { sendVerificationEmail, createVerificationToken, hasEmailConfig } = require("../services/emailService");
const { verifyGoogleIdToken } = require("../services/googleAuthService");

const JWT_SECRET = process.env.JWT_SECRET;
// Email trong ADMIN_EMAIL (.env) sẽ có quyền quản trị viên (đọc động theo biến môi trường)
const promoteIfAdmin = (email) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const targetEmail = String(email || "").trim().toLowerCase();
  return adminEmail && targetEmail === adminEmail ? "ADMIN" : "USER";
};

const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isVerified: user.isVerified,
  avatarUrl: user.avatarUrl || null,
});

// Đăng ký tài khoản mới (captcha + email xác thực, chưa đăng nhập ngay)
const register = async (req, res) => {
  try {
    const { email, password, name, confirmPassword, captchaToken } = req.body;

    if (!email || !password || !name || !confirmPassword) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Mật khẩu xác nhận không khớp" });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ error: "Tên phải có ít nhất 2 ký tự" });
    }

    if (!(await verifyCaptcha(captchaToken))) {
      return res.status(400).json({ error: "Xác thực captcha thất bại, vui lòng thử lại" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({ error: "Email này đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = createVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role: promoteIfAdmin(normalizedEmail),
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      },
    });

    // Gửi email xác thực (nếu thiếu cấu hình SMTP: vẫn tạo tài khoản nhưng log cảnh báo)
    const sent = await sendVerificationEmail(newUser.email, newUser.name, verificationToken);
    if (!sent && !hasEmailConfig()) {
      console.warn("SMTP chưa cấu hình — user phải xác thực qua dev: /verify-email?token=" + verificationToken);
    }

    return res.status(201).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
      email: newUser.email,
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đăng ký" });
  }
};

// Xác thực email qua token (đăng nhập tự động sau khi verify)
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Thiếu token xác thực" });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: "token_invalid_or_expired", message: "Link xác thực không hợp lệ hoặc đã hết hạn" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    const tokenJwt = signToken(updated);

    return res.status(200).json({
      message: "Xác thực email thành công!",
      token: tokenJwt,
      user: publicUser(updated),
    });
  } catch (error) {
    console.error("Lỗi xác thực email:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xác thực email" });
  }
};

// Gửi lại email xác thực (rate limit riêng ở route)
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Không tiết lộ user tồn tại hay không
      return res.status(200).json({ message: "Nếu email tồn tại, chúng tôi đã gửi lại link xác thực." });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "Tài khoản này đã được xác thực." });
    }

    const verificationToken = createVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpires },
    });

    await sendVerificationEmail(user.email, user.name, verificationToken);

    return res.status(200).json({ message: "Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư." });
  } catch (error) {
    console.error("Lỗi gửi lại email xác thực:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi gửi lại email" });
  }
};

// Đăng nhập (chặn user chưa xác thực email)
const login = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });
    }

    if (!(await verifyCaptcha(captchaToken))) {
      return res.status(400).json({ error: "Xác thực captcha thất bại, vui lòng thử lại" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "email_not_verified", message: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác thực." });
    }

    if (promoteIfAdmin(user.email) === "ADMIN" && user.role !== "ADMIN") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      user.role = "ADMIN";
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đăng nhập" });
  }
};

// Đăng nhập / đăng ký bằng Google (Google đã xác thực email -> isVerified = true)
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    const profile = await verifyGoogleIdToken(idToken);

    if (!profile) {
      return res.status(401).json({ error: "Đăng nhập Google thất bại, vui lòng thử lại" });
    }

    if (!profile.emailVerified) {
      return res.status(403).json({ error: "Tài khoản Google chưa xác thực email" });
    }

    // Tìm theo googleId trước, fallback theo email
    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: profile.email } });
    }

    if (!user) {
      // Tạo tài khoản mới từ Google
      user = await prisma.user.create({
        data: {
          email: profile.email,
          password: "", // không có mật khẩu — đăng nhập qua Google
          name: profile.name,
          googleId: profile.googleId,
          avatarUrl: profile.picture,
          isVerified: true,
          role: promoteIfAdmin(profile.email),
        },
      });
    } else {
      // Gắn googleId nếu user cũ đăng nhập bằng email/password lần đầu qua Google
      const updateData = { googleId: profile.googleId, isVerified: true };
      if (!user.avatarUrl && profile.picture) updateData.avatarUrl = profile.picture;
      user = await prisma.user.update({ where: { id: user.id }, data: updateData });
    }

    if (promoteIfAdmin(user.email) === "ADMIN" && user.role !== "ADMIN") {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Đăng nhập Google thành công",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi đăng nhập Google" });
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
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    if (promoteIfAdmin(user.email) === "ADMIN" && user.role !== "ADMIN") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      user.role = "ADMIN";
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
  verifyEmail,
  resendVerification,
  googleLogin,
  getMe,
};