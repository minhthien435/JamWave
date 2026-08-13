const prisma = require("../lib/prisma");
const { GENRE_KEYWORDS, MOOD_MAP, ENERGY_GENRES, PURPOSE_MAP } = require("./aiService");
const { getLyricsForSong } = require("./lyricService");
const { getArtistImage } = require("./artistImageService");
const { searchArtist } = require("./musicBrainz");
const { embedText } = require("./embeddingService");

// ---- Chuẩn hóa bài hát cho response ----
function normalizeSong(song) {
  if (!song) return null;
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    albumCover: song.albumCover,
    audioURL: song.audioURL || song.audioUrl,
    duration: song.duration,
    releaseYear: song.releaseYear ?? null,
    genre: song.genre ?? null,
    source: song.source ?? "jamendo",
    albumId: song.albumId ?? null,
  };
}

function normalizeSongs(songs) {
  return (songs || []).map(normalizeSong).filter(Boolean);
}

// ---- Chuẩn hóa tên: bỏ diacritic, in thường, bỏ ký tự đặc biệt/emoji, bỏ khoảng trắng ----
const VIET_BASE = {
  "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a", "ă": "a", "ắ": "a", "ằ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
  "â": "a", "ấ": "a", "ầ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
  "đ": "d",
  "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e", "ê": "e", "ế": "e", "ề": "e", "ể": "e", "ễ": "e", "ệ": "e",
  "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
  "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o", "ô": "o", "ố": "o", "ồ": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
  "ơ": "o", "ớ": "o", "ờ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
  "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u", "ư": "u", "ứ": "u", "ừ": "u", "ử": "u", "ữ": "u", "ự": "u",
  "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
};
function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/g, (ch) => VIET_BASE[ch] || ch)
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Chuẩn hóa giữ nguyên từ (bỏ diacritic, bỏ ký tự đặc biệt/emoji, giữ khoảng cách từ)
function normalizeKeepWords(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/g, (ch) => VIET_BASE[ch] || ch)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Khoảng cách Levenshtein (cho fuzzy match) ----
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[n];
}

// Độ tương đồng tốt nhất: tìm cửa sổ trong câu sát tên nhất (0..1)
function bestSimilarity(name, sentence) {
  if (!name || !sentence) return 0;
  if (sentence.includes(name)) return 1;
  const len = name.length;
  let best = 0;
  for (let start = 0; start <= sentence.length - len; start++) {
    const window = sentence.slice(start, start + len);
    const sim = 1 - levenshtein(name, window) / Math.max(len, window.length);
    if (sim > best) best = sim;
  }
  return best;
}

