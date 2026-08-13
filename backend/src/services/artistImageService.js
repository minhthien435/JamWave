const axios = require("axios");
const prisma = require("../lib/prisma");

const JAMENDO_API_BASE = "https://api.jamendo.com/v3.0";
const AUDIUS_API_BASE = "https://discoveryprovider.audius.co/v1";

// Cache 30 ngày
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Tra cứu ảnh nghệ sĩ từ Jamendo (ảnh chân dung, cần client_id)
async function fetchJamendoArtistImage(name) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) return null;

  try {
    const response = await axios.get(`${JAMENDO_API_BASE}/artists/`, {
      params: {
        client_id: clientId,
        format: "json",
        name,
        imagesize: "500",
        order: "popularity_total",
      },
      timeout: 8000,
    });
    const results = response.data?.results || [];
    if (results.length === 0) return null;

    // Ưu tiên nghệ sĩ trùng tên chính xác (không phân biệt hoa thường)
    const exact = results.find(
      (a) => a.name && a.name.toLowerCase() === name.toLowerCase()
    );
    const best = exact || results[0];
    return best.image || null;
  } catch (error) {
    console.error("Jamendo artist image lỗi:", error.message);
    return null;
  }
}

// Tra cứu ảnh đại diện từ Audius (profile_picture)
async function fetchAudiusArtistImage(name) {
  try {
    const response = await axios.get(`${AUDIUS_API_BASE}/users/search`, {
      params: {
        app_name: "JAMWAVE",
        query: name,
        limit: 10,
      },
      timeout: 8000,
    });
    const results = response.data?.data || [];
    if (results.length === 0) return null;

    const exact = results.find(
      (u) => u.name && u.name.toLowerCase() === name.toLowerCase()
    );
    const best = exact || results[0];

    return (
      best.profile_picture?.["480x480"] ||
      best.profile_picture?.["1000x1000"] ||
      best.profile_picture?.["150x150"] ||
      null
    );
  } catch (error) {
    console.error("Audius artist image lỗi:", error.message);
    return null;
  }
}

// Lấy ảnh nghệ sĩ (có cache DB). source: "jamendo" | "audius" | null
async function getArtistImage(name, source = null) {
  if (!name || !name.trim()) return null;

  const key = name.trim();
  const cached = await prisma.artistProfile.findUnique({ where: { name: key } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.imageUrl || null;
  }

  // Ưu tiên source của nghệ sĩ, sau đó thử nguồn còn lại
  let imageUrl = null;
  let resolvedSource = null;

  if (source === "audius") {
    imageUrl = await fetchAudiusArtistImage(key);
    if (!imageUrl) imageUrl = await fetchJamendoArtistImage(key);
    resolvedSource = imageUrl ? "audius" : null;
  } else {
    imageUrl = await fetchJamendoArtistImage(key);
    if (imageUrl) {
      resolvedSource = "jamendo";
    } else {
      imageUrl = await fetchAudiusArtistImage(key);
      if (imageUrl) resolvedSource = "audius";
    }
  }

  // Không tìm được -> vẫn cache null (tránh gọi lại lặp) trong 7 ngày
  if (cached) {
    if (imageUrl) {
      await prisma.artistProfile.update({ where: { name: key }, data: { imageUrl, source: resolvedSource, fetchedAt: new Date() } });
    } else {
      await prisma.artistProfile.update({ where: { name: key }, data: { fetchedAt: new Date() } });
    }
  } else {
    await prisma.artistProfile.create({ data: { name: key, imageUrl, source: resolvedSource, fetchedAt: new Date() } });
  }

  return imageUrl || cached?.imageUrl || null;
}

module.exports = { getArtistImage };