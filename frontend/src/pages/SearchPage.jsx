import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { fetchSongs } from "../api/songs";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const PAGE_SIZE = 100;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const setQueue = usePlayerStore((s) => s.setQueue);

  // Debounce: chỉ tìm kiếm sau khi ngừng gõ 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSongs({ q: debouncedQuery, limit: PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setSongs(data.songs);
          setTotal(data.total);
          setQueue(data.songs);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSongs([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, setQueue]);

  // Tải thêm 100 bài tiếp theo (chỉ khi đang xem danh sách đầy đủ)
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchSongs({ q: debouncedQuery, limit: PAGE_SIZE, offset: songs.length });
      setSongs((prev) => [...prev, ...data.songs]);
      setTotal(data.total);
      setQueue((prev) => [...prev, ...data.songs]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <h2 className="text-3xl font-black tracking-tight text-white">Tìm kiếm bài hát & nghệ sĩ</h2>

      <div className="relative max-w-lg mb-6">
        <Search className="absolute left-4 top-3.5 text-violet-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên bài hát, ca sĩ, album..."
          autoFocus
          className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm placeholder-zinc-500 backdrop-blur-md"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-emerald-400">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : error && songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-400 font-semibold mb-2">Không thể tìm kiếm bài hát</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-bold tracking-tight mb-4 text-white">
            {debouncedQuery.trim() ? `Kết quả cho "${debouncedQuery.trim()}"` : "Tất cả bài hát"}
            <span className="text-sm font-medium text-zinc-400 ml-2">({total} bài)</span>
          </h3>
          <SongTable songs={songs} emptyText="Không tìm thấy bài hát nào khớp với từ khóa" />
          {songs.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                Tải thêm ({total - songs.length} bài còn lại)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
