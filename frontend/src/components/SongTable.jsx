import {
  Play,
  Clock,
  Heart,
  X,
  Queue,
  Broadcast,
  SpinnerGap,
  Ticket,
  DownloadSimple,
} from "@phosphor-icons/react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { fetchRadio, downloadSong } from "../api/songs";
import { useToast } from "./ToastContext";
import { useState } from "react";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function SongTable({ songs, onRemove, onUnlike, emptyText = "Chưa có bài hát nào trong danh sách" }) {
  const user = useAuthStore((s) => s.user);
  const { likedIds, toggleLike } = useLikedSongs();
  const { currentSong, isPlaying, setCurrentSong, togglePlay, addToQueue, setQueue } = usePlayerStore();
  const toast = useToast();
  const [radioId, setRadioId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleSelectSong = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  const handleLike = async (e, song) => {
    e.stopPropagation();
    if (!user) return;
    if (onUnlike) {
      await onUnlike(song);
    } else {
      await toggleLike(song);
    }
  };

  // Tạo đài từ bài hát: queue = bài hiện tại + các bài tương tự
  const handleRadio = async (e, song) => {
    e.stopPropagation();
    if (radioId) return;
    setRadioId(song.id);
    try {
      const data = await fetchRadio(song.id, 30);
      const radio = data.songs || [];
      if (radio.length === 0) return;
      setQueue([song, ...radio]);
      setCurrentSong(song);
    } catch (err) {
      console.error("Lỗi tạo đài:", err.message);
    } finally {
      setRadioId(null);
    }
  };

  // Tải bài hát về máy (proxy qua backend để tránh CORS từ nguồn ngoài)
  const handleDownload = async (e, song) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(song.id);
    try {
      await downloadSong(song.id, `${song.title} - ${song.artist}.mp3`);
    } catch (err) {
      toast?.error?.(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed-indie rounded-2xl p-6 bg-[#221D18]/50">
        <Ticket size={40} weight="duotone" className="text-[#8A7B6C] mb-3" />
        <p className="font-mono text-xs text-[#A39282]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="w-full select-none font-sans">
      {/* Table Header dạng Stamped Labels */}
      <div className="grid grid-cols-[36px_1fr_120px] sm:grid-cols-[36px_1fr_1fr_120px] gap-4 px-4 py-2 border-b border-dashed-indie font-mono text-[10px] font-bold text-[#8A7B6C] uppercase tracking-[0.14em]">
        <span>#NO</span>
        <span>BÀI HÁT / GIAI ĐIỆU</span>
        <span className="hidden sm:block">NGHỆ SĨ</span>
        <span className="flex justify-end items-center pr-2">
          <Clock size={13} weight="bold" />
        </span>
      </div>

      {/* Table Body / Ticket Stub Rows */}
      <div className="flex flex-col gap-1.5 mt-2">
        {songs.map((song, index) => {
          const isThisSongSelected = currentSong?.id === song.id;
          const isLiked = likedIds.has(song.id);
          const trackNum = index + 1 < 10 ? `0${index + 1}` : `${index + 1}`;

          return (
            <div
              key={`list-${song.id}`}
              onClick={() => handleSelectSong(song)}
              className={`ticket-row grid grid-cols-[36px_1fr_120px] sm:grid-cols-[36px_1fr_1fr_120px] gap-4 px-4 py-2.5 rounded-xl items-center group cursor-pointer ${
                isThisSongSelected
                  ? "bg-[#2E2721] border-[#D97C54] shadow-md shadow-black/40"
                  : ""
              }`}
            >
              {/* Cột 1: STT Typewriter Mono / Play Icon */}
              <div className="font-mono text-xs font-bold text-[#D97C54] flex items-center justify-center">
                {isThisSongSelected ? (
                  isPlaying ? (
                    <div className="w-4 h-4 rounded-full border border-[#D97C54] flex items-center justify-center reel-spinning">
                      <div className="w-1 h-1 rounded-full bg-[#D97C54]" />
                    </div>
                  ) : (
                    <Play size={13} weight="fill" className="text-[#D97C54]" />
                  )
                ) : (
                  <>
                    <span className="group-hover:hidden text-[#8A7B6C]">{trackNum}</span>
                    <Play size={13} weight="fill" className="hidden group-hover:block text-[#EDE6D6]" />
                  </>
                )}
              </div>

              {/* Cột 2: Ảnh Mini Polaroid & Tiêu đề bài hát */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 p-0.5 bg-[#28221D] border border-[#EDE6D6]/15 rounded flex-shrink-0 shadow-sm">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full rounded object-cover"
                  />
                </div>
                <div className="truncate flex-1 min-w-0">
                  <p
                    className={`font-serif italic text-sm truncate ${
                      isThisSongSelected
                        ? "text-[#D97C54] font-semibold"
                        : "text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors"
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="font-mono text-[10px] text-[#A39282] truncate sm:hidden mt-0.5">
                    {song.artist}
                  </p>
                </div>

                {/* Nút yêu thích + thêm vào hàng chờ */}
                {user && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => handleLike(e, song)}
                      className="text-[#8A7B6C] hover:text-[#D97C54] p-1.5 rounded-lg hover:bg-[#2E2721] transition-all"
                      title={isLiked ? "Bỏ thích" : "Yêu thích"}
                    >
                      <Heart
                        size={15}
                        weight={isLiked ? "fill" : "regular"}
                        className={isLiked ? "text-[#D97C54] fill-[#D97C54] filter drop-shadow-[0_0_5px_rgba(217,124,84,0.4)]" : ""}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                      className="text-[#8A7B6C] hover:text-[#EDE6D6] p-1.5 rounded-lg hover:bg-[#2E2721] transition-all"
                      title="Thêm vào hàng chờ"
                    >
                      <Queue size={15} weight="duotone" />
                    </button>
                    <button
                      onClick={(e) => handleRadio(e, song)}
                      disabled={radioId === song.id}
                      className="text-[#8A7B6C] hover:text-[#EDE6D6] p-1.5 rounded-lg hover:bg-[#2E2721] transition-all"
                      title="Tạo đài bài tương tự"
                    >
                      {radioId === song.id ? (
                        <SpinnerGap size={15} className="animate-spin text-[#D97C54]" />
                      ) : (
                        <Broadcast size={15} weight="duotone" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDownload(e, song)}
                      disabled={downloadingId === song.id}
                      className="text-[#8A7B6C] hover:text-[#EDE6D6] p-1.5 rounded-lg hover:bg-[#2E2721] transition-all"
                      title="Tải bài hát (mp3)"
                    >
                      {downloadingId === song.id ? (
                        <SpinnerGap size={15} className="animate-spin text-[#D97C54]" />
                      ) : (
                        <DownloadSimple size={15} weight="duotone" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Cột 3: Nghệ sĩ */}
              <div className="hidden sm:block font-mono text-xs text-[#A39282] truncate group-hover:text-[#EDE6D6] transition-colors">
                {song.artist}
              </div>

              {/* Cột 4: Thời lượng + nút xóa */}
              <div className="font-mono text-xs text-[#8A7B6C] flex justify-end items-center gap-3 pr-2">
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(song);
                    }}
                    className="text-[#8A7B6C] hover:text-red-400 p-1 rounded-lg hover:bg-[#2E2721] transition-colors"
                    title="Xóa khỏi playlist"
                  >
                    <X size={14} />
                  </button>
                )}
                <span>{formatDuration(song.duration)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
