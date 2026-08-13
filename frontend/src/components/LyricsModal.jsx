import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause, SkipBack, SkipForward, Sparkles, Loader2, Heart, Music, Info } from "lucide-react";
import { parseLrcLyrics } from "../utils/lyricsHelper";
import { fetchLyrics } from "../api/lyrics";
import { useLikedSongs } from "../hooks/useLikedSongs";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function LyricsModal({ currentSong, isPlaying, togglePlay, playNext, playPrevious, currentTime, duration, onSeek, onClose }) {
  const [lyrics, setLyrics] = useState([]);
  const [plainText, setPlainText] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | synced | plain | instrumental | notfound | error
  const [tab, setTab] = useState("lyrics"); // lyrics | about
  const [reloadKey, setReloadKey] = useState(0);
  const activeLineRef = useRef(null);

  const { likedIds, toggleLike } = useLikedSongs();
  const isLiked = currentSong ? likedIds.has(currentSong.id) : false;

  useEffect(() => {
    if (!currentSong) return;

    let cancelled = false;

    const load = async () => {
      // Nếu bài hát có lyrics sẵn (seed thủ công) thì dùng luôn
      if (currentSong.lyrics && currentSong.lyrics.trim()) {
        const parsed = parseLrcLyrics(currentSong.lyrics, currentSong.duration || 180);
        if (parsed.length > 0) {
          setLyrics(parsed);
          setStatus("synced");
          return;
        }
      }

      try {
        const data = await fetchLyrics(currentSong.id);
        if (cancelled) return;
        if (data.instrumental) {
          setStatus("instrumental");
        } else if (data.syncedLyrics) {
          const parsed = parseLrcLyrics(data.syncedLyrics, currentSong.duration || 180);
          setLyrics(parsed);
          if (parsed.length > 0) {
            setStatus("synced");
          } else if (data.plainLyrics) {
            setPlainText(data.plainLyrics);
            setStatus("plain");
          } else {
            setStatus("notfound");
          }
        } else if (data.plainLyrics) {
          setPlainText(data.plainLyrics);
          setStatus("plain");
        } else {
          setStatus("notfound");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [currentSong, reloadKey]);

  // Tìm dòng lyric đang phát hiện tại
  const activeIndex = lyrics.findIndex((line, idx) => {
    const nextLine = lyrics[idx + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  // Tự động cuộn mượt đến dòng lyric đang phát
  useEffect(() => {
    if (activeLineRef.current && tab === "lyrics") {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, tab]);

  if (!currentSong) return null;

  const handleToggleLike = async () => {
    await toggleLike(currentSong);
  };

  const formattedGenre = currentSong.genre
    ? currentSong.genre.replace(/,/g, " ·").toUpperCase()
    : "INDIE · SOUNDSCAPE";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl overflow-hidden select-none">
      {/* Dynamic Ambient Background Glow tuned to track mood */}
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-violet-600/25 rounded-full blur-[160px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[45vw] h-[45vw] bg-cyan-500/20 rounded-full blur-[160px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* Main Glass Panel */}
      <div className="relative w-full max-w-5xl h-[90vh] glass-panel rounded-3xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 glass-header z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white shadow-lg shadow-violet-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white leading-none">NOW PLAYING</h2>
              <p className="text-xs text-cyan-300 mt-1 font-medium">Sing along with the wave</p>
            </div>
          </div>

          {/* Navigation Tabs ([ Lyrics ] | [ About ]) */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10 shadow-inner">
            <button
              onClick={() => setTab("lyrics")}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                tab === "lyrics"
                  ? "bg-gradient-to-r from-violet-600 to-cyan-400 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Music size={13} /> Lời bài hát
            </button>
            <button
              onClick={() => setTab("about")}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                tab === "about"
                  ? "bg-gradient-to-r from-violet-600 to-cyan-400 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Info size={13} /> Thông tin
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Clean Badge on Right */}
            <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-300 tracking-wider">
              {currentSong.source === "audius" ? "AUDIUS" : "JAMENDO"}
            </span>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/15 text-zinc-400 hover:text-white transition-all active:scale-95"
              title="Đóng"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Body: 35 / 65 Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden relative">
          {/* Left Column (35% width, ~280-320px compact artwork & track info) */}
          <div className="md:col-span-4 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 relative bg-black/20">
            <div className="relative group max-w-[280px] w-full aspect-square">
              {/* Dynamic Glow Aura */}
              <div className={`absolute -inset-3 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 opacity-60 blur-xl transition-all duration-700 ${isPlaying ? "animate-pulse-glow" : "opacity-30"}`} />
              
              <img
                src={currentSong.albumCover}
                alt={currentSong.title}
                className={`relative w-full h-full object-cover rounded-2xl shadow-2xl border border-white/20 transition-transform duration-700 ${isPlaying ? "scale-102" : "scale-100"}`}
              />

              {isPlaying && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 text-xs text-cyan-300 font-bold shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Đang phát
                </div>
              )}
            </div>

            {/* Track Info (Title, Artist, Genre & Favorite Button) */}
            <div className="mt-5 text-center max-w-xs w-full">
              <h3 className="text-xl font-black text-white truncate drop-shadow-md">{currentSong.title}</h3>
              <p className="text-sm font-bold text-zinc-300 mt-1 truncate">{currentSong.artist}</p>
              
              <p className="text-[11px] uppercase font-extrabold text-cyan-400 tracking-wider mt-2 truncate">
                {formattedGenre}
              </p>

              {/* ♡ Add to Library Button */}
              <button
                onClick={handleToggleLike}
                className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-xs font-extrabold transition-all duration-200 active:scale-95 shadow-md ${
                  isLiked
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white border-transparent shadow-violet-500/30"
                    : "bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15"
                }`}
              >
                <Heart size={15} fill={isLiked ? "white" : "none"} className={isLiked ? "text-white" : "text-zinc-400"} />
                {isLiked ? "Đã lưu vào thư viện" : "♡ Thêm vào thư viện"}
              </button>
            </div>
          </div>

          {/* Right Column (65% width): Lyrics or About view */}
          <div className="md:col-span-8 p-6 sm:p-10 overflow-y-auto space-y-6 scrollbar-thin flex flex-col justify-start">
            {tab === "lyrics" ? (
              <>
                {status === "loading" && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
                    <Loader2 size={32} className="animate-spin text-cyan-400" />
                    <p className="text-sm font-semibold">Đang tải lời bài hát...</p>
                  </div>
                )}

                {(status === "notfound" || status === "instrumental" || status === "error") && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 my-auto">
                    <div className="w-16 h-16 rounded-full bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-cyan-300 text-3xl shadow-lg shadow-violet-500/20">
                      🎤
                    </div>
                    <p className="text-xl font-black text-white">Một vài giai điệu vẫn chưa có lời để kể.</p>
                    <p className="text-sm text-zinc-300 max-w-md font-medium leading-relaxed">
                      Bản nhạc độc lập này hiện chưa có lời đồng bộ. Hãy thả mình vào từng giai điệu tuyệt vời này!
                    </p>
                    <button
                      onClick={playNext}
                      className="mt-3 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400 hover:from-violet-500 hover:to-cyan-300 text-white font-extrabold text-xs shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      ✨ Khám phá bài tiếp theo
                    </button>
                  </div>
                )}

                {status === "plain" && plainText && (
                  <div className="text-base sm:text-lg font-semibold text-zinc-200 leading-relaxed whitespace-pre-line px-4">
                    {plainText}
                  </div>
                )}

                {status === "synced" &&
                  lyrics.map((line, idx) => {
                    const isActive = idx === activeIndex;

                    return (
                      <div
                        key={idx}
                        ref={isActive ? activeLineRef : null}
                        onClick={() => onSeek && onSeek(line.time)}
                        className={`cursor-pointer transition-all duration-300 px-4 py-3 rounded-2xl flex items-center gap-3 ${
                          isActive
                            ? "bg-gradient-to-r from-violet-600/30 via-purple-600/20 to-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xl sm:text-2xl font-black scale-[1.03] shadow-lg shadow-violet-500/25 translate-x-2 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                            : "text-zinc-400 hover:text-white hover:bg-white/5 text-base sm:text-lg font-bold opacity-40 hover:opacity-90"
                        }`}
                      >
                        {isActive && <Sparkles size={18} className="text-cyan-400 animate-spin flex-shrink-0" />}
                        <span className="flex-1">{line.text}</span>
                        {isActive && <Sparkles size={18} className="text-cyan-400 animate-spin flex-shrink-0" />}
                      </div>
                    );
                  })}
              </>
            ) : (
              /* Tab About (Thông tin bài hát) */
              <div className="p-4 space-y-6">
                <h3 className="text-2xl font-black text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <Info size={22} className="text-cyan-400" /> Thông tin tác phẩm
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-zinc-400 font-medium">Tên bài hát</p>
                    <p className="text-base font-extrabold text-white mt-1">{currentSong.title}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-zinc-400 font-medium">Nghệ sĩ trình bày</p>
                    <p className="text-base font-extrabold text-cyan-300 mt-1">{currentSong.artist}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-zinc-400 font-medium">Nguồn dữ liệu</p>
                    <p className="text-base font-extrabold text-violet-300 mt-1">
                      {currentSong.source === "audius" ? "Audius Web3 Network" : "Jamendo Independent Music Library"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-zinc-400 font-medium">Thời lượng</p>
                    <p className="text-base font-extrabold text-white mt-1">{formatTime(currentSong.duration)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-400/20 text-xs text-zinc-300 leading-relaxed font-medium">
                  🎵 <strong className="text-white">JamWave Indie Experience:</strong> Bài hát này được phát từ hệ thống âm nhạc tự do, độc lập. Thưởng thức âm nhạc không giới hạn rào cản theo phong cách riêng của bạn.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Integrated Player Bar with Mini Audio Equalizer */}
        <div className="p-4 glass-header border-t border-white/10 flex flex-col gap-2 z-20">
          {/* Mini Soundwave Visualizer above progress bar */}
          <div className="flex items-end justify-center gap-1 h-4 opacity-80 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full bg-gradient-to-t from-violet-500 via-purple-400 to-cyan-400 ${isPlaying ? `equalizer-bar-${(i % 4) + 1}` : "h-1 opacity-30"}`}
                style={{ height: isPlaying ? `${4 + (i % 5) * 3}px` : "3px" }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={playPrevious}
                className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all active:scale-95"
                title="Bài trước"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-violet-500/40 active:scale-95"
                title={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all active:scale-95"
                title="Bài tiếp theo"
              >
                <SkipForward size={20} />
              </button>
            </div>

            <div className="flex-1 max-w-2xl flex items-center gap-3 text-xs text-zinc-400 font-bold">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek && onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-400 hover:accent-cyan-300 transition-all"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