// ---- Tìm nghệ sĩ trong DB khớp với câu hỏi (chuẩn hóa + fuzzy) ----
async function findArtist(message) {
  const groups = await prisma.song.groupBy({
    by: ["artist"],
    _count: { _all: true },
  });

  const artists = groups.map((g) => ({ name: g.artist, songCount: g._count._all }));
  const msgNorm = normalizeName(message);
  const msgWords = normalizeKeepWords(message).split(/\s+/).filter((t) => t.length >= 3);

  let best = null;
  let bestScore = 0;

  for (const artist of artists) {
    const anNorm = normalizeName(artist.name);
    if (!anNorm || anNorm.length < 2) continue;

    // 1) Khớp chuỗi con chính xác (sau chuẩn hóa) -> mạnh nhất
    if (msgNorm.includes(anNorm)) {
      // Chọn tên cụ thể nhất (dài nhất) khi nhiều nghệ sĩ lồng nhau
      if (!best || anNorm.length > normalizeName(best.name).length) {
        best = artist;
        bestScore = 1;
      }
      continue;
    }

    // 2) Khớp token: tỷ lệ token của tên xuất hiện trong câu
    const artistWords = normalizeKeepWords(artist.name).split(/\s+/).filter((t) => t.length >= 3);
    if (artistWords.length > 0) {
      const hit = artistWords.filter((t) => msgWords.includes(t)).length;
      const score = hit / artistWords.length;
      if (score > bestScore) {
        bestScore = score;
        best = artist;
      }
    }

    // 3) Fuzzy match (Levenshtein) chỉ cho tên dài đủ, sai lệch nhẹ (vd thiếu dấu, gõ trật 1-2 ký tự)
    if (anNorm.length >= 4) {
      const fuzzy = bestSimilarity(anNorm, msgNorm);
      if (fuzzy > bestScore) {
        bestScore = fuzzy;
        best = artist;
      }
    }
  }

  // 4) Khớp qua alias từ MusicBrainz (ArtistMeta) — tên gọi khác / tên thật của nghệ sĩ
  const metas = await prisma.artistMeta.findMany({ select: { name: true, aliases: true } });
  const aliasToDb = new Map(); // normalizeName -> db artists
  for (const m of metas) {
    const canonNorm = normalizeName(m.name);
    const dbArtists = artists.filter((a) => normalizeName(a.name) === canonNorm);
    if (dbArtists.length === 0) continue;
    for (const nm of [m.name, ...(m.aliases || [])]) {
      const n = normalizeName(nm);
      if (!n || n.length < 2) continue;
      if (!aliasToDb.has(n)) aliasToDb.set(n, []);
      for (const a of dbArtists) if (!aliasToDb.get(n).includes(a)) aliasToDb.get(n).push(a);
    }
  }
  for (const [aliasNorm, dbArtists] of aliasToDb) {
    if (msgNorm.includes(aliasNorm) || aliasNorm.includes(msgNorm)) {
      for (const a of dbArtists) {
        if (!best || normalizeName(a.name).length > normalizeName(best.name).length) {
          best = a;
          bestScore = 1;
        }
      }
    }
  }

  const result = bestScore >= 0.85 ? best : null;
  // On-demand: enrich nghệ sĩ này nền để alias/genre sẵn sàng cho lần hỏi sau
  if (result) ensureArtistMeta(result.name);
  return result;
}

// ---- Gợi ý các nghệ sĩ gần đúng nhất khi không tìm thấy chính xác ----
async function suggestArtists(message, limit = 3) {
  const groups = await prisma.song.groupBy({
    by: ["artist"],
    _count: { _all: true },
  });
  const msgNorm = normalizeName(message);
  const msgWords = normalizeKeepWords(message).split(/\s+/).filter((t) => t.length >= 3);

  const scored = groups
    .map((g) => {
      const anNorm = normalizeName(g.artist);
      if (!anNorm || anNorm.length < 2) return null;
      let score = 0;
      if (msgNorm.includes(anNorm)) score = 1;
      else if (anNorm.includes(msgNorm)) score = 0.9;
      const artistWords = normalizeKeepWords(g.artist).split(/\s+/).filter((t) => t.length >= 3);
      if (artistWords.length) {
        const hit = artistWords.filter((t) => msgWords.includes(t)).length;
        score = Math.max(score, (hit / artistWords.length) * 0.8);
      }
      score = Math.max(score, bestSimilarity(anNorm, msgNorm) * 0.9);
      return { name: g.artist, songCount: g._count._all, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).filter((s) => s.score >= 0.4);
}

// ---- Tìm bài hát trong DB theo tên ----
async function findSong(title) {
  const song = await prisma.song.findFirst({
    where: { title: { contains: title, mode: "insensitive" } },
  });
  return song || null;
}

// ---- Tìm bài hát xuất hiện trong câu thoại ----
async function findSongInMessage(message) {
  if (!message || !message.trim()) return null;
  const songs = await prisma.song.findMany();
  const lowerMsg = message.toLowerCase();

  const sorted = songs.sort((a, b) => b.title.length - a.title.length);
  for (const song of sorted) {
    if (song.title.length >= 2 && lowerMsg.includes(song.title.toLowerCase())) {
      return song;
    }
  }
  return null;
}

// ---- Tìm album theo tên ----
async function findAlbum(name) {
  const album = await prisma.album.findFirst({
    where: { title: { contains: name, mode: "insensitive" } },
    include: { songs: { orderBy: { id: "asc" } } },
  });
  return album || null;
}

async function getAlbumById(albumId) {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: { songs: { orderBy: { id: "asc" } } },
  });
  return album || null;
}

