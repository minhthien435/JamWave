import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  RepeatOnce,
  Shuffle,
  Broadcast,
  SpinnerGap,
  CalendarBlank,
  Tag,
  CheckCircle,
} from "@phosphor-icons/react";
import { usePlayerStore } from "../usePlayerStore";
import { getAudioElement } from "../audioElement";
import { fetchRadio } from "../api/songs";
import SourceBadge from "./SourceBadge";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function NowPlayingModal({ currentSong, onClose }) {
  const {
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    repeatMode,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    setQueue,
  } = usePlayerStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioMsg, setRadioMsg] = useState("");
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Visualizer: animation mô phỏng mượt mà (không dùng WebAudio tránh CORS issue)
  useEffect(() => {
    const audio = getAudioElement();
    const onTime = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };

    if (audio) {
      audio.addEventListener("timeupdate", onTime);
      audio.addEventListener("loadedmetadata", onTime);
      onTime();
    }

    const canvas = canvasRef.current;
    let ctx2d = null;
    if (canvas) {
      ctx2d = canvas.getContext("2d");
      const bars = 48;
      const draw = () => {
        rafRef.current = requestAnimationFrame(draw);
        if (!canvas || !ctx2d) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d.clearRect(0, 0, w, h);

        const playing = usePlayerStore.getState().isPlaying;
        const t = audio?.currentTime || 0;
        const grad = ctx2d.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#8b5cf6");
        grad.addColorStop(1, "rgba(124, 58, 237, 0.15)");
        ctx2d.fillStyle = grad;

        const bw = (w / bars) * 0.55;
        const gap = (w / bars) * 0.45;

        for (let i = 0; i < bars; i++) {
          let bh;
          if (playing) {
            const wave = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 0.55);
            const rand = 0.75 + Math.sin(i * 12.9898 + t * 7.1) * 0.25;
            bh = 4 + wave * rand * (h - 8);
          } else {
            bh = 3 + Math.abs(Math.sin(i * 0.4)) * 3;
          }
          const x = i * (bw + gap);
          const y = h - bh;
          ctx2d.beginPath();
          ctx2d.roundRect(x, y, bw, bh, 2);
          ctx2d.fill();
        }
      };
      draw();
    }

    return () => {
      if (audio) {
        audio.removeEventListener("timeupdate", onTime);
        audio.removeEventListener("loadedmetadata", onTime);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSeek = (e) => {
    const audio = getAudioElement();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audio) audio.currentTime = time;
  };

  const handleRadio = async () => {
    if (radioLoading || !currentSong) return;
    setRadioLoading(true);
    setRadioMsg("");
    try {
      const data = await fetchRadio(currentSong.id, 30);
      const songs = data.songs || [];
      if (songs.length > 0) {
        setQueue([currentSong, ...songs]);
        setRadioMsg(`Đã tạo đài với ${songs.length} bài tương tự!`);
        setTimeout(() => setRadioMsg(""), 3500);
      } else {
        setRadioMsg("Không tìm thấy bài hát tương tự phù hợp.");
      }
    } catch {
      setRadioMsg("Không thể tạo đài lúc này.");
    } finally {
      setRadioLoading(false);
    }
  };

  const genreText = currentSong.genre || "";

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-[#14141c] rounded-3xl border border-white/10 shadow-2xl w-full max-w-lg flex flex-col items-center gap-4 sm:gap-5 p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
          title="Đóng"
        >
          <X size={20} />
        </button>

        {/* Album art */}
        <div className="relative mt-2">
          <img
            src={currentSong.albumCover}
            alt={currentSong.title}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl border border-white/10"
          />
        </div>

        {/* Thông tin bài hát */}
        <div className="text-center space-y-1 w-full mt-1">
          <div className="flex items-center justify-center gap-2 min-w-0 px-4">
            <h3 className="text-lg sm:text-xl font-black text-white truncate">{currentSong.title}</h3>
            <SourceBadge source={currentSong.source} />
          </div>
          <Link
            to={`/artist/${encodeURIComponent(currentSong.artist)}`}  
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-violet-300 transition-colors inline-block"
          >
            {currentSong.artist}
          </Link>
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] font-medium text-zinc-400 mt-1">
            {currentSong.releaseYear ? (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                <CalendarBlank size={12} /> {currentSong.releaseYear}
              </span>
            ) : null}
            {genreText ? (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                <Tag size={12} /> {genreText}
              </span>
            ) : null}
          </div>
        </div>

        {/* Visualizer */}
        <canvas ref={canvasRef} className="w-full max-w-md h-12 sm:h-14 my-1" />

        {/* Thanh tiến trình */}
        <div className="w-full max-w-md flex items-center gap-2.5 text-xs text-zinc-400 font-medium tabular-nums">
          <span className="w-9 text-right text-[11px]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400 transition-all"
          />
          <span className="w-9 text-[11px]">{formatTime(duration)}</span>
        </div>

        {/* Điều khiển */}
        <div className="flex items-center gap-5 sm:gap-6 mt-1">
          <button
            onClick={toggleShuffle}
            className={`transition-all duration-150 active:scale-90 ${
              shuffle ? "text-violet-400" : "text-zinc-400 hover:text-white"
            }`}
            title={shuffle ? "Tắt phát ngẫu nhiên" : "Phát ngẫu nhiên"}
          >
            <Shuffle size={18} weight={shuffle ? "bold" : "regular"} />
          </button>
          <button
            onClick={playPrevious}
            className="text-zinc-400 hover:text-white transition-all active:scale-90"
            title="Bài trước"
          >
            <SkipBack size={22} weight="fill" />
          </button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center hover:scale-105 transition-all active:scale-95 shadow-md shadow-violet-950/60"
          >
            {isPlaying ? (
              <Pause size={22} weight="fill" />
            ) : (
              <Play size={22} weight="fill" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="text-zinc-400 hover:text-white transition-all active:scale-90"
            title="Bài tiếp theo"
          >
            <SkipForward size={22} weight="fill" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`transition-all duration-150 active:scale-90 ${
              repeatMode !== "off" ? "text-violet-400" : "text-zinc-400 hover:text-white"
            }`}
            title={repeatMode === "one" ? "Lặp 1 bài" : repeatMode === "all" ? "Lặp danh sách" : "Tắt lặp"}
          >
            {repeatMode === "one" ? (
              <RepeatOnce size={18} weight="bold" />
            ) : (
              <Repeat size={18} weight={repeatMode === "all" ? "bold" : "regular"} />
            )}
          </button>
        </div>

        {/* Radio */}
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <button
            onClick={handleRadio}
            disabled={radioLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-60 border border-white/10"
          >
            {radioLoading ? (
              <SpinnerGap size={14} className="animate-spin text-violet-400" />
            ) : (
              <Broadcast size={14} weight="duotone" />
            )}
            Tạo đài tương tự
          </button>
          {radioMsg && (
            <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle size={13} weight="fill" /> {radioMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
