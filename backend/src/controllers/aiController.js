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
function respond(res, { type = "text", reply = "", songs = [], artists = [], albums = [], lyrics = null, action = null, lang = "vi" }) {
  return res.json({ type, reply, songs, artists, albums, lyrics, action, lang });
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
  const songMatch = msg.match(/(?:bài\s+hát|bài|song|track)\s+["'“”]?([^"'“”?]+?)["'”]?\s*(?:\?|$)/i);
  if (!songMatch) return "";
  return songMatch[1]
    .trim()
    .replace(/\s+(của|bởi|by|là ai|là sáng tác của|do ai sáng tác|do ai hát)\s*.*$/i, "")
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

// Xác định bài hát mục tiêu cho lyrics / thông tin
async function resolveTargetSong(message, currentSong) {
  const lower = message.toLowerCase();

  // "bài này / bài đang phát / bài hát này"
  if (/\b(bài|song)\s+(này|đang phát|hiện tại|đang nghe)\b/i.test(lower) || /(bài hát này|song này)/i.test(lower)) {
    return currentSong
      ? await prisma.song.findUnique({
          where: { id: currentSong.id },
          include: { lyric: { select: { instrumental: true } } },
        })
      : null;
  }

  const title = extractSongTitle(message);
  if (title) {
    const song = await prisma.song.findFirst({
      where: { title: { contains: title, mode: "insensitive" } },
      include: { lyric: { select: { instrumental: true } } },
    });
    if (song) return song;
  }

  return currentSong
    ? await prisma.song.findUnique({
        where: { id: currentSong.id },
        include: { lyric: { select: { instrumental: true } } },
      })
    : null;
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
function describeFilters(attrs, lang) {
  const parts = [];
  const genreLabel = GENRE_KEYWORDS.find((g) => g.keyword === attrs.genre?.toLowerCase());
  const moodLabel = MOOD_MAP.find((m) => m.mood === attrs.mood?.toLowerCase());
  if (genreLabel) parts.push(lang === "vi" ? genreLabel.label : genreLabel.label);
  else if (attrs.genre) parts.push(attrs.genre);
  if (moodLabel) parts.push(lang === "vi" ? moodLabel.mood : moodLabel.mood);
  else if (attrs.mood) parts.push(attrs.mood);
  if (attrs.vocal === "instrumental") parts.push(lang === "vi" ? "không lời" : "instrumental");
  if (attrs.vocal === "vocals") parts.push(lang === "vi" ? "có lời hát" : "with vocals");
  if (attrs.energy) parts.push(lang === "vi" ? `năng lượng ${attrs.energy}` : `${attrs.energy} energy`);
  return parts.filter(Boolean).join(" · ");
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
          vi: "Mình có thể giúp bạn:\n🎧 Gợi ý bài hát theo nghệ sĩ / thể loại / tâm trạng\n🎤 Xem thông tin nghệ sĩ, số bài hát\n💿 Tra cứu album, năm phát hành\n📜 Xem lời bài hát\n🎚️ Điều khiển nhạc: \"tạm dừng\", \"bài tiếp theo\", \"tăng âm lượng\"\n\nHãy thử hỏi: \"Find some chill indie music for studying\" nhé!",
          en: "I can help you:\n🎧 Suggest songs by artist / genre / mood\n🎤 Artist info and song counts\n💿 Album info and release years\n📜 Song lyrics\n🎚️ Control music: \"pause\", \"next song\", \"turn the volume up\"\n\nTry: \"Find some chill indie music for studying\"!",
        }),
      });
    }

    // 3) PLaylist (coming soon)
    if (/(tạo playlist|create playlist|make me a playlist|playlist cho)/i.test(lower)) {
      return respond(res, {
        lang,
        reply: t({
          vi: "Tính năng tạo playlist bằng AI đang được phát triển! 🚀\nTrong khi chờ, bạn có thể thử: \"Tìm nhạc chill indie cho việc học\" hoặc \"Gợi ý nhạc lofi\" nhé!",
          en: "AI playlist creation is coming soon! 🚀\nMeanwhile, try: \"Find some chill indie music for studying\" or \"Suggest lofi music\"!",
        }),
      });
    }

    // Tìm nghệ sĩ trong câu hỏi (cho các nhánh dùng artist)
    let artist = null;
    if (!/(album|đĩa nhạc)/i.test(lower)) {
      artist = await tools.findArtist(msg);
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

    // 6) Lyrics (lời bài hát + ý nghĩa)
    if (/(lời bài|lyrics|ý nghĩa bài|nói về gì|nói gì|meaning|summarize|tóm tắt|kể về|about the song|nội dung bài)/i.test(lower)) {
      const song = await resolveTargetSong(msg, currentSong);
      const wantMeaning = /(nói về gì|nói gì|ý nghĩa|meaning|summarize|tóm tắt|kể về|about the song|nội dung bài)/i.test(lower);

      if (!song) {
        return respond(res, {
          lang,
          reply: t({
            vi: "Bạn đang nghe bài nào vậy? Hãy nói tên bài hát hoặc phát một bài rồi hỏi \"lời bài hát này\" nhé!",
            en: "Which song is it about? Tell me the song title, or start playing one and ask \"lyrics of this song\"!",
          }),
        });
      }

      const result = await tools.getLyricsForSong(song.id);
      if (result.error === "not_found") {
        return respond(res, { lang, reply: t({ vi: "Không tìm thấy bài hát này!", en: "Song not found!" }) });
      }

      if (result.instrumental) {
        return respond(res, {
          lang,
          type: "lyrics",
          reply: t({
            vi: `Bài **${song.title}** của **${song.artist}** là nhạc không lời (instrumental) 🎶 Không có lời để hiển thị.`,
            en: `**${song.title}** by **${song.artist}** is an instrumental track 🎶 No lyrics available.`,
          }),
          lyrics: {
            songId: song.id,
            title: song.title,
            artist: song.artist,
            plainLyrics: null,
            synced: false,
            instrumental: true,
          },
        });
      }

      const noLyrics = !result.plainLyrics && !result.syncedLyrics;
      if (noLyrics) {
        return respond(res, {
          lang,
          type: "lyrics",
          reply: t({
            vi: `Bài **${song.title}** của **${song.artist}** hiện chưa có lời trong thư viện LRCLIB. Bạn thử bài khác nhé!`,
            en: `**${song.title}** by **${song.artist}** doesn't have lyrics available yet. Try another song!`,
          }),
          lyrics: {
            songId: song.id,
            title: song.title,
            artist: song.artist,
            plainLyrics: null,
            synced: false,
            instrumental: false,
          },
        });
      }

      // Yêu cầu hiểu ý nghĩa -> gọi LLM tóm tắt (không trích nguyên văn toàn bài)
      let replyText;
      if (wantMeaning) {
        const lyricsSnippet = (result.plainLyrics || "").slice(0, 2500);
        const llm = await askLLM([
          {
            role: "system",
            content: `You are a music assistant. Summarize the MEANING/THEME of the given song lyrics in ${lang === "vi" ? "Vietnamese" : "English"}, briefly (3-6 sentences). Do NOT reproduce the lyrics verbatim; only summarize and interpret. If lyrics are unclear, be honest.`,
          },
          {
            role: "user",
            content: `Song: "${song.title}" by ${song.artist}.\n\nLyrics:\n${lyricsSnippet}`,
          },
        ], { temperature: 0.5 });
        replyText = llm.ok
          ? llm.text
          : (llmErrorReply(llm, lang) || t({
              vi: "Mình gặp sự cố khi phân tích ý nghĩa, nhưng đây là lời bài hát để bạn xem nhé!",
              en: "I had trouble analyzing the meaning, but here are the lyrics!",
            }));
      } else {
        replyText = t({
          vi: `Đây là lời bài hát **${song.title}** của **${song.artist}** 🎤`,
          en: `Here are the lyrics of **${song.title}** by **${song.artist}** 🎤`,
        });
      }

      return respond(res, {
        lang,
        type: "lyrics",
        reply: replyText,
        lyrics: {
          songId: song.id,
          title: song.title,
          artist: song.artist,
          plainLyrics: result.plainLyrics || null,
          synced: Boolean(result.syncedLyrics),
          instrumental: false,
        },
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

    // 8) Album intelligence
    if (/(album|đĩa nhạc)/i.test(lower)) {
      const thisAlbum = /(album này|album đang phát|album hiện tại)/i.test(lower);
      const nameMatch = msg.match(/album\s+["'“”]?\s*([^"'“”?]+?)\s*["'”]?\s*(?:\?|$)/i);

      let album = null;
      if (thisAlbum && currentSong?.albumId) {
        album = await tools.getAlbumById(currentSong.albumId);
      } else if (nameMatch) {
        const albumName = nameMatch[1]
          .replace(/\s+(này|đang phát|hiện tại)$/i, "")
          .replace(/^(của|tên|tựa)\s+/i, "")
          .replace(/\s+(?:có|gồm)?\s*(?:bao nhiêu bài|mấy bài|năm nào|năm mấy|khi nào|ra mắt khi nào|phát hành khi nào|năm bao nhiêu|mấy năm|những bài nào|bài nào|gồm những|có những bài|danh sách bài|các bài|tracks?|list)\s*$/i, "")
          .replace(/\s+(có|gồm)\s*$/i, "")
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

        // Phát cả album
        if (/(phát|mở|nghe|play).*(album)|album.*(phát|mở|nghe)/i.test(lower)) {
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
      const genreText = info.genres.length ? `\nThể loại: ${info.genres.join(", ")}` : "";
      const albumText = info.albums.length
        ? `\nAlbum tiêu biểu:\n${info.albums.map((a) => `• ${a.title}`).join("\n")}`
        : "";
      return respond(res, {
        lang,
        type: "artists",
        reply: fmt(t({
          vi: "**{name}**{year}, hiện có **{count} bài hát** trong thư viện.{genre}{albums}\n\nMình gợi ý vài bài ngay nhé! 🎧",
          en: "**{name}**{year}, currently has **{count} songs** in the library.{genre}{albums}\n\nLet me suggest a few tracks! 🎧",
        }), { name: info.name, year: yearText, count: info.songCount, genre: genreText, albums: albumText }),
        artists: [{
          name: info.name,
          songCount: info.songCount,
          coverImg: info.coverImg,
          image: info.image ?? null,
          genres: info.genres,
          sources: info.sources,
          albums: info.albums,
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

    // 12c) Tìm nhạc theo mục đích / mô tả tự nhiên (rule-based, không cần LLM):
    //      "tìm nhạc indie chill cho việc học", "find music for studying", "nhạc tập trung"
    const purposeTrigger = /(tìm nhạc|tìm kiếm nhạc|tìm bài|tìm bản nhạc|nhạc.*cho|find (music|song|tracks?|nhạc)|music (for|to)|nhạc (cho|để)|cần nhạc|cho mình tìm)/i.test(lower);
    if (purposeTrigger && !/(album|đĩa nhạc)/i.test(lower)) {
      const findPurpose = (() => {
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
      })();
      const genre = GENRE_KEYWORDS.find((g) => lower.includes(g.keyword))?.keyword || null;
      const mood = MOOD_MAP.find((m) => lower.includes(m.mood))?.mood || null;
      const energy =
        /(năng lượng cao|mạnh|upbeat|high energy|sôi động)/i.test(lower) ? "high"
        : /(nhẹ nhàng|thư giãn|thả lỏng|chậm|low energy|calm)/i.test(lower) ? "low"
        : null;
      const vocal = /(không lời|nhạc không lời|instrumental|without vocals)/i.test(lower) ? "instrumental"
        : /(có lời|with vocals)/i.test(lower) ? "vocals"
        : null;

      if (genre || mood || findPurpose || energy || vocal) {
        const result = await tools.searchMusic(
          { genre, mood, energy, vocal, purpose: findPurpose },
          10
        );
        if (result.songs.length) {
          sessionStore.update(sessionKey, { lastResults: result.songs });
          const desc = describeFilters({ genre, mood, purpose: findPurpose, energy, vocal }, lang);
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
            const genreText = info.genres.length ? `\nThể loại: ${info.genres.join(", ")}` : "";
            return respond(res, {
              lang,
              type: "artists",
              reply: fmt(t({
                vi: "**{name}**{year}, hiện có **{count} bài hát** trong thư viện.{genre}\n\nMình gợi ý vài bài ngay nhé! 🎧",
                en: "**{name}**{year}, currently has **{count} songs** in the library.{genre}\n\nLet me suggest a few tracks! 🎧",
              }), { name: info.name, year: yearText, count: info.songCount, genre: genreText }),
              artists: [{
                name: info.name,
                songCount: info.songCount,
                coverImg: info.coverImg,
                image: info.image ?? null,
                genres: info.genres,
                sources: info.sources,
                albums: info.albums,
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

      // ---- lyrics (LLM nhận diện) ----
      if (intent === "lyrics") {
        const song = attrs.songTitle
          ? await prisma.song.findFirst({
              where: { title: { contains: attrs.songTitle, mode: "insensitive" } },
              include: { lyric: { select: { instrumental: true } } },
            })
          : await resolveTargetSong(msg, currentSong);

        if (!song) {
          return respond(res, {
            lang,
            reply: t({
              vi: "Bạn muốn xem lời bài hát nào? Hãy nói tên bài hát hoặc phát một bài rồi hỏi \"lời bài hát này\" nhé!",
              en: "Which song's lyrics do you want? Tell me the title or play one and ask \"lyrics of this song\"!",
            }),
          });
        }

        const result = await tools.getLyricsForSong(song.id);
        if (result.error === "not_found" || (!result.plainLyrics && !result.syncedLyrics && !result.instrumental)) {
          return respond(res, {
            lang,
            type: "lyrics",
            reply: t({
              vi: `Bài **${song.title}** hiện chưa có lời trong thư viện LRCLIB. Bạn thử bài khác nhé!`,
              en: `**${song.title}** doesn't have lyrics available yet. Try another song!`,
            }),
            lyrics: { songId: song.id, title: song.title, artist: song.artist, plainLyrics: null, synced: false, instrumental: result.instrumental },
          });
        }

        if (result.instrumental) {
          return respond(res, {
            lang,
            type: "lyrics",
            reply: t({
              vi: `Bài **${song.title}** là nhạc không lời (instrumental) 🎶`,
              en: `**${song.title}** is an instrumental track 🎶`,
            }),
            lyrics: { songId: song.id, title: song.title, artist: song.artist, plainLyrics: null, synced: false, instrumental: true },
          });
        }

        return respond(res, {
          lang,
          type: "lyrics",
          reply: t({
            vi: `Đây là lời bài hát **${song.title}** của **${song.artist}** 🎤`,
            en: `Here are the lyrics of **${song.title}** by **${song.artist}** 🎤`,
          }),
          lyrics: {
            songId: song.id,
            title: song.title,
            artist: song.artist,
            plainLyrics: result.plainLyrics || null,
            synced: Boolean(result.syncedLyrics),
            instrumental: false,
          },
        });
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

module.exports = { chat };