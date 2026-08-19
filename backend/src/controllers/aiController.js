const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const tools = require("../services/aiTools");
const {
  detectLanguage,
  pickReply,
  fmt,
  askLLM,
  llmErrorReply,
  classifyIntent,
  sessionStore,
  GENRE_KEYWORDS,
  MOOD_MAP,
  ENERGY_GENRES,
  PURPOSE_MAP,
} = require("../services/aiService");

// ---------- Response chuẩn hóa ----------
function respond(res, { type = "text", reply = "", songs = [], artists = [], albums = [], action = null, lang = "vi", playlist = null }) {
  const suggestions = buildSuggestions({ action, type, songs, artists, albums, playlist, lang });
  const data = { type, reply, songs, artists, albums, action, lang, playlist, suggestions };

  if (res.locals?.sse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: "result", data })}\n\n`);

    const text = String(data.reply || "");
    if (!text) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return res;
    }
    const safeWrite = (chunk) => {
      try {
        res.write(chunk);
        return true;
      } catch {
        clearInterval(timer);
        return false;
      }
    };
    // Stream reply text theo chunk (hiệu ứng gõ chữ) rồi đóng kết nối
    const chunkSize = Math.max(1, Math.ceil(text.length / 24));
    let i = 0;
    const timer = setInterval(() => {
      const chunk = text.slice(i, i + chunkSize);
      i += chunkSize;
      if (!safeWrite(`data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`)) return;
      if (i >= text.length) {
        clearInterval(timer);
        safeWrite(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        try { res.end(); } catch { /* client đã đóng kết nối */ }
      }
    }, 24);
    return res;
  }

  return res.json(data);
}

// ---------- Câu gợi ý tiếp theo (follow-up chips) ----------
const SUGGESTIONS = {
  vi: {
    play: (artist) => ["Phát bài tiếp theo", `Thêm nhạc giống ${artist || "bài này"} vào hàng chờ`, "Bài tôi nghe nhiều nhất"],
    append: ["Phát bài tiếp theo", "Phát nhạc ngẫu nhiên", "Tạo playlist nhạc lofi 10 bài"],
    playlist: (title) => ["Phát nhạc ngẫu nhiên", `Thêm bài Breathe vào playlist ${title}`, "Tạo playlist nhạc lofi 10 bài"],
    artist: (name) => [`Phát tất cả nhạc của ${name}`, `Tạo playlist nhạc của ${name} 10 bài`, "Bài tôi nghe nhiều nhất"],
    album: ["Phát tất cả bài trong album này", "Thêm toàn bộ album vào hàng chờ", "Phát nhạc ngẫu nhiên"],
    songs: (artist) => ["Phát nhạc ngẫu nhiên", `Thêm nhạc giống ${artist || "bài này"} vào hàng chờ`, "Bài tôi nghe nhiều nhất"],
    text: ["Phát nhạc ngẫu nhiên", "Bài đang hot nhất", "Tìm nhạc không lời chill"],
  },
  en: {
    play: (artist) => ["Play next", `Queue more like ${artist || "this song"}`, "My most-played songs"],
    append: ["Play next", "Play random music", "Make a lofi playlist"],
    playlist: (title) => ["Play random music", `Add Breathe to the playlist ${title}`, "Make a lofi playlist"],
    artist: (name) => [`Play all ${name} songs`, `Make a ${name} playlist`, "My most-played songs"],
    album: ["Play the whole album", "Queue the whole album", "Play random music"],
    songs: (artist) => ["Play random music", `Queue more like ${artist || "this song"}`, "My most-played songs"],
    text: ["Play random music", "Trending songs right now", "Find chill instrumental music"],
  },
};

function buildSuggestions({ action, type, songs, artists, albums, playlist, lang }) {
  const l = lang === "en" ? "en" : "vi";
  const s = SUGGESTIONS[l];
  const first = Array.isArray(songs) && songs.length ? songs[0] : null;
  const artist = first?.artist || (Array.isArray(artists) && artists.length ? artists[0].name : null);
  let list;
  if (action === "play") list = s.play(artist);
  else if (action === "append") list = s.append;
  else if (action === "playlist_created" || action === "playlist_updated") list = s.playlist(playlist?.title || "playlist này");
  else if (Array.isArray(artists) && artists.length) list = s.artist(artists[0].name);
  else if (Array.isArray(albums) && albums.length) list = s.album;
  else if (type === "songs") list = s.songs(artist);
  else list = s.text;
  return list.slice(0, 3);
}

// Định dạng thời lượng giây -> "m:ss"
function fmtDuration(seconds) {
  const sec = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Lấy userId từ Bearer token (null nếu chưa đăng nhập / token lỗi)
function getUserId(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded && decoded.userId) return Number(decoded.userId);
    } catch {
      // token không hợp lệ
    }
  }
  return null;
}

// Nhận diện mục đích nghe (study/focus/sleep/workout/party/night/coding) từ câu
function findPurposeKey(lower) {
  const map = [
    { re: /(học|ôn thi|study|revise)/i, key: "study" },
    { re: /(tập trung|focus|concentrat)/i, key: "focus" },
    { re: /(ngủ|đi ngủ|sleep)/i, key: "sleep" },
    { re: /(tập luyện|tập gym|gym|workout|chạy bộ|running)/i, key: "workout" },
    { re: /(tiệc|party|club)/i, key: "party" },
    { re: /(đêm khuya|khuya|night|thức khuya)/i, key: "night" },
    { re: /(lập trình|code|coding|viết code)/i, key: "coding" },
  ];
  return map.find((m) => m.re.test(lower))?.key || null;
}

// Trích bộ lọc nhạc (genre / mood / energy / vocal / purpose) từ câu mô tả tự nhiên
function extractMusicAttrs(lower) {
  const attrs = {};
  const g = GENRE_KEYWORDS.find((x) => lower.includes(x.keyword));
  if (g) attrs.genre = g.keyword;
  const m = MOOD_MAP.find((x) => lower.includes(x.mood));
  if (m) attrs.mood = m.mood;
  if (/(không lời|khong loi|nhạc không lời|nhac khong loi|instrumental|without vocals|no vocal)/i.test(lower)) attrs.vocal = "instrumental";
  else if (/(có lời|co loi|with vocals)/i.test(lower)) attrs.vocal = "vocals";
  if (/(năng lượng cao|nang luong cao|mạnh|manh|upbeat|high energy|sôi động)/i.test(lower)) attrs.energy = "high";
  else if (/(nhẹ nhàng|nhe nhang|thư giãn|thu gian|thả lỏng|chậm|cham|low energy|calm)/i.test(lower)) attrs.energy = "low";
  const purpose = findPurposeKey(lower);
  if (purpose) attrs.purpose = purpose;
  return attrs;
}

// Session key: userId nếu có token hợp lệ, ngược lại theo IP
function getSessionKey(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded && decoded.userId) return `u:${decoded.userId}`;
    } catch {
      // token không hợp lệ -> dùng IP
    }
  }
  return `ip:${req.ip}`;
}

// Trích tên bài hát từ câu: "phát bài See Tình", "lời bài Rap God", "tác giả bài hát Breathe là ai"...
function extractSongTitle(msg) {
  let songMatch = msg.match(/(?:bài\s+hát|bài|song|track)\s+["'“”]?([^"'“”?]+?)["'“”]?\s*(?:\?|$)/i);
  if (!songMatch) {
    songMatch = msg.match(/^(?:add|thêm|remove|bỏ|gỡ|xóa)\s+["'“”]?([^"'“”?]+?)["'“”]?\s+(?:to|vào|from|khỏi)\s+(?:the |a |an |my )?(?:playlist|danh sách)/i);
  }
  if (!songMatch) return "";
  return songMatch[1]
    .trim()
    .replace(/\s+(của|bởi|by|là ai|là sáng tác của|do ai sáng tác|do ai hát)\s*.*$/i, "")
    .replace(/\s+(vào|qua|to|khỏi|from)\s+(?:playlist|danh sách).*$/i, "")
    .replace(/\s+(thể loại gì|thể loại nào|thuộc thể loại|thuộc loại|dài bao lâu|thời lượng|bao lâu|mấy phút|mấy giây|như thế nào|khi nào|năm nào|năm mấy|năm bao nhiêu|ra đời khi nào|phát hành khi nào|có bao nhiêu bài|bao nhiêu bài|hát bởi ai|ai hát|ai sáng tác|tên gì|tên là gì)\s*.*$/i, "")
    .replace(/\s+(này|đang phát|hiện tại|nhé|nha|đi)$/i, "")
    .replace(/^(của|tên|tựa|tự)\s+/i, "");
}

// Trích tên nghệ sĩ từ câu hỏi khi chưa tìm thấy chính xác (vd "X có bao nhiêu bài?")
function extractArtistHint(msg) {
  const cleaned = (msg || "")
    .replace(/^(có|về|cho|từ|nghe|phát|mở|bật|tìm|tìm kiếm|\s)+(có|về|cho|từ|nghe|phát|mở|bật|tìm|tìm kiếm)?\s*/i, "")
    .replace(/\s+(có|gồm|đang|hiện|trong|ở|thư viện)\s+.*$/i, "")
    .replace(/\s+(bao nhiêu bài|bao nhiêu bài hát|mấy bài|mấy bài hát|số bài|số bài hát|tổng cộng|how many songs|how many tracks|songs? does|tracks? does|songs?)\s*.*$/i, "")
    .replace(/^(của|tên|nghệ sĩ|ca sĩ|artist)\s+/i, "")
    .replace(/[?!.]/g, "")
    .trim();
  if (!cleaned || cleaned.length < 2) return "";
  // Chỉ coi là tên nghệ sĩ nếu chứa chữ cái (không phải từ hỏi thuần)
  if (/^(bao nhiêu|mấy|số|nhiều|tổng|how|many|what|tất cả|toàn)/i.test(cleaned)) return "";
  return cleaned.length > 40 ? cleaned.slice(0, 40) : cleaned;
}

// Context thư viện cho LLM
async function buildLibraryContext(artist, currentSong) {
  const total = await prisma.song.count();
  const topArtists = await prisma.song.groupBy({
    by: ["artist"],
    _count: { _all: true },
    orderBy: { _count: { artist: "desc" } },
    take: 8,
  });

  const parts = [
    `Library has ${total} songs. Top artists: ${topArtists
      .map((a) => `${a.artist} (${a._count._all} songs)`)
      .join(", ")}.`,
  ];

  if (currentSong) {
    parts.push(
      `Currently playing: "${currentSong.title}" by ${currentSong.artist} (source: ${currentSong.source || "unknown"}, genre: ${currentSong.genre || "unknown"}).`
    );
  }

  if (artist) {
    const songs = await prisma.song.findMany({
      where: { artist: { equals: artist.name, mode: "insensitive" } },
      select: { title: true },
      take: 5,
    });
    parts.push(
      `Artist the user asked about: ${artist.name} has ${artist.songCount} songs in the library, e.g.: ${songs
        .map((s) => s.title)
        .join(", ")}.`
    );
  }

  return parts.join(" ");
}

// Mô tả ngắn bộ lọc tìm kiếm (cho reply)
const PURPOSE_LABELS = {
  study: { vi: "học tập", en: "studying" },
  focus: { vi: "tập trung", en: "focusing" },
  sleep: { vi: "ngủ", en: "sleep" },
  workout: { vi: "tập gym", en: "workout" },
  party: { vi: "tiệc tùng", en: "party" },
  night: { vi: "khuya", en: "late night" },
  coding: { vi: "lập trình", en: "coding" },
};

function describeFilters(attrs, lang) {
  const parts = [];
  const genreLabel = GENRE_KEYWORDS.find((g) => g.keyword === attrs.genre?.toLowerCase());
  const moodLabel = MOOD_MAP.find((m) => m.mood === attrs.mood?.toLowerCase());
  if (genreLabel) parts.push(lang === "vi" ? genreLabel.label : genreLabel.label);
  else if (attrs.genre) parts.push(attrs.genre);
  if (moodLabel) parts.push(lang === "vi" ? moodLabel.mood : moodLabel.mood);
  else if (attrs.mood) parts.push(attrs.mood);
  if (attrs.purpose) {
    const p = PURPOSE_LABELS[attrs.purpose.toLowerCase()];
    if (p) parts.push(lang === "vi" ? p.vi : p.en);
  }
  if (attrs.vocal === "instrumental") parts.push(lang === "vi" ? "không lời" : "instrumental");
  if (attrs.vocal === "vocals") parts.push(lang === "vi" ? "có lời hát" : "with vocals");
  if (attrs.energy) parts.push(lang === "vi" ? `năng lượng ${attrs.energy}` : `${attrs.energy} energy`);
  return [...new Set(parts.filter(Boolean))].join(" · ");
}

// Trả lời "không tìm thấy nghệ sĩ" kèm gợi ý gần đúng, TRÁNH lệch sang tổng thư viện
async function artistNotFoundReply(res, query, lang) {
  const t = (obj) => pickReply(obj, lang);
  const suggestions = await tools.suggestArtists(query, 3);
  const suggestText = suggestions.length
    ? t({
        vi: `\nCó phải bạn muốn hỏi về: ${suggestions.map((s) => `*${s.name}* (${s.songCount} bài)`).join(", ")}?`,
        en: `\nDid you mean: ${suggestions.map((s) => `*${s.name}* (${s.songCount} songs)`).join(", ")}?`,
      })
    : "";
  return respond(res, {
    lang,
    reply: t({
      vi: `Mình không tìm thấy nghệ sĩ **${query}** trong thư viện.${suggestText}\n\nBạn thử hỏi: "Thông tin nghệ sĩ ..." hoặc "Bài hát của ..." nhé!`,
      en: `I couldn't find the artist **${query}** in the library.${suggestText}\n\nTry asking: "Tell me about artist ..." or "Songs by ..."!`,
    }),
  });
}