// ---- Enrich nghệ sĩ theo yêu cầu (on-demand) ----
// Nếu nghệ sĩ chưa có trong ArtistMeta -> gọi MusicBrainz nền (fire-and-forget),
// rồi cache lại. Không block request chat. Lần hỏi sau tái sử dụng cache.
const inFlightArtist = new Set();
async function ensureArtistMeta(name) {
  if (!name || !name.trim()) return null;

  const cached = await prisma.artistMeta.findUnique({ where: { name } });
  if (cached) return cached;

  // Tránh gọi MusicBrainz trùng cho cùng nghệ sĩ khi có nhiều request đồng thời
  if (inFlightArtist.has(name)) return null;
  inFlightArtist.add(name);

  // Fire-and-forget: enrich nền, không await ở đây
  searchArtist(name)
    .then(async (result) => {
      if (result) {
        await prisma.artistMeta.upsert({
          where: { name },
          update: {
            artistMbid: result.mbid,
            name: result.name,
            aliases: result.aliases,
            genres: result.genres,
            country: result.country,
            yearRange: result.yearRange,
          },
          create: {
            name,
            artistMbid: result.mbid,
            aliases: result.aliases,
            genres: result.genres,
            country: result.country,
            yearRange: result.yearRange,
          },
        });
      }
    })
    .catch((e) => console.error(`ensureArtistMeta(${name}) lỗi:`, e.message))
    .finally(() => inFlightArtist.delete(name));

  return null; // chưa có -> trả null, request hiện tại xử lý bằng dữ liệu DB hiện có
}

// ---- Thông tin nghệ sĩ đầy đủ ----
async function getArtistInfo(name) {
  const where = { artist: { equals: name, mode: "insensitive" } };

  const [songCount, songs, albums] = await Promise.all([
    prisma.song.count({ where: { ...where, duplicateOf: null } }),
    prisma.song.findMany({ where: { ...where, duplicateOf: null }, orderBy: { id: "asc" }, take: 100 }),
    prisma.album.findMany({ where, take: 5 }),
  ]);

  if (songCount === 0) return null;

  const years = [
    ...new Set(songs.map((s) => s.releaseYear).filter(Boolean)),
  ].sort((a, b) => a - b);

  // Top genres theo tần suất
  const genreCounts = new Map();
  for (const s of songs) {
    for (const g of (s.genre || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    }
  }
  const genres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g.charAt(0).toUpperCase() + g.slice(1));

  // Bổ sung genres từ MusicBrainz (ArtistMeta) nếu DB có ít thông tin
  const meta = await ensureArtistMeta(songs[0].artist);
  if (meta?.genres?.length && genres.length <= 2) {
    for (const g of meta.genres) {
      if (!genres.some((x) => x.toLowerCase() === g.toLowerCase()) && genres.length < 4) {
        genres.push(g.charAt(0).toUpperCase() + g.slice(1));
      }
    }
  }

  const sources = [...new Set(songs.map((s) => s.source).filter(Boolean))];
  const image = await getArtistImage(songs[0].artist, sources[0] || null);

  return {
    name: songs[0].artist,
    songCount,
    coverImg: songs[0].albumCover,
    image,
    genres,
    sources,
    yearRange: years.length >= 2 ? [years[0], years[years.length - 1]] : years.length === 1 ? [years[0]] : [],
    albums: albums.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist,
      coverImg: a.coverImg,
      songCount: a._count?.songs ?? a.songs?.length ?? 0,
      source: a.songs?.[0]?.source || "jamendo",
    })),
    topSongs: normalizeSongs(songs.slice(0, 10)),
  };
}

// ---- Chuẩn hóa album ----
function normalizeAlbum(album, songs = []) {
  if (!album) return null;
  const years = [...new Set(songs.map((s) => s.releaseYear).filter(Boolean))].sort((a, b) => a - b);
  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    coverImg: album.coverImg,
    songCount: songs.length || album._count?.songs || 0,
    releaseYears: years,
    source: songs[0]?.source || album.songs?.[0]?.source || "jamendo",
  };
}

