const axios = require("axios");

// Verify Cloudflare Turnstile token (server-side)
async function verifyCaptcha(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";

  if (!secret) {
    console.warn("⚠️ Cảnh báo: Thiếu TURNSTILE_SECRET_KEY trong backend/.env");
    // Trong môi trường dev, nếu user đã hoàn thành captcha ở frontend (có token) thì cho phép qua để test
    if (process.env.NODE_ENV !== "production" && token) {
      console.warn("⚠️ [DEV MODE] Tạm thời chấp nhận token vì chưa điền TURNSTILE_SECRET_KEY vào backend/.env");
      return true;
    }
    return false;
  }
  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append("secret", secret.trim());
    params.append("response", token.trim());

    const res = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      params.toString(),
      {
        timeout: 8000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (res.data?.success === true) {
      return true;
    }

    console.warn("⚠️ Turnstile verify failed:", res.data);
    return false;
  } catch (error) {
    console.error("Turnstile verify lỗi kết nối:", error.message);
    return false;
  }
}

module.exports = { verifyCaptcha };