const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Verify Google ID token (Sign in with Google), check aud khớp GOOGLE_CLIENT_ID
// Trả về thông tin user Google hoặc null nếu token không hợp lệ.
async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID || !idToken) return null;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return null;

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture || null,
      emailVerified: payload.email_verified === true,
    };
  } catch (error) {
    console.error("Google verifyIdToken lỗi:", error.message);
    return null;
  }
}

module.exports = { verifyGoogleIdToken };