// ---- Tìm kiếm nhạc theo thuộc tính (genre / mood / energy / vocal / purpose) ----
async function searchMusic(attrs = {}, limit = 10) {
  const genreSet = new Set();
  const termSet = new Set();

  const applyGenres = (genres) => genres.forEach((g) => genreSet.add(g.toLowerCase()));
  const applyTerms = (terms) => terms.forEach((t) => termSet.add(t.toLowerCase()));

  // Genre từ khóa
  if (attrs.genre) {
    const g = GENRE_KEYWORDS.find((k) => k.keyword === attrs.genre.toLowerCase() || attrs.genre.toLowerCase().includes(k.keyword));
    if (g) {
      applyGenres(g.genres);
      applyTerms(g.fallbackTerms || []);
    } else {
      applyTerms([attrs.genre]);
      genreSet.add(attrs.genre.toLowerCase());
    }
  }

  // Mood
  if (attrs.mood) {
    const m = MOOD_MAP.find((x) => x.mood === attrs.mood.toLowerCase() || attrs.mood.toLowerCase().includes(x.mood));
    if (m) {
      applyGenres(m.genres);
      applyTerms(m.terms || []);
    }
  }

  // Purpose
  if (attrs.purpose) {
    const p = PURPOSE_MAP[attrs.purpose.toLowerCase()] || PURPOSE_MAP[Object.keys(PURPOSE_MAP).find((k) => attrs.purpose.toLowerCase().includes(k))];
    if (p) {
      applyGenres(p.genres);
      applyTerms(p.terms || []);
    }
  }

  // Energy
  if (attrs.energy === "high") applyGenres(ENERGY_GENRES.high);
  if (attrs.energy === "low") applyGenres(ENERGY_GENRES.low);

  const where = {
    OR: [],
  };

  genreSet.forEach((g) => where.OR.push({ genre: { contains: g, mode: "insensitive" } }));
  termSet.forEach((t) => {
    where.OR.push({ title: { contains: t, mode: "insensitive" } });
    where.OR.push({ artist: { contains: t, mode: "insensitive" } });
  });

  if (attrs.artist) {
    where.artist = { equals: attrs.artist, mode: "insensitive" };
  }

  const wantInstrumental = attrs.vocal === "instrumental";
  const wantVocals = attrs.vocal === "vocals";

  if (wantInstrumental) {
    genreSet.add("instrumental");
    where.OR.push({ genre: { contains: "instrumental", mode: "insensitive" } });
    where.OR.push({ lyric: { instrumental: true } });
  }

  if (where.OR.length === 0) {
    // Không có thuộc tính nào -> trả rỗng, controller sẽ dùng gợi ý mặc định
    return { songs: [], label: "" };
  }

  const candidates = await prisma.song.findMany({
    where,
    include: { lyric: { select: { instrumental: true } } },
    take: 300,
    orderBy: { id: "asc" },
  });

  // ---- Ranking ----
  const sourceCounts = {};
  for (const s of candidates) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  }
  const totalCandidates = candidates.length || 1;
  const minoritySource = Object.entries(sourceCounts).sort((a, b) => a[1] - b[1])[0]?.[0];

  const scored = candidates.map((s) => {
    let score = 0;
    const genre = (s.genre || "").toLowerCase();
    const title = (s.title || "").toLowerCase();
    const artist = (s.artist || "").toLowerCase();
    const isInstrumental = s.lyric?.instrumental === true || genre.includes("instrumental");

    for (const g of genreSet) if (genre.includes(g)) score += 3;
    for (const t of termSet) {
      if (title.includes(t)) score += 1.5;
      if (artist.includes(t)) score += 0.5;
    }

    // Energy khớp
    if (attrs.energy === "high") {
      if (ENERGY_GENRES.high.some((g) => genre.includes(g))) score += 1.5;
      if (ENERGY_GENRES.low.some((g) => genre.includes(g))) score -= 1.5;
    } else if (attrs.energy === "low") {
      if (ENERGY_GENRES.low.some((g) => genre.includes(g))) score += 1.5;
      if (ENERGY_GENRES.high.some((g) => genre.includes(g))) score -= 1.5;
    }

    // Vocal khớp
    if (wantInstrumental && isInstrumental) score += 2.5;
    if (wantVocals && !isInstrumental) score += 1.5;
    if (wantInstrumental && !isInstrumental) score -= 2;
    if (wantVocals && isInstrumental) score -= 3;

    // Cân bằng nguồn (jamendo / audius)
    if (s.source === minoritySource && sourceCounts[s.source] < totalCandidates * 0.6) score += 0.4;

    return { song: s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Loại bỏ trùng title+artist
  const seen = new Set();
  const ranked = [];
  for (const { song } of scored) {
    const key = `${song.title}|${song.artist}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push(song);
    if (ranked.length >= limit) break;
  }

  return { songs: normalizeSongs(ranked), label: "" };
}

// ---- Gợi ý bài hát: theo nghệ sĩ / thể loại / ngẫu nhiên ----
async function suggestSongs(message, artist) {
  const lowerMsg = message.toLowerCase();
  const genre = GENRE_KEYWORDS.find((g) => lowerMsg.includes(g.keyword));

  if (artist) {
    const songs = await prisma.song.findMany({
      where: { artist: { equals: artist.name, mode: "insensitive" }, duplicateOf: null },
      take: 10,
    });
    return { songs: normalizeSongs(songs), label: artist.name };
  }

  if (genre) {
    const genreFilters = genre.genres.map((g) => ({
      genre: { contains: g, mode: "insensitive" },
    }));
    let songs = await prisma.song.findMany({
      where: {
        duplicateOf: null,
        OR: [
          { title: { contains: genre.keyword, mode: "insensitive" } },
          { artist: { contains: genre.keyword, mode: "insensitive" } },
          ...genreFilters,
        ],
      },
      take: 10,
    });

    // Genre quá ít bài: tìm theo từ khóa title/artist
    if (songs.length < 5 && genre.fallbackTerms?.length) {
      const termFilters = genre.fallbackTerms.flatMap((t) => [
        { title: { contains: t, mode: "insensitive" } },
        { artist: { contains: t, mode: "insensitive" } },
      ]);
      const fallback = await prisma.song.findMany({
        where: { duplicateOf: null, OR: termFilters },
        take: 10,
      });
      if (fallback.length > 0) songs = fallback;
    }

    return { songs: normalizeSongs(songs), label: genre.label };
  }

  const songs = await prisma.song.findMany({
    where: { duplicateOf: null },
    orderBy: { id: "asc" },
    take: 10,
  });
  return { songs: normalizeSongs(songs), label: "" };
}

// ---- Bài hát ngẫu nhiên (đã tráo) ----
async function getRandomSongs(count = 10) {
  const total = await prisma.song.count({ where: { duplicateOf: null } });
  if (total === 0) return [];
  const skip = total > count ? Math.floor(Math.random() * (total - count)) : 0;
  const list = await prisma.song.findMany({ where: { duplicateOf: null }, orderBy: { id: "asc" }, skip, take: Math.min(count * 2, total) });
  return normalizeSongs(list.sort(() => Math.random() - 0.5).slice(0, count));
}

// ---- Bài liên quan (cùng nghệ sĩ) làm queue khi phát 1 bài ----
async function getRelatedSongs(song, count = 9) {
  const related = await prisma.song.findMany({
    where: { artist: { equals: song.artist, mode: "insensitive" }, NOT: { id: song.id }, duplicateOf: null },
    take: count,
  });
  return normalizeSongs(related);
}

// ---- Semantic search (pgvector cosine similarity), dựa trên embedding ----
// Trả về list bài tương tự về ý nghĩa/mood/vibe mô tả tự do.
const SEMANTIC_FIELDS = `"id","title","artist","albumCover","audioURL","duration","releaseYear","genre","source","albumId"`;
const toNormalized = (rows) => {
  const mapDb = (r) => ({ ...r, audioURL: r.audioURL || r.audioUrl, source: r.source || "jamendo" });
  return normalizeSongs(rows.map(mapDb));
};

async function semanticSearch(query, count = 10) {
  if (!query || !query.trim()) return [];
  const vec = await embedText(query);
  if (!vec) return [];
  const list = `[${vec.join(",")}]`;
  const q = `'${list}'::vector`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SEMANTIC_FIELDS}, (1 - ("embedding" <=> ${q}))::real AS _score
     FROM "Song"
     WHERE "embedding" IS NOT NULL AND "duplicateOf" IS NULL
     ORDER BY "embedding" <=> ${q}
     LIMIT ${count}`
  );
  return toNormalized(rows || []);
}

// ---- Tìm bài tương tự 1 bài (dùng embedding của seed) ----
async function findSimilarSongs(songId, count = 15) {
  if (!songId) return [];
  const seed = await prisma.$queryRawUnsafe(
    `SELECT "embedding"::text AS emb FROM "Song" WHERE id = ${songId} AND "embedding" IS NOT NULL LIMIT 1`
  );
  const embStr = seed?.[0]?.emb;
  let emb = null;
  try { emb = embStr ? JSON.parse(embStr) : null; } catch { emb = null; }
  if (!emb || !Array.isArray(emb)) return [];
  const list = `[${emb.join(",")}]`;
  const q = `'${list}'::vector`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SEMANTIC_FIELDS}, (1 - ("embedding" <=> ${q}))::real AS _score
     FROM "Song"
     WHERE "embedding" IS NOT NULL AND "duplicateOf" IS NULL AND "id" <> ${songId}
     ORDER BY "embedding" <=> ${q}
     LIMIT ${count}`
  );
  return toNormalized(rows || []);
}

// ---- Radio: chuỗi bài tương đồng với 1 bài/nguồn gốc (semantic + genre/keyword) ----
async function getRadioSongs(seed, count = 15) {
  if (!seed) return [];
  const seedGenres = (seed.genre || "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  const seedTitle = (seed.title || "").toLowerCase();
  const wanted = Math.max(count, 5);

  // 0) Ưu tiên semantic: nếu seed có vector, lấy bài tương tự ngay
  if (seed.id) {
    const semantic = await findSimilarSongs(seed.id, Math.max(wanted, 10));
    if (semantic.length >= Math.min(5, wanted)) {
      return normalizeSongs(semantic.slice(0, count));
    }
  }

  const songFields = {
    select: { id: true, title: true, artist: true, albumCover: true, audioURL: true, duration: true, releaseYear: true, genre: true, source: true, albumId: true },
  };

  // 1) Cùng nghệ sĩ trước
  const sameArtist = await prisma.song.findMany({
    where: { artist: { equals: seed.artist, mode: "insensitive" }, NOT: { id: seed.id }, duplicateOf: null },
    ...songFields,
    take: wanted,
  });

  // 2) Cùng thể loại (lấy rộng rồi chấm điểm)
  const genreCandidates = seedGenres.length
    ? await prisma.song.findMany({
        where: {
          duplicateOf: null,
          NOT: { id: seed.id },
          OR: seedGenres.map((g) => ({ genre: { contains: g, mode: "insensitive" } })),
        },
        ...songFields,
        take: Math.max(wanted * 3, 30),
      })
    : [];

  // Chấm điểm ứng viên thể loại: cùng nghệ sĩ +, khớp nhiều genre +
  const scored = genreCandidates.map((s) => {
    let score = 0;
    const sGenres = (s.genre || "").toLowerCase();
    for (const g of seedGenres) if (sGenres.includes(g)) score += 2;
    if (s.artist.toLowerCase() === seed.artist.toLowerCase()) score += 3;
    if ((s.title || "").toLowerCase() === seedTitle) score += 1;
    return { song: s, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Gộp: cùng nghệ sĩ rồi đến thể loại, không trùng
  const seen = new Set([seed.id]);
  const result = [];
  const push = (s) => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    result.push(s);
  };
  for (const { song } of scored) push(song);
  for (const s of sameArtist) push(s);

  // 3) Bổ sung ngẫu nhiên nếu chưa đủ
  if (result.length < wanted) {
    const extra = await prisma.song.findMany({
      where: { duplicateOf: null, NOT: { id: { in: [...seen] } } },
      ...songFields,
      take: wanted - result.length,
    });
    for (const s of extra) push(s);
  }

  return normalizeSongs(result.slice(0, count));
}

module.exports = {
  normalizeSong,
  normalizeSongs,
  findArtist,
  suggestArtists,
  ensureArtistMeta,
  findSong,
  findSongInMessage,
  findAlbum,
  getAlbumById,
  getArtistInfo,
  normalizeAlbum,
  searchMusic,
  suggestSongs,
  getRandomSongs,
  getRelatedSongs,
  getRadioSongs,
  semanticSearch,
  findSimilarSongs,
  getLyricsForSong,
};