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
      <div className="flex flex-col items-center justify-center py-20 text-center select-none font-sans">
        <Heart size={48} weight="duotone" className="text-[#D97C54] mb-3" />
        <p className="font-serif italic text-lg font-bold text-[#EDE6D6] mb-1">Đăng nhập để xem bài hát đã thích</p>
        <p className="font-mono text-xs text-[#A39282] mb-4">Lưu lại những bài hát bạn yêu thích để nghe lại bất cứ lúc nào</p>
        <Link
          to="/login"
          className="font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] transition-all shadow-md active:scale-95"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (songs === null && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tải bài hát yêu thích...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl indie-panel p-6 sm:p-8 border-dashed-indie shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 relative z-10">
          <div className="w-36 h-36 sm:w-44 sm:h-44 bg-[#B85C38]/20 border border-[#B85C38]/40 rounded-2xl flex items-center justify-center text-[#D97C54] shadow-xl flex-shrink-0">
            <Heart size={64} weight="fill" className="drop-shadow-md text-[#D97C54]" />
          </div>
          <div className="min-w-0 space-y-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#D97C54] px-3.5 py-1 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30">
              Bộ sưu tập cá nhân
            </span>
            <h1 className="font-serif italic font-bold text-3xl sm:text-5xl text-[#EDE6D6]">
              Bản Thu Đã Thích
            </h1>
            <p className="font-mono text-xs text-[#A39282]">
              <span className="tabular-nums font-bold text-[#EDE6D6]">{(songs || []).length}</span> bài hát • Yêu thích bởi <span className="text-[#EDE6D6] font-bold">{user.name}</span>
            </p>

            <button
              onClick={handlePlayAll}
              disabled={!songs || songs.length === 0}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20 mt-3"
              title="Phát tất cả"
            >
              <Play size={20} weight="fill" className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-10 text-center font-sans">
          <p className="font-mono text-sm text-red-400 mb-2">Không thể tải bài hát yêu thích</p>
          <p className="font-mono text-xs text-[#A39282]">{error}</p>
        </div>
      ) : (
        <div className="pt-2">
          <SongTable
            songs={songs || []}
            onUnlike={handleUnlike}
            emptyText="Chưa có bản thu yêu thích nào. Nhấn trái tim trên bản nhạc để lưu vào đây."
          />
        </div>
      )}
    </div>
  );
}
