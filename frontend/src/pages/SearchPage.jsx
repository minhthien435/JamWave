import { useEffect, useState } from "react";
import {
  MagnifyingGlass,
  Sliders,
  X,
  SpinnerGap,
} from "@phosphor-icons/react";
import { fetchSongs, fetchFacets } from "../api/songs";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const PAGE_SIZE = 100;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [facets, setFacets] = useState({ genres: [], years: [], countries: [] });
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("");
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const setQueue = usePlayerStore((s) => s.setQueue);

  useEffect(() => {
    fetchFacets()
      .then((data) => setFacets(data))
      .catch(() => { });
  }, []);

  // Debounce: chỉ tìm kiếm sau khi ngừng gõ 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const hasFilter = Boolean(genre || year || country);

  useEffect(() => {
    let cancelled = false;

    const search = async () => {
      try {
        const data = await fetchSongs({
          q: debouncedQuery,
          genre,
          year,
          country,
          limit: PAGE_SIZE,
          offset: 0,
        });
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
  }, [debouncedQuery, genre, year, country, setQueue]);

  // Tải thêm 100 bài tiếp theo
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchSongs({
        q: debouncedQuery,
        genre,
        year,
        country,
        limit: PAGE_SIZE,
        offset: songs.length,
      });
      setSongs((prev) => [...prev, ...data.songs]);
      setTotal(data.total);
      setQueue((prev) => [...prev, ...data.songs]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleResetFilters = () => {
    setGenre("");
    setYear("");
    setCountry("");
  };

  const selectClass =
    "bg-[#14141c] border border-white/10 text-white px-3.5 py-2.5 rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all text-xs cursor-pointer";

  return (
    <div className="space-y-6 pb-6 select-none">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Tìm kiếm bài hát & nghệ sĩ</h2>
        <p className="text-xs text-zinc-400 font-medium mt-1">Khám phá thư viện âm nhạc độc lập theo từ khóa hoặc bộ lọc</p>
      </div>

      <div className="relative max-w-xl mb-4">
        <MagnifyingGlass className="absolute left-4 top-3.5 text-violet-400" size={20} weight="bold" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên bài hát, ca sĩ, album..."
          autoFocus
          className="w-full bg-[#14141c] border border-white/10 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm placeholder-zinc-500"
        />
      </div>

      {/* Bộ lọc nâng cao */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Sliders size={15} weight="duotone" className="text-violet-400" />
          Lọc:
        </span>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
          <option value="" className="bg-[#14141a]">Thể loại: Tất cả</option>
          {facets.genres.map((g) => (
            <option key={g.value} value={g.value} className="bg-[#14141a]">{g.value}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
          <option value="" className="bg-[#14141a]">Năm: Tất cả</option>
          {facets.years.map((y) => (
            <option key={y.value} value={y.value} className="bg-[#14141a]">{y.value}</option>
          ))}
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
          <option value="" className="bg-[#14141a]">Quốc gia: Tất cả</option>
          {facets.countries.map((c) => (
            <option key={c.value} value={c.value} className="bg-[#14141a]">{c.value.toUpperCase()}</option>
          ))}
        </select>
        {hasFilter && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <X size={13} weight="bold" /> Xóa lọc
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-violet-400">
          <SpinnerGap size={32} className="animate-spin" />
        </div>
      ) : error && songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-rose-400 font-semibold mb-2">Không thể tìm kiếm bài hát</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-bold tracking-tight mb-4 text-white">
            {debouncedQuery.trim() ? `Kết quả cho "${debouncedQuery.trim()}"` : "Tất cả bài hát"}
            <span className="text-sm font-medium tabular-nums text-zinc-400 ml-2">({total} bài)</span>
          </h3>
          <SongTable songs={songs} emptyText="Không tìm thấy bài hát nào khớp với từ khóa" />
          {songs.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 border border-white/10"
              >
                {loadingMore ? <SpinnerGap size={16} className="animate-spin" /> : null}
                Tải thêm ({total - songs.length} bài còn lại)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
