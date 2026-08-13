import { useRef, useEffect, useState } from "react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { recordListen } from "../api/listens";
import SourceBadge from "./SourceBadge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  Mic2,
  X,
} from "lucide-react";
import LyricsModal from "./LyricsModal";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    volume,
    setVolume,
    playNext,
    playPrevious,
    repeatMode,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    queue,
    removeFromQueue,
    setCurrentSong,
  } = usePlayerStore();

  const user = useAuthStore((s) => s.user);
  const { likedIds, toggleLike } = useLikedSongs();

  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [queueOpen, setQueueOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const retryCountRef = useRef(0);

  // Điều khiển play / pause khi currentSong hoặc isPlaying thay đổi
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    retryCountRef.current = 0; // reset số lần thử lại khi đổi bài

    if (isPlaying) {
      audioRef.current.play().catch((err) => console.log("Autoplay blocked:", err));
    } else {
      audioRef.current.pause();
    }
  }, [currentSong, isPlaying]);

  // Ghi nhận lượt nghe khi chuyển sang bài mới (chỉ khi đăng nhập)
  useEffect(() => {
    if (!currentSong) return;
    if (!user) return;
    recordListen(currentSong.id).catch(() => { });
  }, [currentSong, user]);

  // Mở lyrics đồng bộ từ AI Chat (sự kiện jamwave:open-lyrics)
  useEffect(() => {
    const openLyrics = () => setShowLyrics(true);
    window.addEventListener("jamwave:open-lyrics", openLyrics);
    return () => window.removeEventListener("jamwave:open-lyrics", openLyrics);
  }, []);

  // Cập nhật âm lượng cho thẻ audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Khi phát xong: repeat 1 -> phát lại, ngược lại chuyển bài kế tiếp
  const handleEnded = () => {
    if (repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { });
      return;
    }
    playNext();
  };

  // Khi tải bài thất bại (CDN lỗi / timeout): thử lại 1 lần, rồi nhảy bài kế tiếp
  const handleAudioError = () => {
    if (!audioRef.current || !currentSong) return;

    if (retryCountRef.current < 1) {
      retryCountRef.current += 1;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => { });
      }
      return;
    }

    console.log("Không phát được bài:", currentSong.title, "- nhảy bài kế tiếp");
    playNext();
  };

  // Cập nhật thời gian phát
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Cập nhật tổng thời lượng nhạc
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Tua nhạc (Seek)
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Thay đổi âm lượng
  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
  };

  // Nút Mute / Unmute
  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  const handleLike = async () => {
    if (!user || !currentSong) return;
    await toggleLike(currentSong);
  };

  if (!currentSong) return null; // Nếu chưa chọn bài hát nào thì giấu Player Bar

  const isLiked = currentSong ? likedIds.has(currentSong.id) : false;

  return (
    <div className="fixed bottom-3 left-3 right-3 h-20 glass-player rounded-2xl text-white px-5 flex items-center justify-between z-40 select-none border border-white/15 transition-all duration-300">
      {/* Audio Element Ẩn */}
      <audio
        ref={audioRef}
        src={currentSong.audioURL || currentSong.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
      />

      {/* Thông tin bài hát bên trái + Animated Equalizer */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-0">
        <div className="relative group flex-shrink-0">
          <img
            src={currentSong.albumCover}
            alt={currentSong.title}
            className={`w-14 h-14 rounded-xl object-cover shadow-lg transition-transform duration-300 ${isPlaying ? "scale-105 shadow-violet-500/30" : ""}`}
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center gap-1 backdrop-blur-[2px]">
              <span className="w-1 bg-violet-400 rounded-full equalizer-bar-1" />
              <span className="w-1 bg-cyan-400 rounded-full equalizer-bar-2" />
              <span className="w-1 bg-fuchsia-400 rounded-full equalizer-bar-3" />
            </div>
          )}
        </div>

        <div className="truncate min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-bold text-sm truncate hover:text-violet-400 transition-colors cursor-pointer text-zinc-100">
              {currentSong.title}
            </p>
            <SourceBadge source={currentSong.source} />
          </div>
          <p className="text-xs text-zinc-400 truncate hover:text-zinc-200 transition-colors cursor-pointer mt-0.5 font-medium">
            {currentSong.artist}
          </p>
        </div>

        {/* Nút yêu thích bài đang phát */}
        {user && (
          <button
            onClick={handleLike}
            className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 ml-1 p-1 rounded-full hover:bg-white/10"
            title={isLiked ? "Bỏ thích" : "Yêu thích"}
          >
            <Heart size={18} className={isLiked ? "text-violet-400 fill-violet-400 drop-shadow-[0_0_8px_#a855f7]" : ""} />
          </button>
        )}
      </div>

      {/* Nút điều khiển ở giữa & Thanh tiến trình */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        {/* Nút Skip / Play */}
        <div className="flex items-center gap-6">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`transition-all duration-200 active:scale-90 ${shuffle ? "text-violet-400 drop-shadow-[0_0_8px_#a855f7]" : "text-zinc-400 hover:text-white"
              }`}
            title={shuffle ? "Tắt phát ngẫu nhiên" : "Phát ngẫu nhiên"}
          >
            <Shuffle size={17} />
          </button>

          <button
            onClick={playPrevious}
            className="text-zinc-400 hover:text-white transition-all duration-200 active:scale-90 hover:scale-110"
            title="Bài trước"
          >
            <SkipBack size={19} />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white flex items-center justify-center hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg shadow-violet-500/40"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? <Pause size={19} fill="white" /> : <Play size={19} fill="white" className="ml-0.5" />}
          </button>

          <button
            onClick={playNext}
            className="text-zinc-400 hover:text-white transition-all duration-200 active:scale-90 hover:scale-110"
            title="Bài tiếp theo"
          >
            <SkipForward size={19} />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`transition-all duration-200 active:scale-90 ${repeatMode !== "off" ? "text-violet-400 drop-shadow-[0_0_8px_#a855f7]" : "text-zinc-400 hover:text-white"
              }`}
            title={repeatMode === "one" ? "Lặp 1 bài" : repeatMode === "all" ? "Lặp danh sách" : "Tắt lặp"}
          >
            {repeatMode === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Progress Bar (Tua nhạc) */}
        <div className="w-full flex items-center gap-3 text-xs text-zinc-400 font-semibold tracking-tight">
          <span className="w-10 text-right text-[11px] text-zinc-400">{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-400 hover:accent-cyan-300 transition-all"
            />
          </div>
          <span className="w-10 text-[11px] text-zinc-400">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Âm lượng bên phải + Hàng chờ + Lyrics */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 text-zinc-400 relative">
        <button
          onClick={() => setShowLyrics((show) => !show)}
          className={`relative hover:text-white transition-all duration-200 p-2 rounded-xl hover:bg-white/10 active:scale-95 ${showLyrics ? "text-cyan-300 bg-white/15 drop-shadow-[0_0_10px_#38bdf8]" : ""
            }`}
          title="Lời bài hát"
        >
          <Mic2 size={19} />
        </button>

        <button
          onClick={() => setQueueOpen((open) => !open)}
          className={`relative hover:text-white transition-all duration-200 p-2 rounded-xl hover:bg-white/10 active:scale-95 ${queueOpen ? "text-violet-400 bg-white/10" : ""
            }`}
          title="Hàng chờ phát"
        >
          <ListMusic size={19} />
          {queue.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-md">
              {queue.length}
            </span>
          )}
        </button>

        <button onClick={toggleMute} className="hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
          {volume === 0 ? <VolumeX size={19} className="text-red-400" /> : <Volume2 size={19} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-400 hover:accent-cyan-300 transition-all"
        />
      </div>

      {/* Popover Hàng chờ Gọn Gàng Solid (Không dùng glassmorphism, width 280px) */}
      {queueOpen && (
        <div className="absolute bottom-24 right-24 w-72 max-h-[380px] bg-[#14121d] rounded-2xl shadow-2xl border border-violet-500/30 overflow-hidden flex flex-col z-40 select-none">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-violet-500/20 bg-[#1a1727]">
            <h4 className="font-bold text-xs text-white flex items-center gap-2">
              <ListMusic size={15} className="text-cyan-400" />
              Hàng chờ phát ({queue.length} bài)
            </h4>
            <button
              onClick={() => setQueueOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              title="Đóng"
            >
              <X size={15} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {queue.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6 font-medium">Hàng chờ hiện tại đang trống</p>
            ) : (
              queue.map((song) => {
                const isCurrent = song.id === currentSong?.id;
                return (
                  <div
                    key={`${song.id}-${song.title}`}
                    onClick={() => {
                      setCurrentSong(song);
                      setQueueOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 ${isCurrent
                        ? "bg-violet-600/30 text-cyan-300 border border-violet-500/40 font-bold"
                        : "hover:bg-white/5 text-zinc-200"
                      }`}
                  >
                    <img src={song.albumCover} alt={song.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow" />
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className={`text-xs truncate ${isCurrent ? "text-cyan-300 font-bold" : "font-semibold"}`}>{song.title}</p>
                        <SourceBadge source={song.source} />
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate font-medium">{song.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(song.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors flex-shrink-0"
                      title="Xóa khỏi hàng chờ"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Lyrics Overlay Modal */}
      {showLyrics && (
        <LyricsModal
          key={currentSong.id}
          currentSong={currentSong}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          playNext={playNext}
          playPrevious={playPrevious}
          currentTime={currentTime}
          duration={duration}
          onSeek={(newTime) => {
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }
          }}
          onClose={() => setShowLyrics(false)}
        />
      )}
    </div>
  );
}
