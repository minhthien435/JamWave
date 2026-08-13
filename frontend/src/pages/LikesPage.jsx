import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Play, Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-zinc-300 font-semibold text-lg mb-3">Đăng nhập để xem bài hát đã thích</p>
        <Link to="/login" className="text-xs font-bold px-5 py-2.5 rounded-full bg-white text-black hover:scale-105 transition">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (songs === null && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Đang tải bài hát yêu thích...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none">
      {/* Header Vibrant Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/70 via-purple-900/40 to-cyan-950/60 p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 relative z-10">
          <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-2xl flex-shrink-0 border border-white/20">
            <Heart size={72} fill="white" className="drop-shadow-lg" />
          </div>
          <div className="min-w-0 space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 px-3.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30">
              Bộ sưu tập cá nhân
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Bài hát đã thích</h1>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              {(songs || []).length} bài hát • Yêu thích bởi <span className="text-white font-bold">{user.name}</span>
            </p>

            <button
              onClick={handlePlayAll}
              disabled={!songs || songs.length === 0}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-lg shadow-violet-500/35 active:scale-95 mt-4"
              title="Phát tất cả"
            >
              <Play size={22} fill="white" className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-red-400 font-semibold mb-2">Không thể tải bài hát yêu thích</p>
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