// ---------- Xử lý tin nhắn chính ----------
const chat = async (req, res) => {
  try {
    const { message, history = [], currentSong } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung tin nhắn" });
    }

    const msg = message.trim();
    const lower = msg.toLowerCase();
    const lang = detectLanguage(msg);
    const sessionKey = getSessionKey(req);
    const session = sessionStore.get(sessionKey);
    let lastResults = session?.lastResults || [];

    const t = (obj) => pickReply(obj, lang);

    // 1) Chào hỏi
    if (/^(xin chào|chào|hello|hi|hê nhô|alo|ờ lô|hey|chao)\b/i.test(lower)) {
      return respond(res, {
        lang,
        reply: t({
          vi: "Chào bạn! Mình là trợ lý nhạc JamWave 🎵\nBạn có thể hỏi mình:\n• \"Phát nhạc ngẫu nhiên\" hoặc \"Phát bài Breathe\"\n• \"Gợi ý nhạc lofi\" hoặc \"Gợi ý nhạc rock\"\n• \"Alexander Blu có bao nhiêu bài?\"\n• \"Bài hát của Anitek\"\n• \"Tìm nhạc indie chill cho việc học\"",
          en: "Hi there! I'm JamWave's music assistant 🎵\nYou can ask me:\n• \"Play random music\" or \"Play the song Breathe\"\n• \"Suggest lofi\" or \"Suggest rock music\"\n• \"How many songs does Alexander Blu have?\"\n• \"Songs by Anitek\"\n• \"Find some indie chill music for studying\"",
        }),
      });
    }

    // 2) Giới thiệu khả năng
    if (/(bạn làm được gì|giúp đỡ|help|trợ giúp|hướng dẫn|tính năng|có thể làm gì)/i.test(lower)) {
      return respond(res, {
        lang,
        reply: t({
          vi: "Mình có thể giúp bạn:\n🎧 Gợi ý bài hát theo nghệ sĩ / thể loại / tâm trạng\n🎤 Xem thông tin nghệ sĩ, số bài hát, xuất xứ\n💿 Tra cứu album, năm phát hành\n📊 Hỏi thống kê: \"bài dài nhất\", \"thể loại phổ biến\", \"bài đang hot\"\n🔎 Thông tin chi tiết: \"thông tin bài Breathe\"\n💾 Tạo playlist: \"Tạo playlist nhạc chill 10 bài\"\n🎚️ Điều khiển nhạc: \"tạm dừng\", \"bài tiếp theo\", \"thêm vào hàng chờ\"\n\nHãy thử hỏi: \"Find some chill indie music for studying\" nhé!",
          en: "I can help you:\n🎧 Suggest songs by artist / genre / mood\n🎤 Artist info, song counts and origin\n💿 Album info and release years\n📊 Ask for stats: \"longest song\", \"most popular genre\", \"trending now\"\n🔎 Track details: \"tell me about the song Breathe\"\n💾 Create playlists: \"Create a chill playlist with 10 songs\"\n🎚️ Control music: \"pause\", \"next song\", \"add to queue\"\n\nTry: \"Find some chill indie music for studying\"!",
        }),
      });
    }

    // 2b) Gợi ý nghệ sĩ theo thể loại (vd "Gợi ý các nghệ sĩ acoustic")
    if (/(gợi ý|đề xuất|suggest|nổi bật).*(nghệ sĩ|artist)|(nghệ sĩ|artist).*(gợi ý|đề xuất|nổi bật)/i.test(lower)) {
      const artistSuggestions = await tools.suggestArtistsByGenre(msg, 4);
      if (artistSuggestions.length) {
        const listText = artistSuggestions.map((a) => `• **${a.name}** (${a.songCount} bài)`).join("\n");
        return respond(res, {
          lang,
          type: "artists",
          reply: t({
            vi: `Một số nghệ sĩ nổi bật trong thư viện:\n${listText}`,
            en: `Notable artists in the library:\n${listText}`,
          }),
          songs: [],
          artists: artistSuggestions.map((a) => ({ name: a.name, songCount: a.songCount, image: null })),
        });
      }
    }

    // 3) Playlist từ chat (cần đăng nhập) — handler thật đặt sau khi tìm artist bên dưới

    // Tìm nghệ sĩ trong câu hỏi (cho các nhánh dùng artist)
    let artist = null;
    if (!/(album|đĩa nhạc)/i.test(lower)) {
      artist = await tools.findArtist(msg);
    }

    // 2c) Daily Mix / playlist thông minh (cần đăng nhập)
    if (/(daily mix|mix hôm nay|mix cho (tôi|mình|em)|nhạc cho (tôi|mình|em) hôm nay|playlist thông minh|smart playlist|bài hay hôm nay)/i.test(lower)) {
      const userId = getUserId(req);
      if (!userId) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Để tạo Daily Mix riêng, bạn cần **đăng nhập** trước nhé! 🔐",
            en: "To create your personal Daily Mix you need to **log in** first! 🔐",
          }),
        });
      }
      const songs = await tools.buildDailyMix(userId, 15);
      const dateStr = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      const title = `Daily Mix ${dateStr}`;
      let playlist = await prisma.playlist.findFirst({ where: { userId, title } });
      if (playlist) {
        await prisma.playlistSong.deleteMany({ where: { playlistId: playlist.id } });
      } else {
        playlist = await prisma.playlist.create({ data: { title, userId, isPublic: false } });
      }
      await prisma.playlistSong.createMany({
        data: songs.map((s) => ({ playlistId: playlist.id, songId: s.id })),
        skipDuplicates: true,
      });
      sessionStore.update(sessionKey, { lastResults: songs });
      return respond(res, {
        lang,
        type: "songs",
        action: "playlist_created",
        reply: t({
          vi: `Đã tạo **${title}** với **${songs.length} bài** chọn theo thói quen nghe của bạn! 🎧\nPlaylist đã xuất hiện ở sidebar.`,
          en: `Created **${title}** with **${songs.length} tracks** picked from your listening habits! 🎧\nIt's in your sidebar.`,
        }),
        songs,
        playlist: { id: playlist.id, title },
      });
    }

    // 3a) Playlist từ chat
    if (/(tạo playlist|create playlist|make me a playlist|make a playlist|make (a|an|me) .*playlist|playlist mới|thêm.*(vào|qua).*playlist|add to playlist|add .* to (a |an |my |the )?playlist|(bỏ|gỡ|xóa|remove).*(khỏi|from).*(playlist|danh sách)|(xóa|delete).*(playlist|danh sách)|(đổi tên|rename).*(playlist|danh sách))/i.test(lower)) {
      const userId = getUserId(req);
      if (!userId) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Để tạo / thêm playlist, bạn cần **đăng nhập** trước nhé! 🔐 Sau khi đăng nhập, thử lại: \"Tạo playlist nhạc chill 10 bài\" hoặc \"Thêm bài Breathe vào playlist ChillMix\".",
            en: "To create / edit playlists you need to **log in** first! 🔐 Once logged in, try: \"Create a chill playlist with 10 songs\".",
          }),
        });
      }

      // Bỏ bài hát khỏi playlist có sẵn
      if (/(bỏ|gỡ|xóa|remove).*(khỏi|from).*(playlist|danh sách)/i.test(lower)) {
        const plMatch = msg.match(/(?:playlist|danh sách)\s+["'“”]?([^"'“”?]+?)["'“”]?\s*(?:\?|$)/i);
        const playlistName = plMatch
          ? plMatch[1].replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "").trim()
          : "";
        if (!playlistName) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn bỏ bài khỏi playlist nào? Ví dụ: \"Bỏ bài Breathe khỏi playlist ChillMix\".",
              en: "Which playlist should I remove the song from? e.g. \"Remove Breathe from my ChillMix playlist\".",
            }),
          });
        }
        const plTitle = playlistName.slice(0, 60);
        const playlists = await prisma.playlist.findMany({
          where: { userId, title: { contains: plTitle, mode: "insensitive" } },
          take: 5,
        });
        const exact = playlists.find((p) => p.title.toLowerCase() === plTitle.toLowerCase()) || playlists[0];
        if (!exact) {
          return respond(res, {
            lang,
            reply: t({
              vi: `Mình không tìm thấy playlist **${plTitle}** của bạn.`,
              en: `I couldn't find playlist **${plTitle}**.`,
            }),
          });
        }
        const title = extractSongTitle(msg);
        const song = title ? await tools.findSong(title) : null;
        if (!song) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Mình chưa tìm được bài hát đó trong thư viện. Bạn thử nói tên bài khác nhé!",
              en: "I couldn't find that song. Try naming a different track!",
            }),
          });
        }
        await prisma.playlistSong.deleteMany({ where: { playlistId: exact.id, songId: song.id } });
        return respond(res, {
          lang,
          action: "playlist_updated",
          reply: fmt(t({
            vi: "Đã bỏ **{title}** ra khỏi playlist **{pl}**! ✅",
            en: "Removed **{title}** from playlist **{pl}**! ✅",
          }), { title: song.title, pl: exact.title }),
          playlist: { id: exact.id, title: exact.title },
        });
      }

      // Đổi tên playlist
      if (/(đổi tên|rename).*(playlist|danh sách)/i.test(lower)) {
        const plMatch = msg.match(/(?:playlist|danh sách)\s+["'“”]?([^"'“”?]+?)["'“”]?\s*(?:\?|$)/i);
        const playlistName = plMatch
          ? plMatch[1]
              .replace(/\s*(?:thành|thanh|to|tên mới|new name)\s+.*$/i, "")
              .replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "")
              .trim()
          : "";
        if (!playlistName) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn đổi tên playlist nào? Ví dụ: \"Đổi tên playlist ChillMix thành Chill Mix\".",
              en: "Which playlist do you want to rename? e.g. \"Rename playlist ChillMix to Chill Mix\".",
            }),
          });
        }
        const plTitle = playlistName.slice(0, 60);
        const playlists = await prisma.playlist.findMany({
          where: { userId, title: { contains: plTitle, mode: "insensitive" } },
          take: 5,
        });
        const exact = playlists.find((p) => p.title.toLowerCase() === plTitle.toLowerCase()) || playlists[0];
        if (!exact) {
          return respond(res, {
            lang,
            reply: t({
              vi: `Mình không tìm thấy playlist **${plTitle}** của bạn.`,
              en: `I couldn't find playlist **${plTitle}**.`,
            }),
          });
        }
        const newName = (msg.match(/(?:thành|thanh|to|tên mới|new name)\s+["'“”]?([^"'“”?,;]+?)["'“”]?\s*(?:\?|$)/i) || [])[1];
        const newTitle = newName
          ? newName.replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "").trim().slice(0, 50)
          : "";
        if (!newTitle) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn đổi tên mới là gì? Ví dụ: \"Đổi tên playlist ChillMix thành Chill Mix\".",
              en: "What should the new name be? e.g. \"Rename playlist ChillMix to Chill Mix\".",
            }),
          });
        }
        await prisma.playlist.update({ where: { id: exact.id }, data: { title: newTitle } });
        return respond(res, {
          lang,
          action: "playlist_updated",
          reply: fmt(t({
            vi: "Đã đổi tên playlist **{old}** thành **{new}**! ✅",
            en: "Renamed playlist **{old}** to **{new}**! ✅",
          }), { old: exact.title, new: newTitle }),
          playlist: { id: exact.id, title: newTitle },
        });
      }

      // Xóa playlist
      if (/(xóa|delete|remove).*(playlist|danh sách)/i.test(lower)) {
        const plMatch = msg.match(/(?:playlist|danh sách)\s+["'“”]?([^"'“”?]+?)["'“”]?\s*(?:\?|$)/i);
        const playlistName = plMatch
          ? plMatch[1].replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "").trim()
          : "";
        if (!playlistName) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn xóa playlist nào? Ví dụ: \"Xóa playlist ChillMix\".",
              en: "Which playlist do you want to delete? e.g. \"Delete playlist ChillMix\".",
            }),
          });
        }
        const plTitle = playlistName.slice(0, 60);
        const playlists = await prisma.playlist.findMany({
          where: { userId, title: { contains: plTitle, mode: "insensitive" } },
          take: 5,
        });
        const exact = playlists.find((p) => p.title.toLowerCase() === plTitle.toLowerCase()) || playlists[0];
        if (!exact) {
          return respond(res, {
            lang,
            reply: t({
              vi: `Mình không tìm thấy playlist **${plTitle}** của bạn.`,
              en: `I couldn't find playlist **${plTitle}**.`,
            }),
          });
        }
        await prisma.playlist.delete({ where: { id: exact.id } });
        return respond(res, {
          lang,
          action: "playlist_deleted",
          reply: fmt(t({
            vi: "Đã xóa playlist **{pl}**! 🗑️",
            en: "Deleted playlist **{pl}**! 🗑️",
          }), { pl: exact.title }),
        });
      }

      // Thêm bài hát vào playlist có sẵn
      if (/(thêm.*(vào|qua).*playlist|add to playlist|add .* to (a |an |my |the )?playlist)/i.test(lower)) {
        const plMatch = msg.match(/(?:playlist|danh sách)\s+["'“”]?([^"'“”?]+?)["'”]?\s*(?:\?|$)/i);
        const playlistName = plMatch
          ? plMatch[1].replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "").trim()
          : "";
        if (!playlistName) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn thêm bài vào playlist nào? Ví dụ: \"Thêm bài Breathe vào playlist ChillMix\".",
              en: "Which playlist should I add the song to? e.g. \"Add Breathe to my ChillMix playlist\".",
            }),
          });
        }
        const plTitle = playlistName.slice(0, 60);
        const playlists = await prisma.playlist.findMany({
          where: { userId, title: { contains: plTitle, mode: "insensitive" } },
          take: 5,
        });
        const exact = playlists.find((p) => p.title.toLowerCase() === plTitle.toLowerCase()) || playlists[0];
        if (!exact) {
          return respond(res, {
            lang,
            reply: t({
              vi: `Mình không tìm thấy playlist **${plTitle}** của bạn. Thử "Tạo playlist ${plTitle}" để tạo mới nhé!`,
              en: `I couldn't find playlist **${plTitle}**. Try "Create playlist ${plTitle}" to make one!`,
            }),
          });
        }
        const title = extractSongTitle(msg);
        let song = title ? await tools.findSong(title) : null;
        if (!song && currentSong && /(bài này|bài đang phát|bài hát này|current)/i.test(lower)) song = currentSong;
        if (!song) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Mình chưa tìm được bài hát đó trong thư viện. Bạn thử nói tên bài khác nhé!",
              en: "I couldn't find that song in the library. Try naming a different track!",
            }),
          });
        }
        const exists = await prisma.playlistSong.findUnique({
          where: { playlistId_songId: { playlistId: exact.id, songId: song.id } },
        });
        if (exists) {
          return respond(res, {
            lang,
            reply: fmt(t({
              vi: "Bài **{title}** đã có trong playlist **{pl}** rồi! ✅",
              en: "**{title}** is already in playlist **{pl}**! ✅",
            }), { title: song.title, pl: exact.title }),
          });
        }
        await prisma.playlistSong.create({ data: { playlistId: exact.id, songId: song.id } });
        return respond(res, {
          lang,
          action: "playlist_updated",
          reply: fmt(t({
            vi: "Đã thêm **{title}** của **{artist}** vào playlist **{pl}**! 🎵\nPlaylist đã được cập nhật ở sidebar.",
            en: "Added **{title}** by **{artist}** to playlist **{pl}**! 🎵\nYour playlist has been updated in the sidebar.",
          }), { title: song.title, artist: song.artist, pl: exact.title }),
          playlist: { id: exact.id, title: exact.title },
        });
      }

      // Tạo playlist mới
      const countMatch = msg.match(/(\d{1,3})\s*(?:bài|bai|song|tracks?)/i);
      const wantCount = countMatch ? Math.min(Math.max(parseInt(countMatch[1], 10), 1), 30) : 10;

      const titleMatch = msg.match(/(?:tên|tựa|ten|named|called)\s+["'“”]?([^"'“”,;?]+?)["'”]?\s*(?:\?|$)/i);
      let playlistTitle = titleMatch ? titleMatch[1].replace(/\s*(?:nhé|nha|đi|giúp mình|giúp tôi|nhe)$/i, "").trim().slice(0, 50) : "";

