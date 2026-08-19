import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Play, SpinnerGap } from "@phosphor-icons/react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import SongTable from "../components/SongTable";
import { fetchLikedSongs } from "../api/likes";

export default function LikesPage() {
  const user = useAuthStore((s) => s.user);
  const { toggleLike } = useLikedSongs();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const [songs, setSongs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetchLikedSongs()
      .then((data) => {
        if (cancelled) return;
        setSongs(data.songs || []);
        setQueue(data.songs || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setSongs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user, setQueue]);

  // Khi bỏ thích từ trang này thì xóa luôn khỏi danh sách hiển thị
  const handleUnlike = async (song) => {
    const ok = await toggleLike(song);
    if (ok) {
      setSongs((prev) => (prev ? prev.filter((s) => s.id !== song.id) : prev));
    }
  };

  const handlePlayAll = () => {
    if (!songs || songs.length === 0) return;
    setCurrentSong(songs[0]);
  };

  // Chưa đăng nhập
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center select-none">
        <Heart size={48} weight="duotone" className="text-violet-400 mb-3" />
        <p className="text-zinc-200 font-bold text-lg mb-1">Đăng nhập để xem bài hát đã thích</p>
        <p className="text-zinc-400 text-xs mb-4">Lưu lại những bài hát bạn yêu thích để nghe lại bất cứ lúc nào</p>
        <Link
          to="/login"
          className="text-xs font-bold px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-950/50"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (songs === null && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải bài hát yêu thích...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14141c] p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 relative z-10">
          <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-950/50 flex-shrink-0 border border-white/10">
            <Heart size={72} weight="fill" className="drop-shadow-lg text-white" />
          </div>
          <div className="min-w-0 space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-rose-300 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30">
              Bộ sưu tập cá nhân
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Bài hát đã thích</h1>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              <span className="tabular-nums">{(songs || []).length}</span> bài hát • Yêu thích bởi <span className="text-white font-bold">{user.name}</span>
            </p>

            <button
              onClick={handlePlayAll}
              disabled={!songs || songs.length === 0}
              className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-md shadow-rose-950/60 active:scale-95 mt-4"
              title="Phát tất cả"
            >
              <Play size={22} weight="fill" className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-rose-400 font-semibold mb-2">Không thể tải bài hát yêu thích</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="pt-2">
          <SongTable
            songs={songs || []}
            onUnlike={handleUnlike}
            emptyText="Chưa có bài hát yêu thích nào. Nhấn trái tim trên bài hát để thêm vào đây."
          />
        </div>
      )}
    </div>
  );
}
