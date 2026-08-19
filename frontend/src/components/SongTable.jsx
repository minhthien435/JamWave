import {
  Play,
  Clock,
  Heart,
  X,
  MusicNotes,
  Queue,
  Broadcast,
  SpinnerGap,
} from "@phosphor-icons/react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { fetchRadio } from "../api/songs";
import { useState } from "react";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function SongTable({ songs, onRemove, onUnlike, emptyText = "Chưa có bài hát nào" }) {
  const user = useAuthStore((s) => s.user);
  const { likedIds, toggleLike } = useLikedSongs();
  const { currentSong, isPlaying, setCurrentSong, togglePlay, addToQueue, setQueue } = usePlayerStore();
  const [radioId, setRadioId] = useState(null);

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

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MusicNotes size={40} weight="duotone" className="text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Table Header */}
      <div className="grid grid-cols-[32px_1fr_120px] sm:grid-cols-[32px_1fr_1fr_120px] gap-4 px-4 py-2.5 border-b border-white/10 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <span>#</span>
        <span>Tiêu đề</span>
        <span className="hidden sm:block">Nghệ sĩ</span>
        <span className="flex justify-end items-center pr-2">
          <Clock size={15} weight="bold" />
        </span>
      </div>

      {/* Table Body / Rows */}
      <div className="divide-y divide-transparent mt-1">
        {songs.map((song, index) => {
          const isThisSongSelected = currentSong?.id === song.id;
          const isLiked = likedIds.has(song.id);

          return (
            <div
              key={`list-${song.id}`}
              onClick={() => handleSelectSong(song)}
              className={`grid grid-cols-[32px_1fr_120px] sm:grid-cols-[32px_1fr_1fr_120px] gap-4 px-4 py-2.5 rounded-xl items-center group cursor-pointer transition-all duration-150 ${
                isThisSongSelected
                  ? "bg-violet-600/15 border border-violet-500/30"
                  : "hover:bg-white/[0.05] border border-transparent"
              }`}
            >
              {/* Cột 1: STT / Play-Pause / Equalizer Icon */}
              <div className="text-xs font-semibold text-zinc-400 flex items-center justify-center tabular-nums">
                {isThisSongSelected ? (
                  isPlaying ? (
                    <div className="flex items-center gap-[2px]">
                      <span className="w-[3px] bg-violet-400 rounded-full equalizer-bar-1" />
                      <span className="w-[3px] bg-purple-400 rounded-full equalizer-bar-2" />
                      <span className="w-[3px] bg-violet-300 rounded-full equalizer-bar-3" />
                    </div>
                  ) : (
                    <Play size={14} weight="fill" className="text-violet-400" />
                  )
                ) : (
                  <>
                    <span className="group-hover:hidden text-zinc-500">{index + 1}</span>
                    <Play size={14} weight="fill" className="hidden group-hover:block text-zinc-200" />
                  </>
                )}
              </div>

              {/* Cột 2: Ảnh & Tiêu đề bài hát */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={song.albumCover}
                  alt={song.title}
                  loading="lazy"
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm"
                />
                <div className="truncate flex-1 min-w-0">
                  <p
                    className={`text-sm truncate font-semibold ${
                      isThisSongSelected
                        ? "text-violet-300 font-bold"
                        : "text-white group-hover:text-violet-200 transition-colors"
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate sm:hidden font-medium mt-0.5">
                    {song.artist}
                  </p>
                </div>

                {/* Nút yêu thích + thêm vào hàng chờ */}
                {user && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => handleLike(e, song)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                      title={isLiked ? "Bỏ thích" : "Yêu thích"}
                    >
                      <Heart
                        size={16}
                        weight={isLiked ? "fill" : "regular"}
                        className={isLiked ? "text-rose-500 fill-rose-500 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]" : ""}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                      title="Thêm vào hàng chờ"
                    >
                      <Queue size={16} weight="duotone" />
                    </button>
                    <button
                      onClick={(e) => handleRadio(e, song)}
                      disabled={radioId === song.id}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                      title="Tạo đài bài tương tự"
                    >
                      {radioId === song.id ? (
                        <SpinnerGap size={16} className="animate-spin text-violet-400" />
                      ) : (
                        <Broadcast size={16} weight="duotone" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Cột 3: Nghệ sĩ */}
              <div className="hidden sm:block text-xs font-medium text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">
                {song.artist}
              </div>

              {/* Cột 4: Thời lượng + nút xóa */}
              <div className="text-xs text-zinc-400 font-medium tabular-nums flex justify-end items-center gap-3 pr-2">
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(song);
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="Xóa khỏi playlist"
                  >
                    <X size={15} />
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
