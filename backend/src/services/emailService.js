const nodemailer = require("nodemailer");
const crypto = require("crypto");

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

function hasEmailConfig() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

// Token xác thực email (32 bytes hex, hết hạn 24h)
function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function sendVerificationEmail(to, name, token) {
  if (!hasEmailConfig()) {
    console.warn("Thiếu GMAIL_USER / GMAIL_APP_PASSWORD — không gửi được email xác thực");
    return false;
  }

  const verifyUrl = `${CLIENT_ORIGIN}/verify-email?token=${token}`;

  try {
    await getTransporter().sendMail({
      from: `"JamWave" <${GMAIL_USER}>`,
      to,
      subject: "Xác thực tài khoản JamWave 🎵",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#0b0b12;border-radius:16px;color:#eee;border:1px solid #a855f7">
          <h2 style="text-align:center;margin:0;background:linear-gradient(90deg,#a855f7,#22d3ee);-webkit-background-clip:text;color:transparent">JamWave</h2>
          <p style="margin:20px 0 8px">Chào <b>${name}</b>,</p>
          <p style="margin:0 0 20px;color:#aaa">Cảm ơn bạn đã đăng ký! Nhấn nút bên dưới để xác thực email và kích hoạt tài khoản. Link hết hạn sau <b>24 giờ</b>.</p>
          <a href="${verifyUrl}" style="display:block;text-align:center;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;font-weight:bold;padding:14px;border-radius:12px">Xác thực tài khoản</a>
          <p style="margin:24px 0 0;color:#777;font-size:12px">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Lỗi gửi email xác thực:", error.message);
    return false;
  }
}

module.exports = { sendVerificationEmail, createVerificationToken, hasEmailConfig };