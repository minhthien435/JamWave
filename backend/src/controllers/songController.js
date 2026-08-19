const prisma = require("../lib/prisma");
const axios = require("axios");
const https = require("https");
const http = require("http");
const { getRadioSongs, semanticSearch, enrichQueryForSemantic } = require("../services/aiTools");

// Agents buộc IPv4 (tránh ENETUNREACH trên IPv6 khi kết nối Jamendo)
const ipv4HttpAgent  = new http.Agent({  family: 4, keepAlive: false });
const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: false });

// Sanitize tên file tải về (bỏ ký tự đặc biệt không hợp lệ trong tên file)
function sanitizeFile(name) {
  return String(name || "file")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
}

// Lấy danh sách bài hát, hỗ trợ tìm kiếm theo q (title / artist) + lọc genre / year / country + phân trang
const getSongs = async (req, res) => {
  try {
    const { q, genre, year, country, sort } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = { duplicateOf: null };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
      ];
    }

    if (genre) {
      where.genre = { contains: genre, mode: "insensitive" };
    }

    const releaseYear = parseInt(year);
    if (year && !isNaN(releaseYear)) {
      where.releaseYear = releaseYear;
    }

    // Lọc quốc gia: gián tiếp qua tên nghệ sĩ có trong ArtistMeta (country = mã ISO)
    if (country) {
      const names = await prisma.artistMeta.findMany({
        where: { country: { contains: country, mode: "insensitive" } },
        select: { name: true },
      });
      where.artist = { in: names.length > 0 ? names.map((a) => a.name) : ["__no_match__"] };
    }

    const orderBy =
      sort === "year_desc"
        ? [{ releaseYear: "desc" }, { id: "asc" }]
        : sort === "year_asc"
        ? [{ releaseYear: "asc" }, { id: "asc" }]
        : sort === "title"
        ? [{ title: "asc" }]
        : [{ id: "asc" }];

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.song.count({ where }),
    ]);

    res.json({ songs, total, limit, offset });
  } catch (error) {
    console.error("Error to fetch song data:", error);
    res.status(500).json({ error: "Error to fetch song data" });
  }
};

// Lấy các nhãn lọc (facet) cho Browse: thể loại / năm / quốc gia kèm số lượng
const getFacets = async (req, res) => {
  try {
    const [genreGroups, yearGroups, countryGroups] = await Promise.all([
      prisma.song.groupBy({
        by: ["genre"],
        where: { duplicateOf: null, genre: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { genre: "desc" } },
        take: 40,
      }),
      prisma.song.groupBy({
        by: ["releaseYear"],
        where: { duplicateOf: null, releaseYear: { not: null } },
        _count: { _all: true },
        orderBy: { releaseYear: "desc" },
        take: 60,
      }),
      prisma.artistMeta.groupBy({
        by: ["country"],
        where: { country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 40,
      }),
    ]);

    const genres = genreGroups
      .filter((g) => g.genre)
      .map((g) => ({ value: g.genre, count: g._count._all }));
    const years = yearGroups
      .filter((y) => y.releaseYear)
      .map((y) => ({ value: y.releaseYear, count: y._count._all }));
    const countries = countryGroups
      .filter((c) => c.country)
      .map((c) => ({ value: c.country, count: c._count._all }));

    res.json({ genres, years, countries });
  } catch (error) {
    console.error("Error to fetch facets:", error);
    res.status(500).json({ error: "Error to fetch facets" });
  }
};

// Lấy bài hát ngẫu nhiên (cho nút "Phát ngẫu nhiên")
const getRandomSongs = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const songs = await prisma.$queryRawUnsafe(
      `SELECT "id","title","artist","albumCover","audioURL","duration","releaseYear","genre","source","albumId","mbid","isrc","artistMbid","duplicateOf","createdAt","updatedAt"
       FROM "Song" WHERE "duplicateOf" IS NULL ORDER BY RANDOM() LIMIT ${limit}`
    );

    res.json(songs);
  } catch (error) {
    console.error("Error to fetch random songs:", error);
    res.status(500).json({ error: "Error to fetch random songs" });
  }
};

