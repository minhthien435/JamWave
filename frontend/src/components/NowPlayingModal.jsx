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
  CassetteTape,
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

  // Visualizer: animation mô phỏng mượt mà với tông màu Rust & Gold
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
      const bars = 44;
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
        grad.addColorStop(0, "#D97C54");
        grad.addColorStop(0.5, "#E0B35C");
        grad.addColorStop(1, "rgba(184, 92, 56, 0.1)");
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
        setRadioMsg(`Đã thêm ${songs.length} bài tương tự vào hàng phát!`);
        setTimeout(() => setRadioMsg(""), 3500);
      } else {
        setRadioMsg("Không tìm thấy bài hát tương tự phù hợp.");
      }
    } catch {
      setRadioMsg("Không thể tạo danh sách lúc này.");
    } finally {
      setRadioLoading(false);
    }
  };

  const genreText = currentSong.genre || "";

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none overflow-hidden font-sans"
      onClick={onClose}
    >
      <div
        className="relative indie-panel rounded-3xl border-dashed-indie shadow-2xl w-full max-w-md flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A39282] hover:text-[#EDE6D6] p-2 rounded-xl hover:bg-[#2E2721] transition-colors z-10"
          title="Thu nhỏ"
        >
          <X size={18} />
        </button>

        {/* Brand Stamp */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 text-[#D97C54] font-mono text-[10px] uppercase font-bold tracking-[0.18em]">
          <CassetteTape size={13} weight="duotone" />
          JamWave • ĐANG PHÁT
        </div>

        {/* Album art */}
        <div className="relative">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-[#EDE6D6]/15 bg-[#181512]">
            <img
              src={currentSong.albumCover}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Thông tin bài hát */}
        <div className="text-center space-y-0.5 w-full">
          <div className="flex items-center justify-center gap-2 min-w-0 px-2">
            <h3 className="font-serif italic text-lg sm:text-xl font-bold text-[#EDE6D6] truncate">
              {currentSong.title}
            </h3>
            <SourceBadge source={currentSong.source} />
          </div>
          <Link
            to={`/artist/${encodeURIComponent(currentSong.artist)}`}
            onClick={onClose}
            className="font-mono text-xs text-[#A39282] hover:text-[#D97C54] transition-colors inline-block"
          >
            {currentSong.artist}
          </Link>
          <div className="flex items-center justify-center gap-1.5 flex-wrap font-mono text-[10px] text-[#A39282] mt-1">
            {currentSong.releaseYear ? (
              <span className="flex items-center gap-1 bg-[#26211C] border border-[#EDE6D6]/10 px-2 py-0.5 rounded-lg text-[#EDE6D6]">
                <CalendarBlank size={11} className="text-[#E0B35C]" /> {currentSong.releaseYear}
              </span>
            ) : null}
            {genreText ? (
              <span className="flex items-center gap-1 bg-[#26211C] border border-[#EDE6D6]/10 px-2 py-0.5 rounded-lg text-[#EDE6D6]">
                <Tag size={11} className="text-[#D97C54]" /> {genreText}
              </span>
            ) : null}
          </div>
        </div>

        {/* Visualizer sóng âm analog */}
        <div className="w-full max-w-sm bg-[#181512] rounded-xl p-1 border border-[#EDE6D6]/10">
          <canvas ref={canvasRef} className="w-full h-8 sm:h-9" />
        </div>

        {/* Thanh tiến trình */}
        <div className="w-full max-w-sm flex items-center gap-2 font-mono text-[11px] text-[#A39282] tabular-nums">
          <span className="w-8 text-right text-[10px] text-[#A39282]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-[#26211C] rounded-lg appearance-none cursor-pointer accent-[#D97C54] hover:accent-[#B85C38] transition-all"
          />
          <span className="w-8 text-[10px] text-[#A39282]">{formatTime(duration)}</span>
        </div>

        {/* Nút Điều khiển cơ học */}
        <div className="flex items-center gap-5 sm:gap-6 mt-1">
          <button
            onClick={toggleShuffle}
            className={`transition-all duration-150 active:scale-90 ${
              shuffle ? "text-[#D97C54]" : "text-[#8A7B6C] hover:text-[#EDE6D6]"
            }`}
            title={shuffle ? "Tắt phát ngẫu nhiên" : "Phát ngẫu nhiên"}
          >
            <Shuffle size={18} weight={shuffle ? "bold" : "regular"} />
          </button>
          <button
            onClick={playPrevious}
            className="text-[#A39282] hover:text-[#EDE6D6] transition-all active:scale-90"
            title="Bài trước"
          >
            <SkipBack size={22} weight="fill" />
          </button>
          <button
            onClick={togglePlay}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center transition-all active:scale-95 shadow-md border border-[#EDE6D6]/20"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause size={22} weight="fill" />
            ) : (
              <Play size={22} weight="fill" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="text-[#A39282] hover:text-[#EDE6D6] transition-all active:scale-90"
            title="Bài tiếp theo"
          >
            <SkipForward size={22} weight="fill" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`transition-all duration-150 active:scale-90 ${
              repeatMode !== "off" ? "text-[#D97C54]" : "text-[#8A7B6C] hover:text-[#EDE6D6]"
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

        {/* Nút Tạo đài tương tự */}
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <button
            onClick={handleRadio}
            disabled={radioLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60 border border-[#EDE6D6]/15 shadow-sm"
          >
            {radioLoading ? (
              <SpinnerGap size={14} className="animate-spin text-[#D97C54]" />
            ) : (
              <Broadcast size={14} weight="duotone" className="text-[#D97C54]" />
            )}
            Tạo đài tương tự
          </button>
          {radioMsg && (
            <p className="font-mono text-xs text-[#76876F] flex items-center gap-1">
              <CheckCircle size={13} weight="fill" /> {radioMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
