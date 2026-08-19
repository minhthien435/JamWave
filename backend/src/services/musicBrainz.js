const axios = require("axios");

// Client MusicBrainz (Metadata lookup, CC0). Không cần API key.
const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = process.env.MB_USER_AGENT || "JamWave/1.0 (https://localhost)";

// MusicBrainz yêu cầu strict rate limit: tối đa 1 request / giây.
const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

async function throttledRequest(path, params = {}) {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      lastRequestAt = Date.now();
      const response = await axios.get(`${MB_BASE}${path}`, {
        params: { ...params, fmt: "json" },
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        // Rate limit -> chờ lâu hơn rồi thử lại
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      if (status === 503 || status === 504) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }
      // Lỗi mạng (ETIMEDOUT/ENETUNREACH...) -> backoff tăng dần
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(16000, 2000 * attempt)));
    }
  }
  return null;
}

// Chuẩn hóa tên để so khớp (in thường, bỏ dấu, bỏ ký tự đặc biệt)
function normName(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Tìm nghệ sĩ trong MusicBrainz, trả về artist khớp nhất (kèm aliases, genres)
async function searchArtist(query) {
  const data = await throttledRequest("/artist", { query: `artist:"${query}"` });
  const artists = data?.artists || [];
  if (artists.length === 0) return null;

  const q = normName(query);
  const scored = artists
    .map((a) => {
      let score = 0;
      const name = normName(a.name);
      if (name === q) score = 1;
      else if (name.includes(q) || q.includes(name)) score = 0.8;
      else {
        // tương đối đơn giản: tỷ lệ ký tự chung
        let common = 0;
        for (const ch of q) if (name.includes(ch)) common += 1;
        score = q.length ? common / q.length : 0;
      }
      // ưu tiên nghệ sĩ có aliases
      if (a.aliases?.length) score += 0.05;
      return { artist: a, score, nameNorm: name };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score < 0.6) return null;

  const aliases = best.artist.aliases?.map((a) => a.name).slice(0, 10) || [];
  const genres = (best.artist.tags || []).map((t) => t.name).slice(0, 8);
  const beginYear = (best.artist["life-span"]?.begin || "").slice(0, 4);
  const endYear = (best.artist["life-span"]?.end || "").slice(0, 4);
  const yearRange = beginYear
    ? `${beginYear}${endYear && endYear !== beginYear ? `-${endYear}` : ""}`
    : null;

  return {
    mbid: best.artist.id,
    name: best.artist.name,
    aliases,
    genres,
    country: best.artist.country || null,
    yearRange,
    score: best.score,
  };
}

// Tìm recording trong MusicBrainz theo artist + title, trả về mbid + isrc
async function searchRecording(artist, title) {
  const query = `recording:"${title}" AND artist:"${artist}"`;
  const data = await throttledRequest("/recording", { query, limit: 5 });
  const recordings = data?.recordings || [];
  if (recordings.length === 0) return null;

  const aNorm = normName(artist);
  const tNorm = normName(title);
  const scored = recordings
    .map((r) => {
      let score = 0;
      const rTitle = normName(r.title);
      if (rTitle === tNorm) score = 1;
      else if (rTitle.includes(tNorm) || tNorm.includes(rTitle)) score = 0.8;
      const artistMatch = (r["artist-credit"] || []).some((ac) => {
        const name = normName(ac.name || ac.artist?.name || "");
        return name === aNorm || name.includes(aNorm) || aNorm.includes(name);
      });
      if (artistMatch) score += 0.1;
      return { recording: r, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score < 0.7) return null;

  return {
    mbid: best.recording.id,
    isrc: best.recording.isrcs?.[0] || null,
    score: best.score,
  };
}

module.exports = { searchArtist, searchRecording, normName };