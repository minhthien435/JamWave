const axios = require("axios");
const prisma = require("../lib/prisma");

const LRCLIB_BASE = "https://lrclib.net/api";
const MUSIXMATCH_BASE = "https://api.musixmatch.com/ws/1.1";
// Cache 7 ngày cho mọi kết quả (kể cả không tìm thấy) để tránh bị rate limit
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const axiosInstance = axios.create({
  baseURL: LRCLIB_BASE,
  timeout: 8000,
  headers: { "User-Agent": "JamWave/1.0 (music app; contact: jamwave@example.com)" },
});

// Tìm lyrics chính xác theo track + artist + duration
async function fetchFromLrclib(song) {
  try {
    const exact = await axiosInstance.get("/get", {
      params: {
        track_name: song.title,
        artist_name: song.artist,
        duration: song.duration,
      },
    });
    return exact.data;
  } catch (error) {
    if (error.response && error.response.status !== 404) {
      console.error("LRCLIB /get lỗi:", error.response?.status, error.message);
    }
  }

  // Exact match không có -> thử tìm kiếm rồi chọn bản có duration gần nhất
  try {
    const search = await axiosInstance.get("/search", {
      params: {
        track_name: song.title,
        artist_name: song.artist,
      },
    });
    const results = search.data || [];
    if (results.length === 0) return null;

    const sorted = [...results].sort(
      (a, b) => Math.abs((a.duration || 0) - song.duration) - Math.abs((b.duration || 0) - song.duration)
    );
    const best = sorted[0];
    if (Math.abs((best.duration || 0) - song.duration) > 8) return null;

    return best;
  } catch (error) {
    console.error("LRCLIB /search lỗi:", error.response?.status, error.message);
    return null;
  }
}

// Fallback: Musixmatch (plain lyrics, cần MUSIXMATCH_API_KEY trong .env)
async function fetchFromMusixmatch(song) {
  const apiKey = (process.env.MUSIXMATCH_API_KEY || "").trim();
  if (!apiKey) return null;

  try {
    const search = await axios.get(`${MUSIXMATCH_BASE}/track.search`, {
      params: {
        apikey: apiKey,
        q_track: song.title,
        q_artist: song.artist,
        s_track_rating: "desc",
        f_has_lyrics: 1,
      },
      timeout: 8000,
    });

    const list = search.data?.message?.body?.track_list || [];
    if (list.length === 0) return null;

    const track = list[0].track;
    if (track.instrumental === 1) {
      return { plainLyrics: null, syncedLyrics: null, instrumental: true };
    }
    if (!track.has_lyrics) return null;

    const lyricsRes = await axios.get(`${MUSIXMATCH_BASE}/track.lyrics.get`, {
      params: { apikey: apiKey, track_id: track.track_id },
      timeout: 8000,
    });

    const body = lyricsRes.data?.message?.body?.lyrics?.lyrics_body || "";
    // Cắt phần disclaimer "******* This Lyrics is NOT for Commercial use *******"
    const clean = body.split("*******")[0].trim();
    if (!clean) return null;

    return { plainLyrics: clean, syncedLyrics: null, instrumental: false };
  } catch (error) {
    console.error("Musixmatch lỗi:", error.response?.status, error.message);
    return null;
  }
}

// Lấy lyrics theo songId (cache DB 7 ngày, LRCLIB trước rồi Musixmatch fallback)
async function getLyricsForSong(songId) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true, title: true, artist: true, duration: true },
  });

  if (!song) return { error: "not_found" };

  // Kiểm tra cache (trong 7 ngày -> dùng luôn, không gọi nguồn ngoài)
  const cached = await prisma.lyric.findUnique({ where: { songId } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return {
      plainLyrics: cached.plainLyrics,
      syncedLyrics: cached.syncedLyrics,
      instrumental: cached.instrumental,
      cached: true,
    };
  }

  // Chưa có cache hoặc hết hạn -> gọi LRCLIB trước, Musixmatch làm fallback
  let data = await fetchFromLrclib(song);
  if (!data) {
    data = await fetchFromMusixmatch(song);
  }

  const result = {
    plainLyrics: data?.plainLyrics || null,
    syncedLyrics: data?.syncedLyrics || null,
    instrumental: data?.instrumental === true,
  };

  await prisma.lyric.upsert({
    where: { songId },
    create: { songId, ...result },
    update: { ...result, fetchedAt: new Date() },
  });

  return { ...result, cached: false };
}

module.exports = { getLyricsForSong };