function getAudioCandidateUrls(audioURL) {
  const urls = [];
  if (!audioURL) return urls;
  const jamMatch = audioURL.match(/trackid=([0-9]+)/i) || audioURL.match(/\/track\/([0-9]+)/i);
  if (jamMatch && jamMatch[1]) {
    urls.push(`https://mp3d.jamendo.com/download/track/${jamMatch[1]}/mp32/`);
    urls.push(`https://mp3d.jamendo.com/?trackid=${jamMatch[1]}&format=mp32`);
  }
  if (!audioURL.includes("prod-1.storage.jamendo.com")) {
    urls.push(audioURL);
  }
  return urls;
}

// Tải 1 bài hát MP3 (stream bằng native HTTPS IPv4, tránh treo IPv6)
const downloadSong = async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    if (isNaN(songId)) return res.status(400).json({ error: "ID bài hát không hợp lệ" });

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || !song.audioURL) return res.status(404).json({ error: "Không tìm thấy bài hát" });

    const candidates = getAudioCandidateUrls(song.audioURL);
    const filename = `${sanitizeFile(song.title)} - ${sanitizeFile(song.artist)}.mp3`;

    function tryStream(url) {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const mod   = urlObj.protocol === "https:" ? https : http;
        const agent = urlObj.protocol === "https:" ? ipv4HttpsAgent : ipv4HttpAgent;

        const req2 = mod.get(url, { agent, headers: { "User-Agent": "Mozilla/5.0 JamWave/1.0" } }, (upstream) => {
          if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
            upstream.resume();
            resolve(tryStream(upstream.headers.location));
            return;
          }
          if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
            upstream.resume();
            reject(new Error(`HTTP ${upstream.statusCode}`));
            return;
          }
          resolve(upstream);
        });
        req2.setTimeout(30000, () => req2.destroy(new Error("Timeout")));
        req2.on("error", reject);
      });
    }

    let upstream = null;
    let lastErr  = null;
    for (const url of candidates) {
      try { upstream = await tryStream(url); break; }
      catch (err) { lastErr = err; }
    }

    if (!upstream) {
      console.error("Không lấy được file audio:", lastErr?.message);
      return res.status(502).json({ error: "Không thể lấy file từ nguồn nhạc" });
    }

    res.setHeader("Content-Type", upstream.headers["content-type"] || "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"]);
    }

    upstream.on("error", (err) => { console.error("Lỗi stream audio:", err.message); res.destroy(); });
    req.on("close", () => upstream.destroy());
    upstream.pipe(res);
  } catch (error) {
    console.error("Error downloadSong:", error);
    if (!res.headersSent) res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi tải bài hát" });
    else res.destroy();
  }
};

// Radio: chuỗi bài tương tự 1 bài (ưu tiên semantic embedding, fallback genre)
const getSongRadio = async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 50);

    if (isNaN(songId)) {
      return res.status(400).json({ error: "ID bài hát không hợp lệ" });
    }

    const seed = await prisma.song.findUnique({ where: { id: songId } });
    if (!seed) {
      return res.status(404).json({ error: "Không tìm thấy bài hát" });
    }

    const radio = await getRadioSongs(seed, limit);
    return res.json({
      seed: { id: seed.id, title: seed.title, artist: seed.artist },
      songs: radio,
    });
  } catch (error) {
    console.error("Error to fetch radio:", error);
    res.status(500).json({ error: "Error to fetch radio" });
  }
};

// Mood: tìm bài theo tâm trạng/vibe bằng semantic embedding (fallback: genre keyword)
const getMoodSongs = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

    if (!q) {
      return res.status(400).json({ error: "Thiếu từ khóa tâm trạng" });
    }

    let songs = await semanticSearch(q, limit);

    // Fallback: nếu embedding không trả kết quả, lọc theo genre keyword đã enrich
    if (songs.length === 0) {
      const enriched = enrichQueryForSemantic(q);
      const words = enriched.split(" ").map((w) => w.trim()).filter(Boolean);
      if (words.length > 0) {
        songs = await prisma.song.findMany({
          where: {
            duplicateOf: null,
            OR: words.map((w) => ({ genre: { contains: w, mode: "insensitive" } })),
          },
          take: limit,
        });
      }
    }

    return res.json({ mood: q, songs });
  } catch (error) {
    console.error("Error to fetch mood songs:", error);
    res.status(500).json({ error: "Error to fetch mood songs" });
  }
};

module.exports = {
  getSongs,
  getFacets,
  getRandomSongs,
  downloadSong,
  getSongRadio,
  getMoodSongs,
};