const desc = msg
        .replace(/^(vui lòng|please\s+|làm ơn\s+)/i, "")
        .replace(/(tạo playlist|create playlist|make me a playlist|make (a|an)\s+|playlist mới)\s*/i, "")
        .replace(/\s*playlist\s*/i, " ")
        .replace(/tên\s+["'“”]?[^"'“”,;]+["'“”]?\s*/i, "")
        .trim();
      const descAttrs = extractMusicAttrs(desc.toLowerCase());

      if (!playlistTitle) {
        const genreKw = GENRE_KEYWORDS.find((g) => lower.includes(g.keyword));
        const base = genreKw ? genreKw.label : desc.split(/\s+/).slice(0, 2).join(" ") || "ChillMix";
        const existing = await prisma.playlist.count({ where: { userId, title: { startsWith: base } } });
        playlistTitle = existing > 0 ? `${base} #${existing + 1}` : base;
      }

      let songs = [];
      if (descAttrs.genre || descAttrs.mood || descAttrs.purpose || descAttrs.energy || descAttrs.vocal) {
        const result = await tools.searchMusic(descAttrs, wantCount);
        songs = result.songs;
      }
      if (!songs.length) {
        const fb = await tools.suggestSongs(desc, artist);
        songs = fb.songs.slice(0, wantCount);
      }
      if (!songs.length) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Mình chưa tìm được bài hát nào phù hợp để tạo playlist. Bạn thử mô tả lại nhé!",
            en: "I couldn't find songs to build the playlist. Try describing again!",
          }),
        });
      }

      const playlist = await prisma.playlist.create({
        data: { title: playlistTitle, userId, isPublic: false },
      });
      await prisma.playlistSong.createMany({
        data: songs.map((s) => ({ playlistId: playlist.id, songId: s.id })),
        skipDuplicates: true,
      });

      sessionStore.update(sessionKey, { lastResults: songs });
      return respond(res, {
        lang,
        type: "songs",
        action: "playlist_created",
        reply: fmt(t({
          vi: "Đã tạo playlist **{title}** với **{n} bài**! 🎵\nPlaylist đã xuất hiện ở sidebar. Muốn nghe luôn không?",
          en: "Created playlist **{title}** with **{n} tracks**! 🎵\nIt's in your sidebar. Want to play it now?",
        }), { title: playlist.title, n: songs.length }),
        songs,
        playlist: { id: playlist.id, title: playlist.title },
      });
    }


    // 3b) Cá nhân hóa (cần đăng nhập)
    if (/(bài (của )?(mình|tôi|em|tao) (nghe|thích|yêu thích)|bài (mình|tôi|em|tao) đã (thích|yêu thích)|top bài (mình|tôi|em)|(nghe|thích) nhiều nhất|bài (đã )?thích|bài đã (thích|nghe)|my (top|liked|recent)|songs i (like|listen|played)|my favorites?|bài yêu thích|my most[- ]played|most[- ]played (song|songs|track|tracks|music|tunes)|my most[- ]listened|most[- ]listened|what (do )?(i|i'?ve) listen(ed)? to most)/i.test(lower)) {
      const userId = getUserId(req);
      if (!userId) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Để xem thông tin cá nhân (bài nghe / bài thích), bạn cần **đăng nhập** trước nhé! 🔐",
            en: "To see your personal stats (listening / liked songs) you need to **log in** first! 🔐",
          }),
        });
      }
      const wantLiked = /(bài (đã )?thích|bài (mình|tôi|em|tao)( đã)? (thích|yêu thích)|bài yêu thích|liked|favorites?|songs? i like|songs? (that )?i like)/i.test(lower);
      const wantRecent = /(gần đây|recent)/i.test(lower);

      if (wantLiked) {
        const likes = await prisma.userSong.findMany({
          where: { userId },
          include: { song: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        if (!likes.length) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn chưa thích bài hát nào. Thử bấm nút ♥ trên bài hát rồi hỏi lại mình nhé!",
              en: "You haven't liked any songs yet. Tap the ♥ on a track, then ask me again!",
            }),
          });
        }
        const songs = tools.normalizeSongs(likes.map((l) => l.song));
        sessionStore.update(sessionKey, { lastResults: songs });
        return respond(res, {
          lang,
          type: "songs",
          reply: t({
            vi: `Những bài hát bạn đã thích ❤️ (${songs.length} bài):`,
            en: `Songs you've liked ❤️ (${songs.length} tracks):`,
          }),
          songs,
        });
      }

      let songs = [];
      if (wantRecent) {
        const recent = await prisma.songListen.findMany({
          where: { userId },
          orderBy: { listenedAt: "desc" },
          distinct: ["songId"],
          take: 10,
        });
        if (recent.length) {
          const byId = new Map(
            (await prisma.song.findMany({ where: { id: { in: recent.map((r) => r.songId) } } })).map((s) => [s.id, s])
          );
          songs = tools.normalizeSongs(recent.map((r) => byId.get(r.songId)).filter(Boolean));
        }
      } else {
        const top = await prisma.songListen.groupBy({
          by: ["songId"],
          where: { userId },
          _count: { _all: true },
          orderBy: { _count: { songId: "desc" } },
          take: 10,
        });
        if (top.length) {
          const byId = new Map(
            (await prisma.song.findMany({ where: { id: { in: top.map((t) => t.songId) } } })).map((s) => [s.id, s])
          );
          songs = tools.normalizeSongs(top.map((t) => byId.get(t.songId)).filter(Boolean));
        }
      }

      if (songs.length) {
        sessionStore.update(sessionKey, { lastResults: songs });
        const head = wantRecent
          ? "Những bài hát bạn nghe gần đây"
          : "Top bài hát bạn nghe nhiều nhất";
        return respond(res, {
          lang,
          type: "songs",
          reply: t({
            vi: `${head} 🎵`,
            en: wantRecent ? "Your recent listens 🎵" : "Your most-played tracks 🎵",
          }),
          songs,
        });
      }
      return respond(res, {
        lang,
        reply: t({
          vi: "Mình chưa có dữ liệu nghe nào của bạn. Hãy nghe vài bài rồi quay lại hỏi nhé! 🎧",
          en: "I don't have any listening data for you yet. Play a few songs, then come back! 🎧",
        }),
      });
    }

    // 3c) Thống kê thư viện & xu hướng
    const statsMatch =
      /(bài (hát )?(nào )?(dài|ngắn|mới) nhất|thể loại phổ biến|nghệ sĩ (có )?nhiều bài nhất|album (có )?nhiều bài nhất|bao nhiêu nghệ sĩ|mấy nghệ sĩ|số nghệ sĩ|tổng số nghệ sĩ|how many artists|bao nhiêu album|mấy album|số album|tổng số album|how many albums|bài (đang )?hot|đang hot|thịnh hành|nghe nhiều nhất|top bài|top songs|trending|thống kê|tổng quan)/i.test(lower);
    if (statsMatch) {
      // Số nghệ sĩ trong thư viện
      if (/(bao nhiêu nghệ sĩ|mấy nghệ sĩ|số nghệ sĩ|tổng số nghệ sĩ|how many artists)/i.test(lower)) {
        const artistGroups = await prisma.song.groupBy({ by: ["artist"], where: { duplicateOf: null } });
        return respond(res, {
          lang,
          reply: t({
            vi: `Thư viện nhạc đang có **${artistGroups.length} nghệ sĩ** khác nhau. 🎤 Bạn muốn mình gợi ý nhạc của ai không?`,
            en: `The library currently features **${artistGroups.length} different artists**. 🎤 Want me to suggest any of them?`,
          }),
        });
      }
      // Số album trong thư viện
      if (/(bao nhiêu album|mấy album|số album|tổng số album|how many albums)/i.test(lower)) {
        const albumCount = await prisma.album.count();
        return respond(res, {
          lang,
          reply: t({
            vi: `Thư viện hiện có **${albumCount} album**. 💿 Bạn muốn xem album nào không?`,
            en: `The library currently has **${albumCount} albums**. 💿 Want to check any of them?`,
          }),
        });
      }
      // Bài hát dài nhất
      if (/bài (hát )?(nào )?dài nhất/i.test(lower)) {
        const song = await prisma.song.findFirst({ where: { duplicateOf: null }, orderBy: { duration: "desc" } });
        if (song) {
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Bài hát **dài nhất** thư viện là **{title}** của **{artist}**, thời lượng **{dur}**. 🎧",
              en: "The **longest** track in the library is **{title}** by **{artist}** at **{dur}**. 🎧",
            }), { title: song.title, artist: song.artist, dur: fmtDuration(song.duration) }),
            songs: [tools.normalizeSong(song)],
          });
        }
      }
      // Bài hát ngắn nhất
      if (/bài (hát )?(nào )?ngắn nhất/i.test(lower)) {
        const song = await prisma.song.findFirst({ where: { duplicateOf: null }, orderBy: { duration: "asc" } });
        if (song) {
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Bài hát **ngắn nhất** thư viện là **{title}** của **{artist}**, thời lượng **{dur}**. 🎧",
              en: "The **shortest** track in the library is **{title}** by **{artist}** at **{dur}**. 🎧",
            }), { title: song.title, artist: song.artist, dur: fmtDuration(song.duration) }),
            songs: [tools.normalizeSong(song)],
          });
        }
      }
      // Bài hát mới nhất
      if (/bài (hát )?(nào )?mới nhất/i.test(lower)) {
        const song = await prisma.song.findFirst({ where: { duplicateOf: null, releaseYear: { not: null } }, orderBy: { releaseYear: "desc" } });
        if (song) {
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Bài hát **mới nhất** thư viện là **{title}** của **{artist}** (phát hành năm **{year}**). 🎧",
              en: "The **newest** track in the library is **{title}** by **{artist}** (released in **{year}**). 🎧",
            }), { title: song.title, artist: song.artist, year: song.releaseYear }),
            songs: [tools.normalizeSong(song)],
          });
        }
      }
      // Thể loại phổ biến nhất
      if (/thể loại phổ biến/i.test(lower)) {
        const genreGroups = await prisma.song.groupBy({
          by: ["genre"],
          _count: { _all: true },
          orderBy: { _count: { genre: "desc" } },
          take: 5,
        });
        const genres = genreGroups.filter((g) => g.genre).map((g) => `• ${g.genre} (${g._count._all} bài)`);
        if (genres.length) {
          return respond(res, {
            lang,
            reply: t({
              vi: `Các thể loại **phổ biến nhất** trong thư viện:\n${genres.join("\n")}\n\nBạn thích thể loại nào, mình gợi ý nhạc nhé! 🎵`,
              en: `The most **popular genres** in the library:\n${genres.join("\n")}\n\nPick a genre and I'll suggest some music! 🎵`,
            }),
          });
        }
      }
      // Nghệ sĩ có nhiều bài nhất
      if (/nghệ sĩ (có )?nhiều bài nhất/i.test(lower)) {
        const topArtists = await prisma.song.groupBy({
          by: ["artist"],
          where: { duplicateOf: null },
          _count: { _all: true },
          orderBy: { _count: { artist: "desc" } },
          take: 5,
        });
        if (topArtists.length) {
          const list = topArtists.map((a) => `• **${a.artist}** (${a._count._all} bài)`).join("\n");
          return respond(res, {
            lang,
            reply: t({
              vi: `Các nghệ sĩ **có nhiều bài nhất** trong thư viện:\n${list}\n\nMuốn nghe nhạc của ai không? 🎤`,
              en: `Artists with the **most tracks** in the library:\n${list}\n\nWant to listen to any of them? 🎤`,
            }),
          });
        }
      }
      // Album có nhiều bài nhất
      if (/album (có )?nhiều bài nhất/i.test(lower)) {
        const topAlbums = await prisma.album.findMany({
          include: { _count: { select: { songs: true } } },
          orderBy: { songs: { _count: "desc" } },
          take: 5,
        });
        if (topAlbums.length) {
          const list = topAlbums.map((a) => `• **${a.title}** của ${a.artist} (${a._count.songs} bài)`).join("\n");
          return respond(res, {
            lang,
            reply: t({
              vi: `Các album **nhiều bài nhất** trong thư viện:\n${list}\n\nMuốn mình phát thử album nào không? 💿`,
              en: `Albums with the **most tracks** in the library:\n${list}\n\nWant me to play one of them? 💿`,
            }),
          });
        }
      }
      // Bài đang hot / nghe nhiều nhất
      if (/(đang hot|thịnh hành|nghe nhiều nhất|bài (đang )?hot|top bài|top songs|trending)/i.test(lower)) {
        const topListens = await prisma.songListen.groupBy({
          by: ["songId"],
          _count: { _all: true },
          orderBy: { _count: { songId: "desc" } },
          take: 10,
        });
        if (topListens.length) {
          const byId = new Map(
            (await prisma.song.findMany({ where: { id: { in: topListens.map((t) => t.songId) } } })).map((s) => [s.id, s])
          );
          const ordered = topListens.map((t) => byId.get(t.songId)).filter(Boolean);
          const songs = tools.normalizeSongs(ordered);
          sessionStore.update(sessionKey, { lastResults: songs });
          return respond(res, {
            lang,
            type: "songs",
            reply: t({
              vi: "Các bài hát **đang được nghe nhiều nhất** trong thư viện 🎵\nChọn một bài để nghe ngay nhé!",
              en: "The most **listened-to** tracks in the library right now 🎵\nPick one to play!",
            }),
            songs,
          });
        }
        const fb = await tools.suggestSongs(msg, null);
        return respond(res, {
          lang,
          type: "songs",
          reply: t({
            vi: "Chưa có nhiều lượt nghe để xếp hạng, mình gợi ý vài bài nhé 🎵",
            en: "Not enough listening data yet — here are some suggestions 🎵",
          }),
          songs: fb.songs,
        });
      }
      // Thống kê tổng quan (chung chung: "thống kê", "tổng quan thư viện")
      if (/(thống kê|tổng quan)/i.test(lower)) {
        const [totalSongs, artistGroups, albumCount] = await Promise.all([
          prisma.song.count({ where: { duplicateOf: null } }),
          prisma.song.groupBy({ by: ["artist"], where: { duplicateOf: null } }),
          prisma.album.count(),
        ]);
        return respond(res, {
          lang,
          reply: t({
            vi: `📊 Thư viện JamWave hiện có:\n• **${totalSongs} bài hát**\n• **${artistGroups.length} nghệ sĩ**\n• **${albumCount} album**\n\nBạn muốn hỏi chi tiết hơn không? Ví dụ: "bài dài nhất", "thể loại phổ biến" hay "bài đang hot"?`,
            en: `📊 The JamWave library currently has:\n• **${totalSongs} songs**\n• **${artistGroups.length} artists**\n• **${albumCount} albums**\n\nWant more details? Try "longest song", "popular genres" or "trending now"!`,
          }),
        });
      }
      // Thống kê tổng (bài / nhạc) -> đã được handler 4 xử lý phía dưới
    }

    // 4) Đếm số bài hát
    if (/(bao nhiêu bài|mấy bài|số bài|how many|tổng cộng)/i.test(lower) && !/(album|đĩa nhạc)/i.test(lower)) {
      if (artist) {
        const titles = await prisma.song.findMany({
          where: { artist: { equals: artist.name, mode: "insensitive" }, duplicateOf: null },
          select: { title: true, id: true, albumCover: true, duration: true },
          take: 10,
        });
        const nameList = titles.map((tt) => `• ${tt.title}`).slice(0, 6).join("\n");
        return respond(res, {
          lang,
          type: "songs",
          reply: t({
            vi: `Nghệ sĩ **${artist.name}** hiện có **${artist.songCount} bài hát** trong thư viện.\nMột số bài tiêu biểu:\n${nameList}\n\nBạn muốn nghe thử vài bài không? 🎧`,
            en: `Artist **${artist.name}** currently has **${artist.songCount} songs** in the library.\nSome highlights:\n${nameList}\n\nWant to try a few? 🎧`,
          }),
          songs: titles.map((tt) => ({ id: tt.id, title: tt.title, artist: artist.name, albumCover: tt.albumCover, duration: tt.duration })),
        });
      }
      // Không tìm thấy nghệ sĩ -> kiểm tra có phải câu hỏi theo nghệ sĩ cụ thể không
      const artistHint = extractArtistHint(msg);
      if (artistHint) {
        return artistNotFoundReply(res, artistHint, lang);
      }
      const total = await prisma.song.count();
      return respond(res, {
        lang,
        reply: fmt(t({
          vi: "Thư viện nhạc hiện có **{total} bài hát**. Bạn muốn mình gợi ý vài bài không? 🎧",
          en: "The library currently has **{total} songs**. Want me to suggest a few? 🎧",
        }), { total }),
      });
    }

    // 5) Tác giả / Ca sĩ / Nhà sáng tác
    if (/(tác giả|nhà sáng tác|người sáng tác|sáng tác bởi|composer|ai viết|ai sáng tác|ca sĩ|ai hát|của ai|là ai)/i.test(lower)) {
      const extractedTitle = extractSongTitle(msg);
      let targetSong = extractedTitle ? await tools.findSong(extractedTitle) : null;
      if (!targetSong) {
        targetSong = await tools.findSongInMessage(msg);
      }
      if (!targetSong && currentSong && /(bài này|bài đang phát|bài hát này)/i.test(lower)) {
        targetSong = currentSong;
      }

      if (targetSong) {
        const info = await tools.getArtistInfo(targetSong.artist);
        const yearText = targetSong.releaseYear ? ` (phát hành năm ${targetSong.releaseYear})` : "";
        const albumText = targetSong.album ? `, thuộc album *${targetSong.album.title}*` : "";
        return respond(res, {
          lang,
          type: "songs",
          reply: fmt(t({
            vi: "Bài hát **{title}** được thể hiện / sáng tác bởi nghệ sĩ **{artist}**{year}{album}. 🎤\n\nBạn có muốn nghe bài này không?",
            en: "The song **{title}** is by artist **{artist}**{year}{album}. 🎤\n\nWould you like to play it?",
          }), {
            title: targetSong.title,
            artist: targetSong.artist,
            year: yearText,
            album: albumText,
          }),
          artists: info ? [{
            name: info.name,
            songCount: info.songCount,
            coverImg: info.coverImg,
            image: info.image ?? null,
            genres: info.genres,
            sources: info.sources,
          }] : [],
          songs: [tools.normalizeSong(targetSong)],
        });
      }

      // Nếu không tìm thấy bài cụ thể, dùng LLM với context thư viện
      const context = await buildLibraryContext(artist, currentSong);
      const llm = await askLLM([
        { role: "system", content: `You are JamWave's music assistant. Answer briefly and friendly in ${lang === "vi" ? "Vietnamese" : "English"}. Use the provided library data; if unknown, be honest.` },
        { role: "user", content: `${context}\n\nQuestion: ${msg}` }
      ]);
      if (llm.ok) return respond(res, { lang, reply: llm.text });
      const errMsg = llmErrorReply(llm, lang);
      return respond(res, {
        lang,
        reply: errMsg || t({
          vi: "Mình chưa có dữ liệu chính xác về nhà sáng tác / tác giả cho bài hát này trong thư viện. Bạn thử hỏi bài khác nhé!",
          en: "I don't have exact author/composer data for this song in the library. Try asking about another track!",
        }),
      });
    }

    // 7) Năm phát hành / thông tin bài hát cụ thể
    if (/(năm phát hành|năm ra mắt|phát hành năm|release|ra đời năm)/i.test(lower)) {
      const title = extractSongTitle(msg);
      if (title) {
        const song = await tools.findSong(title);
        if (song) {
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Bài **{title}** của **{artist}**{year}{album}. Bạn có muốn nghe thử không? 🎧",
              en: "**{title}** by **{artist}**{year}{album}. Want to give it a listen? 🎧",
            }), {
              title: song.title,
              artist: song.artist,
              year: song.releaseYear ? ` được phát hành năm **${song.releaseYear}**` : " chưa có thông tin năm phát hành",
              album: song.album ? `, thuộc album *${song.album.title}*` : "",
            }),
            songs: [tools.normalizeSong(song)],
          });
        }
      }

      if (artist) {
        const years = await prisma.song.findMany({
          where: { artist: { equals: artist.name, mode: "insensitive" }, releaseYear: { not: null } },
          select: { releaseYear: true },
          distinct: ["releaseYear"],
          orderBy: { releaseYear: "asc" },
        });
        const range = years.length ? `, các bài phát hành các năm: ${years.map((y) => y.releaseYear).join(", ")}` : "";
        return respond(res, {
          lang,
          reply: fmt(t({
            vi: "Nghệ sĩ **{name}** có **{count} bài hát** trong thư viện{range}. Bạn muốn nghe thử không? 🎧",
            en: "Artist **{name}** has **{count} songs** in the library{range}. Want to listen? 🎧",
          }), { name: artist.name, count: artist.songCount, range }),
        });
      }
    }

    // 7b) Thông tin chi tiết bài hát (thể loại, thời lượng, năm, nguồn)
    if (/(thông tin chi tiết|thông tin.*(bài|bài hát)|chi tiết.*(bài|bài hát)|bài.*(thể loại gì|dài bao lâu|thời lượng|bao lâu|mấy phút)|about.*(song|track)|(song|track).*(details|genre|duration))/i.test(lower)) {
      const title = extractSongTitle(msg);
      if (title) {
        const song = await tools.findSong(title);
        if (song) {
          const dur = fmtDuration(song.duration);
          const year = song.releaseYear ? ` phát hành năm **${song.releaseYear}**` : " chưa rõ năm phát hành";
          const genre = song.genre || "chưa rõ";
          const src = song.source === "audius" ? "Audius" : "Jamendo";
          const meta = song.mbid ? `\n• Mã định danh MusicBrainz: \`${song.mbid}\`` : "";
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Thông tin bài **{title}** của **{artist}**:\n• Thể loại: {genre}\n• Thời lượng: {dur}\n• Năm phát hành: {year}\n• Nguồn: {src}{meta}\n\nBạn muốn nghe thử không? 🎧",
              en: "**{title}** by **{artist}**:\n• Genre: {genre}\n• Duration: {dur}\n• Released: {year}\n• Source: {src}{meta}\n\nWant to give it a listen? 🎧",
            }), { title: song.title, artist: song.artist, genre, dur, year, src, meta }),
            songs: [tools.normalizeSong(song)],
          });
        }
      }
    }

