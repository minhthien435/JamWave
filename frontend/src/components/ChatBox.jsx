import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, Play, Copy, Check, Music2, Mic2, ExternalLink } from "lucide-react";
import { sendChatMessage } from "../api/ai";
import { usePlayerStore } from "../usePlayerStore";
import { detectPlayerIntent, executePlayerIntent, detectLanguage } from "../utils/clientIntents";
import ArtistAvatar from "./ArtistAvatar";

const QUICK_SUGGESTIONS = [
  "Phát nhạc ngẫu nhiên",
  "Gợi ý nhạc lofi",
  "Tìm nhạc indie chill cho việc học",
  "Alexander Blu có bao nhiêu bài?",
];

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const renderFormattedText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const innerText = part.slice(2, -2);
      return (
        <span key={index} className="font-bold text-white">
          {innerText}
        </span>
      );
    }
    return part;
  });
};

// ---- Card nghệ sĩ ----
function ArtistCard({ artist, songs, onPlayAll }) {
  const navigate = useNavigate();
  const hasSongs = Array.isArray(songs) && songs.length > 0;

  return (
    <div className="mt-2.5 bg-black/40 hover:bg-black/50 rounded-xl p-3 border border-white/10 transition-all select-none">
      <div className="flex items-center gap-3">
        <ArtistAvatar name={artist.name} image={artist.image} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">🎤 {artist.name}</p>
          {artist.genres?.length > 0 && (
            <p className="text-[10px] text-cyan-300/90 truncate font-medium">{artist.genres.join(" · ")}</p>
          )}
          <p className="text-[10px] text-zinc-400 font-medium">{artist.songCount} bài hát</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
          className="flex-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-zinc-100 rounded-lg py-1.5 transition-all active:scale-95"
        >
          <ExternalLink size={11} className="inline mr-1 -mt-0.5 text-cyan-400" />
          Xem nghệ sĩ
        </button>
        {hasSongs && (
          <button
            onClick={() => onPlayAll(songs)}
            className="flex-1 text-[11px] font-bold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white rounded-lg py-1.5 transition-all active:scale-95"
          >
            <Play size={11} className="inline mr-1 -mt-0.5" fill="white" />
            Phát tất cả
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Card album ----
function AlbumCard({ album, songs, onPlayAll }) {
  const navigate = useNavigate();
  const hasSongs = Array.isArray(songs) && songs.length > 0;

  return (
    <div className="mt-2.5 bg-black/40 hover:bg-black/50 rounded-xl p-3 border border-white/10 transition-all select-none">
      <div className="flex items-center gap-3">
        <img
          src={album.coverImg}
          alt={album.title}
          loading="lazy"
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow border border-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">💿 {album.title}</p>
          <p className="text-[10px] text-zinc-400 truncate font-medium">{album.artist}</p>
          <p className="text-[10px] text-zinc-500 font-medium">
            {album.songCount} bài
            {album.releaseYears?.length > 0 ? ` · ${album.releaseYears.join(", ")}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => navigate(`/album/${album.id}`)}
          className="flex-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-zinc-100 rounded-lg py-1.5 transition-all active:scale-95"
        >
          <ExternalLink size={11} className="inline mr-1 -mt-0.5 text-cyan-400" />
          Xem album
        </button>
        {hasSongs && (
          <button
            onClick={() => onPlayAll(songs)}
            className="flex-1 text-[11px] font-bold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white rounded-lg py-1.5 transition-all active:scale-95"
          >
            <Play size={11} className="inline mr-1 -mt-0.5" fill="white" />
            Phát album
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Lyrics block ----
function LyricsBlock({ lyrics, currentSong }) {
  const isCurrent = currentSong && lyrics.songId === currentSong.id;

  const openSyncedLyrics = () => {
    window.dispatchEvent(new CustomEvent("jamwave:open-lyrics"));
  };

  return (
    <div className="mt-2.5 bg-black/40 rounded-xl border border-white/10 overflow-hidden select-none">
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-600/20 to-cyan-500/10 border-b border-white/10">
        <p className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
          <Mic2 size={12} className="text-cyan-400 flex-shrink-0" />
          {lyrics.title} <span className="text-zinc-400 font-medium">— {lyrics.artist}</span>
        </p>
      </div>

      <div className="px-3.5 py-2.5">
        {lyrics.plainLyrics ? (
          <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-line max-h-52 overflow-y-auto select-text cursor-text font-medium">
            {lyrics.plainLyrics}
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500 font-medium">Không có lời hiển thị.</p>
        )}

        {lyrics.synced && (
          <button
            onClick={openSyncedLyrics}
            disabled={!isCurrent}
            className={`mt-2 w-full text-[11px] font-bold rounded-lg py-1.5 transition-all active:scale-95 flex items-center justify-center gap-1.5 ${isCurrent
                ? "bg-white/10 hover:bg-white/20 text-cyan-300"
                : "bg-white/5 text-zinc-500 cursor-not-allowed"
              }`}
            title={isCurrent ? "Mở lyrics đồng bộ theo nhạc" : "Phát bài này để mở lyrics đồng bộ"}
          >
            <Music2 size={11} />
            {isCurrent ? "Mở lyrics đồng bộ 🎤" : "Có lyrics đồng bộ — phát bài này để mở"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Chào bạn! Mình là trợ lý nhạc JamWave 🎵\nHỏi mình gợi ý bài hát, tìm nhạc theo tâm trạng, tra cứu nghệ sĩ/album, xem lời bài hát hoặc yêu cầu phát nhạc nhé!",
      songs: [],
      artists: [],
      albums: [],
      lyrics: null,
      action: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);
  const playerStore = usePlayerStore();
  const { currentSong, setCurrentSong, setQueue } = playerStore;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const handleSend = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: message, songs: [], artists: [], albums: [], lyrics: null, action: null }]);
    setInput("");
    setSending(true);

    try {
      // Fast-path local: lệnh điều khiển player tức thì, không gọi API
      const localIntent = detectPlayerIntent(message);
      if (localIntent) {
        const lang = detectLanguage(message);
        const reply = executePlayerIntent(localIntent, lang, playerStore);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: reply, songs: [], artists: [], albums: [], lyrics: null, action: null },
        ]);
        return;
      }

      const history = messages
        .filter((m) => m.text)
        .slice(-10)
        .map((m) => ({ role: m.role === "user" ? "user" : "bot", text: m.text }));

      const data = await sendChatMessage(message, { history, currentSong });
      const displaySongs = data.action === "play" ? [] : (data.songs || []);

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply,
          songs: displaySongs,
          artists: data.artists || [],
          albums: data.albums || [],
          lyrics: data.lyrics || null,
          action: data.action || null,
        },
      ]);

      if (data.action === "play" && data.songs?.length) {
        handlePlaySong(data.songs[0], data.songs);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Có lỗi xảy ra: ${err.message}. Thử lại nhé!`,
          songs: [],
          artists: [],
          albums: [],
          lyrics: null,
          action: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handlePlaySong = (song, songs) => {
    setQueue(songs);
    setCurrentSong(song);
  };

  const handleCopyText = (text, index) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      {/* Nút mở chat dạng Quả cầu Neon phát sáng (Floating Neon Orb) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-28 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 border border-white/20 ${open
            ? "bg-zinc-800 text-white shadow-black/80 rotate-90"
            : "bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white neon-glow-violet hover:scale-110 animate-float-slow"
          }`}
        title="Trợ lý nhạc JamWave AI"
      >
        {open ? <X size={24} /> : <Bot size={26} className="stroke-[2.5]" />}
      </button>

      {/* Panel chat Glassmorphism Chuẩn */}
      {open && (
        <div className="fixed bottom-44 right-5 z-50 w-[390px] max-w-[calc(100vw-2rem)] h-[490px] max-h-[calc(100vh-220px)] glass-panel rounded-3xl shadow-2xl border border-white/15 flex flex-col overflow-hidden animate-float-slow">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-600/20 via-cyan-500/10 to-transparent border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                <Bot size={22} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-gradient-emerald">AI Music Assistant</p>
                <p className="text-[11px] text-zinc-400 font-medium">Tìm nhạc • Tra cứu • Điều khiển player</p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container: Hỗ trợ bôi đen (select-text) & copy */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 select-text cursor-text">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line shadow-md transition-all ${msg.role === "user"
                      ? "bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white font-semibold rounded-br-none shadow-violet-500/20"
                      : "bg-white/10 backdrop-blur-md text-zinc-100 rounded-bl-none border border-white/10"
                    }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Card nghệ sĩ */}
                  {msg.artists?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.artists.map((artist) => (
                        <ArtistCard
                          key={`${artist.name}-${artist.songCount}`}
                          artist={artist}
                          songs={msg.songs}
                          onPlayAll={(songs) => handlePlaySong(songs[0], songs)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Card album */}
                  {msg.albums?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.albums.map((album) => (
                        <AlbumCard
                          key={`${album.id}-${album.title}`}
                          album={album}
                          songs={msg.songs}
                          onPlayAll={(songs) => handlePlaySong(songs[0], songs)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Lyrics */}
                  {msg.lyrics && <LyricsBlock lyrics={msg.lyrics} currentSong={currentSong} />}

                  {/* Bài hát được gợi ý */}
                  {msg.songs.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 select-none">
                      {msg.songs.map((song) => (
                        <button
                          key={`${song.id}-${song.title}`}
                          onClick={() => handlePlaySong(song, msg.songs)}
                          className="w-full flex items-center gap-2.5 bg-black/40 hover:bg-violet-500/20 rounded-xl px-2.5 py-2 text-left transition-all duration-200 border border-white/5 group"
                        >
                          <img src={song.albumCover} alt={song.title} loading="lazy" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow" />
                          <div className="truncate flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-white group-hover:text-violet-300">{song.title}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-medium">{formatDuration(song.duration)}</span>
                          <Play size={15} fill="#c084fc" className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nút 1-click Copy tin nhắn AI */}
                {msg.role === "bot" && (
                  <button
                    onClick={() => handleCopyText(msg.text, i)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all flex-shrink-0 mt-1 select-none"
                    title={copiedIndex === i ? "Đã sao chép!" : "Sao chép tin nhắn"}
                  >
                    {copiedIndex === i ? <Check size={13} className="text-cyan-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-zinc-300 rounded-2xl rounded-bl-none px-4 py-3 text-xs font-medium flex items-center gap-3 border border-white/10 shadow-md">
                  <div className="flex items-end gap-1 h-4">
                    <span className="w-1 bg-cyan-400 rounded-full equalizer-bar-1" />
                    <span className="w-1 bg-purple-400 rounded-full equalizer-bar-2" />
                    <span className="w-1 bg-violet-400 rounded-full equalizer-bar-3" />
                    <span className="w-1 bg-cyan-300 rounded-full equalizer-bar-4" />
                  </div>
                  <span>Đang phân tích giai điệu JamWave AI...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl px-3 py-1.5 transition-all border border-white/10 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Nhập câu hỏi hoặc tên bài hát..."
                className="flex-1 bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-2xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all placeholder-zinc-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all flex-shrink-0 shadow-lg shadow-violet-500/25 active:scale-95"
                title="Gửi"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}