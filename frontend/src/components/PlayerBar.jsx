import { useRef, useEffect, useState } from "react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { recordListen } from "../api/listens";
import { setAudioElement } from "../audioElement";
import SourceBadge from "./SourceBadge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSimpleX,
  Shuffle,
  Repeat,
  RepeatOnce,
  Heart,
  Queue,
  CornersOut,
  X,
} from "@phosphor-icons/react";
import NowPlayingModal from "./NowPlayingModal";

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
    resumeTime,
    setResumeTime,
  } = usePlayerStore();

  const user = useAuthStore((s) => s.user);
  const { likedIds, toggleLike } = useLikedSongs();

  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [queueOpen, setQueueOpen] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const retryCountRef = useRef(0);
  const recordedSongRef = useRef(null); // bài đã ghi lượt nghe
  const resumeAppliedRef = useRef(false); // đã seek về vị trí lưu chưa
  const lastSavedTimeRef = useRef(0); // throttle lưu vị trí phát
  const lastUiUpdateRef = useRef(0); // throttle re-render progress bar

  // Đăng ký thẻ audio cho NowPlayingModal (visualizer / seek)
  useEffect(() => {
    setAudioElement(audioRef.current);
  }, []);

  // Điều khiển play / pause khi currentSong hoặc isPlaying thay đổi
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    retryCountRef.current = 0; // reset số lần thử lại khi đổi bài
    recordedSongRef.current = null; // bài mới -> chưa ghi lượt nghe
    resumeAppliedRef.current = false; // chờ metadata để resume

    if (isPlaying) {
      audioRef.current.play().catch((err) => console.log("Autoplay blocked:", err));
    } else {
      audioRef.current.pause();
    }
  }, [currentSong, isPlaying]);

  // Resume vị trí phát khi bài được khôi phục từ localStorage (reload trang)
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (resumeAppliedRef.current) return;
    if (resumeTime > 5) {
      const waitForMetadata = () => {
        if (!audioRef.current) return;
        resumeAppliedRef.current = true;
        const dur = audioRef.current.duration || duration;
        const target = Math.min(resumeTime, Math.max(dur - 5, 0));
        audioRef.current.currentTime = target;
        setCurrentTime(target);
      };
      if (audioRef.current.readyState >= 1) {
        waitForMetadata();
      } else {
        audioRef.current.addEventListener("loadedmetadata", waitForMetadata, { once: true });
      }
    } else {
      resumeAppliedRef.current = true;
    }
  }, [currentSong, resumeTime, duration]);

  // Ghi nhận lượt nghe khi bài thật sự bắt đầu phát (không ghi khi reload trang)
  const handlePlay = () => {
    if (!currentSong || !user) return;
    if (recordedSongRef.current === currentSong.id) return;
    recordedSongRef.current = currentSong.id;
    recordListen(currentSong.id).catch(() => { });
  };

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

  // Cập nhật thời gian phát + lưu vị trí để resume (throttle UI 1 giây, lưu resume 5 giây)
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    const now = performance.now();
    if (now - lastUiUpdateRef.current >= 1000) {
      lastUiUpdateRef.current = now;
      setCurrentTime(t);
    }
    if (Math.abs(t - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = t;
      setResumeTime(t);
    }
  };

  // Tạm dừng / hết bài: lưu vị trí ngay
  const handlePause = () => {
    if (audioRef.current) {
      lastSavedTimeRef.current = audioRef.current.currentTime;
      setResumeTime(audioRef.current.currentTime);
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
    <div className="fixed bottom-3 left-3 right-3 h-20 cassette-player rounded-2xl text-[#EDE6D6] px-5 flex items-center justify-between z-40 select-none border border-[#EDE6D6]/10 transition-all duration-300 font-sans shadow-2xl">
      {/* Audio Element Ẩn */}
      <audio
        ref={audioRef}
        src={currentSong.audioURL || currentSong.audioUrl}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
      />

      {/* Thông tin bài hát bên trái: Polaroid Mini Frame & Title */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-0">
        <div className="relative group flex-shrink-0">
          <div className="w-[50px] h-[50px] p-1 bg-[#28221D] border border-[#EDE6D6]/20 rounded-lg shadow-md">
            <img
              src={currentSong.albumCover}
              alt={currentSong.title}
              className="w-full h-full rounded object-cover"
            />
          </div>
        </div>

        <div className="truncate min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-serif italic font-semibold text-sm truncate hover:text-[#D97C54] transition-colors cursor-pointer text-[#EDE6D6]">
              {currentSong.title}
            </p>
            <SourceBadge source={currentSong.source} />
          </div>
          <p className="font-mono text-[11px] text-[#A39282] truncate hover:text-[#EDE6D6] transition-colors cursor-pointer mt-0.5">
            {currentSong.artist}
          </p>
        </div>

        {/* Nút yêu thích bài đang phát */}
        {user && (
          <button
            onClick={handleLike}
            className="text-[#8A7B6C] hover:text-[#D97C54] transition-colors flex-shrink-0 ml-1 p-1 rounded-lg hover:bg-[#26211C]"
            title={isLiked ? "Bỏ thích" : "Yêu thích"}
          >
            <Heart
              size={18}
              weight={isLiked ? "fill" : "regular"}
              className={isLiked ? "text-[#D97C54] fill-[#D97C54] filter drop-shadow-[0_0_6px_rgba(217,124,84,0.5)]" : ""}
            />
          </button>
        )}
      </div>

      {/* Nút điều khiển ở giữa & Bánh răng Cassette xoay tròn */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        {/* Cassette Tape Reel Window & Controls */}
        <div className="flex items-center gap-5">
          {/* Reel Left */}
          <div
            className={`w-5 h-5 rounded-full border border-[#D4A24C]/60 flex items-center justify-center reel-spinning ${
              !isPlaying ? "paused" : ""
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A24C]" />
          </div>

          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`transition-all duration-150 active:scale-90 ${
              shuffle ? "text-[#D97C54]" : "text-[#8A7B6C] hover:text-[#EDE6D6]"
            }`}
            title={shuffle ? "Tắt phát ngẫu nhiên" : "Phát ngẫu nhiên"}
          >
            <Shuffle size={16} weight={shuffle ? "bold" : "regular"} />
          </button>

          {/* Skip Back */}
          <button
            onClick={playPrevious}
            className="text-[#A39282] hover:text-[#EDE6D6] transition-all duration-150 active:scale-90"
            title="Bài trước"
          >
            <SkipBack size={19} weight="fill" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center transition-all duration-150 active:scale-95 shadow-md border border-[#EDE6D6]/20"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause size={18} weight="fill" />
            ) : (
              <Play size={18} weight="fill" className="ml-0.5" />
            )}
          </button>

          {/* Skip Next */}
          <button
            onClick={playNext}
            className="text-[#A39282] hover:text-[#EDE6D6] transition-all duration-150 active:scale-90"
            title="Bài tiếp theo"
          >
            <SkipForward size={19} weight="fill" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`transition-all duration-150 active:scale-90 ${
              repeatMode !== "off" ? "text-[#D97C54]" : "text-[#8A7B6C] hover:text-[#EDE6D6]"
            }`}
            title={repeatMode === "one" ? "Lặp 1 bài" : repeatMode === "all" ? "Lặp danh sách" : "Tắt lặp"}
          >
            {repeatMode === "one" ? (
              <RepeatOnce size={16} weight="bold" />
            ) : (
              <Repeat size={16} weight={repeatMode === "all" ? "bold" : "regular"} />
            )}
          </button>

          {/* Reel Right */}
          <div
            className={`w-5 h-5 rounded-full border border-[#D4A24C]/60 flex items-center justify-center reel-spinning ${
              !isPlaying ? "paused" : ""
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A24C]" />
          </div>
        </div>

        {/* Progress Bar (Thanh chỉ băng 3px màu Rust) */}
        <div className="w-full flex items-center gap-3 text-xs text-[#A39282] font-mono tracking-tight">
          <span className="w-10 text-right text-[11px] tabular-nums text-[#A39282]">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-[#2E2721] rounded appearance-none cursor-pointer accent-[#D97C54] hover:accent-[#E0B35C] transition-all"
            />
          </div>
          <span className="w-10 text-[11px] tabular-nums text-[#A39282]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Âm lượng bên phải + Hàng chờ + Now Playing */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 text-[#A39282] relative font-mono">
        <button
          onClick={() => setShowNowPlaying((show) => !show)}
          className={`relative hover:text-[#EDE6D6] transition-all duration-150 p-2 rounded-xl hover:bg-[#26211C] active:scale-95 ${
            showNowPlaying ? "text-[#D97C54] bg-[#26211C]" : ""
          }`}
          title="Màn hình phát nhạc"
        >
          <CornersOut size={18} weight="duotone" />
        </button>

        <button
          onClick={() => setQueueOpen((open) => !open)}
          className={`relative hover:text-[#EDE6D6] transition-all duration-150 p-2 rounded-xl hover:bg-[#26211C] active:scale-95 ${
            queueOpen ? "text-[#D97C54] bg-[#26211C]" : ""
          }`}
          title="Hàng chờ phát"
        >
          <Queue size={18} weight="duotone" />
          {queue.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B85C38] text-[#EDE6D6] text-[9px] font-mono font-bold tabular-nums flex items-center justify-center shadow-sm">
              {queue.length}
            </span>
          )}
        </button>

        <button onClick={toggleMute} className="hover:text-[#EDE6D6] transition-colors p-1 rounded-lg hover:bg-[#26211C]">
          {volume === 0 ? <SpeakerSimpleX size={18} className="text-[#8A7B6C]" /> : <SpeakerHigh size={18} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-[#2E2721] rounded appearance-none cursor-pointer accent-[#D97C54] hover:accent-[#E0B35C] transition-all"
        />
      </div>

      {/* Popover Hàng chờ dạng Zine Ticket */}
      {queueOpen && (
        <div className="absolute bottom-24 right-6 w-80 max-h-[390px] indie-panel rounded-2xl shadow-2xl border border-[#EDE6D6]/20 overflow-hidden flex flex-col z-40 select-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dashed-indie bg-[#26211C]">
            <h4 className="font-mono font-bold text-xs text-[#EDE6D6] flex items-center gap-2">
              <Queue size={15} weight="duotone" className="text-[#D97C54]" />
              HÀNG CHỜ PHÁT ({queue.length})
            </h4>
            <button
              onClick={() => setQueueOpen(false)}
              className="text-[#A39282] hover:text-[#EDE6D6] p-1 rounded-lg hover:bg-[#2E2721] transition-colors"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {queue.length === 0 ? (
              <p className="font-mono text-xs text-[#8A7B6C] text-center py-8 font-medium">Hàng chờ đang trống</p>
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
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
                      isCurrent
                        ? "bg-[#B85C38]/20 text-[#D97C54] border border-[#B85C38]/30 font-bold"
                        : "hover:bg-[#26211C] text-[#EDE6D6]"
                    }`}
                  >
                    <img src={song.albumCover} alt={song.title} className="w-8 h-8 rounded object-cover flex-shrink-0 shadow" />
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className={`font-serif italic text-xs truncate ${isCurrent ? "text-[#D97C54] font-bold" : ""}`}>{song.title}</p>
                        <SourceBadge source={song.source} />
                      </div>
                      <p className="font-mono text-[10px] text-[#A39282] truncate">{song.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(song.id);
                      }}
                      className="text-[#8A7B6C] hover:text-red-400 p-1 rounded transition-colors flex-shrink-0"
                      title="Xóa khỏi hàng chờ"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Now Playing Overlay Modal */}
      {showNowPlaying && currentSong && (
        <NowPlayingModal
          key={currentSong.id}
          currentSong={currentSong}
          onClose={() => setShowNowPlaying(false)}
        />
      )}
    </div>
  );
}