// 8) Album intelligence
    if (/(album|đĩa nhạc)/i.test(lower)) {
      const thisAlbum = /(album này|album đang phát|album hiện tại|whole album|toàn bộ album)/i.test(lower);
      const nameMatch = msg.match(/album\s+["'“”]?\s*([^"'“”?]+?)\s*["'“”]?\s*(?:\?|$)/i);

      let album = null;
      if (thisAlbum) {
        if (currentSong?.albumId) {
          album = await tools.getAlbumById(currentSong.albumId);
        }
        if (!album) {
          const last = (session?.lastResults || []).filter((s) => s.albumId);
          if (last.length) {
            const topId = Object.entries(
              last.reduce((acc, s) => ((acc[s.albumId] = (acc[s.albumId] || 0) + 1), acc), {})
            ).sort((a, b) => b[1] - a[1])[0][0];
            album = await tools.getAlbumById(topId);
          }
        }
      } else if (nameMatch) {
        const albumName = nameMatch[1]
          .replace(/\s+(này|đang phát|hiện tại)$/i, "")
          .replace(/^(của|tên|tựa)\s+/i, "")
          .replace(/\s+(?:có|gồm)?\s*(?:bao nhiêu bài|mấy bài|năm nào|năm mấy|khi nào|ra mắt khi nào|phát hành khi nào|năm bao nhiêu|mấy năm|những bài nào|bài nào|gồm những|có những bài|danh sách bài|các bài|tracks?|list)\s*$/i, "")
          .replace(/\s+(có|gồm)\s*$/i, "")
          .replace(/\s+(?:của|bởi|by)\s+[^"'“”,;?]+$/i, "")
          .trim();
        if (albumName && !/(này|đang phát)/i.test(albumName)) {
          album = await tools.findAlbum(albumName);
        }
      }

      if (album) {
        const songs = tools.normalizeSongs(album.songs);
        const years = [...new Set(songs.map((s) => s.releaseYear).filter(Boolean))].sort((a, b) => a - b);
        const yearText = years.length === 1
          ? ` phát hành năm **${years[0]}**`
          : years.length > 1
            ? `, các bài phát hành: ${years.join(", ")}`
            : "";

        // Xếp toàn bộ album vào hàng chờ (không cắt nhạc đang phát)
        if (/(queue|thêm|add).*(album)|album.*(queue|thêm|add)/i.test(lower)) {
          sessionStore.update(sessionKey, { lastResults: songs });
          return respond(res, {
            lang,
            type: "songs",
            action: "append",
            reply: t({
              vi: `Đã thêm toàn bộ album **${album.title}** của **${album.artist}** vào hàng chờ! 🎶 (${songs.length} bài)`,
              en: `Queued the full album **${album.title}** by **${album.artist}**! 🎶 (${songs.length} tracks)`,
            }),
            songs,
          });
        }

        // Phát cả album
        if (/(phát|mở|nghe|play).*(album)|album.*(phát|mở|nghe)/i.test(lower)) {
          sessionStore.update(sessionKey, { lastResults: songs });
          return respond(res, {
            lang,
            type: "songs",
            action: "play",
            reply: t({
              vi: `Đang phát toàn bộ album **${album.title}** của **${album.artist}** cho bạn nghe! 🎶 (${songs.length} bài)`,
              en: `Playing the full album **${album.title}** by **${album.artist}** for you! 🎶 (${songs.length} tracks)`,
            }),
            albums: [tools.normalizeAlbum(album, album.songs)],
            songs,
          });
        }

        return respond(res, {
          lang,
          type: "albums",
          reply: fmt(t({
            vi: "Album **{title}** của **{artist}** có **{count} bài hát**{year}.\n\nDanh sách bài hát:\n{tracks}\n\nBạn muốn nghe cả album không? 🎧",
            en: "Album **{title}** by **{artist}** has **{count} tracks**{year}.\n\nTrack list:\n{tracks}\n\nWant to play the whole album? 🎧",
          }), {
            title: album.title,
            artist: album.artist,
            count: songs.length,
            year: yearText,
            tracks: songs.map((s, i) => `${i + 1}. ${s.title}`).slice(0, 20).join("\n"),
          }),
          albums: [tools.normalizeAlbum(album, album.songs)],
          songs,
        });
      }

      return respond(res, {
        lang,
        reply: t({
          vi: "Mình không tìm thấy album này trong thư viện. Bạn thử hỏi \"album ... có bao nhiêu bài?\" hoặc \"phát album ...\" nhé!",
          en: "I couldn't find that album in the library. Try asking \"how many tracks in album ...\" or \"play album ...\"!",
        }),
      });
    }

    // 9) Thông tin nghệ sĩ
    if (/(thông tin|giới thiệu|ai là|nghệ sĩ|ca sĩ)/i.test(lower) && artist) {
      const info = await tools.getArtistInfo(artist.name);
      if (!info) {
        return respond(res, { lang, reply: t({ vi: "Không tìm thấy nghệ sĩ này!", en: "Artist not found!" }) });
      }
      const yearText = info.yearRange.length === 2
        ? `, hoạt động giai đoạn ${info.yearRange[0]} - ${info.yearRange[1]}`
        : info.yearRange.length === 1
          ? `, hoạt động từ ${info.yearRange[0]}`
          : "";
      const metaYearText = !info.yearRange.length && info.metaYearRange ? `, hoạt động giai đoạn ${info.metaYearRange}` : "";
      const genreText = info.genres.length ? `\nThể loại: ${info.genres.join(", ")}` : "";
      const countryText = info.country ? `\nXuất xứ: ${info.country}` : "";
      const aliasText = info.aliases?.length ? `\nTên gọi khác: ${info.aliases.slice(0, 3).join(", ")}` : "";
      const albumText = info.albums.length
        ? `\nAlbum tiêu biểu:\n${info.albums.map((a) => `• ${a.title}`).join("\n")}`
        : "";
      return respond(res, {
        lang,
        type: "artists",
        reply: fmt(t({
          vi: "**{name}**{year}{metaYear}, hiện có **{count} bài hát** trong thư viện.{genre}{country}{aliases}{albums}\n\nMình gợi ý vài bài ngay nhé! 🎧",
          en: "**{name}**{year}{metaYear}, currently has **{count} songs** in the library.{genre}{country}{aliases}{albums}\n\nLet me suggest a few tracks! 🎧",
        }), {
          name: info.name,
          year: yearText,
          metaYear: metaYearText,
          count: info.songCount,
          genre: genreText,
          country: countryText,
          aliases: aliasText,
          albums: albumText,
        }),
        artists: [{
          name: info.name,
          songCount: info.songCount,
          coverImg: info.coverImg,
          image: info.image ?? null,
          genres: info.genres,
          sources: info.sources,
          albums: info.albums,
          country: info.country ?? null,
        }],
        songs: info.topSongs,
      });
    }

    // 10) Bài hát của nghệ sĩ (liệt kê)
    if (/(bài hát của|nhạc của|bài của|songs by|những bài|songs from)/i.test(lower) && artist && !/(^|\s)(phát|mở|bật|nghe|chơi)(\s|$)/i.test(lower)) {
      const info = await tools.getArtistInfo(artist.name);
      const songs = info ? info.topSongs : [];
      return respond(res, {
        lang,
        type: "songs",
        reply: t({
          vi: `Đây là vài bài hát của **${artist.name}** (${artist.songCount} bài trong thư viện):`,
          en: `Here are some songs by **${artist.name}** (${artist.songCount} songs in the library):`,
        }),
        artists: info ? [{ name: info.name, songCount: info.songCount, coverImg: info.coverImg, image: info.image ?? null, genres: info.genres }] : [],
        songs,
      });
    }

    // 11) Tinh chỉnh kết quả trước đó ("mấy bài đó", "bài nào không lời", "play the first one"...)
    const refinePlayMatch = lower.match(/(?:(?:bài|song|track|phát)\s+)?(?:(?:số|the|#)\s*)?(first|second|third|fourth|fifth|đầu tiên|1st|2nd|3rd|4th|5th|thứ\s*2|thứ\s*3|thứ\s*4|thứ\s*5|[1-5])(?:\s+(?:one|bài|song|track))?/i);
    const refineWantsPlay = refinePlayMatch && /(phát|mở|nghe|play)/i.test(lower);

    if (lastResults.length > 0 && (/(mấy bài|bài nào|những bài đó|các bài đó|which ones|these songs|kết quả)/i.test(lower) || refineWantsPlay)) {
      // Lọc không lời / không vocal
      const wantInstrumental = /(không.*(lời|vocal|hát)|không lời|without.*(lyrics|vocals)|instrumental|no vocal|don'?t have (any )?(lyrics|vocals)|do not have (any )?(lyrics|vocals))/i.test(lower);
      const wantVocals = /(có lời|có vocal|with vocals)/i.test(lower);

      if (wantInstrumental || wantVocals) {
        const filtered = lastResults.filter((s) => {
          const isInst = (s.genre || "").toLowerCase().includes("instrumental");
          return wantInstrumental ? isInst : !isInst;
        });
        if (filtered.length === 0) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Không có bài nào khớp điều kiện này trong kết quả trước đó. Bạn thử tìm lại với yêu cầu khác nhé!",
              en: "None of the previous results match this. Try a new search with a different request!",
            }),
          });
        }
        return respond(res, {
          lang,
          type: "songs",
          reply: t({
            vi: `Mình đã lọc theo yêu cầu, còn **${filtered.length} bài** phù hợp:`,
            en: `Filtered by your request — **${filtered.length} track${filtered.length === 1 ? "" : "s"}** match:`,
          }),
          songs: filtered,
        });
      }

      // Phát bài thứ N trong kết quả
      if (refineWantsPlay) {
        const word = refinePlayMatch[1].toLowerCase().replace(/\s+/g, "");
        const indexMap = {
          first: 0, "1st": 0, "1": 0, "đầu tiên": 0,
          second: 1, "2nd": 1, "2": 1, "thứ2": 1,
          third: 2, "3rd": 2, "3": 2, "thứ3": 2,
          fourth: 3, "4th": 3, "4": 3, "thứ4": 3,
          fifth: 4, "5th": 4, "5": 4, "thứ5": 4,
        };
        const index = indexMap[word] ?? 0;
        const target = lastResults[index];
        if (target) {
          return respond(res, {
            lang,
            type: "songs",
            action: "play",
            reply: fmt(t({
              vi: "Đang phát **{title}** của **{artist}** cho bạn! 🎶",
              en: "Playing **{title}** by **{artist}**! 🎶",
            }), { title: target.title, artist: target.artist }),
            songs: lastResults,
          });
        }
      }
    }

    // 12) Phát nhạc trực tiếp
    const playKeywords = /(phát nhạc|phát bài|phát ngẫu nhiên|mở nhạc|mở bài|bật nhạc|bật bài|nghe bài|chơi nhạc|play|listen|phát lại)/i.test(lower) ||
      (/^(phát|mở|bật|nghe|chơi)\b/i.test(lower) && !/nghe gì/i.test(lower));

    let playTitle = "";
    if (playKeywords) playTitle = extractSongTitle(msg);

    const hasPlayTarget =
      /(ngẫu nhiên|random|tình cờ|bất kỳ)/i.test(lower) ||
      /(phát lại|bài này|đang phát|nghe lại)/i.test(lower) ||
      Boolean(playTitle) ||
      Boolean(GENRE_KEYWORDS.find((g) => lower.includes(g.keyword))) ||
      Boolean(artist) ||
      /^(phát|mở|bật|nghe|chơi|play)\b/i.test(lower);

    if (playKeywords && hasPlayTarget) {
      const isRandom = /(ngẫu nhiên|random|tình cờ|bất kỳ)/i.test(lower);
      const isThisSong = /(phát lại|bài này|đang phát|nghe lại|phát lại bài)/i.test(lower);

      let songs = [];
      let reply = "";

      if (isRandom) {
        songs = await tools.getRandomSongs(10);
        reply = t({
          vi: "Đang phát nhạc ngẫu nhiên từ thư viện cho bạn nhé! 🎶",
          en: "Playing random music from the library for you! 🎶",
        });
      } else if (isThisSong && currentSong) {
        songs = [currentSong, ...(await tools.getRelatedSongs({ id: currentSong.id, artist: currentSong.artist }))];
        reply = fmt(t({
          vi: "Mình bật lại **{title}** của **{artist}** cho bạn nghe! 🎶",
          en: "Restarting **{title}** by **{artist}** for you! 🎶",
        }), { title: currentSong.title, artist: currentSong.artist });
      } else {
        if (playTitle) {
          const song = await tools.findSong(playTitle);
          if (song) {
            songs = [tools.normalizeSong(song), ...(await tools.getRelatedSongs(song))];
            reply = fmt(t({
              vi: "Mở ngay bài **{title}** của **{artist}** cho bạn nghe! 🎶",
              en: "Playing **{title}** by **{artist}** right away! 🎶",
            }), { title: song.title, artist: song.artist });
          }
        } else {
          // Phát theo thể loại: "phát nhạc lofi"
          const genreKw = GENRE_KEYWORDS.find((g) => lower.includes(g.keyword));
          if (genreKw) {
            const result = await tools.searchMusic({ genre: genreKw.keyword }, 10);
            if (result.songs.length) {
              songs = result.songs;
              reply = fmt(t({
                vi: "Đang phát nhạc **{label}** cho bạn nghe nhé! 🎶",
                en: "Playing **{label}** music for you! 🎶",
              }), { label: genreKw.label });
            }
          }
        }

        // Thử tách tên bài không có tiền tố "bài": "play waves", "phát breeze"...
        if (!songs.length) {
          const stripped = msg
            .replace(/^(vui lòng|please\s+|làm ơn\s+|phát|mở|bật|nghe|chơi|play|listen|music|nhạc|bài hát)\s+/i, "")
            .replace(/\s+cho (mình|tôi|tớ|bạn|me)\s*$/i, "")
            .replace(/\s+(đi|nhé|nha|thử|ngay|cho tôi|cho mình)\s*$/i, "")
            .trim();
          if (stripped.length >= 3 && !/^(ngẫu nhiên|random)$/i.test(stripped)) {
            const song = await tools.findSong(stripped);
            if (song) {
              songs = [tools.normalizeSong(song), ...(await tools.getRelatedSongs(song))];
              reply = fmt(t({
                vi: "Mở ngay bài **{title}** của **{artist}** cho bạn nghe! 🎶",
                en: "Playing **{title}** by **{artist}** right away! 🎶",
              }), { title: song.title, artist: song.artist });
            }
          }
        }

        if (!songs.length && artist) {
          const artistSongs = await prisma.song.findMany({
            where: { artist: { equals: artist.name, mode: "insensitive" }, duplicateOf: null },
            take: 10,
          });
          songs = tools.normalizeSongs(artistSongs);
          reply = fmt(t({
            vi: "Mình không tìm thấy bài phù hợp, nên mở nhạc của **{name}** cho bạn nhé! 🎶",
            en: "Couldn't find a matching song, so playing music by **{name}** instead! 🎶",
          }), { name: artist.name });
        } else if (!songs.length && !isRandom) {
          songs = await tools.getRandomSongs(10);
          reply = t({
            vi: "Mình không tìm thấy bài phù hợp trong thư viện, nên mở nhạc ngẫu nhiên cho bạn nhé! 🎶",
            en: "I couldn't find a matching song in the library, so playing random music for you! 🎶",
          });
        }
      }

      sessionStore.update(sessionKey, { lastResults: songs });
      return respond(res, { lang, type: "songs", action: "play", reply, songs });
    }

    // 12b) Radio: "phát như X", "radio Anitek", "play like ...", "phát nhạc giống"
    const radioMatch = lower.match(/(?:radio|phát như|phát giống|phát tương tự|play like|play something like|similar to|phát nhạc like)\s+([^?]+)/i);
    if (radioMatch && !/(album|đĩa nhạc)/i.test(lower)) {
      const target = radioMatch[1].trim();
      let seed = target ? await tools.findSong(target) : null;
      if (!seed && artist) {
        seed = (await tools.getArtistInfo(artist.name))?.topSongs?.[0] || null;
      }
      if (!seed && currentSong) seed = currentSong;
      if (seed) {
        const radio = await tools.getRadioSongs(seed, 15);
        if (radio.length) {
          sessionStore.update(sessionKey, { lastResults: radio });
          return respond(res, {
            lang,
            type: "songs",
            action: "play",
            reply: t({
              vi: `Đang mở radio dựa trên **${seed.title}** của **${seed.artist}** 🎧\nChuỗi bài tương đồng về nghệ sĩ và thể loại!`,
              en: `Starting a radio based on **${seed.title}** by **${seed.artist}** 🎧\nA queue matched by artist and genre!`,
            }),
            songs: radio,
          });
        }
      }
    }

    // 12d) Thêm bài vào hàng chờ (không cắt nhạc đang phát)
    if (/(thêm.*(hàng chờ|hàng đợi|queue)|thêm.*phát|phát thêm|phát nối tiếp|nối tiếp|add to queue|phát sau bài này|^queue\b|queue (more like|similar|it|this|them))/i.test(lower)) {
      const stripped = msg
        .replace(/^(vui lòng|please\s+|làm ơn\s+)/i, "")
        .replace(/\s*(?:vào|to)\s+(?:hàng chờ|hàng đợi|queue)\s*/i, " ")
        .replace(/^(?:queue|thêm|add)\s+/i, "")
        .replace(/^(?:nhạc|music|phát)?\s*(?:giống|như|like|similar to)\s+/i, "")
        .trim();
      const wantTitle = extractSongTitle(msg) || (stripped.length >= 3 && !/(ngẫu nhiên|random)/i.test(stripped) ? stripped : "");
      let songs = [];
      if (wantTitle) {
        const song = await tools.findSong(wantTitle);
        if (song) {
          songs = [song, ...(await tools.getRelatedSongs(song))];
        } else {
          songs = artist ? (await tools.suggestSongs(wantTitle, artist)).songs : [];
        }
      } else if (currentSong) {
        songs = await tools.getRelatedSongs(currentSong);
      } else {
        songs = await tools.getRandomSongs(5);
      }
      if (!songs.length) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Mình không tìm được bài nào để thêm vào hàng chờ. Bạn thử gọi tên bài khác nhé!",
            en: "I couldn't find tracks to queue up. Try naming a different song!",
          }),
        });
      }
      const normSongs = tools.normalizeSongs(songs);
      sessionStore.update(sessionKey, { lastResults: normSongs });
      return respond(res, {
        lang,
        type: "songs",
        action: "append",
        reply: fmt(t({
          vi: "Đã thêm **{n} bài** vào hàng chờ — nhạc đang phát không bị ảnh hưởng 🎶",
          en: "Added **{n} tracks** to the queue — current music keeps playing 🎶",
        }), { n: normSongs.length }),
        songs: normSongs,
      });
    }

    // 12c) Tìm nhạc theo mục đích / mô tả tự nhiên (rule-based, không cần LLM):
    //      "tìm nhạc indie chill cho việc học", "find music for studying", "nhạc sôi động tập gym"
    const hasMusicWord = /(nhạc|music|nhac)/i.test(lower);
    const descAttrs = extractMusicAttrs(lower);
    if (
      hasMusicWord &&
      !/(album|đĩa nhạc)/i.test(lower) &&
      (descAttrs.genre || descAttrs.mood || descAttrs.purpose || descAttrs.energy || descAttrs.vocal)
    ) {
      const attrs = descAttrs;
      const result = await tools.searchMusic(attrs, 10);
      if (result.songs.length) {
          sessionStore.update(sessionKey, { lastResults: result.songs });
          const desc = describeFilters(attrs, lang);
          return respond(res, {
            lang,
            type: "songs",
            reply: fmt(t({
              vi: "Mình tìm được **{n} bài** phù hợp{desc} 🎵\nChọn một bài để nghe ngay nhé!",
              en: "I found **{n} track{s}** matching{desc} 🎵\nPick one to play right away!",
            }), {
              n: result.songs.length,
              s: result.songs.length === 1 ? "" : "s",
              desc: desc ? ` (${desc})` : " your request",
            }),
            songs: result.songs,
          });
      }
    }

    // 13) Gợi ý nhạc
    if (/(gợi ý|đề xuất|recommend|nghe gì|bài nào hay|nhạc gì|suggest|cho mình nghe)/i.test(lower)) {
      const { songs, label } = await tools.suggestSongs(msg, artist);
      sessionStore.update(sessionKey, { lastResults: songs });
      if (songs.length === 0) {
        return respond(res, {
          lang,
          reply: t({
            vi: `${label || "Thể loại này"} hiện chưa có bài hát nào trong thư viện. Bạn thử "gợi ý nhạc chill", "gợi ý nhạc rock" hoặc "phát nhạc ngẫu nhiên" nhé!`,
            en: `${label || "This genre"} has no songs in the library yet. Try "suggest chill music", "suggest rock" or "play random music"!`,
          }),
        });
      }
      const labelText = label
        ? t({ vi: `Gợi ý ${label}`, en: `Suggested: ${label}` })
        : t({ vi: "Mình gợi ý vài bài cho bạn nghe", en: "Here are some suggestions for you" });
      return respond(res, {
        lang,
        type: "songs",
        reply: `${labelText} 🎵\n${t({ vi: "Chọn một bài để nghe ngay nhé!", en: "Pick one to play right away!" })}`,
        songs,
      });
    }

    // 14) Phân loại ý định bằng LLM (các yêu cầu phức tạp / ngôn ngữ tự nhiên)
    const cleanedHistory = (history || [])
      .slice(-10)
      .map((h) => ({ role: h.role === "bot" ? "assistant" : "user", text: String(h.text || "").slice(0, 500) }));

    const classified = await classifyIntent(msg, cleanedHistory);

    if (classified.ok) {
      const { intent, attributes = {} } = classified.intent || {};
      const attrs = attributes || {};

      sessionStore.update(sessionKey, { history: cleanedHistory });

      // ---- search_music / recommend: tìm kiếm theo thuộc tính ----
      if (intent === "search_music" || intent === "recommend") {
        const result = await tools.searchMusic(
          { genre: attrs.genre, mood: attrs.mood, energy: attrs.energy, vocal: attrs.vocal, purpose: attrs.purpose, artist: attrs.artist },
          Math.min(Math.max(attrs.count || 10, 1), 20)
        );

        if (result.songs.length === 0) {
          // Fallback 1: semantic search theo mô tả tự do (mood/vibe) nếu có embedding
          const semantic = await tools.semanticSearch(msg, 10).catch(() => []);
          if (semantic.length) {
            sessionStore.update(sessionKey, { lastResults: semantic });
            return respond(res, {
              lang,
              type: "songs",
              reply: t({
                vi: "Mình tìm theo ý nghĩa/cảm xúc, đây là vài bài gần nhất với yêu cầu của bạn 🎵",
                en: "I matched by meaning/mood, here are the closest tracks 🎵",
              }),
              songs: semantic,
            });
          }
          // Fallback 2: gợi ý chung
          const fb = await tools.suggestSongs(msg, artist);
          sessionStore.update(sessionKey, { lastResults: fb.songs });
          return respond(res, {
            lang,
            type: "songs",
            reply: t({
              vi: "Mình chưa tìm được bài nào khớp chính xác, đây là vài gợi ý gần giống nhé 🎵",
              en: "I couldn't find an exact match, but here are some close suggestions 🎵",
            }),
            songs: fb.songs,
          });
        }

        const desc = describeFilters(attrs, lang);
        sessionStore.update(sessionKey, { lastResults: result.songs });
        return respond(res, {
          lang,
          type: "songs",
          reply: fmt(t({
            vi: "Mình tìm thấy **{n} bài** phù hợp{desc} 🎵\nChọn một bài để nghe ngay nhé!",
            en: "I found **{n} {tracks}** matching{desc} 🎵\nPick one to play right away!",
          }), {
            n: result.songs.length,
            tracks: result.songs.length === 1 ? "track" : "tracks",
            desc: desc ? ` (${desc})` : " your request",
          }),
          songs: result.songs,
        });
      }

      // ---- play_music ----
      if (intent === "play_music") {
        if (attrs.album) {
          const album = await tools.findAlbum(attrs.album);
          if (album) {
            const songs = tools.normalizeSongs(album.songs);
            sessionStore.update(sessionKey, { lastResults: songs });
            return respond(res, {
              lang,
              type: "songs",
              action: "play",
              reply: fmt(t({
                vi: "Đang phát toàn bộ album **{title}** của **{artist}** cho bạn nghe! 🎶 ({n} bài)",
                en: "Playing the full album **{title}** by **{artist}** for you! 🎶 ({n} tracks)",
              }), { title: album.title, artist: album.artist, n: songs.length }),
              songs,
            });
          }
        }

        if (attrs.songTitle) {
          const song = await tools.findSong(attrs.songTitle);
          if (song) {
            const queue = [tools.normalizeSong(song), ...(await tools.getRelatedSongs(song))];
            sessionStore.update(sessionKey, { lastResults: queue });
            return respond(res, {
              lang,
              type: "songs",
              action: "play",
              reply: fmt(t({
                vi: "Mở ngay bài **{title}** của **{artist}** cho bạn nghe! 🎶",
                en: "Playing **{title}** by **{artist}** right away! 🎶",
              }), { title: song.title, artist: song.artist }),
              songs: queue,
            });
          }
        }

        if (attrs.artist && !attrs.genre && !attrs.mood) {
          const artistSongs = await prisma.song.findMany({
            where: { artist: { equals: attrs.artist, mode: "insensitive" }, duplicateOf: null },
            take: 10,
          });
          if (artistSongs.length) {
            const songs = tools.normalizeSongs(artistSongs);
            sessionStore.update(sessionKey, { lastResults: songs });
            return respond(res, {
              lang,
              type: "songs",
              action: "play",
              reply: fmt(t({
                vi: "Đang phát nhạc của **{name}** cho bạn nghe nhé! 🎶",
                en: "Playing music by **{name}** for you! 🎶",
              }), { name: attrs.artist }),
              songs,
            });
          }
        }

        // Phát theo phong cách
        const result = await tools.searchMusic(
          { genre: attrs.genre, mood: attrs.mood, energy: attrs.energy, vocal: attrs.vocal, purpose: attrs.purpose },
          10
        );
        if (result.songs.length) {
          sessionStore.update(sessionKey, { lastResults: result.songs });
          return respond(res, {
            lang,
            type: "songs",
            action: "play",
            reply: fmt(t({
              vi: "Đang phát {desc} cho bạn nghe nhé! 🎶",
              en: "Playing {desc} music for you! 🎶",
            }), { desc: describeFilters(attrs, lang) || "nhạc phù hợp" }),
            songs: result.songs,
          });
        }

        const random = await tools.getRandomSongs(10);
        sessionStore.update(sessionKey, { lastResults: random });
        return respond(res, {
          lang,
          type: "songs",
          action: "play",
          reply: t({
            vi: "Mình không tìm thấy bài phù hợp, nên phát nhạc ngẫu nhiên cho bạn nhé! 🎶",
            en: "I couldn't find a match, so playing random music for you! 🎶",
          }),
          songs: random,
        });
      }

      // ---- artist_info ----
      if (intent === "artist_info") {
        const target = attrs.artist || artist?.name || (currentSong ? currentSong.artist : null);
        if (target) {
          const info = await tools.getArtistInfo(target);
          if (info) {
            const yearText = info.yearRange.length === 2
              ? `, hoạt động giai đoạn ${info.yearRange[0]} - ${info.yearRange[1]}`
              : info.yearRange.length === 1
                ? `, hoạt động từ ${info.yearRange[0]}`
                : "";
            const metaYearText = !info.yearRange.length && info.metaYearRange ? `, hoạt động giai đoạn ${info.metaYearRange}` : "";
            const genreText = info.genres.length ? `\nThể loại: ${info.genres.join(", ")}` : "";
            const countryText = info.country ? `\nXuất xứ: ${info.country}` : "";
            const aliasText = info.aliases?.length ? `\nTên gọi khác: ${info.aliases.slice(0, 3).join(", ")}` : "";
            return respond(res, {
              lang,
              type: "artists",
              reply: fmt(t({
                vi: "**{name}**{year}{metaYear}, hiện có **{count} bài hát** trong thư viện.{genre}{country}{aliases}\n\nMình gợi ý vài bài ngay nhé! 🎧",
                en: "**{name}**{year}{metaYear}, currently has **{count} songs** in the library.{genre}{country}{aliases}\n\nLet me suggest a few tracks! 🎧",
              }), {
                name: info.name,
                year: yearText,
                metaYear: metaYearText,
                count: info.songCount,
                genre: genreText,
                country: countryText,
                aliases: aliasText,
              }),
              artists: [{
                name: info.name,
                songCount: info.songCount,
                coverImg: info.coverImg,
                image: info.image ?? null,
                genres: info.genres,
                sources: info.sources,
                albums: info.albums,
                country: info.country ?? null,
              }],
              songs: info.topSongs,
            });
          }
        }
        return respond(res, {
          lang,
          reply: t({
            vi: "Mình chưa tìm thấy nghệ sĩ này trong thư viện. Bạn thử hỏi \"thông tin nghệ sĩ Anitek\" nhé!",
            en: "I couldn't find that artist in the library. Try \"tell me about artist Anitek\"!",
          }),
        });
      }

      // ---- album_info ----
      if (intent === "album_info") {
        let album = null;
        if (attrs.album) album = await tools.findAlbum(attrs.album);
        if (!album && currentSong?.albumId) album = await tools.getAlbumById(currentSong.albumId);

        if (album) {
          const songs = tools.normalizeSongs(album.songs);
          const years = [...new Set(songs.map((s) => s.releaseYear).filter(Boolean))].sort((a, b) => a - b);
          const yearText = years.length === 1 ? ` phát hành năm **${years[0]}**` : years.length > 1 ? `, các bài phát hành: ${years.join(", ")}` : "";
          return respond(res, {
            lang,
            type: "albums",
            reply: fmt(t({
              vi: "Album **{title}** của **{artist}** có **{count} bài hát**{year}.\n\nDanh sách bài hát:\n{tracks}\n\nBạn muốn nghe cả album không? 🎧",
              en: "Album **{title}** by **{artist}** has **{count} tracks**{year}.\n\nTrack list:\n{tracks}\n\nWant to play the whole album? 🎧",
            }), {
              title: album.title,
              artist: album.artist,
              count: songs.length,
              year: yearText,
              tracks: songs.map((s, i) => `${i + 1}. ${s.title}`).slice(0, 20).join("\n"),
            }),
            albums: [tools.normalizeAlbum(album, album.songs)],
            songs,
          });
        }
      }

      // ---- chat: LLM tự do ----
      // RAG: lấy kết quả semantic (nếu câu mô tả mood/vibe/đề xuất) bổ sung vào context
      let ragHits = [];
      if (!artist && !/\?(.*album|.*bài hát(t của)?)/i.test(msg)) {
        try {
          ragHits = await tools.semanticSearch(msg, 6);
        } catch (e) {
          ragHits = [];
        }
      }
      const context = await buildLibraryContext(artist, currentSong);
      const ragText = ragHits.length
        ? `\n\nSemantic matches (chỉ được dùng những mục này khi nói về bài hát cụ thể):\n${ragHits.map((s) => `- "${s.title}" by ${s.artist} (${s.genre || "unknown genre"})`).join("\n")}`
        : "";
      const llm = await askLLM([
        {
          role: "system",
          content: `You are the music assistant of JamWave - an indie music app (Jamendo + Audius indie catalog). Reply briefly and friendly in ${lang === "vi" ? "Vietnamese" : "English"}.
STRICT RULES:
- Answer ONLY using the library context and semantic matches provided. NEVER invent song titles, artists, release years, genres, or song counts that are not present in the context.
- If the exact info is not in the context, say so honestly (e.g. "Chưa có thông tin này trong thư viện") instead of guessing.
- For factual questions (song/year/artist/count), prefer the context data; do not elaborate beyond it.
- You cannot play music yourself; suggest "phát nhạc ngẫu nhiên" or the app will play it.`,
        },
        {
          role: "user",
          content: `Library context:\n${context}${ragText}\n\nConversation history:\n${(cleanedHistory || []).map((h) => `${h.role}: ${h.text}`).join("\n") || "(empty)"}\n\nQuestion: ${msg}`,
        },
      ]);

      if (llm.ok) return respond(res, { lang, reply: llm.text });

      const errMsg = llmErrorReply(llm, lang);
      if (errMsg) return respond(res, { lang, reply: errMsg });
    }

    // 15) Fallback: không có LLM / classify lỗi -> hướng dẫn
    return respond(res, {
      lang,
      reply: t({
        vi: "Mình chưa hiểu câu hỏi này lắm 🤔 Bạn thử:\n• \"Phát nhạc ngẫu nhiên\" hoặc \"Phát bài Breathe\"\n• \"Alexander Blu có bao nhiêu bài?\"\n• \"Bài hát của Anitek\"\n• \"Gợi ý nhạc lofi\"\n• \"Tìm nhạc indie chill cho việc học\"",
        en: "I'm not sure I understood that 🤔 Try:\n• \"Play random music\" or \"Play the song Breathe\"\n• \"How many songs does Alexander Blu have?\"\n• \"Songs by Anitek\"\n• \"Suggest lofi music\"\n• \"Find some indie chill music for studying\"",
      }),
    });
  } catch (error) {
    console.error("Lỗi xử lý chat:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống khi xử lý tin nhắn" });
  }
};

// Phiên bản streaming: giữ nguyên logic chat, chỉ chuyển respond sang SSE
const chatStream = async (req, res) => {
  res.locals.sse = true;
  return chat(req, res);
};

module.exports = { chat, chatStream };