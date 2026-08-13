import { Play, Clock, Heart, X, Music, ListPlus } from "lucide-react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default function SongTable({ songs, onRemove, onUnlike, emptyText = "Chưa có bài hát nào" }) {
  const user = useAuthStore((s) => s.user);
  const { likedIds, toggleLike } = useLikedSongs();
  const { currentSong, isPlaying, setCurrentSong, togglePlay, addToQueue } = usePlayerStore();

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

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Music size={40} className="text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="grid grid-cols-[20px_1fr_140px] sm:grid-cols-[20px_1fr_1fr_140px] gap-4 px-4 py-3 border-b border-white/10 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <span>#</span>
        <span>Tiêu đề</span>
        <span className="hidden sm:block">Nghệ sĩ</span>
        <span className="flex justify-end pr-2">
          <Clock size={15} />
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
              className={`grid grid-cols-[20px_1fr_140px] sm:grid-cols-[20px_1fr_1fr_140px] gap-4 px-4 py-2.5 rounded-xl items-center group cursor-pointer transition-all duration-200 ${isThisSongSelected
                  ? "bg-violet-500/15 border border-violet-500/30 shadow-md"
                  : "hover:bg-white/[0.06] border border-transparent"
                }`}
            >
              {/* Cột 1: STT / Play-Pause / Equalizer Icon */}
              <div className="text-xs font-semibold text-zinc-400 flex items-center justify-center">
                {isThisSongSelected ? (
                  isPlaying ? (
                    <div className="flex items-center gap-[2px]">
                      <span className="w-[3px] bg-violet-400 rounded-full equalizer-bar-1" />
                      <span className="w-[3px] bg-cyan-400 rounded-full equalizer-bar-2" />
                      <span className="w-[3px] bg-fuchsia-400 rounded-full equalizer-bar-3" />
                    </div>
                  ) : (
                    <Play size={15} fill="#c084fc" className="text-purple-400" />
                  )
                ) : (
                  <>
                    <span className="group-hover:hidden text-zinc-500">{index + 1}</span>
                    <Play size={15} fill="white" className="hidden group-hover:block text-white" />
                  </>
                )}
              </div>

              {/* Cột 2: Ảnh & Tiêu đề bài hát */}
              <div className="flex items-center gap-3 min-w-0">
                <img src={song.albumCover} alt={song.title} loading="lazy" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-md" />
                <div className="truncate flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isThisSongSelected ? "text-cyan-400 font-extrabold" : "text-white group-hover:text-cyan-300 transition-colors"}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate sm:hidden font-medium">{song.artist}</p>
                </div>

                {/* Nút yêu thích + thêm vào hàng chờ */}
                {user && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => handleLike(e, song)}
                      className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
                      title={isLiked ? "Bỏ thích" : "Yêu thích"}
                    >
                      <Heart
                        size={16}
                        className={isLiked ? "text-violet-400 fill-violet-400 drop-shadow-[0_0_8px_#a855f7]" : ""}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                      className="text-zinc-400 hover:text-cyan-400 p-1 rounded-full hover:bg-white/10 transition-all"
                      title="Thêm vào hàng chờ"
                    >
                      <ListPlus size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Cột 3: Nghệ sĩ */}
              <div className="hidden sm:block text-xs font-semibold text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">{song.artist}</div>

              {/* Cột 4: Thời lượng + nút xóa */}
              <div className="text-xs text-zinc-400 font-semibold flex justify-end items-center gap-3 pr-2">
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(song);
                    }}
                    className="text-zinc-500 hover:text-red-400 p-1 rounded-full hover:bg-white/10 transition-colors"
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
